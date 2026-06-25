# NewAPI 运维指南

> 国内主机 124.220.63.115 + Package 站 chat 转发
> Owner: 虾 | 2026-06-25

## 主机信息

| 项目 | 值 |
|---|---|
| 公网 IP | 124.220.63.115 |
| 区域 | 上海 |
| 配置 | 腾讯云轻量 2C4G / SSD 50GB / 5M |
| 系统 | Ubuntu 24.04 LTS |
| SSH key | `~/.ssh/newapi_prod` (ed25519) |
| SSH 用户 | `ubuntu` (sudo 免密) |

## 服务清单

| 服务 | 端口 | 状态命令 |
|---|---|---|
| NewAPI (Docker) | 3000 | `cd /opt/newapi && sudo docker compose ps` |
| Caddy 反代 | 80/443 | `sudo systemctl status caddy` |
| UFW 防火墙 | - | `sudo ufw status` |

## NewAPI 凭据（本地 `/tmp/`，不上 git）

```
/tmp/shrimp_token       # admin user.access_token (32 字符)
/tmp/business_token     # 业务 token (48 字符，给前端用)
/root/newapi/.env.keys  # 7 家上游 API Key (600 权限)
```

## 7 家上游 channel

```bash
sqlite3 /opt/newapi/data/one-api.db 'SELECT id, name, type, base_url, status FROM channels'
```

| ID | 名称 | type | base_url | 状态 |
|---|---|---|---|---|
| 1 | 硅基流动 | 40 | https://api.siliconflow.cn | ✅ |
| 2 | 智谱AI | 26 | https://open.bigmodel.cn | ✅ |
| 3 | Moonshot | 25 | https://api.moonshot.cn | ✅ |
| 4 | OpenRouter | 20 | https://openrouter.ai/api | ⚠️ CN 403 |
| 5 | 字节火山 | 45 | https://ark.cn-beijing.volces.com/api | ⚠️ endpoint 占位 |
| 6 | 百川 | 1 | https://api.baichuan-ai.com | ✅ |
| 7 | 阶跃 | 1 | https://api.stepfun.com | ✅ |

## 常用命令

### 测 NewAPI
```bash
# diag (7 家)
ssh -i ~/.ssh/newapi_prod ubuntu@124.220.63.115 'node /opt/newapi/diag.js | tail -40'

# chat 测试
BIZ=$(ssh -i ~/.ssh/newapi_prod ubuntu@124.220.63.115 'cat /tmp/business_token')
curl -s -m 30 -H "Authorization: Bearer $BIZ" -H "Content-Type: application/json" \
  -X POST http://124.220.63.115/v1/chat/completions \
  -d '{"model":"glm-4-flash","messages":[{"role":"user","content":"hi"}],"max_tokens":20}'
```

### 改上游 API Key
```bash
# 1. 改 /root/newapi/.env.keys（600 权限）
ssh -i ~/.ssh/newapi_prod ubuntu@124.220.63.115
sudo nano /root/newapi/.env.keys
# 改 SILICONFLOW_API_KEY=xxx 等

# 2. 直接 UPDATE channels 表
sqlite3 /opt/newapi/data/one-api.db "UPDATE channels SET key='<新key>' WHERE id=1"

# 3. 重启 NewAPI 让 key 生效
cd /opt/newapi && sudo docker compose restart
```

### 加新上游 channel
```bash
# 用 Python 直写（绕过 v1.0.0-rc.15 已知 panic bug）
ssh -i ~/.ssh/newapi_prod ubuntu@124.220.63.115 'sudo python3 << "EOF"
import sqlite3, time
c = sqlite3.connect("/opt/newapi/data/one-api.db")
c.execute("""INSERT INTO channels (
    type, key, status, name, weight, created_time,
    base_url, models, "group", priority, auto_ban,
    channel_info, settings, setting, other_info, tag,
    model_mapping, status_code_mapping, header_override, param_override,
    open_ai_organization, test_model, other
) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""", (
    40, "sk-xxx", 1, "新上游", 100, int(time.time()),
    "https://api.example.com", "model-1,model-2", "default", 50, 1,
    None, None, None, None, None, None, None, None, None,
    None, None, ""
))
c.commit()
EOF'

# 然后 sync 到 abilities
curl -s -X POST -H "Authorization: Bearer $(cat /tmp/shrimp_token)" \
  -H "New-Api-User: 1" http://127.0.0.1:3000/api/channel/fix
```

### 备份恢复

```bash
# 手动备份
ssh -i ~/.ssh/newapi_prod ubuntu@124.220.63.115 'sudo bash /opt/newapi/backup.sh'

# 列出备份
ssh -i ~/.ssh/newapi_prod ubuntu@124.220.63.115 'ls -lh /opt/newapi/backups/'

# 恢复（停 NewAPI → 解压 → 起）
ssh -i ~/.ssh/newapi_prod ubuntu@124.220.63.115 '
  cd /opt/newapi
  sudo docker compose down
  sudo tar -xzf /opt/newapi/backups/one-api-YYYYMMDD_HHMMSS.tar.gz \
    -C /opt/newapi/data one-api.db --strip-components=0
  sudo docker compose up -d
'
```

## 故障排查

### NewAPI 502 / 无法访问
```bash
# 1. 看容器状态
ssh ... 'cd /opt/newapi && sudo docker compose ps'
# 2. 看日志
ssh ... 'sudo docker logs newapi --tail 50'
# 3. 重启
ssh ... 'cd /opt/newapi && sudo docker compose restart'
```

### 某个 channel 失败
```bash
# 1. 跑 diag 找出失败的 channel
ssh ... 'node /opt/newapi/diag.js'
# 2. 直接 curl 该 channel 测试
#    比如硅基流动失败：
SF_KEY=$(ssh ... 'grep SILICONFLOW_API_KEY /root/newapi/.env.keys | cut -d= -f2-')
curl -s -m 30 -H "Authorization: Bearer $SF_KEY" \
  https://api.siliconflow.cn/v1/chat/completions \
  -d '{"model":"deepseek-ai/DeepSeek-V4-Flash","messages":[{"role":"user","content":"hi"}],"max_tokens":20}'
# 3. 看 NewAPI 日志确认是上游报错还是配置错
ssh ... 'sudo docker logs newapi --tail 30 | grep -A 3 "channel #1"'
```

### /v1/models 只列少量 model
```bash
# 1. 看 SelfUseModeEnabled
sqlite3 /opt/newapi/data/one-api.db "SELECT key, value FROM options"
# 2. 开自用模式
sqlite3 /opt/newapi/data/one-api.db "UPDATE options SET value='true' WHERE key='SelfUseModeEnabled'"
# 3. 重启
ssh ... 'cd /opt/newapi && sudo docker compose restart'
```

### Package 站 chat 报错
```bash
# 1. 看 Vercel Function 日志
#    浏览器打开 https://vercel.com/dashboard → package-hub → Logs
# 2. 看 NewAPI 是否能直接调
BIZ=...
curl ... http://124.220.63.115/v1/chat/completions ...
# 3. 看 Vercel env var 是否还配着
#    Vercel Dashboard → package-hub → Settings → Environment Variables
#    NEWAPI_URL = http://124.220.63.115
#    NEWAPI_KEY = 0tqOnnIoH2e7AsdTns1IKVea3AeEZTVt3C61yTXTqWs9rw7L
```

## 已知坑（v1.0.0-rc.15）

1. **token 字段**：用 `users.access_token` (char(32))，不是 OpenAI 风格 51 字符
2. **channel_info Scan bug**：直写 SQLite 时 channel_info 设 NULL（不是 '{}' 字符串）
3. **base_url 不带 /v1**：拼 URL 时 NewAPI 自己加，重复了 404
4. **channel.type 需专用码**：硅基=40, 智谱V4=26, Moonshot=25, OpenRouter=20, 火山=45, OpenAI=1
5. **SelfUseModeEnabled 默认关**：/v1/models 只列已配 billing 的 model，要 UPDATE options + restart

## 升级 NewAPI

```bash
# 1. 备份
ssh ... 'sudo bash /opt/newapi/backup.sh'

# 2. 拉新版
ssh ... 'cd /opt/newapi && sudo docker compose pull'

# 3. 重启
ssh ... 'cd /opt/newapi && sudo docker compose up -d'

# 4. 跑 diag 验证
ssh ... 'node /opt/newapi/diag.js'
```

