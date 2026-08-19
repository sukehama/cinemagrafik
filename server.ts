import express from "express";
import path from "path";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "data", "db.json");

// Middleware to parse JSON bodies with a larger limit (to prevent payload too large for big lists)
app.use(express.json({ limit: "50mb" }));

// Ensure DB directory exists
async function ensureDbExists() {
  const dir = path.dirname(DB_FILE);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {}
}

// API Routes
app.get("/api/omdb/config", (req, res) => {
  const hasEnvKey = Boolean(process.env.OMDB_API_KEY && process.env.OMDB_API_KEY.trim() !== "");
  res.json({ hasEnvKey });
});

app.get("/api/omdb/search", async (req, res) => {
  try {
    const query = String(req.query.query || "").trim();
    const type = req.query.type ? String(req.query.type) : "";
    const year = req.query.year ? String(req.query.year) : "";
    const page = req.query.page ? String(req.query.page) : "1";
    const userApiKey = req.headers["x-omdb-key"] as string || (req.query.apiKey ? String(req.query.apiKey) : "");
    const apiKey = (process.env.OMDB_API_KEY && process.env.OMDB_API_KEY.trim()) || userApiKey;

    if (!apiKey) {
      return res.status(400).json({ 
        Response: "False", 
        Error: "OMDb API ključ nije podešen. Unesite vaš besplatni API ključ sa www.omdbapi.com u postavkama ili u okruženju." 
      });
    }

    if (!query) {
      return res.json({ Response: "True", Search: [], totalResults: "0" });
    }

    let url = `https://www.omdbapi.com/?apikey=${encodeURIComponent(apiKey)}&s=${encodeURIComponent(query)}&page=${page}`;
    if (type && (type === 'movie' || type === 'series')) {
      url += `&type=${encodeURIComponent(type)}`;
    }
    if (year) {
      url += `&y=${encodeURIComponent(year)}`;
    }

    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("OMDb search proxy error:", error);
    res.status(500).json({ Response: "False", Error: error.message || "Greška pri pretraživanju OMDb baze" });
  }
});

app.get("/api/omdb/detail", async (req, res) => {
  try {
    const id = String(req.query.id || "").trim();
    const title = String(req.query.title || "").trim();
    const season = req.query.season ? String(req.query.season) : "";
    const plot = req.query.plot ? String(req.query.plot) : "full";
    const userApiKey = req.headers["x-omdb-key"] as string || (req.query.apiKey ? String(req.query.apiKey) : "");
    const apiKey = (process.env.OMDB_API_KEY && process.env.OMDB_API_KEY.trim()) || userApiKey;

    if (!apiKey) {
      return res.status(400).json({ 
        Response: "False", 
        Error: "OMDb API ključ nije podešen." 
      });
    }

    let url = `https://www.omdbapi.com/?apikey=${encodeURIComponent(apiKey)}&plot=${plot}`;
    if (id) {
      url += `&i=${encodeURIComponent(id)}`;
    } else if (title) {
      url += `&t=${encodeURIComponent(title)}`;
    } else {
      return res.status(400).json({ Response: "False", Error: "Potreban je IMDb ID (i) ili naziv (t)." });
    }

    if (season) {
      url += `&Season=${encodeURIComponent(season)}`;
    }

    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("OMDb detail proxy error:", error);
    res.status(500).json({ Response: "False", Error: error.message || "Greška pri dohvatanju detalja sa OMDb-a" });
  }
});

app.get("/api/entries", async (req, res) => {
  try {
    await ensureDbExists();
    try {
      const data = await fs.readFile(DB_FILE, "utf-8");
      return res.json(JSON.parse(data));
    } catch (e) {
      // Return empty array if file not found or corrupted
      return res.json([]);
    }
  } catch (error) {
    console.error("Error reading database:", error);
    res.status(500).json({ error: "Failed to read database" });
  }
});

app.post("/api/entries", async (req, res) => {
  try {
    await ensureDbExists();
    const data = req.body;
    await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    res.json({ success: true });
  } catch (error) {
    console.error("Error writing to database:", error);
    res.status(500).json({ error: "Failed to save to database" });
  }
});

// Vite middleware integration
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Support Spa router fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
