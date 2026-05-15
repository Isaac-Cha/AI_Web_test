import React from "react";
import { useLang } from "@/context/LanguageContext";

export default function Footer() {
  const { t } = useLang();
  const year = new Date().getFullYear();
  return (
    <footer data-testid="site-footer" className="relative border-t border-white/10 py-14">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="grid md:grid-cols-12 gap-8">
          <div className="md:col-span-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-gradient-to-br from-gold-300 to-gold-700 flex items-center justify-center font-display font-black text-black">∞</div>
              <div>
                <div className="font-display font-bold">无限量化 MetaTrader</div>
                <div className="font-mono text-[10px] tracking-[0.25em] text-cyan2">QUANT · SYSTEM · AUTO</div>
              </div>
            </div>
            <p className="mt-5 text-sm text-gray-500 leading-relaxed max-w-md">
              {t.footer.disclaimer}
            </p>
          </div>
          <div className="md:col-span-3">
            <div className="section-label mb-4">Keywords</div>
            <div className="flex flex-wrap gap-2 text-xs">
              {["黄金", "量化", "自动交易", "MT4", "MT5", "EA", "COMEX", "XAUUSD"].map((k) => (
                <span key={k} className="px-2.5 py-1 rounded-full border border-white/10 text-gray-400">{k}</span>
              ))}
            </div>
          </div>
          <div className="md:col-span-4">
            <div className="section-label mb-4">Contact</div>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>WeChat · 右下浮窗扫码</li>
              <li>Email · contact@wxlh-mt.com</li>
              <li>Baidu SEO · 黄金 量化 MT4 MT5 EA</li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
          <div>© {year} 无限量化 MetaTrader · {t.footer.rights}</div>
          <div className="font-mono tracking-wider">Built with ♦ for professional traders</div>
        </div>
      </div>
    </footer>
  );
}
