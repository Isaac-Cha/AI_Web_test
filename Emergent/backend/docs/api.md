# Emergent Backend API

Base path：`/api`

## 认证（写入接口）

写入/删除接口都在 `/api/admin/*` 下，需要请求头：

- `X-Admin-Token: <ADMIN_TOKEN>`

服务端通过环境变量 `ADMIN_TOKEN` 配置。

## EA

### 列表

- `GET /api/eas`
  - Query：`include_draft=false|true`（默认 false）

### 详情

- `GET /api/eas/{ea_id}`

### 新建/更新/删除（后台上传）

- `POST /api/admin/eas`
- `PUT /api/admin/eas/{ea_id}`
- `DELETE /api/admin/eas/{ea_id}`

Payload 字段（示例）：

```json
{
  "id": "ea-xxx",
  "sort": 10,
  "status": "published",
  "name_zh": "示例EA",
  "name_en": "Example EA",
  "symbol": "XAUUSD",
  "platform": "MT4 / MT5",
  "profit_monthly": "8-15%",
  "max_drawdown": "12%",
  "risk_level": "中等 Medium",
  "strategy_zh": "...",
  "strategy_en": "...",
  "min_capital": "$1000",
  "cooperation_zh": "...",
  "cooperation_en": "...",
  "cover": "https://...",
  "equity": [0, 2, 5],
  "features_zh": ["..."],
  "features_en": ["..."],
  "setup_zh": "...",
  "setup_en": "..."
}
```

## 指标

- `GET /api/indicators`
- `GET /api/indicators/{ind_id}`
- `POST /api/admin/indicators`
- `PUT /api/admin/indicators/{ind_id}`
- `DELETE /api/admin/indicators/{ind_id}`

## 教学

- `GET /api/tutorials`
- `POST /api/admin/tutorials`
- `PUT /api/admin/tutorials/{t_id}`
- `DELETE /api/admin/tutorials/{t_id}`

## 线索表单

- `POST /api/submissions`
- `GET /api/submissions`

## 在线接口文档

FastAPI 自带：
- Swagger UI：`/docs`
- OpenAPI JSON：`/openapi.json`

