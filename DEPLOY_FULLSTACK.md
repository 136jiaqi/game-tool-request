# XMODhub.com 全球多语言版部署手册

本交付包是完整的“前端 + 后端 + 数据库”应用，不依赖 Streamlit。

- 前端：React + Vite，生产文件位于 `dist/`
- 后端：FastAPI + Uvicorn，入口 `backend/app.py`
- 数据库：SQLite，默认 `/opt/xmodhub-tool-request/data/xmodhub.db`
- Steam：由后端实时访问 Steam 商店，浏览器不直接访问 Steam
- 钉钉：用户提交先写数据库，接口立即返回；Webhook 在后台同步
- 语言：URL 参数 → 用户保存的选择 → 浏览器语言 → 默认英语；不读取访问 IP

本交付只需部署一套全球版代码。浏览器语言为简体中文时显示简中，为繁体中文时显示繁中，英语浏览器显示英语，其他浏览器语言回退英语。用户可在顶部手动切换简中、繁中和英语，选择保存在当前设备。

## 一、服务器要求

推荐 Ubuntu 22.04/24.04 LTS，至少 2 核 CPU、2 GB 内存、20 GB 磁盘。开放 80/443，勿向公网开放 8501。

服务器必须能出站访问：

- `store.steampowered.com:443`
- `connector.dingtalk.com:443`

## 二、安装系统依赖

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip nginx unzip curl sqlite3 certbot python3-certbot-nginx
sudo useradd --system --create-home --shell /usr/sbin/nologin xmodhub || true
sudo mkdir -p /opt/xmodhub-tool-request
sudo chown -R xmodhub:xmodhub /opt/xmodhub-tool-request
```

## 三、上传并解压代码包

将 ZIP 上传到 `/tmp/xmodhub-global-fullstack.zip`：

```bash
sudo -u xmodhub unzip /tmp/xmodhub-global-fullstack.zip -d /opt/xmodhub-tool-request
cd /opt/xmodhub-tool-request
test -f backend/app.py && test -f backend/schema.sql && test -f dist/index.html
```

若 ZIP 解压后多了一层同名目录，请把该目录中的全部文件移动到 `/opt/xmodhub-tool-request/`，确保上述三个文件路径正确。

## 四、安装后端依赖

```bash
cd /opt/xmodhub-tool-request
sudo -u xmodhub python3 -m venv .venv
sudo -u xmodhub .venv/bin/pip install --upgrade pip
sudo -u xmodhub .venv/bin/pip install -r backend/requirements.txt
```

生产包已包含 `dist/`，运维无需安装 Node.js。只有修改前端源码时才执行 `npm ci && npm run build`。

## 五、配置环境变量

```bash
sudo -u xmodhub cp backend/.env.example backend/.env
sudo -u xmodhub nano backend/.env
```

推荐配置：

```env
DATABASE_PATH=/opt/xmodhub-tool-request/data/xmodhub.db
DINGTALK_WEBHOOK_URL=https://connector.dingtalk.com/webhook/flow/替换为真实地址
ALLOWED_ORIGINS=https://xmodhub.com,https://www.xmodhub.com
FRONTEND_DIR=/opt/xmodhub-tool-request/dist
TRUST_PROXY_HEADERS=true
```

```bash
sudo mkdir -p /opt/xmodhub-tool-request/data
sudo chown -R xmodhub:xmodhub /opt/xmodhub-tool-request/data
sudo chmod 600 /opt/xmodhub-tool-request/backend/.env
```

不要把真实 Webhook 写入 GitHub。它属于服务器运行时密钥，不是 GitHub Actions Secret；除非部署流程明确从 Actions 注入服务器环境变量。

## 六、启动 systemd 服务

```bash
sudo cp deploy/xmodhub-tool-request.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now xmodhub-tool-request
sudo systemctl status xmodhub-tool-request --no-pager
curl http://127.0.0.1:8501/api/health
```

首次启动会自动创建 SQLite 表。健康接口应返回 `ok: true` 和 `database: ok`。

## 七、配置 Nginx 和 HTTPS

如果 XMODhub.com 已有主站，不要覆盖原 `server` 块，只把 `deploy/nginx-xmodhub.conf` 中的两个 `location` 合并进现有 HTTPS `server` 块。

新站可参考：

```bash
sudo cp deploy/nginx-xmodhub.conf /etc/nginx/sites-available/xmodhub-tool-request
sudo ln -s /etc/nginx/sites-available/xmodhub-tool-request /etc/nginx/sites-enabled/xmodhub-tool-request
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d xmodhub.com -d www.xmodhub.com
```

必须同时代理：

- `/tool-request/` → `127.0.0.1:8501`
- `/api/` → `127.0.0.1:8501`

缺少 `/api/` 代理会导致页面能打开但无法识别游戏或提交。

## 八、语言规则

本版本不根据访问 IP 选择语言，优先级如下：

- URL 参数：`?lang=zh-CN`、`?lang=zh-TW`、`?lang=en`。
- 用户之前通过顶部菜单保存的语言。
- 浏览器语言：`zh-CN/zh-Hans/zh-SG` → 简中；`zh-TW/zh-HK/zh-MO/zh-Hant` → 繁中；`en-*` → 英语。
- 其他语言或无法识别时默认英语。

测试默认语言时请使用无痕窗口，或先清除 `xmodhub_language` 本地存储；否则用户之前保存的语言会优先于浏览器语言。

## 九、Steam 实时查询验收

```bash
curl -I --max-time 15 https://store.steampowered.com/
curl --max-time 30 http://127.0.0.1:8501/api/steam/game/2507980
```

第二条应返回游戏名称及 `supportedLanguages`。如果超时或 502，是服务器到 Steam 的出站网络问题，不是前端问题。应配置合规的境外出口/代理，并在 `backend/.env` 中设置标准 `HTTPS_PROXY`，再重启服务。

## 十、提交和数据库验收

先在网页完成一次真实测试，再检查：

```bash
sudo -u xmodhub sqlite3 /opt/xmodhub-tool-request/data/xmodhub.db \
  "SELECT submission_id,app_id,webhook_status,created_at FROM submissions ORDER BY created_at DESC LIMIT 10;"
sudo journalctl -u xmodhub-tool-request -n 100 --no-pager
```

页面提交成功只表示数据库已保存。`webhook_status` 会从 `pending` 更新为 `success`、`partial`、`failed` 或 `not_configured`。钉钉失败不影响数据库留存。

## 十一、上线验收清单

- `https://xmodhub.com/tool-request/` 可打开，刷新子路由不 404
- `https://xmodhub.com/api/health` 返回正常
- 简中、繁中、英文浏览器首次访问显示对应语言，其他浏览器默认英语
- 用户手动切换语言后刷新仍保持所选语言
- 输入有效 Steam 商店链接能实时识别游戏和界面支持语言
- 提交按钮能在合理时间内成功，不再一直“提交中”
- SQLite 出现新记录，钉钉随后出现对应记录
- 手机和电脑端背景、文字、下拉框均清晰可读

## 十二、备份、更新和排障

在线备份 SQLite：

```bash
sudo mkdir -p /var/backups/xmodhub
sudo -u xmodhub sqlite3 /opt/xmodhub-tool-request/data/xmodhub.db \
  ".backup '/var/backups/xmodhub/xmodhub-$(date +%F-%H%M).db'"
```

更新代码前先备份数据库；不要覆盖 `backend/.env` 和 `data/xmodhub.db`。更新后：

```bash
cd /opt/xmodhub-tool-request
sudo -u xmodhub .venv/bin/pip install -r backend/requirements.txt
sudo systemctl restart xmodhub-tool-request
sudo nginx -t && sudo systemctl reload nginx
```

常用排障命令：

```bash
sudo journalctl -u xmodhub-tool-request -f
sudo tail -f /var/log/nginx/error.log
curl -v http://127.0.0.1:8501/api/health
curl -v https://xmodhub.com/api/health
```

安全注意事项：只开放 80/443；保护 `.env`；定期备份数据库；限制日志中的联系方式与 Webhook；8501 仅监听本机，不对公网开放。
