
export default async function handler(req, res) {
  const path = String(req.query.path || "manga").replace(/^\/+/, "");

  if (!/^(manga|cover|chapter|at-home|statistics|author|artist|tag|group|user)(\/|$)/.test(path)) {
    return res.status(400).json({ error: "Unsupported MangaDex endpoint" });
  }

  const incoming = new URL(req.url, `https://${req.headers.host}`);
  const target = new URL(`https://api.mangadex.org/${path}`);

  for (const [key, value] of incoming.searchParams.entries()) {
    if (key !== "path") {
      target.searchParams.append(key, value);
    }
  }

  try {
    const response = await fetch(target, {
      headers: {
        Accept: "application/json",
        "User-Agent": "AdamDEX/1.0"
      }
    });

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(response.status).send(await response.text());
  } catch (error) {
    return res.status(502).json({
      error: "MangaDex API temporarily unavailable"
    });
  }
}
