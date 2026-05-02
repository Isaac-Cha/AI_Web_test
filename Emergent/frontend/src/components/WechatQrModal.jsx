import React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useLang } from "@/context/LanguageContext";

export default function WechatQrModal({ open, onOpenChange, title, description }) {
  const { lang } = useLang();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="wechat-qr-modal"
        className="bg-obsidian-800 border-white/10 max-w-sm"
      >
        <DialogHeader>
          <DialogTitle className="text-white font-display text-xl">
            {title || (lang === "zh" ? "微信扫码联系" : "Scan WeChat")}
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-sm">
            {description || (lang === "zh"
              ? "扫码添加我们的顾问，获取专属合作方案。"
              : "Scan to reach our advisor for a tailored plan.")}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-3 rounded-2xl bg-white p-4">
          <img
            src="/img/wechat-qr.svg"
            alt="WeChat QR"
            className="w-full aspect-square object-contain"
          />
        </div>
        <div className="text-center font-mono text-[11px] tracking-widest text-gray-500 uppercase mt-1">
          24H · REPLY
        </div>
      </DialogContent>
    </Dialog>
  );
}
