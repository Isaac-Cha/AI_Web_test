export default function Join() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-14">
      <div className="text-xs uppercase tracking-widest text-white/50">Join</div>
      <h1 className="mt-2 text-3xl font-semibold">加入我们</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-white/65">
        这里将展示团队介绍、加入方式、合作收益与线索收集入口（后续接入后台发布）。
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-white/12 bg-white/6 p-6 backdrop-blur-xl">
          <div className="text-sm font-semibold text-white/90">占位骨架</div>
          <div className="mt-3 text-sm text-white/65">后续加入表单、FAQ 与权益说明。</div>
        </div>
        <div className="rounded-3xl border border-white/12 bg-white/6 p-6 backdrop-blur-xl">
          <div className="text-sm font-semibold text-white/90">联系方式</div>
          <div className="mt-3 text-sm text-white/65">右下角按钮可随时打开微信二维码。</div>
        </div>
      </div>
    </main>
  )
}

