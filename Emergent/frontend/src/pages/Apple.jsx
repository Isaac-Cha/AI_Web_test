import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useLang } from "@/context/LanguageContext";
import VersionSwitcher, { useHref } from "@/components/VersionSwitcher";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Globe, ArrowRight, ChevronRight, Plus } from "lucide-react";
import { API } from "@/lib/api";

const BLUE = "#0071E3";

const sf = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Arial, sans-serif";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 0.9, 0.3, 1] } },
};

/* ---------------- Nav ---------------- */
function AppleNav() {
  const { lang, setLang } = useLang();
  const items = [
    { id: "home", label: lang === "zh" ? "首页" : "Home" },
    { id: "ea", label: lang === "zh" ? "EA 策略" : "EAs" },
    { id: "indicators", label: lang === "zh" ? "指标" : "Indicators" },
    { id: "platform", label: lang === "zh" ? "CG 平台" : "CG" },
    { id: "tutorials", label: lang === "zh" ? "教学" : "Learn" },
    { id: "about", label: lang === "zh" ? "加入" : "Join" },
  ];
  const jump = (id) => {
    if (id === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <header
      className="fixed top-0 inset-x-0 z-40 backdrop-blur-xl bg-white/80 border-b border-black/5"
      data-testid="apple-nav"
      style={{ fontFamily: sf }}
    >
      <div className="max-w-[1100px] mx-auto h-14 px-6 flex items-center justify-between text-[13px] text-black">
        <button
          onClick={() => jump("home")}
          data-testid="apple-logo"
          className="flex items-center gap-2 group"
        >
          <span className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white font-black text-lg">∞</span>
          <span className="font-semibold tracking-tight text-black">无限量化</span>
        </button>
        <nav className="hidden md:flex items-center gap-6">
          {items.map((it) => (
            <button
              key={it.id}
              data-testid={`apple-nav-${it.id}`}
              onClick={() => jump(it.id)}
              className="text-black/80 hover:text-black transition-colors"
            >
              {it.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <VersionSwitcher />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-black/70 hover:text-black px-2 py-1 text-[11px] flex items-center gap-1">
                <Globe size={13} /> {lang === "zh" ? "中文" : "EN"}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLang("zh")}>中文</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLang("en")}>English</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

/* ---------------- Hero ---------------- */
function AppleHero() {
  const { lang } = useLang();
  return (
    <section className="pt-24 pb-10 text-center" style={{ fontFamily: sf }}>
      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}
        className="text-[14px] font-medium mb-4"
        style={{ color: BLUE }}
      >
        {lang === "zh" ? "新一代 量化交易" : "New · Quant Trading"}
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 0.9, 0.3, 1] }}
        className="font-semibold tracking-tight text-black"
        style={{ fontSize: "clamp(44px, 7vw, 80px)", letterSpacing: "-0.03em", lineHeight: 1.02 }}
      >
        {lang === "zh" ? "无限量化" : "Infinite Quant"}
      </motion.h1>
      <motion.h2
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.1 }}
        className="mt-2 font-semibold tracking-tight text-black/70"
        style={{ fontSize: "clamp(30px, 4.5vw, 52px)", letterSpacing: "-0.02em", lineHeight: 1.05 }}
      >
        {lang === "zh" ? "重塑交易，自动交易" : "Reshape Trading · Automate everything"}
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.25 }}
        className="mt-6 text-[19px] text-black/70 max-w-xl mx-auto px-6 leading-relaxed"
      >
        {lang === "zh"
          ? "顶级 EA 策略、MT4 / MT5 指标与 CG 合作平台，专为专业交易者打造。"
          : "Pro-grade EAs, MT4/MT5 indicators and partner broker support — crafted for serious traders."}
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.35 }}
        className="mt-7 flex items-center justify-center gap-6 text-[17px] font-medium"
      >
        <a href="#ea" data-testid="apple-cta-primary" className="inline-flex items-center gap-1 hover:underline" style={{ color: BLUE }}>
          {lang === "zh" ? "了解 EA 策略" : "Explore EAs"} <ChevronRight size={16} />
        </a>
        <button
          type="button"
          data-testid="apple-cta-secondary"
          onClick={() => window.dispatchEvent(new Event("open-wechat-panel"))}
          className="inline-flex items-center gap-1 hover:underline"
          style={{ color: BLUE }}
        >
          {lang === "zh" ? "咨询合作" : "Contact"} <ChevronRight size={16} />
        </button>
      </motion.div>
    </section>
  );
}

/* ---------------- Tile primitive ---------------- */
function Tile({ children, dark = false, className = "", testId }) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      data-testid={testId}
      className={`relative overflow-hidden rounded-[28px] ${
        dark ? "bg-[#1D1D1F] text-white" : "bg-[#F5F5F7] text-black"
      } ${className}`}
      style={{ fontFamily: sf }}
    >
      {children}
    </motion.div>
  );
}

/* ---------------- EA Bento ---------------- */
function EABento() {
  const { lang, t } = useLang();
  const href = useHref();
  const [eas, setEas] = useState([]);
  useEffect(() => {
    axios.get(`${API}/eas`).then((r) => setEas(r.data)).catch(() => {});
  }, []);
  const [big, ...rest] = eas;
  return (
    <section id="ea" className="max-w-[1024px] mx-auto px-5 mt-8">
      <div className="flex items-end justify-between mb-6 px-1" style={{ fontFamily: sf }}>
        <div>
          <div className="text-[12px] font-semibold tracking-widest uppercase" style={{ color: BLUE }}>EA · STRATEGIES</div>
          <h2 className="mt-2 font-semibold tracking-tight text-black text-[24px] md:text-[32px]" style={{ letterSpacing: "-0.02em" }}>
            {lang === "zh" ? "EA 策略矩阵" : "EA Strategy Matrix"}
          </h2>
        </div>
        <Link to={href("/ea")} data-testid="apple-view-all-ea" className="inline-flex items-center gap-1 text-[15px] font-medium shrink-0" style={{ color: BLUE }}>
          {t.ea.viewAll} <ChevronRight size={15} />
        </Link>
      </div>
      <div className="grid grid-cols-6 gap-4">
        {big && (
          <Tile dark className="col-span-6 p-10 md:p-14 min-h-[460px] flex flex-col justify-between relative" testId={`apple-ea-big-${big.id}`}>
            <Link to={href(`/ea/${big.id}`)} className="absolute inset-0 z-10" aria-label={big.name_en} />
            <div className="relative">
              <div className="text-[13px] font-semibold tracking-widest uppercase opacity-70" style={{ color: BLUE }}>
                {lang === "zh" ? "旗舰策略" : "Flagship strategy"}
              </div>
              <h3 className="mt-3 font-semibold tracking-tight" style={{ fontSize: "clamp(32px, 4vw, 52px)", letterSpacing: "-0.02em", lineHeight: 1.08 }}>
                {lang === "zh" ? big.name_zh : big.name_en}
              </h3>
              <p className="mt-4 text-[17px] text-white/80 max-w-xl leading-relaxed">
                {lang === "zh" ? big.strategy_zh : big.strategy_en}
              </p>
            </div>
            <div className="relative flex items-end justify-between gap-4 mt-10">
              <div className="grid grid-cols-3 gap-6 max-w-md">
                <Stat v={big.profit_monthly} l={lang === "zh" ? "月化" : "Monthly"} />
                <Stat v={big.max_drawdown} l={lang === "zh" ? "最大回撤" : "Max DD"} />
                <Stat v={big.min_capital} l={lang === "zh" ? "建议资金" : "Capital"} />
              </div>
              <span className="inline-flex items-center gap-1 text-[15px] font-medium shrink-0" style={{ color: BLUE }}>
                {t.ea.cta} <ChevronRight size={15} />
              </span>
            </div>
          </Tile>
        )}
        {rest.map((ea, i) => (
          <Tile
            key={ea.id}
            className="col-span-6 md:col-span-2 p-8 min-h-[360px] flex flex-col justify-between relative"
            dark={i === 1}
            testId={`apple-ea-${ea.id}`}
          >
            <Link to={href(`/ea/${ea.id}`)} className="absolute inset-0 z-10" aria-label={ea.name_en} />
            <div>
              <div className="text-[12px] font-semibold tracking-widest uppercase" style={{ color: BLUE }}>
                {ea.symbol}
              </div>
              <h4 className="mt-2 font-semibold tracking-tight text-[26px]" style={{ letterSpacing: "-0.02em" }}>
                {lang === "zh" ? ea.name_zh : ea.name_en}
              </h4>
              <p className={`mt-3 text-[15px] leading-relaxed ${i === 1 ? "text-white/75" : "text-black/65"}`}>
                {lang === "zh" ? ea.strategy_zh : ea.strategy_en}
              </p>
            </div>
            <div className="mt-6 flex items-baseline justify-between">
              <div>
                <div className="font-semibold text-[28px]" style={{ color: i === 1 ? "#fff" : BLUE }}>
                  {ea.profit_monthly}
                </div>
                <div className={`text-[12px] ${i === 1 ? "text-white/60" : "text-black/55"}`}>
                  {lang === "zh" ? "月化收益" : "Monthly return"}
                </div>
              </div>
              <span className={`text-[14px] font-medium inline-flex items-center gap-0.5`} style={{ color: i === 1 ? "#fff" : BLUE }}>
                {t.ea.cta} <ChevronRight size={14} />
              </span>
            </div>
          </Tile>
        ))}
      </div>
    </section>
  );
}

function Stat({ v, l }) {
  return (
    <div>
      <div className="font-semibold text-[28px]" style={{ color: BLUE, letterSpacing: "-0.01em" }}>{v}</div>
      <div className="text-[12px] text-white/60 mt-1">{l}</div>
    </div>
  );
}

/* ---------------- Indicators Bento ---------------- */
function IndicatorsBento() {
  const { lang, t } = useLang();
  const href = useHref();
  const [items, setItems] = useState([]);
  useEffect(() => {
    axios.get(`${API}/indicators`).then((r) => setItems(r.data)).catch(() => {});
  }, []);
  return (
    <section id="indicators" className="max-w-[1024px] mx-auto px-5 mt-4">
      <div className="text-center my-12 relative" style={{ fontFamily: sf }}>
        <div className="text-[13px] font-semibold tracking-widest uppercase" style={{ color: BLUE }}>Indicators</div>
        <h2 className="mt-3 font-semibold tracking-tight text-black" style={{ fontSize: "clamp(34px, 4.6vw, 56px)", letterSpacing: "-0.02em", lineHeight: 1.05 }}>
          {lang === "zh" ? "为 MT4 / MT5 精心打磨" : "Crafted for MT4 & MT5"}
        </h2>
        <Link to={href("/indicators")} data-testid="apple-view-all-indicators" className="mt-4 inline-flex items-center gap-1 text-[15px] font-medium" style={{ color: BLUE }}>
          {t.indicators.viewAll} <ChevronRight size={15} />
        </Link>
      </div>
      <div className="grid grid-cols-6 gap-4">
        {items.map((it, i) => (
          <Tile
            key={it.id}
            className="col-span-6 sm:col-span-3 md:col-span-2 p-7 min-h-[220px] flex flex-col justify-between relative"
            dark={i === 2}
            testId={`apple-indicator-${it.id}`}
          >
            <Link to={href(`/indicator/${it.id}`)} className="absolute inset-0 z-10" aria-label={it.name_en} />
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[12px] font-semibold tracking-widest uppercase" style={{ color: BLUE }}>MT4 / MT5</div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${i === 2 ? "bg-white/15 text-white" : "bg-black/10 text-black/70"}`}>
                  {lang === "zh" ? it.category_zh : it.category_en}
                </span>
              </div>
              <h4 className="mt-2 font-semibold tracking-tight text-[22px]" style={{ letterSpacing: "-0.01em" }}>
                {lang === "zh" ? it.name_zh : it.name_en}
              </h4>
            </div>
            <p className={`text-[14px] leading-relaxed ${i === 2 ? "text-white/75" : "text-black/65"}`}>
              {lang === "zh" ? it.desc_zh : it.desc_en}
            </p>
            <span className={`mt-3 text-[13px] font-medium inline-flex items-center gap-0.5`} style={{ color: i === 2 ? "#fff" : BLUE }}>
              {t.indicators.cta} <ChevronRight size={13} />
            </span>
          </Tile>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Broker (dark hero strip) ---------------- */
function AppleBroker() {
  const { lang, t } = useLang();
  return (
    <section id="platform" className="max-w-[1024px] mx-auto px-5 mt-4">
      <Tile dark className="p-10 md:p-16" testId="apple-broker-tile">
        <div>
          <div className="text-[13px] font-semibold tracking-widest uppercase" style={{ color: BLUE }}>
            Partner Broker
          </div>
          <h2 className="mt-3 font-semibold tracking-tight" style={{ fontSize: "clamp(32px, 4.4vw, 54px)", letterSpacing: "-0.02em", lineHeight: 1.05 }}>
            {lang === "zh" ? "CG 平台，" : "CG Broker,"}
            <br />
            {lang === "zh" ? "专业级交易通道" : "built for pros"}
          </h2>
          <p className="mt-5 text-[17px] text-white/75 leading-relaxed max-w-md">
            {t.broker.desc}
          </p>
          <div className="mt-6 flex items-center gap-6 text-[15px]">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("open-wechat-panel"))}
              className="hover:underline inline-flex items-center gap-1"
              style={{ color: BLUE }}
            >
              {lang === "zh" ? "咨询合作" : "Contact"} <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </Tile>
    </section>
  );
}

/* ---------------- Tutorials ---------------- */
function AppleTutorials() {
  const { lang, t } = useLang();
  const href = useHref();
  const [items, setItems] = useState([]);
  useEffect(() => {
    axios.get(`${API}/tutorials`).then((r) => setItems(r.data)).catch(() => {});
  }, []);
  return (
    <section id="tutorials" className="max-w-[1024px] mx-auto px-5 mt-4">
      <div className="text-center my-12" style={{ fontFamily: sf }}>
        <div className="text-[13px] font-semibold tracking-widest uppercase" style={{ color: BLUE }}>Learn</div>
        <h2 className="mt-3 font-semibold tracking-tight text-black" style={{ fontSize: "clamp(34px, 4.6vw, 56px)", letterSpacing: "-0.02em", lineHeight: 1.05 }}>
          {lang === "zh" ? "从 0 到 1" : "From zero to one"}
        </h2>
        <Link to={href("/tutorials")} data-testid="apple-view-all-tutorials" className="mt-4 inline-flex items-center gap-1 text-[15px] font-medium" style={{ color: BLUE }}>
          {t.tutorials.viewAll} <ChevronRight size={15} />
        </Link>
      </div>
      <div className="grid grid-cols-6 gap-4">
        {items.map((it, i) => (
          <Tile
            key={it.id}
            className="col-span-6 md:col-span-3 p-8 min-h-[200px] flex items-center justify-between"
            dark={i % 2 === 1}
            testId={`apple-tutorial-${it.id}`}
          >
            <div>
              <div className="text-[12px] font-semibold tracking-widest uppercase" style={{ color: BLUE }}>
                {lang === "zh" ? it.cloud_zh : it.cloud_en}
              </div>
              <h4 className="mt-2 font-semibold tracking-tight text-[22px]" style={{ letterSpacing: "-0.01em" }}>
                {lang === "zh" ? it.title_zh : it.title_en}
              </h4>
            </div>
            <a href={it.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[15px] font-medium shrink-0" style={{ color: BLUE }}>
              {lang === "zh" ? "查看" : "Watch"} <ArrowRight size={15} />
            </a>
          </Tile>
        ))}
      </div>
    </section>
  );
}

/* ---------------- About + Form ---------------- */
function AppleAbout() {
  const { lang, t } = useLang();
  const [form, setForm] = useState({ name: "", contact: "", email: "", message: "" });
  const [sub, setSub] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.contact.trim()) {
      toast.error(t.toast.error);
      return;
    }
    setSub(true);
    try {
      await axios.post(`${API}/submissions`, { kind: "join", ...form });
      toast.success(t.toast.success);
      setForm({ name: "", contact: "", email: "", message: "" });
    } catch (err) {
      toast.error(t.toast.error);
    } finally {
      setSub(false);
    }
  };

  return (
    <section id="about" className="max-w-[1024px] mx-auto px-5 mt-4 mb-24" style={{ fontFamily: sf }}>
      <div className="text-center my-12">
        <div className="text-[13px] font-semibold tracking-widest uppercase" style={{ color: BLUE }}>Join</div>
        <h2 className="mt-3 font-semibold tracking-tight text-black" style={{ fontSize: "clamp(34px, 4.6vw, 56px)", letterSpacing: "-0.02em", lineHeight: 1.05 }}>
          {lang === "zh" ? "与我们共建" : "Build with us"}
        </h2>
        <p className="mt-4 text-[18px] text-black/65 max-w-xl mx-auto leading-relaxed">
          {t.about.subtitle}
        </p>
      </div>
      <Tile className="p-8 md:p-12" testId="apple-join-form">
        <form onSubmit={submit} className="grid md:grid-cols-2 gap-5 max-w-2xl mx-auto">
          <div className="md:col-span-1">
            <label className="text-[12px] text-black/60 font-medium">{t.about.name}</label>
            <Input
              data-testid="apple-form-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-2 bg-white border-black/10 rounded-xl h-11 text-black"
            />
          </div>
          <div className="md:col-span-1">
            <label className="text-[12px] text-black/60 font-medium">{t.about.contact}</label>
            <Input
              data-testid="apple-form-contact"
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              className="mt-2 bg-white border-black/10 rounded-xl h-11 text-black"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-[12px] text-black/60 font-medium">{t.about.email}</label>
            <Input
              data-testid="apple-form-email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-2 bg-white border-black/10 rounded-xl h-11 text-black"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-[12px] text-black/60 font-medium">{t.about.message}</label>
            <Textarea
              data-testid="apple-form-message"
              rows={4}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="mt-2 bg-white border-black/10 rounded-xl text-black"
            />
          </div>
          <div className="md:col-span-2 flex justify-center pt-2">
            <button
              disabled={sub}
              data-testid="apple-form-submit"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-[15px] font-medium disabled:opacity-60"
              style={{ background: BLUE }}
            >
              <Plus size={15} />
              {sub ? t.about.submitting : t.about.submit}
            </button>
          </div>
        </form>
      </Tile>
    </section>
  );
}

/* ---------------- Footer ---------------- */
function AppleFooter() {
  const { t } = useLang();
  return (
    <footer className="bg-[#F5F5F7] border-t border-black/5 py-12 text-[12px] text-black/60" style={{ fontFamily: sf }}>
      <div className="max-w-[1024px] mx-auto px-5">
        <p className="leading-relaxed max-w-3xl">{t.footer.disclaimer}</p>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-black/45">
          <div>© {new Date().getFullYear()} 无限量化 MetaTrader · {t.footer.rights}</div>
          <div className="flex gap-4">
            <Link to="/">Sci-Fi</Link>
            <Link to="/apple">Apple</Link>
            <Link to="/hybrid">Hybrid</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ---------------- Page ---------------- */
export default function Apple() {
  return (
    <div
      className="bg-[#FBFBFD] min-h-screen text-black animate-fade-in-page"
      data-testid="apple-page"
      style={{ fontFamily: sf }}
    >
      <AppleNav />
      <main className="pt-12">
        <AppleHero />
        <EABento />
        <IndicatorsBento />
        <AppleBroker />
        <AppleTutorials />
        <AppleAbout />
      </main>
      <AppleFooter />
    </div>
  );
}
