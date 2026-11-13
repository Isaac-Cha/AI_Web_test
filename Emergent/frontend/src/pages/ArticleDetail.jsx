import React, { useEffect, useState } from "react";
import axios from "axios";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { API } from "@/lib/api";
import VersionSwitcher, { useHref, useVariant } from "@/components/VersionSwitcher";

function Content({ value, muted }) {
  const blocks = String(value || "").split(/\n{2,}/).filter(Boolean);
  return blocks.map((block, index) => {
    if (block.startsWith("### ")) return <h3 key={index} className="mt-10 text-xl font-bold">{block.slice(4)}</h3>;
    if (block.startsWith("## ")) return <h2 key={index} className="mt-12 text-2xl font-bold">{block.slice(3)}</h2>;
    if (block.startsWith("# ")) return <h2 key={index} className="mt-12 text-3xl font-bold">{block.slice(2)}</h2>;
    return <p key={index} className={`mt-5 whitespace-pre-wrap leading-8 ${muted}`}>{block}</p>;
  });
}

export default function ArticleDetail() {
  const { slug } = useParams();
  const variant = useVariant();
  const href = useHref();
  const isApple = variant === "apple";
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/articles/${slug}`).then((r) => setItem(r.data)).catch(() => setItem(null)).finally(() => setLoading(false));
    window.scrollTo(0, 0);
  }, [slug]);

  const page = isApple ? "bg-[#F5F5F7] text-black" : "bg-obsidian-900 text-white";
  const muted = isApple ? "text-black/70" : "text-gray-300";
  const border = isApple ? "border-black/10" : "border-white/10";
  const accent = isApple ? "text-[#0071E3]" : "text-cyan2";
  if (loading) return <main className={`min-h-screen grid place-items-center ${page}`}>Loading…</main>;
  if (!item) return <main className={`min-h-screen grid place-items-center ${page}`}><Link to={href("/articles")}>文章不存在</Link></main>;

  return (
    <main className={`min-h-screen ${page}`} data-testid="article-detail-page">
      <header className={`fixed inset-x-0 top-0 z-40 border-b backdrop-blur-xl ${isApple ? "bg-white/85 border-black/5" : "bg-black/70 border-white/10"}`}>
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link to={href("/articles")} className="inline-flex items-center gap-2 text-sm"><ArrowLeft size={16} /> 内容库</Link>
          <VersionSwitcher dark={!isApple} />
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-6 pb-24 pt-28 md:pt-36">
        <div className={`text-xs font-mono uppercase ${accent}`}>{item.type}{item.research_id ? ` · ${item.research_id}` : ""}</div>
        <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">{item.title}</h1>
        <p className={`mt-6 text-lg leading-8 ${muted}`}>{item.summary}</p>
        <div className={`mt-10 border-t ${border}`} />
        <Content value={item.content} muted={muted} />
        {Array.isArray(item.source_refs) && item.source_refs.length > 0 && (
          <section className={`mt-14 border-t pt-8 ${border}`}>
            <h2 className="text-xl font-bold">来源</h2>
            <div className="mt-4 space-y-3">
              {item.source_refs.map((ref, i) => ref.url ? (
                <a key={i} href={ref.url} target="_blank" rel="noreferrer" className={`flex items-center gap-2 text-sm ${accent}`}>{ref.title}<ExternalLink size={13} /></a>
              ) : <div key={i} className={`text-sm ${muted}`}>{ref.title}</div>)}
            </div>
          </section>
        )}
      </article>
    </main>
  );
}
