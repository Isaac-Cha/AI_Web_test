import React, { useState } from "react";
import axios from "axios";
import { useLang } from "@/context/LanguageContext";
import { motion } from "framer-motion";
import { Users, Rocket, LineChart, Server, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { API } from "@/lib/api";

const TEAM = [
  { name: "Alex Chen", role: "Head of Quant · 前投行交易员", tag: "Quant", color: "text-gold" },
  { name: "Luna Wu", role: "EA Architect · C++/MQL5", tag: "Engineering", color: "text-cyan2" },
  { name: "Ken Zhao", role: "Risk & Execution", tag: "Risk", color: "text-emerald-400" },
  { name: "Iris Lin", role: "Growth · Baidu & AI Search", tag: "Growth", color: "text-pink-300" },
];

const benefitIcons = [Rocket, LineChart, Users, Server];

export default function AboutJoin() {
  const { t } = useLang();
  const [form, setForm] = useState({ name: "", contact: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.contact.trim()) {
      toast.error(t.toast.error);
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/submissions`, {
        kind: "join",
        ...form,
      });
      toast.success(t.toast.success);
      setForm({ name: "", contact: "", email: "", message: "" });
    } catch (err) {
      toast.error(t.toast.error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="about" data-testid="about-section" className="relative py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="max-w-3xl mb-14">
          <div className="section-label mb-3">{t.about.label}</div>
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
            <span className="text-gradient-gold">{t.about.title}</span>
          </h2>
          <p className="mt-4 text-gray-400">{t.about.subtitle}</p>
        </div>

        {/* Benefits */}
        <div className="mb-16">
          <div className="font-display text-xl font-semibold mb-6">{t.about.benefitsTitle}</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {t.about.benefits.map((b, i) => {
              const Icon = benefitIcons[i];
              return (
                <motion.div
                  key={b.t}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.55, delay: i * 0.08 }}
                  className="glass rounded-2xl p-5 ring-cyan-hover transition-all"
                  data-testid={`benefit-${i}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-cyan2/15 text-cyan2 flex items-center justify-center mb-3">
                    <Icon size={18} />
                  </div>
                  <div className="font-display font-semibold">{b.t}</div>
                  <p className="mt-1.5 text-sm text-gray-400 leading-relaxed">{b.d}</p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Team */}
        <div className="mb-16">
          <div className="font-display text-xl font-semibold mb-6">{t.about.teamTitle}</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TEAM.map((m, i) => (
              <motion.div
                key={m.name}
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: false, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className="glass rounded-2xl p-6 ring-cyan-hover transition-all"
                data-testid={`team-member-${i}`}
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold-300 to-gold-700 flex items-center justify-center font-display font-black text-black text-xl mb-4">
                  {m.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                </div>
                <div className={`font-mono text-[10px] tracking-widest uppercase ${m.color}`}>{m.tag}</div>
                <div className="font-display text-base font-bold mt-1">{m.name}</div>
                <div className="text-xs text-gray-400 mt-1 leading-relaxed">{m.role}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5">
            <div className="sticky top-24">
              <div className="font-display text-2xl font-bold">{t.about.formTitle}</div>
              <p className="mt-3 text-gray-400 text-sm leading-relaxed">
                {t.about.subtitle}
              </p>
              <div className="mt-6 space-y-3">
                {["EA 开发者合作 · EA Developer", "资金方合作 · Capital Partner", "平台销售合作 · Broker Sales"].map((s) => (
                  <div key={s} className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan2" /> {s}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <form
            onSubmit={submit}
            className="lg:col-span-7 glass rounded-2xl p-6 md:p-8 space-y-4"
            data-testid="join-form"
          >
            <div className="section-label">{t.about.contactTitle}</div>
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label={t.about.name}>
                <Input
                  data-testid="form-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-white/5 border-white/10 focus-visible:border-cyan2/60"
                />
              </FormField>
              <FormField label={t.about.contact}>
                <Input
                  data-testid="form-contact"
                  value={form.contact}
                  onChange={(e) => setForm({ ...form, contact: e.target.value })}
                  className="bg-white/5 border-white/10 focus-visible:border-cyan2/60"
                />
              </FormField>
            </div>
            <FormField label={t.about.email}>
              <Input
                data-testid="form-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-white/5 border-white/10 focus-visible:border-cyan2/60"
              />
            </FormField>
            <FormField label={t.about.message}>
              <Textarea
                data-testid="form-message"
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="bg-white/5 border-white/10 focus-visible:border-cyan2/60"
              />
            </FormField>
            <Button
              type="submit"
              disabled={submitting}
              data-testid="form-submit"
              className="w-full bg-gold hover:bg-gold-300 text-black font-semibold rounded-full h-11"
            >
              <Send size={16} className="mr-2" />
              {submitting ? t.about.submitting : t.about.submit}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}

function FormField({ label, children }) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] text-gray-400 tracking-widest uppercase mb-1.5 inline-block">{label}</span>
      {children}
    </label>
  );
}
