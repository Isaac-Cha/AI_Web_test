# Tick/订单记录工具（优先级最高）

目标：把观摩账号的订单与 `XAUUSD` tick 数据同步到后端，用于生成 EA 详情页的收益曲线、浮亏/回撤等指标。

## 当前实现（最小可行管道）

后端已提供两个写入接口（需要 `X-Admin-Token`）：

- `POST /api/admin/ticks/xauusd/batch`
  - Body：`[{ ts, bid, ask, volume? }, ...]`
- `POST /api/admin/accounts/{account_id}/orders/batch`
  - Body：`[{ ticket, symbol, side, volume, open_time, open_price, close_time?, close_price?, profit?, swap?, commission? }, ...]`

收益曲线计算接口：`GET /api/accounts/{account_id}/equity` 目前为占位（后续实现 tick 级计算）。

## 从 Dukascopy 下载 tick（CSV）

如果你手上是 MT4 的 `.fxt` 文件且无法转码，建议直接从 Dukascopy 下载 `tick` 数据为 CSV。

安装要求：本机已安装 Node.js。

示例（下载 XAUUSD，按天分文件，CSV）：

```powershell
cd .\Emergent\tools\tick_recorder
powershell -ExecutionPolicy Bypass -File .\download_dukascopy_ticks.ps1 -Instrument xauusd -From 2026-04-01 -To 2026-04-03 -OutDir .\download
```

下载完成后，将 Dukascopy 输出的 tick CSV 转为后端导入格式（`ts,bid,ask,volume?`）：

```powershell
python .\convert_dukascopy_tick_csv.py --in .\download\xauusd\xauusd_2026-04-01.csv --out .\download\xauusd\xauusd_2026-04-01_norm.csv
```

再导入后端：

```powershell
$env:BACKEND_URL='http://127.0.0.1:8000'
$env:ADMIN_TOKEN='your-admin-token'
$env:TICKS_CSV='.\download\xauusd\xauusd_2026-04-01_norm.csv'
python .\import_ticks_csv.py
```

## 数据来源建议

你现在有 2026-04-01 之前的历史数据；从 04-01 起可以用工具持续记录并后补。

推荐做法：
- 先定义本地落盘格式（CSV/Parquet），再批量导入后端（断点续传更稳）
- tick 数据量大，优先按“分钟/5分钟采样 + 原始 tick 分表”两层策略

## 下一步需要你确认

- 观摩账号平台：MT4 还是 MT5？是否能导出 `orders`/`deals`/`ticks`（CSV 或 API）
- tick 字段：是否包含 `bid/ask/last/volume`？时间戳精度是秒还是毫秒？
- 需要展示的曲线：
  - 余额曲线（Balance）
  - 净值曲线（Equity）
  - 浮动盈亏（Floating PnL）
  - 回撤（Drawdown）
