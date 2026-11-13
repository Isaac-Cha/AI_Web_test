import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { ArrowRight, BookOpen, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { API } from "@/lib/api";
import { Input } from "@/components/ui/input";
import VersionSwitcher, { useHref, useVariant } from "@/components/VersionSwitcher";

const TYPES = ["all", "foundation", "system", "research", "guide", "case"];
const TYPE_LABELS = {
  all: "全部",
  foundation: "交易基础",
  system: "核心系统",
  research: "研究日志",
  guide: "工具指南",
  case: "案例复盘",
};

export default function ArticleList() {
  const variant = useVariant();
  const href = useHref();
  const isApple = variant === "apple";
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");

  useEffect(() => {
    axios.get(`${API}/articles`).then((r) => setItems(r.data)).catch(() => setItems([]));
    window.scrollTo(0, 0);
  }, []);

  const filtered = useMemo(() => items.filter((item) => {
    const matchesType = type === "all" || item.type === type;
    const needle = query.trim().toLowerCase();
    const matchesQuery = !needle || `${item.title} ${item.summary}`.toLowerCase().includes(needle);
    return matchesType && matchesQuery;
  }), [items, query, type]);

  const page = isApple ? "bg-[#F5F5F7] text-black" : "bg-obsidian-900 text-white";
  const surface = isApple ? "bg-white border-black/10" : "bg-white/[0.035] border-white/10";
  const muted = isApple ? "text-black/60" : "text-gray-400";
  const accent = isApple ? "text-[#0071E3]" : "text-cyan2";

  return (
    <main className={`min-h-screen ${page}`} data-testid="article-list-page">
      <header className={`fixed inset-x-0 top-0 z-40 border-b backdrop-blur-xl ${isApple ? "bg-white/85 border-black/5" : "bg-black/70 border-white/10"}`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 md:px-10">
          <Link to={href("/")} className="font-bold">无限量化 <span className={`ml-2 text-xs font-mono ${accent}`}>KNOWLEDGE</span></Link>
          <VersionSwitcher dark={!isApple} />
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 pb-10 pt-28 md:px-10 md:pt-36">
        <div className={`text-xs font-mono uppercase ${accent}`}>Evidence-first learning</div>
        <h1 className="mt-2 text-4xl font-black md:text-6xl">帮助交易者少走弯路</h1>
        <p className={`mt-4 max-w-3xl leading-relaxed ${muted}`}>从风险、工具边界、测试方法到交易系统。文章中的数字和结论应能追溯到来源或研究编号。</p>
      </section>

      <section className="mx-auto max-w-7xl px-6 md:px-10">
        <div className={`flex flex-col gap-4 rounded-lg border p-4 lg:flex-row lg:items-center ${surface}`}>
          <div className="relative flex-1">
            <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`} />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索文章" className={`pl-9 ${isApple ? "bg-white text-black" : "bg-black/20 text-white"}`} />
          </div>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((value) => (
              <button key={value} onClick={() => setType(value)} className={`rounded-full border px-3 py-1.5 text-xs ${type === value ? (isApple ? "bg-black text-white" : "bg-cyan2 text-black border-cyan2") : (isApple ? "border-black/15" : "border-white/15 text-gray-300")}`}>
                {TYPE_LABELS[value]}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 pb-24 md:px-10">
        {filtered.length === 0 ? (
          <div className={`border-t py-16 text-center ${isApple ? "border-black/10" : "border-white/10"} ${muted}`}>暂无已发布文章</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <article key={item.slug} className={`relative flex min-h-64 flex-col rounded-lg border p-6 ${surface}`}>
                <div className={`text-xs font-mono ${accent}`}>{TYPE_LABELS[item.type] || item.type}{item.research_id ? ` · ${item.research_id}` : ""}</div>
                <h2 className="mt-4 text-xl font-bold leading-snug">{item.title}</h2>
                <p className={`mt-3 flex-1 text-sm leading-relaxed ${muted}`}>{item.summary}</p>
                <Link to={href(`/articles/${item.slug}`)} className={`mt-6 inline-flex items-center gap-2 text-sm font-medium ${accent}`}>阅读全文 <ArrowRight size={14} /></Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
