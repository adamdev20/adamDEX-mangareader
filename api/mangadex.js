export default async function handler(req, res) {
  const incoming = new URL(req.url, `https://${req.headers.host}`);
  const path = String(incoming.searchParams.get("path") || "").replace(/^\/+/, "");
  const allowed = /^(manga(?:\/[^/]+(?:\/(?:feed|relation))?)?|chapter\/[^/]+|tags|manga\/random\/get|proxy)$/;
  if (!allowed.test(path)) return res.status(400).json({ error: "Unsupported MahiruDex endpoint" });

  const target = new URL(`https://mahirudex.vercel.app/api/${path}`);
  for (const [key, value] of incoming.searchParams.entries()) {
    if (key !== "path") target.searchParams.append(key, value);
  }
  try {
    const upstream = await fetch(target.toString(), {
      headers: { Accept: path === "proxy" ? "image/avif,image/webp,image/apng,image/*,*/*;q=0.8" : "application/json" },
    });
    const contentType = upstream.headers.get("content-type") || "application/json; charset=utf-8";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=600");
    if (!upstream.ok) return res.status(upstream.status).send(await upstream.text());
    if (path === "proxy") {
      const buffer = Buffer.from(await upstream.arrayBuffer());
      return res.status(200).send(buffer);
    }
    return res.status(200).send(await upstream.text());
  } catch (error) {
    return res.status(502).json({ error: "MahiruDex API temporarily unavailable" });
  }
}
