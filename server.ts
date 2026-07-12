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
