# Hydro-Minim AI Development Guide

本文件是 `halo-theme-hydro-minim` 的本地深度开发指南。进入本主题时先读根目录 `AGENTS.md`，再读本文；通用 Halo 主题规范继续参考 `../AI-THEME-DEV-GUIDE.md`。

## 必读顺序

1. `AGENTS.md`：项目身份、编辑边界、视觉不变量、关键交互。
2. 本文件：当前主题目录、参考项目使用方式、常见开发路线。
3. `../AI-THEME-DEV-GUIDE.md`：工作区级 Halo 主题开发规范、Finder/API、Thymeleaf 约束。
4. `../app` 或 `../app/dist/index.html`：只在改视觉/动画时对照原始 React 原型。

## 当前主题边界

- 只编辑 `src/`、`public/`、`theme.yaml`、`settings.yaml`、配置和文档源文件。
- 不手动编辑 `templates/` 和 `dist/`；它们分别由 `pnpm run build-only`、`pnpm run build` 生成。
- 运行时不引入 React、Radix、shadcn；现有交互由 Thymeleaf + Vite TypeScript + CSS 完成。
- 保持 Hydro-Minim 的灰白背景、Space Mono、黑色细边线、轻颗粒和克制极简氛围。

## 源码地图

| 路径                         | 责任                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| `src/*.html`                 | Halo 页面模板源文件，覆盖首页、文章、页面、分类、标签、归档、作者、扩展页面和错误页 |
| `src/modules/`               | Header、Hero、文章卡片、列表 Hero、分页、Footer 等可复用片段                        |
| `src/partials/`              | 基础布局和 head 资源入口                                                            |
| `src/assets/main.ts`         | Lenis、GSAP、导航切换、Hero motion、主题切换、页面交互                              |
| `src/assets/styles/main.css` | 主视觉系统、响应式、深浅色变量、动画样式                                            |
| `public/assets/`             | 静态图片、品牌资源和无需经过打包的主题资源                                          |
| `theme.yaml`                 | Halo 主题元信息与自定义模板声明                                                     |
| `settings.yaml`              | Halo 后台设置表单                                                                   |

## 参考项目索引

这些项目只作为实现参考，不是本主题的上游。开发时先明确要参考的是“数据接入、页面覆盖、交互架构、验证脚本、还是视觉细节”。

| 项目                            | 适合参考                                                                                      | 使用边界                                                  |
| ------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `../app`                        | 原始 UI、动画节奏、Hero reveal、导航收缩、卡片 3D hover、Footer marquee                       | 只做视觉/交互对照，不把 React 运行时移入本主题            |
| `../theme-vite-starter`         | Vite + Halo 插件结构、构建配置、基础模板组织                                                  | 适合查工程结构，不提供完整产品级页面                      |
| `../theme-earth`                | 成熟 Halo 页面组织、Finder 数据接入、常规博客模板                                             | 适合查 Halo 数据字段和模板套路，视觉不跟随                |
| `../theme-clarity`              | 三栏博客、PJAX、侧边栏 Widget、双评论系统、友链提交交互                                       | 借鉴功能链路，避免把 Hydro-Minim 变成通用三栏主题         |
| `../theme-spark`                | 多语言、DaisyUI 多主题、动态首页 section 排序、电商页面                                       | 只参考配置和 section 编排思路                             |
| `../theme-walker`               | 极简博客、Svelte Web Components、点赞 Tracker、View Transition                                | 可参考轻量交互和 View Transition，不引入 Svelte 到本主题  |
| `../theme-microimmersion-1.5.0` | Thymeleaf macro、REST API 客户端渲染、Annotation Setting 扩展字段                             | 可参考沉浸式页面和宏复用，避免照搬重视觉                  |
| `../halo-theme-vapor`           | 极简博客、Tailwind v3 + Alpine + Less、TOC、搜索、插件页面、Lit Web Components 子包、压缩产物 | 可参考页面适配和小组件封装，不复制其生成后的 `templates/` |
| `../theme-sky-blog-3`           | macOS 桌面壳层、Dock/窗口协议、PJAX 生命周期、app/widget 分层、reload/smoke 验证脚本          | 只参考架构和验证方法，不改变 Hydro-Minim 的极简博客身份   |
| `../Serenity-Grace`             | 页面类型覆盖、完整后台配置、亮暗模式、PJAX、Lenis、欢迎页、天气时钟、图库/项目/留言等扩展页面 | 可参考设置项和页面覆盖，不套用粉蓝高装饰视觉              |

## 新增三个参考主题的阅读入口

### `../halo-theme-vapor`

- 先读：`README.md`、`theme.yaml`、`settings.yaml`、`package.json`。
- 查模板：`templates/modules/layout.html`、`templates/modules/head.html`、`templates/modules/header.html`、`templates/modules/post-card.html`。
- 查交互：`src/main.ts`、`src/functions/toc/`、`src/functions/theme/`、`src/functions/links/`、`src/functions/message/`。
- 查 Web Component：`lit-components/src/components/upvote-button.ts`、`lit-components/src/components/emoji.ts`。
- 适合问题：文章 TOC、搜索页、友链/图库/瞬间插件页、轻量反馈消息、资源压缩。

### `../theme-sky-blog-3`

- 先读：`README.md`、`AGENTS.md`、`docs/文档索引.md`、`docs/架构总览.md`、`docs/开发约束.md`。
- 查壳层：`src/shell-core/`、`src/shell/desktop-shell/`、`templates/modules/shell/`。
- 查页面 app：`src/apps/reader/`、`src/apps/moments/`、`src/apps/photos/`、`src/apps/links/`、`src/apps/explorer/`。
- 查 widget：`src/widgets/`、`docs/桌面小组件.md`。
- 查验证：`scripts/verify-theme-reload.mjs`、`scripts/smoke-playwright.mjs`、`scripts/typecheck-contracts.mjs`。
- 适合问题：复杂页面生命周期、PJAX 同窗口更新、按页面拆入口、插件页面 smoke、reload 后线上验证。

### `../Serenity-Grace`

- 先读：`README.md`、`theme.yaml`、`settings.yaml`。
- 查布局：`templates/modules/layout.html`、`templates/modules/header.html`、`templates/modules/footer.html`、`templates/modules/search-modal.html`。
- 查主要页面：`templates/index.html`、`templates/post.html`、`templates/archives.html`、`templates/about.html`、`templates/links.html`、`templates/photos.html`、`templates/projects.html`、`templates/guestbook.html`。
- 查交互：`templates/assets/js/main.js`、`pjax.js`、`post.js`、`weather-clock.js`、`links-submit.js`、`music-panel.js`。
- 查样式：`templates/assets/css/base.css`、`index.css`、`post-page.css`、`archives.css`。
- 适合问题：后台设置分组、页面类型补齐、欢迎页、天气时钟、音乐面板、社交/分享/打赏、View Transition 式主题切换。

## 常见开发路线

### 修改模板页面

1. 改 `src/*.html` 或 `src/modules/*.html`。
2. 检查 Thymeleaf 表达式是否有空值兜底。
3. 运行 `pnpm run check`。
4. 运行 `pnpm run build`。
5. 如果是路由或 Halo 运行时问题，检查生成后的 `templates/*.html` 是否符合预期。

### 修改交互

1. 优先改 `src/assets/main.ts`，不要在模板里堆大段 inline JS。
2. 保持 Header 胶囊、主题光幕、Hero motion、滚动倾斜这些状态机彼此独立。
3. 任何滚动 transform 必须在停止后复位并清理，避免点击命中区域错位。
4. 运行 `pnpm run check` 和 `pnpm run build`，视觉/交互改动还要做桌面端和移动端浏览器检查。

### 新增页面或插件适配

1. 先查 `theme.yaml` 是否需要声明 custom template。
2. 优先复用 `src/partials/layout.html`、`src/modules/header.html`、`src/modules/footer.html`。
3. 数据接入先查 `../AI-THEME-DEV-GUIDE.md` 和参考主题对应页面。
4. 插件页优先参考 Clarity、Vapor、Sky Blog 3、Serenity-Grace 中同类页面的兜底逻辑。
5. 不把参考主题的视觉系统整体搬进 Hydro-Minim。

### 插件扩展页作为独立页面模板

`bangumis.html`、`docs.html`、`equipments.html`、`friends.html`、`moments.html`、`photos.html`、`steam.html`
同时服务插件原生路由和 Halo 独立页面自定义模板。后台使用方式：

1. 在 Console 新建独立页面。
2. 在页面模板中选择对应的 `Hydro ...` 模板。
3. 自定义页面 slug，建议不要直接使用 `moments`、`photos`、`bangumis`、`docs` 等插件原生路径，避免安装插件后出现路由优先级冲突。
4. 修改 `theme.yaml` 模板声明后，需要在主题管理中重新加载主题配置。

这类模板必须先判断插件是否可用，再读取插件 Finder 或路由注入变量；未安装插件时显示安装提示，不要直接访问 `moments.items`、`photos.items`、`groups`、`projects` 等可能不存在的变量。

## 交付检查

至少执行：

```bash
pnpm run check
pnpm run build
```

如果改动涉及视觉、交互、页面路由或 Halo 数据表达式，还需要：

- 对比 `src/` 和生成后的 `templates/`。
- 在 Halo 实例检查首页桌面端、移动端、文章详情页、分类/标签/归档页。
- 对新增扩展页面检查未安装插件、空数据、图片缺失、深浅色切换、PJAX/返回导航等状态。
