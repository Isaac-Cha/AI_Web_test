import React from "react";
import { useLang } from "@/context/LanguageContext";
import StarField from "@/components/StarField";
import { ChevronDown, MessageCircle, Zap } from "lucide-react";
import { motion } from "framer-motion";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
};
const item = {
  hidden: { opacity: 0, y: 22, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: [0.22, 0.9, 0.3, 1] } },
};

export default function Hero() {
  const { t } = useLang();
  const lines = [
    { zh: t.hero.title1, en: "QUANTITATIVE", num: "01", tone: "gold" },
    { zh: t.hero.title2, en: "RESHAPE · TRADING", num: "02", tone: "white" },
    { zh: t.hero.title3, en: "AUTO-TRADE", num: "03", tone: "cyan" },
  ];

  return (
    <section
      id="home"
      data-testid="hero-section"
      className="relative min-h-screen w-full overflow-hidden"
    >
      <div className="absolute inset-0">
        <StarField />
      </div>
      <div className="absolute inset-0 grid-lines opacity-30 pointer-events-none" />

      {/* giant ∞ background symbol */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none flex items-center justify-center select-none"
      >
        <motion.span
          initial={{ opacity: 0, scale: 0.8, rotate: -6 }}
          animate={{ opacity: 0.07, scale: 1, rotate: 0 }}
          transition={{ duration: 1.6, ease: [0.2, 0.8, 0.2, 1] }}
          className="font-display font-black text-white leading-none"
          style={{ fontSize: "clamp(340px, 60vw, 820px)" }}
        >
          ∞
        </motion.span>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-obsidian-900 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-36 md:pt-44 pb-28">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="section-label mb-10"
        >
          {t.hero.tagline}
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-8">
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
              className="space-y-2 md:space-y-3"
              data-testid="hero-title"
            >
              {lines.map((l, i) => (
                <motion.div
                  key={l.zh}
                  variants={item}
                  className="relative flex items-end gap-4 md:gap-6"
                  style={{ paddingLeft: `${i * 28}px` }}
                >
                  {/* numeric prefix */}
                  <span className="font-mono text-[11px] md:text-xs tracking-[0.35em] text-gray-500 pb-3">
                    {l.num}
                  </span>

                  {/* main zh line */}
                  <span
                    className={`font-display font-black tracking-tighter leading-[0.95] text-5xl md:text-6xl lg:text-7xl ${
                      l.tone === "gold"
                        ? "text-gradient-gold"
                        : l.tone === "cyan"
                          ? "text-gradient-cyan"
                          : "text-white"
                    }`}
                  >
                    {l.zh}
                  </span>

                  {/* EN overlay small pill */}
                  <span className="hidden md:inline-flex items-center gap-2 pb-3">
                    <span className="h-px w-8 bg-white/20" />
                    <span className="font-mono text-[10px] tracking-[0.3em] text-gray-400 uppercase">
                      {l.en}
                    </span>
                  </span>
                </motion.div>
              ))}
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="mt-10 text-base md:text-lg text-gray-300 max-w-2xl leading-relaxed"
            >
              {t.hero.subtitle}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.85 }}
              className="mt-10 flex flex-wrap gap-4"
            >
              <button
                type="button"
                data-testid="hero-cta-open-account"
                onClick={() => window.dispatchEvent(new Event("open-wechat-panel"))}
                className="group inline-flex items-center gap-2 px-6 py-3.5 bg-gold hover:bg-gold-300 text-black font-semibold rounded-full transition-all hover:-translate-y-0.5 shadow-[0_12px_40px_-10px_rgba(245,158,11,0.6)]"
              >
                <MessageCircle size={18} />
                {t.hero.cta1}
              </button>
              <a
                href="#ea"
                data-testid="hero-cta-ea"
                className="inline-flex items-center gap-2 px-6 py-3.5 border border-cyan2/50 text-cyan2 hover:bg-cyan2/10 font-semibold rounded-full transition-all"
              >
                <Zap size={18} />
                {t.hero.cta2}
              </a>
            </motion.div>
          </div>

          <div className="lg:col-span-4" />
        </div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {t.hero.stats.map((s, i) => (
            <motion.div
              key={s.l}
              variants={item}
              className="glass rounded-xl p-5"
              data-testid={`hero-stat-${i}`}
            >
              <div className="font-mono text-2xl md:text-3xl text-gradient-gold font-bold">{s.v}</div>
              <div className="text-xs md:text-sm text-gray-400 mt-1">{s.l}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-gray-500 animate-bounce z-10">
        <ChevronDown size={22} />
      </div>
    </section>
  );
}
