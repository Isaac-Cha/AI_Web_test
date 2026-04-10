import { Link, NavLink, Outlet } from 'react-router-dom'

import WeChatFloat from '@/components/WeChatFloat'

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `text-sm transition-colors ${isActive ? 'text-white' : 'text-white/70 hover:text-white'}`
      }
    >
      {label}
    </NavLink>
  )
}

export default function SiteLayout() {
  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#050816]/65 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img src="/img/brand/logo.png" alt="无限量化" className="h-8 w-auto" draggable={false} />
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-wide">无限量化</div>
              <div className="text-xs text-white/60">MetaTrader · 量化交易</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <NavItem to="/" label="首页" />
            <NavItem to="/platform" label="合作平台" />
            <NavItem to="/ea" label="EA" />
            <NavItem to="/metrics" label="指标" />
            <NavItem to="/learn" label="教学" />
            <NavItem to="/join" label="加入我们" />
          </nav>
        </div>
      </header>

      <Outlet />

      <WeChatFloat />
    </div>
  )
}

