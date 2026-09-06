# 财务仪表盘（Web 版）

多端同步的财务看板：数据存于 **Supabase**，前端部署在 **GitHub Pages**，支持邮箱登录、拖拽重排布局、在线添加/导入数据。

## 文件说明
| 文件 | 作用 |
| --- | --- |
| `index.html` | 页面结构（登录 / 仪表盘 / 添加数据 / 导入 CSV） |
| `styles.css` | 主题样式（配色抽成 `:root` 变量，改深色/玻璃风只动这一处） |
| `app.js` | 前端逻辑（Supabase 客户端、认证、图表、CSV 导入、默认值调整） |
| `supabase-schema.sql` | 建表 + 行级安全（RLS）语句 |
| `seed.csv` | 你现有的 10 个月数据（首次迁移用） |
| `chart.umd.min.js` | 本地化的 Chart.js（无 CDN 依赖） |
| `supabase.min.js` | 本地化的 Supabase 客户端（本地模式零网络依赖） |

## 一、创建 Supabase 后端
1. 打开 https://supabase.com → New Project，建一个项目。
2. 左侧 **SQL Editor** → 新建查询 → 粘贴 `supabase-schema.sql` 全部内容 → **Run**。
   - 这会建 `finance_records` 表，并开启 RLS（每个用户只能看/改自己的数据）。
3. 左侧 **Authentication → Providers**，确认 **Email** 已开启（默认开启）。
4. 左侧 **Project Settings → API**：复制
   - `Project URL` → 填入 `app.js` 的 `SUPABASE_URL`
   - `anon public` key → 填入 `app.js` 的 `SUPABASE_ANON_KEY`

## 二、首次导入历史数据
1. 用 GitHub Pages 地址打开网站（见下文部署），点底部「**云端同步**」→「注册」用邮箱+密码建账号。
2. 登录后点底部「**导入**」→ 选择本仓库里的 `seed.csv` → 导入。
   - 这会把你现有的 10 个月数据写入你的账号。（之后新增月份用「+ 记录」即可。）

## 三、部署到 GitHub Pages

### 方式 A：命令行（推荐）

本目录已经初始化 git 仓库，你只需要：

1. 在 GitHub 新建一个**公开**仓库（如 `finance-dashboard`）。
   - 不要勾选 README、.gitignore 等，保持空仓库。
2. 在本目录执行：
   ```bash
   git remote add origin https://github.com/你的用户名/finance-dashboard.git
   git push -u origin main
   ```
3. 仓库 **Settings → Pages** → Source 选 `main` / `(root)` → Save。
4. 等 1-2 分钟，访问 `https://你的用户名.github.io/finance-dashboard/` 即可。

### 方式 B：GitHub 网页直接上传

如果你不想用命令行：

1. GitHub 新建公开仓库 → 进入仓库页面。
2. 把本目录的 8 个文件拖进网页上传区（或点 `+` → `Upload files`）：
   `index.html`、`styles.css`、`app.js`、`chart.umd.min.js`、`supabase.min.js`、`seed.csv`、`supabase-schema.sql`、`README.md`
3. **Settings → Pages** → Source 选 `main` / `(root)` → Save。
4. 等 1-2 分钟即可访问。

## 四、日常使用
- **多端同步**：任意设备浏览器打开上面的网址，登录同一账号，数据一致。
- **添加一个月**：点「+ 添加数据」填 14 项（车贷/房贷期数自动累加），保存即刷新所有图表。
- **拖拽布局**：拖动任意卡片标题可重排，顺序自动记住（按账号分别保存）。
- **想换风格**：改 `styles.css` 顶部 `:root` 变量（例如把 `--bg/--card/--accent` 换成深色或玻璃拟态配色）即可。

## 备注
- GitHub Pages 站点本身是公开可访问的，但**数据受 Supabase RLS 保护**，未登录看不到任何内容，且每人只能看自己的数据。
- `anon` key 暴露在前端是 Supabase 的正常设计，真正的安全靠 RLS 策略（已配置）。
