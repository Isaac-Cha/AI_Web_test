import React from "react";
import { useLang } from "@/context/LanguageContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ShieldCheck, Gift, TrendingUp, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

const icons = [Gift, TrendingUp, ShieldCheck];

export default function CGBroker() {
  const { t } = useLang();
  return (
    <section id="platform" data-testid="cg-broker-section" className="relative py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
          <div>
            <div className="section-label mb-3">{t.broker.label}</div>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
              <span className="text-gradient-cyan">CG</span> <span className="text-white">· {t.broker.title}</span>
            </h2>
            <p className="mt-4 text-gray-400 max-w-2xl leading-relaxed">{t.broker.desc}</p>
          </div>
          <div className="glass rounded-xl px-5 py-3 flex items-center gap-3" data-testid="broker-logo-chip">
            <img src="/img/logo-CG.png" alt="CG" className="h-8" onError={(e)=>{e.currentTarget.style.display='none';}} />
            <span className="font-mono text-xs tracking-[0.2em] text-cyan2">PARTNER · LIVE</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Activities */}
          <div className="lg:col-span-7">
            <div className="mb-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="font-mono text-xs text-gray-500 tracking-widest">{t.broker.activities}</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {t.broker.activitiesList.map((a, i) => {
                const Icon = icons[i % icons.length];
                return (
                  <motion.div
                    key={a.t}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.6, delay: i * 0.08 }}
                    className="glass rounded-2xl p-6 ring-cyan-hover transition-all group"
                    data-testid={`activity-card-${i}`}
                  >
                    <div className="w-11 h-11 rounded-lg bg-gold/15 text-gold flex items-center justify-center mb-4 group-hover:bg-gold/25 transition-colors">
                      <Icon size={20} />
                    </div>
                    <div className="font-display font-semibold text-lg">{a.t}</div>
                    <p className="mt-2 text-sm text-gray-400 leading-relaxed">{a.d}</p>
                  </motion.div>
                );
              })}
              <div className="glass rounded-2xl p-6 sm:col-span-2 bg-gradient-to-br from-gold/5 to-cyan2/5" data-testid="broker-benefits-summary">
                <div className="section-label mb-2">WHY CG</div>
                <div className="font-display text-xl font-semibold">低延迟 · 深度流动性 · 稳定点差 · 全天候风控</div>
              </div>
            </div>

            {/* FAQ */}
            <div className="mt-10">
              <div className="mb-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="font-mono text-xs text-gray-500 tracking-widest">{t.broker.faq}</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>
              <Accordion type="single" collapsible className="glass rounded-2xl divide-y divide-white/10 px-2">
                {t.broker.faqs.map((f, i) => (
                  <motion.div
                    key={f.q}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.5, delay: i * 0.06 }}
                  >
                    <AccordionItem value={`faq-${i}`} className="border-b-0">
                      <AccordionTrigger data-testid={`faq-trigger-${i}`} className="px-4 text-left hover:text-cyan2">
                        <span className="text-sm md:text-base">{f.q}</span>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 text-gray-400 text-sm md:text-base">
                        {f.a}
                      </AccordionContent>
                    </AccordionItem>
                  </motion.div>
                ))}
              </Accordion>
            </div>
          </div>

          {/* QR */}
          <div className="lg:col-span-5">
            <div className="sticky top-24">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6 }}
                className="glass rounded-2xl p-5 border-white/10 ring-cyan-hover transition-all max-w-[280px] mx-auto"
                data-testid="broker-qr-card"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="section-label">{t.broker.scan}</div>
                    <div className="font-display text-base font-bold mt-1">CG · 新客开户直通</div>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_#10B981] animate-pulse" />
                </div>
                <div className="aspect-square rounded-xl bg-white p-3">
                  <img
                    src="/img/promotion-qr.png"
                    alt="开户二维码"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-1.5 text-center">
                  <div className="p-1.5 rounded-md bg-white/5">
                    <div className="font-mono text-cyan2 text-xs">MT4/5</div>
                    <div className="text-[9px] text-gray-500 mt-0.5">Platforms</div>
                  </div>
                  <div className="p-1.5 rounded-md bg-white/5">
                    <div className="font-mono text-gold text-xs">$100</div>
                    <div className="text-[9px] text-gray-500 mt-0.5">Min</div>
                  </div>
                  <div className="p-1.5 rounded-md bg-white/5">
                    <div className="font-mono text-white text-xs">24/7</div>
                    <div className="text-[9px] text-gray-500 mt-0.5">Support</div>
                  </div>
                </div>
                <a
                  href="https://www.cgfintech108.com/en"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="cg-visit-site-button"
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-gold-300 to-gold-700 text-black text-sm font-semibold hover:-translate-y-0.5 transition-transform"
                >
                  <ExternalLink size={14} />
                  {t.broker.visitSite}
                </a>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
