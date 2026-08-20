/**
 * Wikipedia API helper to fetch authentic actor portraits and biographies
 * without requiring any API keys.
 */

export interface WikiActorData {
  photoUrl?: string;
  bio?: string;
  extract?: string;
  pageUrl?: string;
}

// In-memory cache for the session to prevent repeated network requests
const wikiCache = new Map<string, WikiActorData>();

export async function fetchActorWikiInfo(actorName: string): Promise<WikiActorData> {
  const cleanName = (actorName || '').trim();
  if (!cleanName) return {};

  const cacheKey = cleanName.toLowerCase();
  if (wikiCache.has(cacheKey)) {
    return wikiCache.get(cacheKey)!;
  }

  try {
    // 1. Try direct Wikipedia REST summary API
    const formattedTitle = encodeURIComponent(cleanName.replace(/\s+/g, '_'));
    const summaryRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${formattedTitle}`);
    if (summaryRes.ok) {
      const data = await summaryRes.json();
      if (data && data.type !== 'disambiguation' && (data.thumbnail || data.extract)) {
        const result: WikiActorData = {
          photoUrl: data.thumbnail?.source || undefined,
          bio: data.extract || undefined,
          extract: data.description || undefined,
          pageUrl: data.content_urls?.desktop?.page || undefined
        };
        wikiCache.set(cacheKey, result);
        return result;
      }
    }

    // 2. Fallback to Wikipedia action=query with generator=search
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(cleanName + ' actor')}&gsrlimit=1&prop=pageimages|extracts&pithumbsize=600&exintro=1&explaintext=1&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const pages = searchData.query?.pages;
      if (pages) {
        const firstPageId = Object.keys(pages)[0];
        const page = pages[firstPageId];
        if (page && page.pageid > 0) {
          const result: WikiActorData = {
            photoUrl: page.thumbnail?.source || undefined,
            bio: page.extract || undefined,
            pageUrl: `https://en.wikipedia.org/?curid=${page.pageid}`
          };
          wikiCache.set(cacheKey, result);
          return result;
        }
      }
    }
  } catch (err) {
    console.warn(`Wikipedia API fetch warning for actor "${cleanName}":`, err);
  }

  const fallback: WikiActorData = {};
  wikiCache.set(cacheKey, fallback);
  return fallback;
}

/**
 * Batch fetch Wikipedia info for a list of actor names concurrently
 */
export async function batchFetchActorsWiki(actorNames: string[]): Promise<Record<string, WikiActorData>> {
  const uniqueNames = Array.from(new Set(actorNames.map(n => n.trim()).filter(Boolean)));
  const results: Record<string, WikiActorData> = {};

  await Promise.all(
    uniqueNames.map(async (name) => {
      const info = await fetchActorWikiInfo(name);
      results[name] = info;
    })
  );

  return results;
}
