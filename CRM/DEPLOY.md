# CRM 系统 — 运维部署手册（宝塔 + Docker）

> **这份文档是给谁看的？**
> 给从未碰过 Node / NestJS / PostgreSQL 的运维同事。
> 只要会用宝塔面板和会复制粘贴命令，就能完整部署 CRM 系统。
>
> **不需要懂：** Node.js / pnpm / Prisma / NestJS / React
> **需要懂：** 怎么在宝塔面板装软件、怎么打开 Linux 终端、怎么复制粘贴命令

---

## 目录

1. [整体方案概览](#0-整体方案概览)
2. [服务器准备](#1-服务器准备)
3. [安装宝塔面板](#2-安装宝塔面板)
4. [安装 Docker（宝塔一键安装）](#3-安装-docker宝塔一键安装)
5. [上传项目代码](#4-上传项目代码)
6. [配置环境变量 `.env.production`](#5-配置环境变量-envproduction-极重要)
7. [首次启动](#6-首次启动)
8. [插入演示数据](#7-插入演示数据首次部署必做)
9. [访问验证 + 默认账号](#8-访问验证--默认账号)
10. [配置域名 + HTTPS（用宝塔反向代理）](#9-配置域名--https用宝塔反向代理)
11. [日常运维命令](#10-日常运维命令)
12. [常见问题排查](#11-常见问题排查)
13. [数据备份与恢复](#12-数据备份与恢复)
14. [完全重置（演示前彻底清空）](#13-完全重置演示前彻底清空)

---

## 0. 整体方案概览

CRM 系统由 **4 个容器**组成，全部用 Docker 跑：

| 容器名 | 作用 | 对外端口 |
|---|---|---|
| `crm-web` | 前端 + Nginx 静态服务 + API 反向代理 | **8080**（运维主要操作的入口）|
| `crm-api` | 后端 NestJS 服务 | 不对外，仅容器内访问 |
| `crm-postgres` | PostgreSQL 数据库 | 不对外，仅容器内访问 |
| `crm-redis` | Redis 缓存 | 不对外，仅容器内访问 |

**为什么这么设计？**
- 数据库和 API 不暴露端口 = 外网无法直接攻击
- 用户访问 `8080` → nginx → 转发到 api / 静态文件
- 用宝塔的 nginx 把 `80` / `443` 反向代理到 `8080`，挂上域名和 HTTPS

---

## 1. 服务器准备

### 推荐配置

| 项目 | 最低配置 | 推荐配置 |
|---|---|---|
| CPU | 2 核 | 4 核 |
| 内存 | 4 GB | 8 GB |
| 硬盘 | 40 GB SSD | 80 GB SSD |
| 系统 | CentOS 7.6+ 或 Ubuntu 20.04+ | **Ubuntu 22.04 LTS**（推荐，对 Docker 支持最好）|
| 带宽 | 3 Mbps | 5 Mbps |

### 必须开放的端口

在云服务器控制台的"安全组 / 防火墙"里开放以下端口：

| 端口 | 用途 |
|---|---|
| `22` | SSH 远程连接（建议改成非标准端口防扫描，例如 22022）|
| `80` | HTTP 访问 |
| `443` | HTTPS 访问 |
| `8888` | 宝塔面板 |

> ⚠️ 不要开放 `5432`（PostgreSQL）、`6379`（Redis）、`8080`（容器端口）、`3001`（API 内部端口） —— 这些都不应该让外网访问。

---

## 2. 安装宝塔面板

### 2.1 SSH 登录服务器

用你习惯的工具（Xshell / Termius / iTerm2）SSH 登录到服务器，登录后**确认你是 root 用户**：

```bash
whoami
# 应该输出: root
```

如果不是 root，先执行：

```bash
sudo -i
```

### 2.2 安装宝塔（一行命令）

**Ubuntu / Debian：**
```bash
wget -O install.sh https://download.bt.cn/install/install-ubuntu_6.0.sh && bash install.sh ed8484bec
```

**CentOS：**
```bash
yum install -y wget && wget -O install.sh https://download.bt.cn/install/install_6.0.sh && sh install.sh ed8484bec
```

> 安装时间约 5-10 分钟，途中如果问你 `Do you want to install Bt-Panel to the /www directory now? (y/n)`，输入 `y` 回车。

### 2.3 记录登录信息

安装完成后，终端会显示**外网面板地址、用户名、初始密码**，类似：

```
============================== Bt-Panel ==============================
外网面板地址: https://你的IP:8888/随机字符串
内网面板地址: https://内网IP:8888/随机字符串
username: 随机用户名
password: 随机密码
======================================================================
```

**截图这一段，单独保存好**，登录面板后第一件事建议立刻改密码。

### 2.4 第一次登录面板

浏览器打开"外网面板地址"，会提示"网站不安全"，是因为还没 HTTPS 证书，**点击"高级 → 继续访问"即可**。

登录后宝塔会自动弹出"推荐安装"窗口，**直接关掉，我们后面手动装 Docker 即可**。

---

## 3. 安装 Docker（宝塔一键安装）

> Docker 是把我们整个 CRM 系统打包好的容器引擎，运维不需要懂内部原理。

### 3.1 在宝塔里安装 Docker 管理器

1. 宝塔左侧菜单 → 点击 **「软件商店」**
2. 顶部搜索框输入：`Docker`
3. 找到 **「Docker 管理器」**，点击右侧 **「安装」** 按钮
4. 弹出版本选择，**选最新稳定版**，点 **「确定」**
5. 安装大约需要 3-5 分钟，期间不要关闭页面

### 3.2 验证 Docker 已装好

回到 SSH 终端，执行：

```bash
docker --version
docker compose version
```

**期望输出：**
```
Docker version 24.x.x, build xxxxx
Docker Compose version v2.x.x
```

如果两条命令都正常输出版本号，说明 Docker 已就绪。

> ⚠️ 注意：是 `docker compose`（中间有空格），不是老旧的 `docker-compose`（中间是横线）。这份文档全部用新的 `docker compose`。

---

## 4. 上传项目代码

### 4.1 把代码打包成 zip 上传

**开发者侧**（不是运维同事做）：

```bash
# 在项目根目录执行（开发者本地）
cd /path/to/CRM
git archive --format=zip --output=crm-deploy.zip HEAD
```

**或者**直接打包整个目录（如果还没用 git）：

```bash
cd /path/to/CRM
# Mac/Linux
zip -r crm-deploy.zip . -x "node_modules/*" "**/node_modules/*" "*.git*" ".env" ".env.production" "apps/*/dist/*"
```

得到 `crm-deploy.zip` 文件。

### 4.2 上传到服务器

**方式一：用宝塔文件管理上传（推荐运维使用）**

1. 宝塔左侧菜单 → 点击 **「文件」**
2. 进入 **`/www/wwwroot/`** 目录（宝塔默认网站目录）
3. 顶部菜单点 **「上传」**，选择刚才的 `crm-deploy.zip`
4. 上传完成后，**右键 zip 文件 → 解压**，解压后会得到一个文件夹（比如 `CRM`）

最终路径应该是：`/www/wwwroot/CRM/`

### 4.3 验证上传完整

回到 SSH 终端：

```bash
cd /www/wwwroot/CRM
ls -la
```

**应该看到以下关键文件/目录：**
```
docker-compose.prod.yml     ← 生产编排文件
.env.production.example     ← 环境变量模板
apps/                       ← 前后端代码
packages/                   ← 共享代码
package.json
pnpm-lock.yaml
```

如果有缺失，说明上传不完整，重新上传。

---

## 5. 配置环境变量 `.env.production`（极重要）

> ⚠️ **这一步如果做错，会触发"PostgreSQL 密码陷阱"，需要销毁数据重来。请务必先做这一步再启动！**

### 5.1 复制模板

```bash
cd /www/wwwroot/CRM
cp .env.production.example .env.production
```

### 5.2 生成一个安全的 JWT_SECRET

```bash
openssl rand -hex 32
```

**复制这一串输出（一长串字母数字），等会要用到。**

例如输出：`a3f7b9d2e4c6...`（共 64 个字符）

### 5.3 编辑 `.env.production`

**用宝塔文件管理编辑（最简单）：**

1. 宝塔左侧 → 「文件」 → 进入 `/www/wwwroot/CRM/`
2. 找到 `.env.production` 文件（如果看不到隐藏文件，点击右上角 **「显示隐藏文件」**）
3. 右键 → **「编辑」**
4. 把下面三个值改掉：

```ini
# ---- 数据库 ----
POSTGRES_PASSWORD=请改为一个强密码至少16位        ← 改成你自己设的密码，例如 Crm_Demo_2026_Strong
                                                  ⚠️ 改完后请单独记一下，将来备份/恢复要用

# ---- JWT 鉴权 ----
JWT_SECRET=请生成32位以上随机字符串                ← 粘贴你刚才 openssl rand -hex 32 的输出
```

5. 保存。

### 5.4 验证配置

```bash
cd /www/wwwroot/CRM
grep -E "POSTGRES_PASSWORD|JWT_SECRET" .env.production
```

**正确的样子（值都已经改过）：**
```
POSTGRES_PASSWORD=Crm_Demo_2026_Strong
JWT_SECRET=a3f7b9d2e4c6...（一长串）
```

**如果还看到"请改为..."的中文占位符，说明没改成功，回到 5.3 重新做。**

---

## 6. 首次启动

```bash
cd /www/wwwroot/CRM
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

**首次启动需要 5-15 分钟**，期间会做这些事：
1. 拉取基础镜像（Node、PostgreSQL、Redis、Nginx）
2. 在容器内安装项目依赖（约 700 个包）
3. 编译前端（React → 静态文件）
4. 编译后端（NestJS → JavaScript）
5. 启动所有容器
6. 自动执行数据库迁移（创建 34 张表）

**期间不要打断**。终端最后应该输出类似：

```
✔ Container crm-postgres     Healthy
✔ Container crm-redis        Healthy
✔ Container crm-api          Started
✔ Container crm-web          Started
```

**4 个容器都看到对应状态，就成功了。**

### 验证容器状态

```bash
docker ps
```

**期望看到 4 个容器都是 `Up xxx` 状态：**

```
NAMES         STATUS                    PORTS
crm-web       Up xx seconds            0.0.0.0:8080->80/tcp
crm-api       Up xx seconds            3001/tcp
crm-postgres  Up xx seconds (healthy)  5432/tcp
crm-redis     Up xx seconds (healthy)  6379/tcp
```

如果有容器状态是 `Restarting`，跳到[第 11 节 — 常见问题排查](#11-常见问题排查)。

---

## 7. 插入演示数据（首次部署必做）

容器虽然起来了，但数据库是空的，**没有任何账号、没有任何数据**。
此时如果打开页面登录，会显示"账号或密码不正确"。

执行：

```bash
docker exec -w /repo/apps/api crm-api npx prisma db seed
```

**期望输出：**
```
Seed users created. Default password: Crm@2026
Lead source configs seeded.
Rich demo data seeded ([DEMO]). Login as sales 13800000003 / admin 13800000001 — password Crm@2026
🌱  The seed command has been executed.
```

> 这个命令做了两件事：
> 1. 创建 3 个默认账号（admin / manager / sales）
> 2. 插入一批演示客户、线索、商机数据（带 `[DEMO]` 标记），方便给别人演示系统

---

## 8. 访问验证 + 默认账号

### 8.1 打开浏览器测试

浏览器访问：`http://你的服务器IP:8080`

应该看到 CRM 登录页面。

### 8.2 默认账号

| 角色 | 手机号 | 密码 |
|---|---|---|
| **管理员** | `13800000001` | `Crm@2026` |
| **销售主管** | `13800000002` | `Crm@2026` |
| **销售员** | `13800000003` | `Crm@2026` |

> 演示完成后建议**立刻在系统设置里改默认密码**，不要在生产环境用默认密码。

### 8.3 测试 API 通畅

```bash
curl http://localhost:8080/api/v1/health
```

**期望输出：**
```json
{"code":0,"message":"success","data":{"status":"ok","timestamp":"..."}}
```

---

## 9. 配置域名 + HTTPS（用宝塔反向代理）

> 走到这一步，你已经能通过 `http://IP:8080` 访问 CRM。
> 这一节是把它绑定到真实域名（比如 `crm.your-company.com`）并自动 HTTPS。

### 9.1 域名解析

在域名服务商（阿里云/腾讯云/Cloudflare）控制台：
- 添加一条 A 记录：`crm` → 服务器公网 IP
- TTL 默认即可
- 等待 5-10 分钟生效

### 9.2 在宝塔添加站点

1. 宝塔左侧菜单 → 点击 **「网站」**
2. 顶部右上角 → 点击 **「添加站点」**
3. 填写：
   - **域名**：`crm.your-company.com`（你的真实域名）
   - **根目录**：随意，比如 `/www/wwwroot/crm-placeholder`（用于宝塔占位，实际不会用到）
   - **PHP 版本**：选「纯静态」
   - **数据库**：「不创建」
4. 点 **「提交」**

### 9.3 配置反向代理

1. 在「网站」列表里，找到刚创建的 `crm.your-company.com`，点击 **「设置」**
2. 左侧菜单选 **「反向代理」**
3. 点 **「添加反向代理」**，填写：
   - **代理名称**：`crm-app`（随便）
   - **目标 URL**：`http://127.0.0.1:8080`
   - **发送域名**：保持 `$host`
4. 点 **「提交」**

### 9.4 申请 HTTPS 证书（免费）

1. 在站点设置左侧菜单 → 点 **「SSL」**
2. 选 **「Let's Encrypt」** 选项卡
3. 勾选你的域名 → 点 **「申请」**
4. 等待 30 秒左右，提示申请成功
5. **打开「强制 HTTPS」开关**

### 9.5 验证

浏览器访问：`https://crm.your-company.com`

应该看到 CRM 登录页面，地址栏有🔒小锁标志，说明 HTTPS 生效。

---

## 10. 日常运维命令

> 以下命令必须在项目根目录（`/www/wwwroot/CRM`）里执行。

### 推荐方式：用 `pnpm prod:*` 简短命令

**前提**：服务器装了 Node + pnpm。如果没装，跳到下面的"完整 docker compose 命令"。

```bash
# 启动（首次或更新代码后用，自动重建镜像）
pnpm prod:up

# 停止（数据保留）
pnpm prod:down

# 重启所有容器（不重建镜像，改了 .env 后用）
pnpm prod:restart

# 实时看日志（Ctrl+C 退出，不影响容器运行）
pnpm prod:logs

# 看容器状态
pnpm prod:status

# 重新跑 seed（演示数据被改乱后恢复）
pnpm prod:seed

# 完全重置：销毁所有数据 + 重启（演示前用，全清空）
pnpm prod:reset
```

### 备用方式：完整 docker compose 命令（不装 pnpm 也能用）

```bash
# 启动
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build

# 停止
docker compose --env-file .env.production -f docker-compose.prod.yml down

# 重启
docker compose --env-file .env.production -f docker-compose.prod.yml restart

# 日志
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f

# 状态
docker compose --env-file .env.production -f docker-compose.prod.yml ps

# 重新跑 seed
docker exec -w /repo/apps/api crm-api npx prisma db seed

# 完全重置
docker compose --env-file .env.production -f docker-compose.prod.yml down -v && \
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

> ⚠️ **必须每条命令都带 `--env-file .env.production`**，不带的话会报错 `POSTGRES_PASSWORD is missing a value`。

### 看单个容器的日志

```bash
docker logs crm-api --tail 100      # 看 API 最后 100 行
docker logs crm-api -f              # 实时跟随 API 日志
docker logs crm-postgres            # 看数据库日志
docker logs crm-web                 # 看 nginx 日志
```

---

## 11. 常见问题排查

### 11.1 ❌ `P1000: Authentication failed against database server`

**症状：** API 容器不停重启，docker logs 看到上面这条错。

**原因：** PostgreSQL 第一次启动时记住了**旧的密码**（可能是模板里的中文占位符），后来改了 `.env.production` 也不会影响已经初始化的数据库密码。

**解决方案：** 销毁数据库 volume 重新初始化（**会清空数据**）：

```bash
cd /www/wwwroot/CRM
docker compose --env-file .env.production -f docker-compose.prod.yml down -v
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
docker exec -w /repo/apps/api crm-api npx prisma db seed
```

如果数据库里已经有重要数据，**不要这么做**，改用：
```bash
# 进入 postgres 容器手动改密码（需要知道当前密码）
docker exec -it crm-postgres psql -U crm -d crm -c "ALTER USER crm WITH PASSWORD '新密码';"
# 然后改 .env.production 的 POSTGRES_PASSWORD 为新密码
# 重启 api
docker compose --env-file .env.production -f docker-compose.prod.yml restart api
```

---

### 11.2 ❌ 浏览器访问显示 `502 Bad Gateway`

**症状：** 前端能打开但 API 请求全失败，nginx 报 502。

**原因：** API 容器没正常启动。

**排查步骤：**

```bash
# 1. 看 API 容器状态
docker ps -a | grep crm-api

# 2. 看 API 日志（找红色 Error 行）
docker logs crm-api --tail 50
```

**常见子原因：**
- 数据库认证失败 → 看 11.1
- 端口冲突 → 看 11.3
- 镜像没构建好 → 重新执行 `pnpm prod:up`

---

### 11.3 ❌ `port is already allocated` / `address already in use`

**症状：** 启动时报某个端口被占用。

**解决方案：**

```bash
# 看是谁在占用 8080 端口
lsof -i :8080
# 或者
netstat -tunlp | grep 8080

# 找到 PID 后 kill（替换 PID 为实际数字）
kill -9 PID
```

如果是宝塔自带的 nginx 占用了 80 端口（这是正常的，我们用 8080 不冲突），不需要处理。

---

### 11.4 ❌ 登录显示"账号或密码不正确"

**原因：** 数据库里没有用户数据（没跑 seed）。

**解决方案：**

```bash
docker exec -w /repo/apps/api crm-api npx prisma db seed
```

跑完后用 `13800000001` / `Crm@2026` 试登录。

---

### 11.5 ❌ 演示数据被人改乱了，怎么恢复

```bash
docker exec -w /repo/apps/api crm-api npx prisma db seed
```

`seed` 命令会**自动清掉旧的 DEMO 数据**（带 `[DEMO]` 标记的客户、线索）并重新插入初始演示数据。
**用户、自定义字段、配置不会被清掉**，所以放心跑。

---

### 11.6 ❌ Docker 构建时下载特别慢

**原因：** 国内访问 Docker Hub 慢。

**解决方案：** 配置国内镜像源。

```bash
# 创建/编辑 daemon 配置
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<EOF
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://dockerproxy.com",
    "https://docker.nju.edu.cn"
  ]
}
EOF

# 重启 Docker
systemctl restart docker
```

然后重新执行 `pnpm prod:up`。

---

### 11.7 ❌ 磁盘空间不够

```bash
# 查看 Docker 占用
docker system df

# 清理无用镜像、容器、网络
docker system prune -a

# 清理 build cache
docker builder prune -a
```

---

### 11.8 ❌ 改了代码怎么部署上去

**前提：** 开发者重新上传了新代码 zip 并解压到 `/www/wwwroot/CRM/`。

```bash
cd /www/wwwroot/CRM
pnpm prod:up      # 会自动重建镜像并重启
# 等待 5-10 分钟构建完成

# 如果新代码加了新的数据库 migration，会自动应用，无需手动操作
```

---

## 12. 数据备份与恢复

### 12.1 备份数据库

```bash
# 备份到当前目录，文件名带日期
docker exec crm-postgres pg_dump -U crm -d crm > crm-backup-$(date +%Y%m%d-%H%M%S).sql
```

**强烈建议**：用宝塔 → 计划任务 → 添加每天自动备份的 Shell 任务：

```bash
cd /www/wwwroot/CRM
docker exec crm-postgres pg_dump -U crm -d crm > /www/backup/crm-$(date +\%Y\%m\%d).sql
# 只保留最近 7 天
find /www/backup/ -name "crm-*.sql" -mtime +7 -delete
```

### 12.2 备份上传的文件

```bash
# 上传文件在容器 volume 里，需要从容器复制出来
docker cp crm-api:/repo/apps/api/uploads /www/backup/crm-uploads-$(date +%Y%m%d)
```

### 12.3 恢复数据库

```bash
# 假设备份文件是 crm-backup.sql
cat crm-backup.sql | docker exec -i crm-postgres psql -U crm -d crm
```

---

## 13. 完全重置（演示前彻底清空）

> 这个操作会**删除数据库所有数据 + 上传的所有文件**，仅适合演示前重置环境。

```bash
cd /www/wwwroot/CRM
pnpm prod:reset      # 销毁 volume + 重启
docker exec -w /repo/apps/api crm-api npx prisma db seed   # 重新插演示数据
```

完成后系统回到全新的演示状态。

---

## 附录：联系开发者

如果以上所有方案都不能解决问题，把以下信息发给开发者：

```bash
# 在服务器上跑这一段，把输出全部复制粘贴发给开发者
echo "==== 系统信息 ===="
uname -a
docker --version
docker compose version
echo ""
echo "==== 容器状态 ===="
docker ps -a
echo ""
echo "==== API 日志最后 100 行 ===="
docker logs crm-api --tail 100 2>&1
echo ""
echo "==== Web 日志最后 50 行 ===="
docker logs crm-web --tail 50 2>&1
echo ""
echo "==== Postgres 日志最后 30 行 ===="
docker logs crm-postgres --tail 30 2>&1
```
