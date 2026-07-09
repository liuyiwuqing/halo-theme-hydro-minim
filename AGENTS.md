# AI Agent Handoff

本文件是后续 AI agent 进入 `halo-theme-hydro-minim` 时的第一入口。更完整的开发说明见 [docs/ai-development-guide.md](docs/ai-development-guide.md)。

## 项目身份

- 中文名：氢·简
- 英文名：Hydro-Minim
- 项目标识：`halo-theme-hydro-minim`
- Halo 主题标识：`metadata.name: halo-theme-hydro-minim`
- 当前版本：`1.0.0-beta9`
- 兼容目标：Halo `>=2.25.0`

## 项目地图

- 当前主题：`/Users/lywq/Personalspace/blog/halo_theme_dev/halo-theme-hydro-minim`
- 开发源文件：`src/`、`public/`、`theme.yaml`、`settings.yaml`、配置和文档源文件。
- 生成产物：`templates/` 和 `dist/`，只能由构建命令生成。
- 旧目标名 `halo-theme-hydro-mini` 已废弃，不要继续使用。

## 必须遵守

- 使用 `halo-theme-dev` 技能或对应 Halo 主题文档约束开发。
- 只编辑 `src/`、`public/`、`theme.yaml`、`settings.yaml`、配置和文档源文件。
- 不要手动编辑 `templates/`，它由 `pnpm run build-only` 生成。
- 不要手动编辑 `dist/`，它由 `pnpm run build` 生成。
- 主题运行时不使用 React，不要重新引入 React/Radix/shadcn 运行时。
- 静态资源必须放在 `public/assets/` 或由 Vite 输出到 `templates/assets/`。

## 视觉不变量

- 保持 Hydro-Minim 的灰白背景、Space Mono、黑色细边线、轻颗粒、克制极简氛围。
- 保持 Hero 图片 reveal、导航收缩、文字扰动、卡片 3D hover、分类 accordion、Footer marquee 等体验。
- 深色模式也要保持“氢·简”的低饱和、细线框、轻质感，不要改成高对比霓虹或纯黑仪表盘风格。
- 修改视觉前优先对照现有 `src/modules/`、`src/assets/styles/main.css`、`docs/theme-features.md` 和 `PRODUCT.md`，不要把主题改成通用博客模板风格。

## Halo 平台常用模式速查

Halo 数据接入、Thymeleaf 规范、Annotation Setting 等说明以 `halo-theme-dev` 技能和项目内模板实现为准。

核心模式：

- Finder 对象：`postFinder`、`categoryFinder`、`tagFinder`、`menuFinder`、`pluginFinder` 等，模板中直接调用。
- 设置读取：`theme.config.<group>.<name>`，字段在 `settings.yaml` 中定义。
- 路由变量：首页 `posts`、文章 `post`、页面 `singlePage`、分类 `category`+`posts`、标签 `tag`+`posts`、归档 `archives`、作者 `author`。
- 上下篇：`postFinder.cursor(post.metadata.name)` → `{ previous, next }`。
- 缩略图：`thumbnail.gen(url, 's' | 'm' | 'l' | 'xl')`。
- 评论组件：`<halo:comment group="content.halo.run" kind="Post" name="..." />`。
- 搜索插件检查：`pluginFinder.available('PluginSearchWidget')`。
- Annotation 读取：`entity.metadata.annotations['key']`，key 来自 `annotation-setting.yaml`。

## 常用命令

```bash
pnpm install
pnpm run check
pnpm run build
```

## 当前关键交互

- Header：桌面和移动端都保留“顶部菜单 / 胶囊菜单”滚动切换。
- PC 胶囊：滚动后偏右，进入动画从左到右。
- 移动胶囊：滚动后右上角白色长胶囊，内部为「氢 / 搜索 / 深浅色 / 菜单」。
- 深浅色：默认模式来自 `settings.yaml`，访客可点 Header 图标切换，偏好写入 `localStorage.hydro-color-scheme`，切换时必须走主题内置圆形光幕过渡。
- Hero 图片：使用独立 motion 层处理鼠标移动，避免和 GSAP reveal/parallax 的 transform 互相覆盖。
- 主内容滚动倾斜：滚动时短暂 `rotateX`，滚动停止后必须复位并清理 transform，避免点击命中区域错位。

## 交付前检查

至少运行：

```bash
pnpm run check
pnpm run build
```

如果改了视觉或交互，需要在 Halo 实例中检查首页桌面端、移动端、文章详情页、分类/标签/归档页。

## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues for `liuyiwuqing/halo-theme-hydro-minim`; use the `gh` CLI from this repo. See `docs/agents/issue-tracker.md`.
Scripted issue → PR workflow: use `scripts/issue-pr.sh` or `pnpm run issue-pr -- ...`. See `docs/agents/issue-pr-workflow.md`.

### Triage labels

Use the default five-label triage vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context Halo theme repo. Read `AGENTS.md`, `README.md`, `docs/ai-development-guide.md`, `CONTEXT.md`, and relevant ADRs under `docs/adr/`. See `docs/agents/domain.md`.
