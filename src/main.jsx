import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Search, Compass, Bookmark, Clock3, ChevronRight, ArrowLeft, Menu, X, BookOpen, Flame, ArrowUpRight, LoaderCircle, RotateCcw } from "lucide-react";
import "./styles.css";

const API = "https://mahirudex.vercel.app/api";
const LANGS = ["en", "id"];

function title(m) {
  const a = m?.attributes || m || {};
  const t = a.title || m?.title || {};
  return t.en || t.id || t[Object.keys(t)[0]] || m?.name || "Untitled";
}
function description(m) {
  const a = m?.attributes || m || {};
  const d = a.description || m?.description || {};
  return typeof d === "string" ? d : d.en || d.id || d[Object.keys(d)[0]] || "No description available.";
}
function coverUrl(m) {
  if (!m) return "";
  const direct = [m.cover, m.coverUrl, m.cover_url, m.coverArt, m.cover_art_url, m.attributes?.cover].find(v => typeof v === "string" && /^https?:\/\//i.test(v));
  if (direct) return direct;
  const id = m.id || m.mangaId || m.manga_id || m.attributes?.id;
  const rels = m.relationships || m.relations || m.data?.relationships || [];
  const rel = rels.find?.(x => ["cover_art", "coverArt", "cover"].includes(x.type)) || m.coverArt || m.cover_art;
  const file = rel?.attributes?.fileName || rel?.attributes?.filename || rel?.fileName || rel?.filename || m.coverFileName || m.coverFilename || m.cover_file_name;
  if (!id || !file) return "";
  return `https://uploads.mangadex.org/covers/${id}/${file}.256.jpg`;
}

function tags(m) {
  const raw = m?.attributes?.tags || m?.tags || [];
  return raw.slice(0, 3).map(x => x.attributes?.name?.en || x.name?.en || x.name || x.attributes?.name?.id).filter(Boolean);
}
function asList(result) {
  if (Array.isArray(result)) return result;
  if (!result || typeof result !== "object") return [];
  for (const key of ["data", "results", "manga", "items", "chapters", "feed", "relationships"]) {
    const value = result[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") {
      for (const nested of ["data", "results", "items", "manga", "chapters"]) {
        if (Array.isArray(value[nested])) return value[nested];
      }
    }
  }
  return [];
}
function unwrap(result) {
  if (!result || typeof result !== "object") return result;
  if (result.data && !Array.isArray(result.data) && typeof result.data === "object") return result.data;
  if (result.manga && !Array.isArray(result.manga) && typeof result.manga === "object") return result.manga;
  return result;
}

async function api(path, params = {}) {
  const cleanPath = String(path).replace(/^\/+/, "");
  const url = new URL(`${API}/${cleanPath}`);

  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;

    if (Array.isArray(value)) {
      value.forEach((item) => url.searchParams.append(key, item));
    } else {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(
      `MahiruDex API error: ${response.status} ${await response.text()}`
    );
  }

  return response.json();
}

function Cover({ m, large = false }) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const base = coverUrl(m);
  const sources = useMemo(() => {
    if (!base) return [];
    const proxy = `${API}?path=proxy&url=${encodeURIComponent(base)}`;
    const original = base.replace(/\.256\.jpg$/, "");
    return [...new Set([proxy, base, `${API}?path=proxy&url=${encodeURIComponent(original)}`, original])];
  }, [base]);
  useEffect(() => setSourceIndex(0), [base]);
  return <div className={`cover${large ? " cover-large" : ""}`}>
    {sources[sourceIndex] ? <img src={sources[sourceIndex]} alt={`${title(m)} cover`} loading="lazy" referrerPolicy="no-referrer" onError={() => setSourceIndex(i => i + 1)} /> : <div className="fallback"><b>AD</b><small>NO COVER</small></div>}
    <i />
  </div>;
}
function Card({ m, onOpen }) {
  return <button className="card" onClick={() => onOpen(m)}>
    <Cover m={m} />
    <div className="cardtext"><small>{m?.attributes?.year || m?.year || m?.attributes?.status || "MANGA"}</small><b>{title(m)}</b><span>{tags(m).join(" · ") || "Discover your next read"}</span></div>
    <ArrowUpRight size={16} />
  </button>;
}

function App() {
  const [language, setLanguage] = useState("en");
  const [popular, setPopular] = useState([]);
  const [fresh, setFresh] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState("home");
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [chapter, setChapter] = useState(null);
  const [pages, setPages] = useState([]);
  const [reading, setReading] = useState(false);
  const [menu, setMenu] = useState(false);
  const [saved, setSaved] = useState(() => { try { return JSON.parse(localStorage.getItem("ad-saved") || "[]"); } catch { return []; } });
  const [history, setHistory] = useState(() => { try { return JSON.parse(localStorage.getItem("ad-history") || "[]"); } catch { return []; } });

  useEffect(() => {
    let alive = true;
    setLoading(true); setError("");
    Promise.allSettled([
      api("manga", { limit: 24, order: "followedCount" }),
      api("manga", { limit: 16, order: "createdAt" })
    ]).then(results => {
      if (!alive) return;
      const [popularResult, freshResult] = results;
      if (popularResult.status === "fulfilled") setPopular(asList(popularResult.value));
      if (freshResult.status === "fulfilled") setFresh(asList(freshResult.value));
      if (popularResult.status === "rejected" && freshResult.status === "rejected") setError("Katalog gagal dimuat dari MahiruDex. Coba muat ulang.");
      else if ((popularResult.status === "fulfilled" && !asList(popularResult.value).length) || (freshResult.status === "fulfilled" && !asList(freshResult.value).length)) setError("API merespons, tetapi format daftar manga belum dikenali.");
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  useEffect(() => { localStorage.setItem("ad-saved", JSON.stringify(saved)); }, [saved]);
  useEffect(() => { localStorage.setItem("ad-history", JSON.stringify(history)); }, [history]);

  const home = () => { setPage("home"); setSelected(null); setMenu(false); window.scrollTo(0, 0); };
  const search = async e => {
    e?.preventDefault();
    const q = query.trim(); setTerm(q); setPage("search"); setSelected(null); setSearching(true); setError(""); setMenu(false); window.scrollTo(0, 0);
    try { const result = await api("manga", { title: q, limit: 24, order: q ? "relevance" : "followedCount" }); setFresh(asList(result)); }
    catch { setError("Pencarian gagal. Periksa koneksi lalu coba lagi."); }
    finally { setSearching(false); }
  };
  const open = async m => {
    setSelected(m); setDetail(null); setChapters([]); setPage("detail"); setError(""); window.scrollTo(0, 0);
    try {
      const [d, c] = await Promise.all([
        api(`manga/${m.id}`),
        api(`manga/${m.id}/feed`, { lang: "en,id" })
      ]);
      const detailed = unwrap(d) || m;
      setDetail(detailed || m);
      setChapters(asList(c).filter(ch => {
        const lang = String(ch?.attributes?.translatedLanguage || ch?.translatedLanguage || ch?.lang || "").toLowerCase();
        return LANGS.includes(lang) && !ch?.attributes?.externalUrl;
      }).sort((a, b) => {
        const av = parseFloat(a?.attributes?.chapter ?? a?.chapter ?? "0") || 0;
        const bv = parseFloat(b?.attributes?.chapter ?? b?.chapter ?? "0") || 0;
        return av - bv;
      }));
    } catch { setDetail(m); setError("Detail atau daftar chapter gagal dimuat. Coba buka judulnya lagi."); }
  };
  const read = async ch => {
    setChapter(ch); setPage("reader"); setPages([]); setReading(true); setError(""); window.scrollTo(0, 0);
    try {
      const r = await api(`chapter/${ch.id}`, { quality: "data" });
      const candidates = r?.pages || r?.images || r?.data?.pages || r?.chapter?.data || r?.chapter?.pages || r?.data?.chapter?.data || r?.data?.chapter?.pages || r?.data || [];
      const pageUrls = Array.isArray(candidates) ? candidates.map(item => typeof item === "string" ? item : item?.url || item?.src).filter(Boolean) : [];
      setPages(pageUrls);
      if (!pageUrls.length) throw new Error("No pages returned");
      const ctitle = ch?.attributes?.chapter || ch?.chapter || "—";
      setHistory(prev => [{ id: selected.id, title: title(selected), chapter: ctitle, chapterId: ch.id, cover: coverUrl(selected) }, ...prev.filter(x => x.chapterId !== ch.id)].slice(0, 30));
    } catch { setError("Halaman chapter belum berhasil dimuat dari endpoint MahiruDex."); }
    finally { setReading(false); }
  };
  const toggle = m => setSaved(prev => prev.some(x => x.id === m.id) ? prev.filter(x => x.id !== m.id) : [{ ...m, title: title(m), cover: coverUrl(m) }, ...prev]);
  const list = page === "saved" ? saved : page === "history" ? history.map(x => ({ id: x.id, title: { en: x.title }, cover: x.cover, attributes: { title: { en: x.title }, status: "Reading" } })) : page === "search" ? fresh : fresh;
  const activeManga = detail || selected;
  const chapterLang = c => (c?.attributes?.translatedLanguage || c?.translatedLanguage || c?.lang || "en").toUpperCase();
  const chapterNumber = c => c?.attributes?.chapter ?? c?.chapter ?? "—";
  const chapterName = c => c?.attributes?.title || c?.title || "";

  return <div className="shell">
    <header>
      <button className="brand" onClick={home}><span className="mark">A<span>/</span>D</span><span className="brandtxt">Adam<span>DEX</span><small>READ BEYOND</small></span></button>
      <nav className={menu ? "open" : ""}>
        <button className={page === "home" ? "active" : ""} onClick={home}><Compass size={16}/> Discover</button>
        <button onClick={() => { setPage("saved"); setSelected(null); setMenu(false); }}><Bookmark size={16}/> Library <small>{saved.length}</small></button>
        <button onClick={() => { setPage("history"); setSelected(null); setMenu(false); }}><Clock3 size={16}/> History</button>
      </nav>
      <label className="language"><span>CHAPTERS</span><select value={language} onChange={e => setLanguage(e.target.value)} aria-label="Chapter language"><option value="en">EN</option><option value="id">ID</option></select></label>
      <form className="topsearch" onSubmit={search}><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a manga…" /></form>
      <button className="menubtn" onClick={() => setMenu(!menu)} aria-label="Toggle menu">{menu ? <X/> : <Menu/>}</button>
    </header>

    {page === "reader" ? <main className="reader">
      <div className="readbar"><button onClick={() => setPage("detail")}><ArrowLeft size={16}/> Back</button><div><small>NOW READING · {chapterLang(chapter)}</small><b>{title(selected)} · Ch. {chapterNumber(chapter)}</b></div><button onClick={() => read(chapter)} aria-label="Reload chapter"><RotateCcw size={16}/></button></div>
      {reading && <div className="status"><LoaderCircle className="spin"/> Loading pages…</div>}{error && <p className="error">{error}</p>}
      <div className="pages">{pages.map((src, i) => <img key={`${src}-${i}`} src={src} alt={`Page ${i + 1}`} loading={i < 3 ? "eager" : "lazy"} onError={e => { e.currentTarget.alt = "Page failed to load"; }} />)}</div>
      {!reading && pages.length > 0 && <button className="back" onClick={() => setPage("detail")}><ArrowLeft size={16}/> Chapter list</button>}
    </main> : page === "detail" && selected ? <main className="detail">
      <button className="back" onClick={home}><ArrowLeft size={16}/> Back to discovery</button>
      <section className="profile"><div className="profilecover"><Cover m={activeManga} large /></div><div><small className="eyebrow">MANGA PROFILE</small><h1>{title(activeManga)}</h1><div className="tags">{[...tags(activeManga), activeManga?.attributes?.status, activeManga?.attributes?.year].filter(Boolean).map(x => <span key={x}>{x}</span>)}</div><p>{description(activeManga)}</p><div className="actions"><button className="primary" disabled={!chapters.length} onClick={() => chapters[0] && read(chapters[0])}><BookOpen size={17}/> Start reading <ChevronRight size={16}/></button><button className="secondary" onClick={() => toggle(activeManga)}><Bookmark size={17}/>{saved.some(x => x.id === selected.id) ? "In library" : "Save to library"}</button></div></div></section>
      <section className="chaptersection"><div className="sectionhead"><div><small className="eyebrow">ENGLISH + INDONESIAN</small><h2>Chapters <span>{chapters.length}</span></h2></div><small>LANG: {language.toUpperCase()}</small></div>
        {error && <p className="error">{error}</p>}
        {chapters.length ? chapters.filter(c => chapterLang(c).toLowerCase() === language).map((c, i) => <button className="chapter" key={c.id} onClick={() => read(c)}><span>{String(i + 1).padStart(2, "0")}</span><b>Chapter {chapterNumber(c)}{chapterName(c) ? ` — ${chapterName(c)}` : ""}<small>{chapterLang(c)} · {c?.attributes?.pages || c?.pages || "?"} pages</small></b><ChevronRight size={16}/></button>) : <div className="status">{error ? "Could not load chapters." : "Loading chapters or no English/Indonesian chapters available."}</div>}
      </section>
    </main> : <main>
      {page === "home" && <section className="hero"><div className="herocopy"><small className="eyebrow">YOUR NEXT STORY STARTS HERE</small><h1>Stories worth<br/><em>staying up for.</em></h1><p>Discover manga and read chapters in English or Indonesian.</p><form className="herosearch" onSubmit={search}><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search manga titles…"/><button>Search <ArrowUpRight size={15}/></button></form><div className="herofoot"><span>Powered by MahiruDex API</span><span>DISCOVER</span></div></div><div className="heroart"><div className="orbit"/><div className="orbit two"/><div className="stamp">AD<span>✳</span></div><div className="float one"><b>01</b> Find a story.</div><div className="float two"><b>02</b> Read a chapter.</div><small>ADAMDEX / READER</small></div></section>}
      {page === "home" && <section className="section"><div className="sectionhead"><div><small className="eyebrow">COMMUNITY FAVORITES</small><h2><Flame size={20}/> Popular manga</h2></div></div>{loading && !popular.length ? <div className="status"><LoaderCircle className="spin"/> Loading manga…</div> : <div className="grid popular">{popular.slice(0, 6).map(m => <Card key={m.id} m={m} onOpen={open}/>)}</div>}</section>}
      <section className="section"><div className="sectionhead"><div><small className="eyebrow">{page === "search" ? "SEARCH RESULTS" : page === "saved" ? "YOUR COLLECTION" : page === "history" ? "CONTINUE READING" : "LATEST ADDED"}</small><h2>{page === "search" ? (term ? `Results for “${term}”` : "Explore manga") : page === "saved" ? "Your library" : page === "history" ? "Reading history" : "Fresh manga"}</h2></div>{page === "home" && <small className="hint">EN + ID CHAPTERS</small>}</div>
        {error && <p className="error">{error} <button onClick={() => window.location.reload()}>Retry</button></p>}
        {(loading && page === "home") || searching ? <div className="status"><LoaderCircle className="spin"/> Loading titles…</div> : list.length ? <div className="grid">{list.map(m => <Card key={m.id} m={m} onOpen={open}/>)}</div> : <div className="status">{page === "saved" ? "Your library is empty. Save a manga to keep it here." : page === "history" ? "No reading history on this device yet." : "No titles found. Try another search."}</div>}
      </section>
      <footer><button className="brand" onClick={home}><span className="mark">A<span>/</span>D</span><span className="brandtxt">Adam<span>DEX</span><small>READ BEYOND</small></span></button><p>Manga data provided by MahiruDex.</p><small>ADAMDEX · 2026</small></footer>
    </main>}
  </div>;
}

createRoot(document.getElementById("root")).render(<App />);
