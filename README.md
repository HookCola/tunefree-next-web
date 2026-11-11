# TuneFree Next Web 🎵

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/HookCola/tunefree-next-web)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

基于 **TuneFreeNext V4 API 规范** 打造的轻量级 Web 网页端音乐客户端与无损解析播放器。

采用 **极简单 HTML 前端 + Node.js 原生零依赖轻量反代** 架构，无需复杂的构建打包或 `npm install`，开箱即跑！

---

## ✨ 核心特性

- 🚀 **极简单文件前端**：基于 Vue 3 + Tailwind CSS，现代暗黑系毛玻璃质感，响应式移动端与桌面端自适应。
- ⚡ **零外部依赖反代**：使用 Node.js 原生 `node:http` 和内置 `fetch`，彻底解决浏览器端 CORS 跨域难题，无需装任何第三方包。
- 🔍 **聚合音乐搜索**：原生接入 QQ 音乐与网易云音乐公共开放检索接口，自动桥接提取与 TuneFree 兼容的标准 `trackId`。
- 🎧 **多档音质与无损解析**：支持选择 128k、320k（高品质）、FLAC（无损）、flac24bit（Hi-Res）音质，一键调取 `/v1/parse` 获取播放票据。
- 📻 **全功能悬浮播放器**：内置 HTML5 底部常驻音乐流媒体播放器，流式边下边播，不占服务器带宽，并支持一键下载音频文件。
- 👤 **完整账号与会员体系**：
  - 遵循 TuneFreeNext 规范，安装期自动生成并持久化标准 UUID v4 作为 `deviceId`。
  - 支持邮箱注册（提示 ≥12 位密码）、邮箱 Token 验证、登录与 Token 本地管理。
  - 会员权益展示（体验特权/正式会员/剩余天数）与听歌统计。
  - 官方订阅商品拉取与订单创建。
- 📋 **API 实时诊断日志**：内置抓包调试面板，实时追踪每一个 REST 请求方法、响应状态码、耗时与 `requestId`。

---

## 🏗️ 架构说明

```
[ 用户浏览器 (Web 单页) ]
         │
         ▼ (抹平跨域 + 聚合搜索)
[ 本地/服务端 Node.js 代理 (server.mjs) ]
         │
         ├─── 搜歌接口 ───> [ QQ 音乐 / 网易云 开放搜索 ]
         │
         └─── 解析/账号 ──> [ TuneFreeNext 官方中台 (tunefree.sayqz.com) ]
                                 │
                                 ▼ (HTTP 302 重定向)
                       [ 源站官方 CDN (腾讯/网易 音频流) ]
```

> **流量提示**：音乐播放采用 302 重定向由浏览器直接连接源站 CDN，音频传输不走代理服务器中转，服务器带宽占用极低。

---

## 🚀 部署与运行方式

### 方式一：本地极速运行 (免 npm install)

1. 克隆本仓库：
   ```bash
   git clone https://github.com/HookCola/tunefree-next-web.git
   cd tunefree-next-web
   ```

2. 启动服务：
   ```bash
   node server.mjs
   ```

3. 浏览器访问：`http://localhost:3000`

---

### 方式二：Cloudflare Workers / Pages 一键部署 (免费无服务器)

本项目完美支持全球分布式的 **Cloudflare Workers** 与 **Cloudflare Pages** 零服务器部署：

#### 途径 A：点击官方一键部署按钮 (Deploy to Cloudflare)

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/HookCola/tunefree-next-web)

点击上方按钮，Cloudflare 会自动引导你将本项目一键克隆并完成自动化 Workers 边缘部署，无需在本地配置任何环境！

#### 途径 B：通过 Wrangler 命令行一键部署
确保已登录 Cloudflare (`npx wrangler login`)，然后在项目根目录下直接执行：
```bash
npx wrangler deploy
```
发布成功后将直接获得一个全球可用的 `https://tunefree-next-web.<your-subdomain>.workers.dev` 访问地址！

#### 途径 C：Cloudflare Pages 绑定 GitHub 自动构建
1. 打开 [Cloudflare 控制台](https://dash.cloudflare.com/) -> **Compute (Workers & Pages)** -> **Create Application** -> **Pages**。
2. 选择 **Connect to Git**，关联你的 `tunefree-next-web` 仓库。
3. 构建设置：
   - **Framework preset**: `None`
   - **Build output directory**: `public`
4. 点击 **Save and Deploy**，几秒钟即可全球上线！

---

### 方式三：GitHub Actions 自动化持续部署 (CI/CD)

仓库已内置 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) 工作流：
1. 在你的 GitHub 仓库中，进入 **Settings** -> **Secrets and variables** -> **Actions**。
2. 添加以下 Repository Secret：
   - `CLOUDFLARE_API_TOKEN`：在 Cloudflare 个人资料页创建带有 `All accounts - Cloudflare Workers: Edit` 权限的 API Token。
   - `CLOUDFLARE_ACCOUNT_ID`（可选）：你的 Cloudflare 账户 ID。
3. 之后只要向 `main` 分支执行 `git push`，GitHub Actions 就会自动打包并发布至 Cloudflare Workers！

---

## 📁 目录结构

```
.
├── server.mjs                    # 原生 Node.js 轻量代理服务 (本地测试)
├── src/
│   └── worker.js                 # Cloudflare Worker 边缘处理脚本 (CORS + 搜歌)
├── public/
│   ├── index.html                # 单页面前端 (Vue 3 + Tailwind CSS + 播放器)
│   └── _worker.js                # Cloudflare Pages 边缘路由入口
├── wrangler.json                 # Cloudflare 配置文件 (JSON)
├── wrangler.toml                 # Cloudflare 配置文件 (TOML，兼容一键部署)
├── .github/workflows/deploy.yml  # GitHub Actions 自动化部署流水线
├── package.json                  # 项目配置与脚本
├── .gitignore                    # Git 忽略配置
└── README.md                     # 项目说明文档
```
│   └── index.html   # 单页面前端 (Vue 3 + Tailwind CSS + 播放器)
├── package.json     # 项目元信息与启动脚本
├── .gitignore       # Git 忽略配置
└── README.md        # 项目说明文档
```

---

## 📜 开源协议

本项目基于 [MIT](LICENSE) 协议开源。仅供学习交流与 API 契约集成测试研究使用，音频版权均归各大音乐平台所有。
