import React, { useEffect, useState } from "react";
import { useLang } from "@/context/LanguageContext";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, Menu, X } from "lucide-react";
import VersionSwitcher from "@/components/VersionSwitcher";

const NAV_ITEMS = [
  { id: "home", href: "#home" },
  { id: "ea", href: "#ea" },
  { id: "indicators", href: "#indicators" },
  { id: "platform", href: "#platform" },
  { id: "tutorials", href: "#tutorials" },
  { id: "about", href: "#about" },
];

export default function Header() {
  const { lang, setLang, t } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const jump = (href) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header
      data-testid="site-header"
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled ? "glass-strong border-b border-white/10" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 md:h-20 flex items-center justify-between">
        <button
          onClick={() => jump("#home")}
          data-testid="logo-button"
          className="flex items-center gap-3 group"
        >
          <div className="relative w-9 h-9 rounded-md overflow-hidden bg-black/20 flex items-center justify-center">
            <img src="/img/brand-logo.png" alt="无限量化" className="w-full h-full object-contain" draggable={false} />
            <span className="absolute inset-0 ring-1 ring-white/15 rounded-md" />
          </div>
          <div className="leading-tight text-left">
            <div className="font-display font-bold text-white text-base tracking-tight">无限量化</div>
            <div className="font-mono text-[10px] tracking-[0.25em] text-cyan2 uppercase">MetaTrader</div>
          </div>
        </button>

        <nav className="hidden lg:flex items-center gap-8">
          {NAV_ITEMS.map((it) => (
            <button
              key={it.id}
              data-testid={`nav-${it.id}`}
              onClick={() => jump(it.href)}
              className="text-sm text-gray-300 hover:text-white transition-colors relative group"
            >
              {t.nav[it.id]}
              <span className="absolute left-0 -bottom-1 h-px w-0 bg-cyan2 transition-all group-hover:w-full" />
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden md:block">
            <VersionSwitcher dark />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                data-testid="lang-toggle"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/15 hover:border-cyan2/60 text-xs font-mono uppercase tracking-widest transition-colors"
              >
                <Globe size={14} />
                {lang === "zh" ? "中文" : "EN"}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-obsidian-800 border-white/10">
              <DropdownMenuItem data-testid="lang-zh" onClick={() => setLang("zh")}>中文 简体</DropdownMenuItem>
              <DropdownMenuItem data-testid="lang-en" onClick={() => setLang("en")}>English</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={() => jump("#platform")}
            data-testid="open-account-cta"
            className="hidden md:inline-flex items-center px-4 py-2 rounded-full bg-gold hover:bg-gold-300 text-black text-sm font-semibold transition-transform hover:-translate-y-0.5"
          >
            {t.nav.openAccount}
          </button>

          <button
            className="lg:hidden p-2 text-white"
            onClick={() => setMobileOpen((v) => !v)}
            data-testid="mobile-menu-toggle"
            aria-label="menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden glass-strong border-t border-white/10">
          <div className="px-6 py-4 flex flex-col gap-3">
            {NAV_ITEMS.map((it) => (
              <button
                key={it.id}
                data-testid={`mobile-nav-${it.id}`}
                onClick={() => jump(it.href)}
                className="text-left text-gray-200 py-1.5 border-b border-white/5"
              >
                {t.nav[it.id]}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
