# 氢·简 / Hydro-Minim

Hydro-Minim 是“氢”系列的首款 Halo 主题，项目标识为 `halo-theme-hydro-minim`。主题由原 React + TypeScript + Vite 原型改造而来，但运行时采用 Halo 原生 Thymeleaf 模板 + Vite TypeScript 交互，不依赖 React。

主题已支持浅色、深色和跟随系统三种默认配色，并提供访客侧深浅色切换按钮。

## 快速开始

```bash
pnpm install
pnpm dev
```

开发源文件在 `src/`，`templates/` 是 Vite/Halo 插件生成的产物，不要手动编辑。

## 构建与校验

```bash
pnpm run check
pnpm run build
```

`pnpm run build` 会生成可安装主题包：

```text
dist/halo-theme-hydro-minim-1.0.0.zip
```

## 目录说明

- `src/*.html`: Halo 页面模板源文件，包括首页、文章、页面、分类、标签、归档、作者和错误页。
- `src/modules/`: 首页与列表页复用模块，例如 Header、Hero、文章卡片、分页、Footer。
- `src/partials/`: 基础 HTML 布局和 head 资源入口。
- `src/assets/main.ts`: Lenis、GSAP、导航切换、Hero 鼠标动效等交互逻辑。
- `src/assets/styles/main.css`: Hydro-Minim 的主要视觉系统和响应式样式。
- `public/assets/images/`: 默认 Hero 和文章封面图，构建后复制到 `templates/assets/images/`。
- `theme.yaml`: Halo 主题元信息。
- `settings.yaml`: Halo 主题设置表单。

## 给后续 AI Agent

继续开发前请先阅读 [AGENTS.md](./AGENTS.md) 和 [docs/ai-development-guide.md](./docs/ai-development-guide.md)。这两份文档记录了当前架构、关键交互、验证命令和容易踩坑的位置。
