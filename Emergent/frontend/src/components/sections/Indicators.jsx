import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useLang } from "@/context/LanguageContext";
import { useHref } from "@/components/VersionSwitcher";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Indicators() {
  const { lang, t } = useLang();
  const href = useHref();
  const [items, setItems] = useState([]);

  useEffect(() => {
    axios.get(`${API}/indicators`).then((r) => setItems(r.data)).catch(() => {});
  }, []);

  return (
    <section id="indicators" data-testid="indicators-section" className="relative py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="max-w-3xl mb-14 flex items-end justify-between gap-6">
          <div>
            <div className="section-label mb-3">{t.indicators.label}</div>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
              <span className="text-white">{t.indicators.title}</span>
            </h2>
            <p className="mt-4 text-gray-400">{t.indicators.subtitle}</p>
          </div>
          <Link
            to={href("/indicators")}
            data-testid="indicators-view-all"
            className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-cyan2/40 text-cyan2 hover:bg-cyan2/10 text-sm font-medium shrink-0 whitespace-nowrap"
          >
            {t.indicators.viewAll} <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((it, i) => (
            <motion.div
              key={it.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: (i % 3) * 0.08 }}
              className="glass rounded-2xl p-6 ring-cyan-hover transition-all relative overflow-hidden group"
              data-testid={`indicator-card-${it.id}`}
            >
              <div className="absolute -top-10 -left-10 w-28 h-28 rounded-full bg-cyan2/10 blur-2xl group-hover:bg-cyan2/20 transition-colors" />
              <div className="relative flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-cyan2/15 text-cyan2 flex items-center justify-center">
                    <Sparkles size={18} />
                  </div>
                  <span
                    data-testid={`indicator-category-${it.id}`}
                    className="px-2.5 py-1 rounded-full border border-cyan2/30 bg-cyan2/5 text-[10px] font-mono tracking-[0.2em] uppercase text-cyan2"
                  >
                    {lang === "zh" ? it.category_zh : it.category_en}
                  </span>
                </div>
                <div className="section-label mb-1.5">MT4 / MT5</div>
                <h3 className="font-display text-lg font-bold text-white">
                  {lang === "zh" ? it.name_zh : it.name_en}
                </h3>
                <p className="mt-2 text-sm text-gray-400 leading-relaxed flex-1">
                  {lang === "zh" ? it.desc_zh : it.desc_en}
                </p>
                <Link
                  to={href(`/indicator/${it.id}`)}
                  data-testid={`indicator-detail-${it.id}`}
                  className="mt-4 pt-4 border-t border-white/10 text-sm text-cyan2 hover:text-cyan-300 font-semibold inline-flex items-center gap-1"
                >
                  {t.indicators.cta} <ArrowRight size={14} />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
