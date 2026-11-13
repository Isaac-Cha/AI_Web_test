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

        {/* Form */}
        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5">
            <div className="sticky top-24">
              <div className="font-display text-2xl font-bold">{t.about.formTitle}</div>
              <p className="mt-3 text-gray-400 text-sm leading-relaxed">
                {t.about.subtitle}
              </p>
              <div className="mt-6 space-y-3">
                {["EA 研究与开发 · EA Research", "指标验证 · Indicator Review", "交易系统技术交流 · System Design"].map((s) => (
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
