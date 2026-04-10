import { motion } from 'framer-motion'

import Starfield from '@/components/Starfield'
import WeChatFloat from '@/components/WeChatFloat'

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050816] text-white">
      <Starfield />

      <div className="absolute inset-0 bg-[radial-gradient(800px_520px_at_20%_10%,rgba(66,165,245,0.16),transparent_65%),radial-gradient(700px_560px_at_78%_30%,rgba(0,229,255,0.12),transparent_60%),radial-gradient(820px_560px_at_60%_92%,rgba(211,68,255,0.10),transparent_55%)]" />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <img src="/img/brand/logo.png" alt="无限量化" className="h-9 w-auto" draggable={false} />
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-wide">无限量化</div>
            <div className="text-xs text-white/60">MetaTrader · Quant</div>
          </div>
        </div>
        <nav className="hidden items-center gap-6 text-sm text-white/70 md:flex">
          <a className="hover:text-white" href="#platform">合作平台</a>
          <a className="hover:text-white" href="#ea">EA 列表</a>
          <a className="hover:text-white" href="#metrics">指标列表</a>
          <a className="hover:text-white" href="#learn">教学</a>
          <a className="hover:text-white" href="#about">关于/加入</a>
        </nav>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-20 pt-8">
        <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/70 backdrop-blur-xl">
              <span className="h-2 w-2 rounded-full bg-emerald-300/80" />
              合作平台 · EA · 指标 · 教学
            </div>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight md:text-5xl">
              面向外汇交易者的
              <span className="block bg-gradient-to-r from-cyan-200 via-white to-fuchsia-200 bg-clip-text text-transparent">
                量化工具与合作生态
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/70">
              展示合作平台理念与规则，提供 EA/指标的图文说明与教学入口。全站科技风，动效克制但写实，强调信息可读性与可信度。
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#platform"
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-[0_18px_45px_rgba(0,0,0,0.35)] hover:bg-white/95"
              >
                查看合作平台
              </a>
              <a
                href="#ea"
                className="rounded-xl border border-white/15 bg-white/6 px-4 py-2.5 text-sm font-semibold text-white/90 backdrop-blur-xl hover:bg-white/10"
              >
                浏览 EA 列表
              </a>
            </div>
          </div>

          <div className="relative">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 110, damping: 22, mass: 1.1 }}
              className="rounded-3xl border border-white/12 bg-white/6 p-6 backdrop-blur-xl"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-white/90">合作平台 · CG</div>
                <div className="text-xs text-white/55">开户链接</div>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-[1fr_140px] md:items-center">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src="/img/partners/logo-CG.png"
                      alt="CG"
                      className="h-10 w-auto rounded-lg bg-black/10 p-1"
                      draggable={false}
                    />
                    <div>
                      <div className="text-sm font-semibold">CG 合作平台</div>
                      <div className="text-xs text-white/60">理念/活动/规则/Q&A 将由后台维护并发布</div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/75">
                    建议先扫码注册，再进入 EA/指标详情查看策略与风险说明。
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <img
                    src="/img/qr/promo.png"
                    alt="Promo QR"
                    className="h-auto w-full select-none rounded-xl"
                    draggable={false}
                  />
                </div>
              </div>
            </motion.div>

            <motion.div
              className="logo-shimmer absolute -top-10 left-1/2 w-[340px] -translate-x-1/2 drop-shadow-[0_28px_60px_rgba(0,0,0,0.55)] md:w-[420px]"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            >
              <img src="/img/brand/logo.png" alt="无限量化 Logo" className="w-full select-none" draggable={false} />
            </motion.div>
          </div>
        </section>

        <section id="ea" className="mt-20">
          <div className="flex items-end justify-between gap-6">
            <div>
              <div className="text-xs uppercase tracking-widest text-white/50">EA</div>
              <h2 className="mt-2 text-2xl font-semibold">EA 列表（即将上线）</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
                后续这里会用 3D 视差滚动展示 EA 卡片：收益/风险/策略/合作条件，并支持筛选与对比。
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-white/12 bg-white/6 p-5 backdrop-blur-xl"
              >
                <div className="h-4 w-24 rounded bg-white/10" />
                <div className="mt-4 h-3 w-40 rounded bg-white/10" />
                <div className="mt-2 h-3 w-32 rounded bg-white/10" />
                <div className="mt-6 h-9 w-28 rounded-xl bg-white/10" />
              </div>
            ))}
          </div>
        </section>

        <section id="metrics" className="mt-16">
          <div className="text-xs uppercase tracking-widest text-white/50">Metrics</div>
          <h2 className="mt-2 text-2xl font-semibold">指标列表（即将上线）</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
            指标页会用图文解释常用量化指标，支持分类、搜索，以及与 EA 的关联跳转。
          </p>
        </section>

        <section id="learn" className="mt-16">
          <div className="text-xs uppercase tracking-widest text-white/50">Learn</div>
          <h2 className="mt-2 text-2xl font-semibold">教学（外链）</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
            这里会展示百度云盘教学链接与分类标签，支持多语言标题。
          </p>
        </section>

        <section id="about" className="mt-16">
          <div className="text-xs uppercase tracking-widest text-white/50">About</div>
          <h2 className="mt-2 text-2xl font-semibold">关于我们 / 如何加入</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
            团队介绍、合作方式、加入好处、表单收集线索，以及微信二维码浮窗。
          </p>
        </section>
      </main>

      <WeChatFloat />
    </div>
  )
}
