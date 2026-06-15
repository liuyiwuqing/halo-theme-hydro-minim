# 氢·简 / Hydro-Minim

Hydro-Minim 是“氢”系列的首款 Halo 主题，项目标识为 `halo-theme-hydro-minim`。主题运行时采用 Halo 原生 Thymeleaf 模板 + Vite TypeScript 交互，不依赖 React。

主题已支持浅色、深色和跟随系统三种默认配色，并提供访客侧深浅色切换按钮。主题设置中的“全局外观 / 强调色”会统一驱动文字选中、正文链接、输入焦点、光标、搜索命中和轻量高亮，默认保持低饱和的氢风格，不建议改成高对比霓虹色。

搜索入口依赖官方 `PluginSearchWidget` 插件，主题设置可在“全局组件 / 搜索入口方式”中选择弹窗搜索或页面搜索；未安装插件时主题不会展示无效搜索入口。

## 交流群

[点击链接加入群聊【halo博客-lywq插件】](https://qm.qq.com/q/wuC7NZr0sw)

<img src="https://github.com/user-attachments/assets/bf162401-07fd-49ec-b50f-5218c9510937" style="height: 400px !important; width: auto; object-fit: contain;" />

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

## 自动化流程

- `CI`：在 `master` / `main` 分支推送、面向 `master` / `main` 的 Pull Request 和手动触发时运行，依次执行 `pnpm install --frozen-lockfile`、`pnpm run check:ci`、`pnpm test`、`pnpm run build`。非 PR 触发会临时上传构建出的主题 zip，便于回溯。
- `CD`：在 GitHub Release 发布后触发，调用 `halo-sigs/reusable-workflows/.github/workflows/theme-cd.yaml@v4`，把 `dist` 产物上传到 GitHub Release 和 Halo 应用市场。
- 发布所需的 `app-id` 已写入 `.github/workflows/cd.yaml`；Halo 应用市场令牌通过仓库 Secret `HALO_PAT` 注入。

## 上线资料

- [主题功能介绍](./docs/theme-features.md)：面向应用市场、宣传页和站点介绍，梳理 Hydro-Minim 的定位、功能卖点和页面覆盖。
- [主题使用教程](./docs/theme-usage-guide.md)：面向站长后台配置，按“品牌与站点 / 视觉与动效 / 导航与结构 / 首页 / 内容页面 / 插件页面 / 高级设置”分组说明。
- [宣传图源文件](./docs/promotion/index.html)：可维护的宣传图 HTML 设计稿。
- 宣传图 PNG：位于 `docs/promotion/`，包括主视觉、功能矩阵、配置导览和插件生态四张图。

## 快捷操作按钮

主题设置中的“全局组件 / 快捷项”支持两层配置：

- `全局默认快捷项`：所有页面都没有命中专属规则时使用。
- `页面快捷配置`：按永久链接或模板 ID 命中后覆盖全局默认配置，永久链接规则优先于模板 ID 规则，`所有页面` 规则作为兜底；永久链接支持 `/about`、`/about/` 或完整 URL，并兼容当前请求路径；如果命中的页面配置是空的，会回退到全局默认快捷项。

每个快捷项支持三类动作：

- `跳转链接`：保持原有链接跳转能力，可配置是否新标签打开。
- `主题内置动作`：支持打开搜索、切换深浅色、返回顶部、复制当前链接、会员签到、文章收藏、打印页面、打开移动菜单、滚动到评论区。
- `自定义函数`：在“高级 / 自定义 JavaScript”中注册 `window.HydroMinimActions`，也支持直接填写 `window.LinksSubmit.openSubmitPopup` 这类全局方法路径，快捷项填写函数名和 JSON 参数。

会员签到与文章收藏依赖 `PluginMember` 自动注入的 `window.memberSignIn` 和 `window.memberFavorite`，主题不会手动引入会员插件脚本。后台建议开启对应“前台能力”，并关闭插件默认按钮；文章收藏只在文章详情页具备 `post` 上下文时可用。

页面规则示例：

```text
模板 ID: page_about
永久链接: /about
模板 ID: docs
永久链接: /docs
```

自定义函数示例：

```js
window.HydroMinimActions = {
  ...(window.HydroMinimActions || {}),
  openSponsorModal({ payload }) {
    const modal = document.querySelector(`[data-modal="${payload.modal}"]`);
    modal?.classList.add("is-open");
  },
};
```

## 全局提示框

主题内置 `window.HydroNotice` 全局提示 API，视觉为顶部居中的极简胶囊提示，自动适配浅色、深色、强调色和移动端安全区。它适合主题自定义脚本、插件页面和第三方扩展在前台给用户反馈，不需要额外插入 DOM。

基础用法：

```js
window.HydroNotice?.success("保存成功");
window.HydroNotice?.error("提交失败，请稍后再试", { title: "Error" });
```

完整接口：

```js
const notice = window.HydroNotice?.show({
  id: "links-submit-status",
  title: "Links",
  message: "友链申请已提交",
  variant: "success", // info | success | warning | error
  duration: 4200, // 毫秒；0 表示不自动关闭
  dismissible: true,
});

notice?.close();
window.HydroNotice?.clear("links-submit-status");
window.HydroNotice?.clear();
```

快捷方法包括 `info(message, options)`、`success(message, options)`、`warning(message, options)`、`error(message, options)`。插件拓展时建议使用稳定 `id` 表示同一业务状态，例如上传进度、提交状态、登录状态；重复使用同一个 `id` 会替换旧提示，避免顶部刷出一长串消息，整得跟日志瀑布似的。

如果插件脚本加载得比主题脚本更早，请在调用前判断 API 是否存在，或在 `DOMContentLoaded` 后再调用：

```js
document.addEventListener("DOMContentLoaded", () => {
  window.HydroNotice?.info("插件已就绪", { id: "plugin-ready" });
});
```

## 目录说明

- `src/*.html`: Halo 页面模板源文件，包括首页、文章、页面、分类、标签、归档、作者和错误页。
- `src/modules/`: 首页与列表页复用模块，例如 Header、Hero、文章卡片、分页、Footer。
- `src/partials/`: 基础 HTML 布局和 head 资源入口。
- `src/assets/main.ts`: Lenis、GSAP、导航切换、Hero 鼠标动效等交互逻辑。
- `src/assets/hydro-notice.ts`: 全局胶囊提示框 API，暴露 `window.HydroNotice` 给主题脚本和插件拓展使用。
- `src/assets/styles/main.css`: Hydro-Minim 的主要视觉系统和响应式样式。
- `public/assets/images/`: 默认 Hero 和文章封面图，构建后复制到 `templates/assets/images/`。
- `theme.yaml`: Halo 主题元信息。
- `settings.yaml`: Halo 主题设置表单。

## 给后续 AI Agent

继续开发前请先阅读：

- [AGENTS.md](./AGENTS.md)：本主题的 Agent 入口，项目身份、约束、视觉不变量和关键交互。
- [docs/ai-development-guide.md](./docs/ai-development-guide.md)：本主题的深度开发指南、源码地图、交互/模板开发路线和常见陷阱。
- [CONTEXT.md](./CONTEXT.md)：本主题的领域语言和当前关键决策。
