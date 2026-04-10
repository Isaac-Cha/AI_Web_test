# 全局设计规范（Desktop-first）

## Layout
- 桌面端优先：内容容器 max-width 1200px，左右留白随屏幕增大。
- 基础布局：Header（固定高度）+ Main（内容分区）+ Footer。
- 列表区采用 CSS Grid（桌面 3 列，平板 2 列，手机 1 列），详情页正文区采用单列阅读布局。

## Meta Information（通用）
- title：`{页面名} - {品牌名}`（品牌名待你确认）
- description：来自栏目/内容摘要；无摘要时使用默认品牌描述（待你提供）。
- Open Graph：og:title/og:description/og:image（封面图）、og:locale（当前语言）。

## Global Styles（Design Tokens 建议）
- 背景色：#0B1020（深色品牌感，可替换）
- 主色（Accent）：#0EA5E9；链接色：#9BDCFF
- 文字：主文字 rgba(255,255,255,0.92)；弱化文字 rgba(255,255,255,0.72)
- 字号：H1 32 / H2 20 / Body 14-16 / Caption 12
- 按钮：主按钮实心（主色），hover 加深；次按钮描边（半透明边框）
- 卡片：圆角 12-16，半透明背景 + 轻边框 + blur（可选）

---

# 页面级设计

## 1) 首页
### Page Structure
- 顶部导航（横向）
- Hero 主视觉区（左文案右图/或全宽背景）
- 栏目入口区（卡片/图标入口）
- 精选内容区（按栏目分组或统一瀑布流）
- Footer（版权、备案/隐私等链接）

### Sections & Components
- Header
  - 左侧：Logo（点击回到首页）
  - 中部：栏目导航（来自“栏目管理”配置）
  - 右侧：语言切换（下拉或按钮组），可选“联系”按钮
- Hero
  - 标题/副标题：品牌主张（待你提供）
  - CTA：进入关键栏目/联系页
- Featured Content
  - 内容卡片：封面、标题、摘要、发布时间
  - 点击：进入内容详情页

### Responsive
- 桌面：导航横排；精选内容 3 列
- 平板：导航收敛；精选内容 2 列
- 手机：Hamburger 菜单；内容 1 列

## 2) 栏目内容列表页（通用模板）
### Page Structure
- 顶部导航
- 面包屑 + 栏目标题区
- 内容列表（卡片网格）
- 分页/加载更多

### Sections & Components
- 栏目标题：展示栏目名称（随语言切换）
- 列表工具条（基础）：总数、排序（最新/最热可选，若未定义则仅“最新”）
- 列表：点击进入详情

## 3) 内容详情页（通用模板）
### Page Structure
- 顶部导航
- 标题区（标题、时间、封面）
- 正文阅读区（富文本/媒体）
- 关联内容推荐

### Sections & Components
- 正文渲染：支持图片/视频/引用等富文本块
- 语言切换：切换后展示同一内容的另一语言版本；若缺失则提示“该语言版本待补充”

## 4) 联系/转化页
### Page Structure
- 顶部导航
- 联系信息卡片区（可多列）
- 二维码/社媒区
- （可选）联系表单

### Sections & Components
- 表单字段（若启用）：姓名、联系方式、留言；提交后提示状态

## 5) 后台管理（登录 + 内容发布）
### Page Structure
- 登录页（居中卡片）
- 后台：左侧侧边栏 + 右侧内容区（典型 Dashboard）

### Sections & Components
- Sidebar
  - 栏目管理
  - 内容管理
  - 媒体库
  - 多语言设置（至少：启用哪些 locale、默认语言）
- 内容编辑器
  - 基础信息：所属栏目、slug、状态、发布时间、封面
  - 多语言 Tab：每个语言一组字段（title/summary/content/SEO）
  - 预览/保存草