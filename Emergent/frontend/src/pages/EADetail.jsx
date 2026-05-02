import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart, BarChart, Bar
} from "recharts";
import {
  CheckCircle2, AlertTriangle, Shield, Wallet, TrendingUp, Activity, Loader2, Clock, Percent, ListOrdered
} from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import VersionSwitcher, { useVariant, useHref } from "@/components/VersionSwitcher";
import WechatQrModal from "@/components/WechatQrModal";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const sf = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif";
const BLUE = "#0071E3";

function DetailNav({ variant, homeHref }) {
  const isApple = variant === "apple";
  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 border-b ${
        isApple ? "bg-white/80 backdrop-blur-xl border-black/5" : "glass-strong border-white/10"
      }`}
      style={isApple ? { fontFamily: sf } : undefined}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
        <Link to={homeHref} className="flex items-center gap-3 group" data-testid="detail-home-link">
          <div
            className={`w-9 h-9 rounded-md flex items-center justify-center font-display font-black text-lg ${
              isApple ? "bg-black text-white" : "bg-gradient-to-br from-gold-300 to-gold-700 text-black"
            }`}
          >
            ∞
          </div>
          <div className="leading-tight text-left">
            <div
              className={`font-display font-bold text-base tracking-tight ${
                isApple ? "text-black" : "text-white"
              }`}
            >
              无限量化
            </div>
            <div
              className={`font-mono text-[10px] tracking-[0.25em] uppercase ${
                isApple ? "text-[#0071E3]" : "text-cyan2"
              }`}
            >
              MetaTrader
            </div>
          </div>
        </Link>
        <div className="hidden md:block">
          <VersionSwitcher dark={!isApple} />
        </div>
      </div>
    </header>
  );
}

function AnimatedEquity({ equity, className = "", loadingLabel, isApple }) {
  const [phase, setPhase] = useState("loading");
  useEffect(() => {
    const timer = setTimeout(() => setPhase("chart"), 900);
    return () => clearTimeout(timer);
  }, []);
  const safeEquity = Array.isArray(equity) ? equity : [];
  const data = safeEquity.map((v, i) => ({ m: `M${i + 1}`, v }));
  const stroke = isApple ? BLUE : "#F59E0B";
  const fillId = isApple ? "equityFillApple" : "equityFillSci";
  return (
    <div className={`relative w-full h-72 ${className}`}>
      {phase === "loading" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" data-testid="ea-equity-loading">
          <div className="absolute inset-0 flex items-end justify-between gap-1 px-4 py-6 opacity-60">
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t ${isApple ? "bg-[#0071E3]/15" : "bg-gold/20"}`}
                style={{
                  height: `${30 + Math.sin(i * 0.9) * 22 + (i / 14) * 30}%`,
                  animation: `pulse 1.2s ease-in-out ${i * 0.05}s infinite alternate`,
                }}
              />
            ))}
          </div>
          <div
            className={`relative z-10 flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-full border backdrop-blur ${
              isApple
                ? "text-black/70 bg-white/70 border-black/10"
                : "text-gray-300 bg-black/50 border-white/10"
            }`}
          >
            <Loader2 size={12} className={`animate-spin ${isApple ? "text-[#0071E3]" : "text-gold"}`} /> {loadingLabel}
          </div>
        </div>
      ) : safeEquity.length === 0 ? (
        <div
          className={`absolute inset-0 flex items-center justify-center rounded-2xl border ${
            isApple
              ? "bg-white border-black/5 text-black/60"
              : "bg-white/[0.03] border-white/10 text-white/60"
          }`}
          data-testid="ea-equity-empty"
        >
          <div className="text-sm font-mono">{isApple ? "数据准备中" : "Equity data pending"}</div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full h-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={isApple ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"} strokeDasharray="2 4" />
              <XAxis dataKey="m" tick={{ fill: isApple ? "#6B7280" : "#6B7280", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: isApple ? "#6B7280" : "#6B7280", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip
                contentStyle={{
                  background: isApple ? "#FFFFFF" : "#0A0A0E",
                  border: isApple ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  fontFamily: "JetBrains Mono",
                }}
                itemStyle={{ color: stroke }}
                labelStyle={{ color: "#9CA3AF", fontSize: 11 }}
                formatter={(v) => [`${v}%`, "Cumulative"]}
              />
              <Area type="monotone" dataKey="v" stroke={stroke} strokeWidth={2.4} fill={`url(#${fillId})`} animationDuration={2200} animationEasing="ease-out" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </div>
  );
}

export default function EADetail() {
  const { id } = useParams();
  const { lang, t } = useLang();
  const variant = useVariant();
  const href = useHref();
  const isApple = variant === "apple";
  const [ea, setEa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState("MT4");
  const [selectedAccountIdx, setSelectedAccountIdx] = useState(0);

  useEffect(() => {
    setLoading(true);
    axios.get(`${API}/eas/${id}`).then((r) => {
      const eaData = r.data;
      setEa(eaData);
      if (eaData.accounts && eaData.accounts.length > 0) {
        const platforms = [...new Set(eaData.accounts.map(a => a.platform || "MT4"))];
        if (platforms.includes("MT4")) setSelectedPlatform("MT4");
        else setSelectedPlatform(platforms[0]);
      }
    }).catch(() => setEa(null)).finally(() => setLoading(false));
    window.scrollTo(0, 0);
  }, [id]);

  const pageBg = isApple ? "min-h-screen bg-[#FBFBFD] text-black" : "min-h-screen bg-obsidian-900 text-white";
  const pageStyle = isApple ? { fontFamily: sf } : undefined;

  const formatDate = (isoString) => {
    if (!isoString) return "-";
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
      }).format(d);
    } catch {
      return "-";
    }
  };

  if (loading) {
    return (
      <div className={`${pageBg} flex items-center justify-center font-mono ${isApple ? "text-black/50" : "text-white/50"}`} style={pageStyle}>
        Loading strategy…
      </div>
    );
  }
  if (!ea) {
    return (
      <div className={`${pageBg} flex flex-col items-center justify-center gap-4 ${isApple ? "text-black/70" : "text-white/70"}`} style={pageStyle}>
        <p>EA not found</p>
        <Link to={href("/")} className={isApple ? "text-[#0071E3] underline" : "text-cyan2 underline"}>← Back</Link>
      </div>
    );
  }

  const hasAccounts = ea.accounts && ea.accounts.length > 0;
    
    // Filter accounts by selected platform
    const platformAccounts = hasAccounts ? ea.accounts.filter(a => (a.platform || "MT4") === selectedPlatform) : [];
    
    // Safety check in case the selectedIdx is out of bounds for the new platform
    const currentStats = platformAccounts.length > 0 
      ? platformAccounts[selectedAccountIdx < platformAccounts.length ? selectedAccountIdx : 0] 
      : ea;

    const availablePlatforms = hasAccounts ? [...new Set(ea.accounts.map(a => a.platform || "MT4"))] : [];

    const stats = [
      { icon: TrendingUp, label: t.ea.col.profit, value: currentStats.profit_monthly || ea.profit_monthly, tone: isApple ? "text-[#0071E3]" : "text-gold" },
      { icon: AlertTriangle, label: t.ea.col.dd, value: hasAccounts && currentStats.max_drawdown !== undefined ? `${currentStats.max_drawdown}%` : ea.max_drawdown, tone: isApple ? "text-rose-600" : "text-red-400" },
      { icon: Shield, label: t.ea.col.risk, value: ea.risk_level, tone: isApple ? "text-emerald-600" : "text-emerald-400" },
      { icon: Wallet, label: t.ea.col.minCap, value: hasAccounts && currentStats.initial_deposit !== undefined ? `$${currentStats.initial_deposit}` : ea.min_capital, tone: isApple ? "text-[#0071E3]" : "text-cyan2" },
    ];

  const cardCls = isApple
    ? "rounded-2xl bg-white border border-black/5 shadow-[0_6px_30px_-12px_rgba(0,0,0,0.18)]"
    : "glass rounded-2xl";
  const ctaCls = isApple
    ? "inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0071E3] hover:bg-[#0A84FF] text-white font-semibold shadow-[0_10px_28px_-10px_rgba(0,113,227,0.6)]"
    : "inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gold hover:bg-gold-300 text-black font-semibold shadow-[0_12px_40px_-10px_rgba(245,158,11,0.6)]";

  return (
    <div className={pageBg} style={pageStyle} data-testid="ea-detail-page">
      <DetailNav variant={variant} homeHref={href("/")} />

      {/* Hero cover */}
      <section className="relative pt-16">
        <div className="relative h-[380px] md:h-[460px] w-full overflow-hidden">
          <img src={ea.cover} alt={ea.name_en} className={`absolute inset-0 w-full h-full object-cover ${isApple ? "opacity-90" : "opacity-50"}`} />
          <div
            className={`absolute inset-0 ${
              isApple
                ? "bg-gradient-to-b from-white/20 via-white/50 to-[#FBFBFD]"
                : "bg-gradient-to-b from-obsidian-900/40 via-obsidian-900/60 to-obsidian-900"
            }`}
          />
          {!isApple && <div className="absolute inset-0 grid-lines opacity-20" />}
          <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 h-full flex flex-col justify-end pb-12">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="flex items-center gap-3 mb-4">
                <span
                  className={
                    isApple
                      ? "font-mono text-[11px] tracking-[0.25em] uppercase text-[#0071E3]"
                      : "section-label"
                  }
                >
                  {ea.symbol}
                </span>
                <span className={`h-3 w-px ${isApple ? "bg-black/20" : "bg-white/20"}`} />
                <span className={`font-mono text-xs tracking-widest uppercase ${isApple ? "text-black/60" : "text-gray-400"}`}>
                  {ea.platform}
                </span>
              </div>
              <h1
                className={`font-display font-black tracking-tighter leading-none ${
                  isApple ? "text-black" : "text-gradient-gold"
                }`}
                style={{ fontSize: "clamp(40px, 6vw, 72px)" }}
              >
                {lang === "zh" ? ea.name_zh : ea.name_en}
              </h1>
              <p className={`mt-4 max-w-2xl leading-relaxed text-base md:text-lg ${isApple ? "text-black/70" : "text-gray-300"}`}>
                {lang === "zh" ? ea.strategy_zh : ea.strategy_en}
              </p>
              {ea.last_sync_time && (
                <div className={`mt-4 text-sm flex items-center gap-2 ${isApple ? "text-black/50" : "text-white/50"}`}>
                  <Clock size={16} />
                  <span>最后更新: {formatDate(ea.last_sync_time)} (北京时间)</span>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats row */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 -mt-10 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className={`${cardCls} p-4 md:p-5`}
              data-testid={`ea-detail-stat-${i}`}
            >
              <s.icon size={16} className={s.tone} />
              <div className={`font-mono text-xl md:text-2xl font-bold mt-2 ${s.tone}`}>{s.value}</div>
              <div className={`text-xs mt-0.5 uppercase tracking-wider ${isApple ? "text-black/50" : "text-gray-500"}`}>{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Advanced Metrics */}
              {hasAccounts && (
                <div className="mt-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                    <div className="flex items-center gap-4">
                      <h3 className={`text-xl font-bold ${isApple ? "text-black" : "text-white"}`}>进阶分析指标</h3>
                      {availablePlatforms.length > 1 && (
                        <div className="flex items-center bg-black/10 rounded-lg p-1">
                          {availablePlatforms.map(plat => (
                            <button
                              key={plat}
                              onClick={() => {
                                setSelectedPlatform(plat);
                                setSelectedAccountIdx(0);
                              }}
                              className={`px-4 py-1 text-sm font-medium rounded-md transition-colors ${
                                selectedPlatform === plat
                                  ? (isApple ? "bg-white text-black shadow-sm" : "bg-neutral-700 text-white")
                                  : (isApple ? "text-black/60 hover:text-black" : "text-white/60 hover:text-white")
                              }`}
                            >
                              {plat}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {platformAccounts.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${isApple ? "text-black/60" : "text-white/60"}`}>选择观摩账号:</span>
                        <select 
                          className={`px-3 py-1.5 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            isApple 
                              ? "bg-white border-black/10 text-black shadow-sm" 
                              : "bg-neutral-800 border-neutral-700 text-white"
                          }`}
                          value={selectedAccountIdx}
                          onChange={(e) => setSelectedAccountIdx(Number(e.target.value))}
                        >
                          {platformAccounts.map((acc, idx) => (
                            <option key={idx} value={idx}>
                              {acc.account} ({acc.server})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className={`${cardCls} p-4 flex flex-col gap-2`}>
                      <div className={`text-xs font-medium ${isApple ? "text-black/50" : "text-white/50"}`}>总净利润率</div>
                      <div className={`text-lg font-bold text-green-500`}>{currentStats.profit_percentage || '-'}%</div>
                    </div>
                    <div className={`${cardCls} p-4 flex flex-col gap-2`}>
                      <div className={`text-xs font-medium ${isApple ? "text-black/50" : "text-white/50"}`}>历史胜率</div>
                      <div className={`text-lg font-bold ${isApple ? "text-[#0071E3]" : "text-cyan2"}`}>
                        {currentStats.win_rate ? `${(currentStats.win_rate * 100).toFixed(2)}%` : '-'}
                      </div>
                    </div>
                    <div className={`${cardCls} p-4 flex flex-col gap-2`}>
                      <div className={`text-xs font-medium ${isApple ? "text-black/50" : "text-white/50"}`}>开仓手数区间</div>
                      <div className={`text-lg font-bold ${isApple ? "text-black" : "text-white"}`}>
                        {currentStats.min_lots} ~ {currentStats.max_lots}
                      </div>
                    </div>
                    <div className={`${cardCls} p-4 flex flex-col gap-2`}>
                      <div className={`text-xs font-medium ${isApple ? "text-black/50" : "text-white/50"}`}>平均持仓时间</div>
                      <div className={`text-sm font-bold ${isApple ? "text-black" : "text-white"} truncate`} title={currentStats.holding_time_avg}>
                        {currentStats.holding_time_avg?.split('.')[0] || '-'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Monthly Profit Chart */}
              {currentStats.profit_by_month && Object.keys(currentStats.profit_by_month).length > 0 && (
                <div className="mt-8">
                  <h3 className={`text-xl font-bold mb-4 ${isApple ? "text-black" : "text-white"}`}>月度盈利表现</h3>
                  <div className={`${cardCls} p-6 h-[300px]`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={Object.entries(currentStats.profit_by_month).map(([k, v]) => ({ name: k, profit: v }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isApple ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.1)"} vertical={false} />
                        <XAxis dataKey="name" stroke={isApple ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.3)"} fontSize={12} tickMargin={10} />
                        <YAxis stroke={isApple ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.3)"} fontSize={12} tickFormatter={(val) => `$${val}`} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: isApple ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.8)",
                            border: isApple ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "12px",
                            color: isApple ? "#000" : "#fff",
                          }}
                        />
                        <Bar dataKey="profit" fill={isApple ? "#0071E3" : "#F59E0B"} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
      </section>

      {/* Main body */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-16 md:py-24 grid lg:grid-cols-12 gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className={`lg:col-span-8 ${cardCls} p-6 md:p-8`}
          data-testid="ea-equity-card"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className={isApple ? "font-mono text-[11px] tracking-[0.25em] uppercase text-[#0071E3]" : "section-label"}>
                EQUITY CURVE
              </div>
              <h2 className="font-display text-xl md:text-2xl font-bold mt-1">{t.ea.detailEquity}</h2>
            </div>
            <div className={`font-mono text-xs flex items-center gap-1.5 ${isApple ? "text-emerald-600" : "text-emerald-400"}`}>
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isApple ? "bg-emerald-600" : "bg-emerald-400"}`} /> LIVE
            </div>
          </div>
          <AnimatedEquity equity={ea.equity} isApple={isApple} loadingLabel={lang === "zh" ? "加载权益曲线…" : "Loading equity…"} />
        </motion.div>

        <div className="lg:col-span-4 space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className={`${cardCls} p-6`}
          >
            <div className={`mb-3 ${isApple ? "font-mono text-[11px] tracking-[0.25em] uppercase text-[#0071E3]" : "section-label"}`}>
              {t.ea.detailFeatures}
            </div>
            <ul className="space-y-3">
              {(lang === "zh" ? ea.features_zh : ea.features_en).map((f, i) => (
                <li key={i} className={`flex items-start gap-2 text-sm leading-relaxed ${isApple ? "text-black/80" : "text-gray-200"}`}>
                  <CheckCircle2 size={16} className={`shrink-0 mt-0.5 ${isApple ? "text-[#0071E3]" : "text-gold"}`} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.2 }}
            className={`${cardCls} p-6`}
          >
            <div className={`mb-3 ${isApple ? "font-mono text-[11px] tracking-[0.25em] uppercase text-[#0071E3]" : "section-label"}`}>
              {t.ea.detailCoop}
            </div>
            <p className={`text-sm leading-relaxed ${isApple ? "text-black/80" : "text-gray-200"}`}>
              <Activity size={14} className={`inline mr-1.5 ${isApple ? "text-[#0071E3]" : "text-cyan2"}`} />
              {lang === "zh" ? ea.cooperation_zh : ea.cooperation_en}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Setup + CTA */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className={`${cardCls} p-6 md:p-10 grid md:grid-cols-3 gap-8 items-center`}
        >
          <div className="md:col-span-2">
            <div className={`mb-2 ${isApple ? "font-mono text-[11px] tracking-[0.25em] uppercase text-[#0071E3]" : "section-label"}`}>
              {t.ea.detailSetup}
            </div>
            <p className={`leading-relaxed text-sm md:text-base ${isApple ? "text-black/75" : "text-gray-300"}`}>
              {lang === "zh" ? ea.setup_zh : ea.setup_en}
            </p>
          </div>
          <div className="flex md:justify-end">
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              data-testid="ea-detail-apply"
              className={ctaCls}
            >
              {t.ea.detailApply} →
            </button>
          </div>
        </motion.div>
      </section>

      <WechatQrModal open={qrOpen} onOpenChange={setQrOpen} />
    </div>
  );
}
