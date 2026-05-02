import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { CheckCircle2, Sparkles, BookOpen } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import VersionSwitcher, { useVariant, useHref } from "@/components/VersionSwitcher";
import WechatQrModal from "@/components/WechatQrModal";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const sf = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif";

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

export default function IndicatorDetail() {
  const { id } = useParams();
  const { lang, t } = useLang();
  const variant = useVariant();
  const href = useHref();
  const isApple = variant === "apple";
  const [ind, setInd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    axios.get(`${API}/indicators/${id}`).then((r) => setInd(r.data)).catch(() => setInd(null)).finally(() => setLoading(false));
    window.scrollTo(0, 0);
  }, [id]);

  const pageBg = isApple ? "min-h-screen bg-[#FBFBFD] text-black" : "min-h-screen bg-obsidian-900 text-white";
  const pageStyle = isApple ? { fontFamily: sf } : undefined;

  if (loading) {
    return (
      <div className={`${pageBg} flex items-center justify-center font-mono ${isApple ? "text-black/50" : "text-white/50"}`} style={pageStyle}>
        Loading indicator…
      </div>
    );
  }
  if (!ind) {
    return (
      <div className={`${pageBg} flex flex-col items-center justify-center gap-4 ${isApple ? "text-black/70" : "text-white/70"}`} style={pageStyle}>
        <p>Indicator not found</p>
        <Link to={href("/")} className={isApple ? "text-[#0071E3] underline" : "text-cyan2 underline"}>← Back</Link>
      </div>
    );
  }

  const cardCls = isApple
    ? "rounded-2xl bg-white border border-black/5 shadow-[0_6px_30px_-12px_rgba(0,0,0,0.18)]"
    : "glass rounded-2xl";
  const ctaCls = isApple
    ? "inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0071E3] hover:bg-[#0A84FF] text-white font-semibold shadow-[0_10px_28px_-10px_rgba(0,113,227,0.6)]"
    : "inline-flex items-center gap-2 px-6 py-3 rounded-full border border-cyan2/60 text-cyan2 hover:bg-cyan2/10 font-semibold";

  return (
    <div className={pageBg} style={pageStyle} data-testid="indicator-detail-page">
      <DetailNav variant={variant} homeHref={href("/")} />

      {/* Hero */}
      <section className="relative pt-16">
        <div className="relative h-[360px] md:h-[440px] w-full overflow-hidden">
          <img src={ind.cover} alt={ind.name_en} className={`absolute inset-0 w-full h-full object-cover ${isApple ? "opacity-90" : "opacity-45"}`} />
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
                  data-testid="indicator-detail-category"
                  className={
                    isApple
                      ? "px-3 py-1 rounded-full border border-[#0071E3]/30 bg-[#0071E3]/10 text-[11px] font-mono tracking-[0.2em] uppercase text-[#0071E3]"
                      : "px-3 py-1 rounded-full border border-cyan2/40 bg-cyan2/10 text-[11px] font-mono tracking-[0.2em] uppercase text-cyan2"
                  }
                >
                  {lang === "zh" ? ind.category_zh : ind.category_en}
                </span>
                <span className={`h-3 w-px ${isApple ? "bg-black/20" : "bg-white/20"}`} />
                <span className={`font-mono text-xs tracking-widest uppercase ${isApple ? "text-black/60" : "text-gray-400"}`}>
                  MT4 / MT5
                </span>
              </div>
              <h1
                className={`font-display font-black tracking-tighter leading-none ${
                  isApple ? "text-black" : "text-gradient-cyan"
                }`}
                style={{ fontSize: "clamp(40px, 6vw, 72px)" }}
              >
                {lang === "zh" ? ind.name_zh : ind.name_en}
              </h1>
              <p className={`mt-4 max-w-2xl leading-relaxed text-base md:text-lg ${isApple ? "text-black/70" : "text-gray-300"}`}>
                {lang === "zh" ? ind.desc_zh : ind.desc_en}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-16 md:py-24 grid lg:grid-cols-12 gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className={`lg:col-span-7 ${cardCls} p-6 md:p-8`}
          data-testid="indicator-usage-card"
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                isApple ? "bg-[#0071E3]/10 text-[#0071E3]" : "bg-cyan2/15 text-cyan2"
              }`}
            >
              <BookOpen size={16} />
            </div>
            <div>
              <div className={isApple ? "font-mono text-[11px] tracking-[0.25em] uppercase text-[#0071E3]" : "section-label"}>
                USAGE
              </div>
              <h2 className="font-display text-xl md:text-2xl font-bold">{t.indicators.detailUsage}</h2>
            </div>
          </div>
          <p className={`leading-relaxed text-sm md:text-base ${isApple ? "text-black/80" : "text-gray-200"}`}>
            {lang === "zh" ? ind.usage_zh : ind.usage_en}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className={`lg:col-span-5 ${cardCls} p-6 md:p-8`}
          data-testid="indicator-features-card"
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                isApple ? "bg-[#0071E3]/10 text-[#0071E3]" : "bg-gold/15 text-gold"
              }`}
            >
              <Sparkles size={16} />
            </div>
            <div>
              <div className={isApple ? "font-mono text-[11px] tracking-[0.25em] uppercase text-[#0071E3]" : "section-label"}>
                FEATURES
              </div>
              <h2 className="font-display text-xl md:text-2xl font-bold">{t.indicators.detailFeatures}</h2>
            </div>
          </div>
          <ul className="space-y-3">
            {(lang === "zh" ? ind.features_zh : ind.features_en).map((f, i) => (
              <li key={i} className={`flex items-start gap-2 text-sm leading-relaxed ${isApple ? "text-black/80" : "text-gray-200"}`}>
                <CheckCircle2 size={16} className={`shrink-0 mt-0.5 ${isApple ? "text-[#0071E3]" : "text-gold"}`} />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className={`${cardCls} p-8 text-center`}
        >
          <div className={`mb-2 ${isApple ? "font-mono text-[11px] tracking-[0.25em] uppercase text-[#0071E3]" : "section-label"}`}>
            {t.indicators.detailCategory}
          </div>
          <p className={`mb-4 text-sm ${isApple ? "text-black/60" : "text-gray-400"}`}>
            {lang === "zh" ? ind.category_zh : ind.category_en} · MT4 / MT5
          </p>
          <button
            type="button"
            onClick={() => setQrOpen(true)}
            data-testid="indicator-detail-apply"
            className={ctaCls}
          >
            {t.indicators.detailApply} →
          </button>
        </motion.div>
      </section>

      <WechatQrModal open={qrOpen} onOpenChange={setQrOpen} />
    </div>
  );
}
