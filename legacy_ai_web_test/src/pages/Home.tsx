import { motion } from 'framer-motion'

import Starfield from '@/components/Starfield'

export default function Home() {
  return (
    <div className="relative min-h-[calc(100vh-65px)] overflow-hidden">
      <Starfield />

      <div className="absolute inset-0 bg-[radial-gradient(800px_520px_at_20%_10%,rgba(66,165,245,0.16),transparent_65%),radial-gradient(700px_560px_at_78%_30%,rgba(0,229,255,0.12),transparent_60%),radial-gradient(820px_560px_at_60%_92%,rgba(211,68,255,0.10),transparent_55%)]" />

      <main className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-20 pt-12">
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
                href="/platform"
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-[0_18px_45px_rgba(0,0,0,0.35)] hover:bg-white/95"
              >
                查看合作平台
              </a>
              <a
                href="/ea"
                className="rounded-xl border border-white/15 bg-white/6 px-4 py-2.5 text-sm font-semibold text-white/90 backdrop-blur-xl hover:bg-white/10"
              >
                浏览 EA
              </a>
            </div>
          </div>

          <div className="relative min-h-[240px] lg:min-h-[420px]">
            <motion.div
              className="logo-shimmer absolute right-0 top-1/2 w-[360px] -translate-y-1/2 drop-shadow-[0_34px_70px_rgba(0,0,0,0.6)] md:w-[480px]"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: [0, -12, 0] }}
              transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
              style={{ x: -50, scale: 1.3 }}
            >
              <img src="/img/brand/logo.png" alt="无限量化 Logo" className="w-full select-none" draggable={false} />
            </motion.div>
          </div>
        </section>

        <section className="mt-16 grid gap-4 md:grid-cols-3">
          <a href="/platform" className="rounded-2xl border border-white/12 bg-white/6 p-5 backdrop-blur-xl hover:bg-white/10">
            <div className="text-xs uppercase tracking-widest text-white/50">Platform</div>
            <div className="mt-2 text-lg font-semibold">合作平台</div>
            <div className="mt-2 text-sm text-white/65">理念/活动/规则/Q&A 后台维护发布</div>
          </a>
          <a href="/ea" className="rounded-2xl border border-white/12 bg-white/6 p-5 backdrop-blur-xl hover:bg-white/10">
            <div className="text-xs uppercase tracking-widest text-white/50">EA</div>
            <div className="mt-2 text-lg font-semibold">EA</div>
            <div className="mt-2 text-sm text-white/65">列表与详情页，后续加入 3D 视差</div>
          </a>
          <a href="/metrics" className="rounded-2xl border border-white/12 bg-white/6 p-5 backdrop-blur-xl hover:bg-white/10">
            <div className="text-xs uppercase tracking-widest text-white/50">Metrics</div>
            <div className="mt-2 text-lg font-semibold">指标</div>
            <div className="mt-2 text-sm text-white/65">指标图文说明与分类检索</div>
          </a>
          <a href="/learn" className="rounded-2xl border border-white/12 bg-white/6 p-5 backdrop-blur-xl hover:bg-white/10">
            <div className="text-xs uppercase tracking-widest text-white/50">Learn</div>
            <div className="mt-2 text-lg font-semibold">教学</div>
            <div className="mt-2 text-sm text-white/65">百度云盘链接与课程目录</div>
          </a>
          <a href="/join" className="rounded-2xl border border-white/12 bg-white/6 p-5 backdrop-blur-xl hover:bg-white/10">
            <div className="text-xs uppercase tracking-widest text-white/50">Join</div>
            <div className="mt-2 text-lg font-semibold">加入我们</div>
            <div className="mt-2 text-sm text-white/65">团队介绍、合作方式与线索收集</div>
          </a>
        </section>
      </main>
    </div>
  )
}
