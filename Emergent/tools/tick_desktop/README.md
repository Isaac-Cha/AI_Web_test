# Tick 下载桌面程序（Windows）

用途：按“日期范围/按天/定时”从 Dukascopy 下载 XAUUSD tick 数据（CSV），并自动转为后端可导入的标准格式（`ts,bid,ask,volume`）。

依赖：
- Python 3.10+
- Node.js（用于运行 `npx dukascopy-node`）

启动：

```powershell
cd d:\Aiproject1\EA\website\Emergent\tools\tick_desktop
python .\tick_downloader_gui.py
```

