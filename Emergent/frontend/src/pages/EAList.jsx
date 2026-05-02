import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Search, AlertTriangle, Shield, Wallet,
} from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import VersionSwitcher, { useVariant, useHref } from "@/components/VersionSwitcher";
import { Input } from "@/components/ui/input";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
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

const PLATFORMS = ["All", "MT4", "MT5"];
const RISKS = ["All", "低 Low", "中 Mid", "高 High"];

function Chip({ active, onClick, label, testid, isApple }) {
  const base = "px-3.5 py-1.5 rounded-full text-xs font-mono tracking-widest uppercase border transition-all";
  if (isApple) {
    return (
      <button
        onClick={onClick}
        data-testid={testid}
        className={`${base} ${
          active
            ? "bg-[#0071E3] text-white border-[#0071E3]"
            : "border-black/15 text-black/70 hover:border-[#0071E3]/60 hover:text-black"
        }`}
      >
        {label}
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      data-testid={testid}
      className={`${base} ${
        active ? "bg-gold text-black border-gold" : "border-white/15 text-gray-300 hover:border-cyan2/50 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

export default function EAList() {
  const { lang, t } = useLang();
  const variant = useVariant();
  const href = useHref();
  const isApple = variant === "apple";
  const [eas, setEas] = useState([]);
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState("All");
  const [risk, setRisk] = useState("All");

  useEffect(() => {
    axios.get(`${API}/eas`).then((r) => setEas(r.data));
    window.scrollTo(0, 0);
  }, []);

  const featured = eas[0];

  const filtered = useMemo(() => {
    return eas.filter((ea) => {
      const name = (lang === "zh" ? ea.name_zh : ea.name_en) || "";
      const matchesQ = !q.trim() || name.toLowerCase().includes(q.trim().toLowerCase())
        || ea.symbol.toLowerCase().includes(q.trim().toLowerCase());
      const matchesPlatform = platform === "All" || ea.platform.includes(platform);
      const matchesRisk = risk === "All" || ea.risk_level.includes(risk.split(" ")[0]);
      return matchesQ && matchesPlatform && matchesRisk;
    });
  }, [eas, q, platform, risk, lang]);

  return (
    <div
      className={isApple ? "min-h-screen bg-[#FBFBFD] text-black" : "min-h-screen bg-obsidian-900 text-white"}
      style={isApple ? { fontFamily: sf } : undefined}
      data-testid="ea-list-page"
    >
      <ListNav variant={variant} homeHref={href("/")} />

      {/* Banner */}
      {featured && (
        <section className="relative pt-16">
          <div className="relative h-[420px] md:h-[500px] w-full overflow-hidden">
            <img src={featured.cover} alt={featured.name_en} className={`absolute inset-0 w-full h-full object-cover ${isApple ? "opacity-90" : "opacity-45"}`} />
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
                      : "px-2.5 py-1 rounded-full border border-gold/40 bg-gold/10 text-[10px] font-mono tracking-widest text-gold uppercase"
                  }>
                    {lang === "zh" ? "推荐 · FEATURED" : "FEATURED"}
                  </span>
                  <span className={isApple ? "font-mono text-[11px] tracking-[0.25em] uppercase text-black/60" : "section-label"}>{featured.symbol}</span>
                </div>
                <h1 className={`font-display font-black tracking-tighter leading-none ${isApple ? "text-black" : "text-gradient-gold"}`}
                    style={{ fontSize: "clamp(40px, 6vw, 72px)" }}>
                  {lang === "zh" ? t.ea.title : "All EA Strategies"}
                </h1>
                <p className={`mt-4 max-w-2xl leading-relaxed text-base md:text-lg ${isApple ? "text-black/70" : "text-gray-300"}`}>
                  {lang === "zh"
                    ? `本月推荐：${featured.name_zh}，月化 ${featured.profit_monthly},最大回撤 ${featured.max_drawdown}`
                    : `This month's pick: ${featured.name_en} — ${featured.profit_monthly} monthly, ${featured.max_drawdown} max DD`}
                </p>
                <Link
                  to={href(`/ea/${featured.id}`)}
                  data-testid="ea-list-featured-cta"
                  className={isApple
                    ? "mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0071E3] hover:bg-[#0A84FF] text-white font-semibold"
                    : "mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gold hover:bg-gold-300 text-black font-semibold"}
                >
                  {t.ea.cta} <ArrowRight size={14} />
                </Link>
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* Filter bar */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 mt-10">
        <div className={`rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4 ${
          isApple
            ? "bg-white border border-black/5 shadow-[0_6px_30px_-12px_rgba(0,0,0,0.1)]"
            : "glass"
        }`}>
          <div className="relative flex-1 min-w-0">
            <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isApple ? "text-black/40" : "text-gray-400"}`} />
            <Input
              data-testid="ea-search-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.ea.searchPlaceholder}
              className={isApple
                ? "pl-8 bg-white border-black/10 text-black placeholder:text-black/40"
                : "pl-8 bg-white/5 border-white/10 text-white"}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-mono text-[10px] tracking-widest uppercase mr-1 ${isApple ? "text-black/50" : "text-gray-500"}`}>{t.ea.filterPlatform}</span>
            {PLATFORMS.map((p) => (
              <Chip key={p} isApple={isApple} testid={`ea-filter-platform-${p}`} active={platform === p} onClick={() => setPlatform(p)} label={p} />
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-mono text-[10px] tracking-widest uppercase mr-1 ${isApple ? "text-black/50" : "text-gray-500"}`}>{t.ea.filterRisk}</span>
            {RISKS.map((r) => (
              <Chip key={r} isApple={isApple} testid={`ea-filter-risk-${r}`} active={risk === r} onClick={() => setRisk(r)} label={r} />
            ))}
          </div>
        </div>
      </section>

      {/* List */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-10 pb-24">
        {filtered.length === 0 ? (
          <div className={`text-center py-24 font-mono ${isApple ? "text-black/50" : "text-gray-500"}`}>
            {lang === "zh" ? "未找到匹配的策略" : "No strategies match your filters"}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((ea, i) => (
              <motion.div
                key={ea.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.06 }}
                className={`group relative rounded-2xl overflow-hidden transition-all ${
                  isApple
                    ? "bg-white border border-black/5 shadow-[0_6px_30px_-12px_rgba(0,0,0,0.15)] hover:border-[#0071E3]/40 hover:shadow-[0_14px_40px_-14px_rgba(0,113,227,0.3)]"
                    : "border border-white/10 bg-white/[0.03] hover:border-cyan2/50"
                }`}
                data-testid={`ea-list-item-${ea.id}`}
              >
                <Link to={href(`/ea/${ea.id}`)} className="absolute inset-0 z-10" aria-label={ea.name_en} />
                <div className="relative aspect-[16/9] overflow-hidden">
                  <img src={ea.cover} alt={ea.name_en} className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${isApple ? "opacity-95 group-hover:opacity-100" : "opacity-70 group-hover:opacity-100"}`} />
                  <div className={`absolute inset-0 bg-gradient-to-t ${isApple ? "from-white/80 to-transparent" : "from-obsidian-900 to-transparent"}`} />
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full backdrop-blur text-[10px] font-mono tracking-widest ${isApple ? "bg-white/80 text-[#0071E3]" : "bg-black/60 text-gold"}`}>{ea.symbol}</span>
                  </div>
                  <div className={`absolute bottom-3 right-3 font-mono text-xl font-bold ${isApple ? "text-[#0071E3]" : "text-gradient-gold"}`}>{ea.profit_monthly}</div>
                </div>
                <div className="p-5">
                  <div className={isApple ? "font-mono text-[11px] tracking-[0.25em] uppercase text-black/50 mb-1" : "section-label mb-1"}>{ea.platform}</div>
                  <h3 className={`font-display text-lg font-bold ${isApple ? "text-black" : "text-white"}`}>{lang === "zh" ? ea.name_zh : ea.name_en}</h3>
                  <p className={`mt-2 text-xs leading-relaxed line-clamp-2 ${isApple ? "text-black/60" : "text-gray-400"}`}>
                    {lang === "zh" ? ea.strategy_zh : ea.strategy_en}
                  </p>
                  <div className={`mt-4 pt-4 grid grid-cols-3 gap-2 border-t ${isApple ? "border-black/10" : "border-white/10"}`}>
                    <MiniStat isApple={isApple} icon={AlertTriangle} v={ea.max_drawdown} l={t.ea.col.dd} c={isApple ? "text-rose-600" : "text-red-300"} />
                    <MiniStat isApple={isApple} icon={Shield} v={ea.risk_level.split(" ")[0]} l={t.ea.col.risk} c={isApple ? "text-emerald-600" : "text-emerald-300"} />
                    <MiniStat isApple={isApple} icon={Wallet} v={ea.min_capital} l={t.ea.col.min} c={isApple ? "text-[#0071E3]" : "text-cyan2"} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MiniStat({ icon: Icon, v, l, c, isApple }) {
  return (
    <div>
      <Icon size={12} className={c} />
      <div className={`font-mono text-sm font-semibold mt-1 ${c}`}>{v}</div>
      <div className={`text-[9px] uppercase tracking-wider ${isApple ? "text-black/50" : "text-gray-500"}`}>{l}</div>
    </div>
  );
}
