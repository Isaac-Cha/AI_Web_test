import React, { useState } from "react";
import { MessageCircle, X } from "lucide-react";

export default function FloatingWechat() {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3" data-testid="floating-wechat">
      {open && (
        <div
          className="glass-strong rounded-2xl p-4 w-64 border-cyan2/40 shadow-[0_20px_60px_-10px_rgba(0,240,255,0.25)] animate-fade-up"
          data-testid="wechat-qr-panel"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="section-label">WeChat</div>
              <div className="text-white text-sm font-semibold">扫码添加顾问</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-white"
              aria-label="close"
              data-testid="close-wechat-panel"
            >
              <X size={16} />
            </button>
          </div>
          <div className="aspect-square rounded-xl bg-white p-3 flex items-center justify-center">
            <img
              src="/img/wechat-qr.png"
              alt="WeChat QR"
              className="w-full h-full object-contain"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          </div>
          <div className="mt-3 text-[11px] text-gray-400 font-mono text-center tracking-wider">
            WeChat · 24h 回复
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        data-testid="toggle-wechat-button"
        className="relative w-14 h-14 rounded-full bg-gradient-to-br from-cyan2 to-[#0EA5E9] text-black flex items-center justify-center shadow-[0_10px_40px_-10px_rgba(0,240,255,0.6)] hover:scale-105 transition-transform pulse-ring"
        aria-label="Contact via WeChat"
      >
        <MessageCircle size={22} />
      </button>
    </div>
  );
}
