import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useLang } from "@/context/LanguageContext";
import { useHref } from "@/components/VersionSwitcher";
import { motion } from "framer-motion";
import { Cloud, ArrowUpRight, PlayCircle, ArrowRight } from "lucide-react";
import { API } from "@/lib/api";

export default function Tutorials() {
  const { lang, t } = useLang();
  const href = useHref();
  const [items, setItems] = useState([]);

  useEffect(() => {
    axios.get(`${API}/tutorials`).then((r) => setItems(r.data)).catch(() => {});
  }, []);

  return (
    <section id="tutorials" data-testid="tutorials-section" className="relative py-24 md:py-32 bg-obsidian-800/60">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="max-w-3xl mb-14 flex items-end justify-between gap-6">
          <div>
            <div className="section-label mb-3">{t.tutorials.label}</div>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-gradient-cyan">
              {t.tutorials.title}
            </h2>
            <p className="mt-4 text-gray-400">{t.tutorials.subtitle}</p>
          </div>
          <Link
            to={href("/tutorials")}
            data-testid="tutorials-view-all"
            className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-cyan2/40 text-cyan2 hover:bg-cyan2/10 text-sm font-medium shrink-0 whitespace-nowrap"
          >
            {t.tutorials.viewAll} <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {items.map((it, i) => (
            <motion.a
              key={it.id}
              href={it.url}
              target="_blank"
              rel="noreferrer"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: (i % 2) * 0.08 }}
              className="glass rounded-2xl p-6 ring-cyan-hover transition-all relative overflow-hidden group flex items-center justify-between gap-6"
              data-testid={`tutorial-card-${it.id}`}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gold/15 text-gold flex items-center justify-center shrink-0 group-hover:bg-gold/25 transition-colors">
                  <PlayCircle size={22} />
                </div>
                <div>
                  <div className="section-label mb-1.5">{lang === "zh" ? it.cloud_zh : it.cloud_en}</div>
                  <h3 className="font-display text-lg font-bold text-white">
                    {lang === "zh" ? it.title_zh : it.title_en}
                  </h3>
                  <div className="mt-2 text-xs text-cyan2 font-mono tracking-wider flex items-center gap-1.5">
                    <Cloud size={12} /> {t.tutorials.download}
                  </div>
                </div>
              </div>
              <ArrowUpRight size={22} className="text-gray-500 group-hover:text-cyan2 transition-colors" />
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
