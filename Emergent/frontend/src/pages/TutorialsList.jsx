import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, ArrowUpRight, PlayCircle, Cloud } from "lucide-react";
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
        <Link to={homeHref} className="flex items-center gap-3" data-testid="list-home-link">
          <div
            className={`w-9 h-9 rounded-md flex items-center justify-center font-display font-black text-lg ${
              isApple ? "bg-black text-white" : "bg-gradient-to-br from-gold-300 to-gold-700 text-black"
            }`}
          >
            ∞
          </div>
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

export default function TutorialsList() {
  const { lang, t } = useLang();
  const variant = useVariant();
  const href = useHref();
  const isApple = variant === "apple";
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    axios.get(`${API}/tutorials`).then((r) => setItems(r.data));
    window.scrollTo(0, 0);
  }, []);

  const filtered = useMemo(() => items.filter((it) => {
    const name = lang === "zh" ? it.title_zh : it.title_en;
    return !q.trim() || name.toLowerCase().includes(q.trim().toLowerCase());
  }), [items, q, lang]);

  const featured = items[0];

  const pageBg = isApple ? "min-h-screen bg-[#FBFBFD] text-black" : "min-h-screen bg-obsidian-900 text-white";
  const pageStyle = isApple ? { fontFamily: sf } : undefined;
  const cardCls = isApple
    ? "rounded-2xl bg-white border border-black/5 shadow-[0_6px_30px_-12px_rgba(0,0,0,0.18)]"
    : "glass rounded-2xl";
  const searchCls = isApple
    ? "pl-8 bg-white border-black/10 text-black placeholder:text-black/40"
    : "pl-8 bg-white/5 border-white/10 text-white";
  const ctaCls = isApple
    ? "mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0071E3] hover:bg-[#0A84FF] text-white font-semibold"
    : "mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gold hover:bg-gold-300 text-black font-semibold";

  return (
    <div className={pageBg} style={pageStyle} data-testid="tutorials-list-page">
      <ListNav variant={variant} homeHref={href("/")} />

      {featured && (
        <section className="relative pt-16">
          <div className="relative h-[420px] md:h-[500px] w-full overflow-hidden">
            <div
              className={`absolute inset-0 ${
                isApple
                  ? "bg-gradient-to-br from-[#F5F5F7] via-white to-[#E8F0FE]"
                  : "bg-gradient-to-br from-obsidian-800 via-obsidian-900 to-[#1a1205]"
              }`}
            />
            {!isApple && <div className="absolute inset-0 grid-lines opacity-30" />}
            <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 h-full flex flex-col justify-end pb-12">
              <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={
                      isApple
                        ? "px-2.5 py-1 rounded-full border border-[#0071E3]/30 bg-[#0071E3]/10 text-[10px] font-mono tracking-widest text-[#0071E3] uppercase"
                        : "px-2.5 py-1 rounded-full border border-gold/40 bg-gold/10 text-[10px] font-mono tracking-widest text-gold uppercase"
                    }
                  >
                    {lang === "zh" ? "推荐 · FEATURED" : "FEATURED"}
                  </span>
                  <span
                    className={
                      isApple
                        ? "font-mono text-[11px] tracking-[0.25em] uppercase text-black/60"
                        : "section-label"
                    }
                  >
                    {lang === "zh" ? featured.cloud_zh : featured.cloud_en}
                  </span>
                </div>
                <h1
                  className={`font-display font-black tracking-tighter leading-none ${
                    isApple ? "text-black" : "text-gradient-gold"
                  }`}
                  style={{ fontSize: "clamp(40px, 6vw, 72px)" }}
                >
                  {lang === "zh" ? t.tutorials.title : "All Tutorials"}
                </h1>
                <p className={`mt-4 max-w-2xl leading-relaxed text-base md:text-lg ${isApple ? "text-black/70" : "text-gray-300"}`}>
                  {lang === "zh" ? `入门必读：${featured.title_zh}` : `Start here: ${featured.title_en}`}
                </p>
                <a
                  href={featured.url}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="tutorials-list-featured-cta"
                  className={ctaCls}
                >
                  {t.tutorials.download} <ArrowUpRight size={14} />
                </a>
              </motion.div>
            </div>
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-6 md:px-10 mt-10">
        <div className={`${cardCls} p-5`}>
          <div className="relative">
            <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isApple ? "text-black/40" : "text-gray-400"}`} />
            <Input
              data-testid="tutorials-search-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.tutorials.searchPlaceholder}
              className={searchCls}
            />
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 md:px-10 py-10 pb-24">
        {filtered.length === 0 ? (
          <div className={`text-center py-24 font-mono ${isApple ? "text-black/50" : "text-gray-500"}`}>
            {lang === "zh" ? "未找到匹配的教程" : "No tutorials match your search"}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-5">
            {filtered.map((it, i) => (
              <motion.a
                key={it.id}
                href={it.url}
                target="_blank"
                rel="noreferrer"
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: (i % 2) * 0.06 }}
                className={`${cardCls} p-6 flex items-center justify-between gap-6 transition-all ${
                  isApple ? "hover:border-[#0071E3]/40 hover:shadow-[0_12px_40px_-14px_rgba(0,113,227,0.3)]" : "hover:border-cyan2/50 ring-cyan-hover"
                }`}
                data-testid={`tutorial-list-item-${it.id}`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      isApple ? "bg-[#0071E3]/10 text-[#0071E3]" : "bg-gold/15 text-gold"
                    }`}
                  >
                    <PlayCircle size={22} />
                  </div>
                  <div>
                    <div className={`mb-1.5 ${isApple ? "font-mono text-[11px] tracking-[0.25em] uppercase text-black/60" : "section-label"}`}>
                      {lang === "zh" ? it.cloud_zh : it.cloud_en}
                    </div>
                    <h3 className={`font-display text-lg font-bold ${isApple ? "text-black" : "text-white"}`}>
                      {lang === "zh" ? it.title_zh : it.title_en}
                    </h3>
                    <div
                      className={`mt-2 text-xs font-mono tracking-wider flex items-center gap-1.5 ${
                        isApple ? "text-[#0071E3]" : "text-cyan2"
                      }`}
                    >
                      <Cloud size={12} /> {t.tutorials.download}
                    </div>
                  </div>
                </div>
                <ArrowUpRight size={22} className={`shrink-0 ${isApple ? "text-black/40" : "text-gray-500"}`} />
              </motion.a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
