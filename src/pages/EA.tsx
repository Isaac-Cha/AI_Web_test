export default function EA() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-14">
      <div className="text-xs uppercase tracking-widest text-white/50">EA</div>
      <h1 className="mt-2 text-3xl font-semibold">EA 列表</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-white/65">
        这里将展示 EA 卡片列表（后续加入 3D 视差滚动、筛选、详情页等）。
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="rounded-2xl border border-white/12 bg-white/6 p-5 backdrop-blur-xl">
            <div className="h-4 w-28 rounded bg-white/10" />
            <div className="mt-4 h-3 w-44 rounded bg-white/10" />
            <div className="mt-2 h-3 w-36 rounded bg-white/10" />
            <div className="mt-6 h-9 w-28 rounded-xl bg-white/10" />
          </div>
        ))}
      </div>
    </main>
  )
}

