import { AnimatePresence, motion } from 'framer-motion'
import { QrCode } from 'lucide-react'
import { useMemo, useState } from 'react'

export default function WeChatFloat() {
  const [open, setOpen] = useState(false)
  const spring = useMemo(
    () => ({ type: 'spring' as const, stiffness: 260, damping: 28, mass: 0.9 }),
    [],
  )

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <div className="relative">
        <AnimatePresence>
          {open ? (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={spring}
              className="absolute bottom-14 right-0 w-[260px] rounded-2xl border border-white/12 bg-white/8 p-3 backdrop-blur-xl"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm text-white/90">微信扫码联系</div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-2 py-1 text-xs text-white/70 hover:bg-white/10 hover:text-white"
                >
                  关闭
                </button>
              </div>
              <div className="mt-3 overflow-hidden rounded-xl bg-black/20 p-2">
                <img
                  src="/img/qr/wechat.png"
                  alt="WeChat QR"
                  className="h-auto w-full select-none rounded-lg"
                  draggable={false}
                />
                <div className="mt-3 text-center text-xs text-white/55">
                  扫一扫上面的二维码图案，加我为朋友。
                </div>
              </div>
              <div className="mt-2 text-xs text-white/60">建议先在“关于/加入”页留下需求，再微信对接。</div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={() => setOpen((v) => !v)}
          whileTap={{ scale: 0.98 }}
          transition={spring}
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl hover:bg-white/14"
          aria-label="Open WeChat QR"
        >
          <QrCode className="h-5 w-5" />
        </motion.button>
      </div>
    </div>
  )
}

