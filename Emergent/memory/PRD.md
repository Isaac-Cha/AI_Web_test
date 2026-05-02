# 无限量化 MetaTrader — Product Requirements Document

## Original Problem Statement
Build a marketing + lead-gen website for the forex quantitative brand "无限量化 (MetaTrader)".
Target audience: forex traders, EA developers/operators, broker sales partners.

## User Personas
- **Forex Trader** – wants to open a CG broker account, evaluate EA strategies
- **EA Developer / Operator** – wants to partner, monetize EAs
- **Broker Sales** – wants co-marketing & capital pipeline
- **Community Learner** – wants MT4/MT5 tutorials via Baidu Pan

## Core Requirements (from user)
- Showcase CG partner broker: philosophy, activities, rules, FAQ, open-account QR
- EA list with profit / risk / strategy / partnership conditions
- Indicator list (image + text)
- Tutorials (Baidu Pan links)
- About Us + Join Us (team + benefits) with form submission
- Forms saved to DB (admin views later)
- zh / en multilingual
- Floating WeChat QR widget
- Heavy animations: starry sky hero, mouse-trail cursor, sci-fi aesthetic
- SEO for Baidu & AI search: 黄金 外汇 量化 自动交易 MT4 MT5 EA COMEX gold xauusd

## User Choices (confirmed)
- Languages: zh + en
- No admin CMS — content is hardcoded in backend (API-served) for v1
- Forms save to MongoDB
- Placeholder images used; user will replace `img/logo-CG.svg`, `img/promotion-qr.svg`, `img/wechat-qr.svg`
- Premium sci-fi animations enabled

## Architecture
- **Frontend**: React 19 + Tailwind + shadcn/ui + framer-motion. Canvas-based starry sky (no WebGL deps). Custom trailing cursor. i18n via React Context.
- **Backend**: FastAPI + Motor (Mongo). Public endpoints: `/api/eas`, `/api/indicators`, `/api/tutorials`, `/api/submissions` (POST/GET).
- **DB**: MongoDB `submissions` collection — kinds: contact | join | account_open.

## Implemented (v1 · 2026-02-20)
- [x] Hero with starry canvas, gold/cyan gradient title, CG open-account QR card, animated stats grid
- [x] CG Broker section with activities bento, FAQ accordion, sticky QR card
- [x] EA section: 4 strategies (Golden Phoenix, Quantum Scalper, Nebula Grid, COMEX Navigator) with profit/DD/risk/min-cap/partnership
- [x] Indicators: 6 items (Liquidity Map, SMC Suite, VIX Pulse, Session Clock, AI Trend Radar, Volume Profile)
- [x] Tutorials: 4 Baidu Pan course placeholders
- [x] About + Join form (persists to Mongo) with team showcase and 4 benefits
- [x] Floating WeChat QR panel (bottom-right)
- [x] Language toggle zh/en via shadcn DropdownMenu
- [x] Custom mouse cursor with trail ring (desktop only)
- [x] Mobile responsive nav with hamburger
- [x] SEO meta, OpenGraph, JSON-LD FinancialService schema
- [x] 13/13 backend pytest + full Playwright UI verification (100% pass)

## v2 Updates (2026-02-24)
- [x] Three theme variants: Sci-Fi (default dark), Apple (white/#0071E3), Hybrid (starry + Apple tiles)
- [x] VersionSwitcher preserves current sub-route when switching themes (remapPath `/apple/ea/:id` ↔ `/hybrid/ea/:id` ↔ `/ea/:id`)
- [x] EA/Indicator/Tutorial list + detail pages fully variant-aware (nav, banner, filters, cards, CTAs, equity curve colors)
- [x] Apple detail pages: white background, blue #0071E3 accents, shadow-elevated cards, blue Recharts area
- [x] Sci-Fi/Hybrid detail pages: obsidian background, gold equity curve, glass cards
- [x] MouseTrail color adapts to current route/theme
- [x] Framer Motion `once: true` to keep elements visible after scroll
- [x] Recharts animated equity curves with skeleton loading state

## Prioritized Backlog
### P0
- Admin dashboard page at `/admin/submissions` (read-only) for lead review
- Replace placeholder SVGs with user-supplied PNG assets (logo-CG, promotion-qr, wechat-qr)

### P1
- Per-EA detail modal/page with live equity curve (Recharts)
- Blog/News section for Baidu SEO (high-keyword density articles)
- Email notification on new submission (Resend / SendGrid)
- Tutorial landing pages with embedded video previews before Baidu Pan link

### P2
- 3D WebGL hero upgrade (@react-three/fiber + Stars)
- Live XAUUSD price ticker (CoinGecko or Alpha Vantage)
- Testimonial carousel + partner logo wall
- Progressive image optimization + CDN
