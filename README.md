# 陈俊呈 · AI 产品作品集与学习系统

一个基于 Next.js 16 的个人作品集站点。公开区域展示项目与能力证据，`/learn` 是仅站点所有者可进入的 30 关 AIPM 学习系统。

[访问网站](https://aipm-sprint-camp.vercel.app) · [GitHub 源码](https://github.com/CHENG-GPTU/cheng-personal-archive)

## 本地启动

```bash
pnpm install
pnpm dev
pnpm build
```

Node.js 22.13 以上；推荐 Node.js 24。私有学习功能的环境变量模板见 `.env.example`。没有配置私有服务时，公开作品集仍可构建和访问。

## 验证与发布

```bash
pnpm test:archive
pnpm test:archive:browser
```

浏览器验证需本地 Chrome，或安装 Playwright Chromium（`pnpm exec playwright install chromium`）。具体覆盖范围见 `docs/archive-music-verification.md`。

GitHub 用于保存代码，Vercel 用于运行网站。连接仓库后，主分支更新可触发新的生产部署。密钥只配置在托管平台的环境变量中，不写入仓库。

公开仓库不包含 `.env.local`、本地学习数据 `.local`、简历工作文件、聊天/调试日志、构建目录或工具安装记录。发布使用整理后的源码快照，不包含原工作目录的历史记录。

## 许可

原创应用代码使用 MIT 许可。照片、履历、音乐等素材和第三方组件不在该许可范围内；详细说明见 `THIRD_PARTY_NOTICES.md`。

## Vercel 服务端配置

项目需要以下服务端环境变量。不要把真实值提交到 Git：

- `DATABASE_URL`：Vercel Marketplace 中 Neon Postgres 的连接地址
- `DEEPSEEK_API_KEY`：站内 AI 教练的 DeepSeek 密钥
- `AIPM_SESSION_SECRET`：至少 32 字符的随机会话签名密钥
- `AIPM_ACCESS_CODE_HASH`：专属访问码的 SHA-256 十六进制摘要
- `AIPM_OWNER_NAME`：学习工作台显示名（可选）
- `AIPM_OWNER_ID`：云端学习记录的固定所有者 ID（可选）
- `DEEPSEEK_COACH_MODEL`：默认 `deepseek-v4-flash`（可选）
- `DEEPSEEK_EVALUATION_MODEL`：默认 `deepseek-v4-pro`（可选）

数据库连接后，第一次经过身份验证的学习请求会以 `CREATE TABLE IF NOT EXISTS` 初始化四张私有表。所有学习查询都绑定固定的 `owner_id`；公开作品页不会读取这些表。

## 隐私边界

- `/work` 与项目案例为公开内容。
- `/learn`、AI 对话、草稿、评分与证据使用服务端会话保护。
- 穿搭照片等个人媒体仍使用浏览器 IndexedDB，只保存在当前设备。
- 涉及真实顾客、患者、同事、公司或内部业务信息时，必须先匿名化。
