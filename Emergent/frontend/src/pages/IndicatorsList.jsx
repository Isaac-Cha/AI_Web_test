import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Search, Sparkles } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import VersionSwitcher, { useVariant, useHref } from "@/components/VersionSwitcher";
import { Input } from "@/components/ui/input";
import { API } from "@/lib/api";

const sf = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif";

function ListNav({ variant, homeHref }) {
  const isApple = variant === "apple";
  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 border-b ${
        isApple ? "bg-white/80 backdrop-blur-xl border-black/5" : "glass-strong border-white/10"
      }`}
      style={isApple ? { fontFamily: sf } : undefined}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
        <Link to={homeHref} className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-md flex items-center justify-center font-display font-black text-lg ${
            isApple ? "bg-black text-white" : "bg-gradient-to-br from-gold-300 to-gold-700 text-black"
          }`}>∞</div>
          <div className="leading-tight text-left">
            <div className={`font-display font-bold text-base tracking-tight ${isApple ? "text-black" : "text-white"}`}>无限量化</div>
            <div className={`font-mono text-[10px] tracking-[0.25em] uppercase ${isApple ? "text-[#0071E3]" : "text-cyan2"}`}>MetaTrader</div>
          </div>
        </Link>
        <div className="hidden md:block"><VersionSwitcher dark={!isApple} /></div>
      </div>
    </header>
  );
}

function Chip({ active, onClick, label, testid, isApple }) {
  const base = "px-3.5 py-1.5 rounded-full text-xs font-mono tracking-widest uppercase border transition-all";
  if (isApple) {
    return (
      <button
        onClick={onClick}
        data-testid={testid}
        className={`${base} ${
          active ? "bg-[#0071E3] text-white border-[#0071E3]" : "border-black/15 text-black/70 hover:border-[#0071E3]/60 hover:text-black"
        }`}
      >{label}</button>
    );
  }
  return (
    <button
      onClick={onClick}
      data-testid={testid}
      className={`${base} ${
        active ? "bg-cyan2 text-black border-cyan2" : "border-white/15 text-gray-300 hover:border-cyan2/50 hover:text-white"
      }`}
    >{label}</button>
  );
}

export default function IndicatorsList() {
  const { lang, t } = useLang();
  const variant = useVariant();
  const href = useHref();
  const isApple = variant === "apple";
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");

  useEffect(() => {
    axios.get(`${API}/indicators`).then((r) => setItems(r.data));
    window.scrollTo(0, 0);
  }, []);

  const categories = useMemo(() => {
    const set = new Set();
    items.forEach((i) => set.add(lang === "zh" ? i.category_zh : i.category_en));
    return ["All", ...Array.from(set)];
  }, [items, lang]);

  const filtered = useMemo(() => items.filter((it) => {
    const name = lang === "zh" ? it.name_zh : it.name_en;
    const category = lang === "zh" ? it.category_zh : it.category_en;
    const matchesQ = !q.trim() || name.toLowerCase().includes(q.trim().toLowerCase());
    const matchesCat = cat === "All" || category === cat;
    return matchesQ && matchesCat;
  }), [items, q, cat, lang]);

  const featured = items[1] || items[0];

  return (
    <div
      className={isApple ? "min-h-screen bg-[#FBFBFD] text-black" : "min-h-screen bg-obsidian-900 text-white"}
      style={isApple ? { fontFamily: sf } : undefined}
      data-testid="indicators-list-page"
    >
      <ListNav variant={variant} homeHref={href("/")} />

      {featured && (
        <section className="relative pt-16">
          <div className="relative h-[420px] md:h-[500px] w-full overflow-hidden">
            <img src={featured.cover} alt={featured.name_en} className={`absolute inset-0 w-full h-full object-cover ${isApple ? "opacity-90" : "opacity-40"}`} />
            <div className={`absolute inset-0 ${
              isApple
                ? "bg-gradient-to-b from-white/20 via-white/50 to-[#FBFBFD]"
                : "bg-gradient-to-b from-obsidian-900/30 via-obsidian-900/60 to-obsidian-900"
            }`} />
            {!isApple && <div className="absolute inset-0 grid-lines opacity-20" />}
            <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 h-full flex flex-col justify-end pb-12">
              <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={
                    isApple
                      ? "px-2.5 py-1 rounded-full border border-[#0071E3]/30 bg-[#0071E3]/10 text-[10px] font-mono tracking-widest text-[#0071E3] uppercase"
                      : "px-2.5 py-1 rounded-full border border-cyan2/40 bg-cyan2/10 text-[10px] font-mono tracking-widest text-cyan2 uppercase"
                  }>
                    {lang === "zh" ? "推荐 · FEATURED" : "FEATURED"}
                  </span>
                  <span className={isApple ? "font-mono text-[11px] tracking-[0.25em] uppercase text-black/60" : "section-label"}>
                    {lang === "zh" ? featured.category_zh : featured.category_en}
                  </span>
                </div>
                <h1 className={`font-display font-black tracking-tighter leading-none ${isApple ? "text-black" : "text-gradient-cyan"}`}
                    style={{ fontSize: "clamp(40px, 6vw, 72px)" }}>
                  {lang === "zh" ? t.indicators.title : "Indicator Library"}
                </h1>
                <p className={`mt-4 max-w-2xl leading-relaxed text-base md:text-lg ${isApple ? "text-black/70" : "text-gray-300"}`}>
                  {lang === "zh"
                    ? `本周推荐：${featured.name_zh} — ${featured.desc_zh}`
                    : `This week's pick: ${featured.name_en} — ${featured.desc_en}`}
                </p>
                <Link
                  to={href(`/indicator/${featured.id}`)}
                  data-testid="indicators-list-featured-cta"
                  className={isApple
                    ? "mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0071E3] hover:bg-[#0A84FF] text-white font-semibold"
                    : "mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-cyan2/60 text-cyan2 hover:bg-cyan2/10 font-semibold"}
                >
                  {t.indicators.cta} <ArrowRight size={14} />
                </Link>
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* Filter */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 mt-10">
        <div className={`rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4 ${
          isApple ? "bg-white border border-black/5 shadow-[0_6px_30px_-12px_rgba(0,0,0,0.1)]" : "glass"
        }`}>
          <div className="relative flex-1 min-w-0">
            <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isApple ? "text-black/40" : "text-gray-400"}`} />
            <Input
              data-testid="indicators-search-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.indicators.searchPlaceholder}
              className={isApple
                ? "pl-8 bg-white border-black/10 text-black placeholder:text-black/40"
                : "pl-8 bg-white/5 border-white/10 text-white"}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-mono text-[10px] tracking-widest uppercase mr-1 ${isApple ? "text-black/50" : "text-gray-500"}`}>{t.indicators.detailCategory}</span>
            {categories.map((c) => (
              <Chip key={c} isApple={isApple} testid={`ind-filter-${c}`} active={cat === c} onClick={() => setCat(c)} label={c} />
            ))}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-10 pb-24">
        {filtered.length === 0 ? (
          <div className={`text-center py-24 font-mono ${isApple ? "text-black/50" : "text-gray-500"}`}>
            {lang === "zh" ? "未找到匹配的指标" : "No indicators match your filters"}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((it, i) => (
              <motion.div
                key={it.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.06 }}
                className={`group relative rounded-2xl overflow-hidden transition-all ${
                  isApple
                    ? "bg-white border border-black/5 shadow-[0_6px_30px_-12px_rgba(0,0,0,0.15)] hover:border-[#0071E3]/40 hover:shadow-[0_14px_40px_-14px_rgba(0,113,227,0.3)]"
                    : "border border-white/10 bg-white/[0.03] hover:border-cyan2/50"
                }`}
                data-testid={`ind-list-item-${it.id}`}
              >
                <Link to={href(`/indicator/${it.id}`)} className="absolute inset-0 z-10" aria-label={it.name_en} />
                <div className="relative aspect-[16/9] overflow-hidden">
                  <img src={it.cover} alt={it.name_en} className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${isApple ? "opacity-95 group-hover:opacity-100" : "opacity-60 group-hover:opacity-100"}`} />
                  <div className={`absolute inset-0 bg-gradient-to-t ${isApple ? "from-white/80 to-transparent" : "from-obsidian-900 to-transparent"}`} />
                  <span className={`absolute top-3 left-3 px-2 py-0.5 rounded-full backdrop-blur text-[10px] font-mono tracking-widest ${
                    isApple ? "bg-white/80 text-[#0071E3]" : "bg-black/60 text-cyan2"
                  }`}>
                    {lang === "zh" ? it.category_zh : it.category_en}
                  </span>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles size={13} className={isApple ? "text-[#0071E3]" : "text-cyan2"} />
                    <div className={isApple ? "font-mono text-[11px] tracking-[0.25em] uppercase text-black/50" : "section-label"}>MT4 / MT5</div>
                  </div>
                  <h3 className={`font-display text-lg font-bold ${isApple ? "text-black" : "text-white"}`}>{lang === "zh" ? it.name_zh : it.name_en}</h3>
                  <p className={`mt-2 text-xs leading-relaxed line-clamp-2 ${isApple ? "text-black/60" : "text-gray-400"}`}>
                    {lang === "zh" ? it.desc_zh : it.desc_en}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
