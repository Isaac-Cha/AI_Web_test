import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useLang } from "@/context/LanguageContext";
import { useHref } from "@/components/VersionSwitcher";
import { motion } from "framer-motion";
import { Activity, AlertTriangle, TrendingUp, Wallet, Shield, ArrowRight } from "lucide-react";
import { API } from "@/lib/api";

const riskColor = (risk) => {
  if (!risk) return "text-gray-300";
  if (/高|high/i.test(risk)) return "text-red-400";
  if (/低|low/i.test(risk)) return "text-emerald-400";
  return "text-yellow-400";
};

export default function EASection() {
  const { lang, t } = useLang();
  const href = useHref();
  const [eas, setEas] = useState([]);

  useEffect(() => {
    axios.get(`${API}/eas`).then((r) => setEas(r.data)).catch(() => {});
  }, []);

  return (
    <section id="ea" data-testid="ea-section" className="relative py-24 md:py-32 bg-obsidian-800/60">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="max-w-3xl mb-14 flex items-end justify-between gap-6">
          <div>
            <div className="section-label mb-3">{t.ea.label}</div>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-gradient-gold">
              {t.ea.title}
            </h2>
            <p className="mt-4 text-gray-400">{t.ea.subtitle}</p>
          </div>
          <Link
            to={href("/ea")}
            data-testid="ea-view-all"
            className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-gold/40 text-gold hover:bg-gold/10 text-sm font-medium shrink-0 whitespace-nowrap"
          >
            {t.ea.viewAll} <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
          {eas.map((ea, i) => (
            <motion.article
              key={ea.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: (i % 2) * 0.1 }}
              className="glass rounded-2xl p-6 ring-cyan-hover transition-all group relative overflow-hidden"
              data-testid={`ea-card-${ea.id}`}
            >
              <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gold/10 blur-3xl group-hover:bg-gold/20 transition-colors" />
              <div className="flex items-start justify-between relative">
                <div>
                  <div className="section-label mb-2">{ea.symbol} · {ea.platform}</div>
                  <h3 className="font-display text-2xl font-bold">
                    {lang === "zh" ? ea.name_zh : ea.name_en}
                  </h3>
                </div>
                <div className="text-right">
                  <div className="font-mono text-2xl text-gradient-gold">{ea.profit_monthly}</div>
                  <div className="text-[10px] text-gray-500 tracking-widest mt-1">{t.ea.col.profit}</div>
                </div>
              </div>

              <p className="mt-4 text-sm text-gray-400 leading-relaxed">
                {lang === "zh" ? ea.strategy_zh : ea.strategy_en}
              </p>

              <div className="mt-5 grid grid-cols-4 gap-2 text-center">
                <Stat icon={AlertTriangle} label={t.ea.col.dd} value={ea.max_drawdown} tone="text-red-300" />
                <Stat icon={Shield} label={t.ea.col.risk} value={ea.risk_level} tone={riskColor(ea.risk_level)} />
                <Stat icon={Wallet} label={t.ea.col.min} value={ea.min_capital} tone="text-cyan2" />
                <Stat icon={TrendingUp} label={t.ea.col.profit} value={ea.profit_monthly} tone="text-emerald-400" />
              </div>

              <div className="mt-5 pt-5 border-t border-white/10 flex items-center justify-between">
                <div className="text-xs text-gray-400">
                  <Activity size={12} className="inline mr-1.5 text-cyan2" />
                  {lang === "zh" ? ea.cooperation_zh : ea.cooperation_en}
                </div>
                <Link
                  to={href(`/ea/${ea.id}`)}
                  data-testid={`ea-detail-${ea.id}`}
                  className="text-sm text-gold hover:text-gold-300 font-semibold inline-flex items-center gap-1"
                >
                  {t.ea.cta} <ArrowRight size={14} />
                </Link>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stat({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-lg bg-white/5 p-2.5">
      <Icon size={12} className={`mx-auto mb-1 ${tone}`} />
      <div className={`font-mono text-xs font-semibold ${tone}`}>{value}</div>
      <div className="text-[9px] text-gray-500 mt-0.5 uppercase tracking-wider">{label}</div>
    </div>
  );
}
