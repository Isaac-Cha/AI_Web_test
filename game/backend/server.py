"""办二 Show Thumb - 独立 FastAPI 应用。
与 EA 主站 (8000) 完全独立，默认监听 127.0.0.1:8001。
启动:
  uvicorn game.backend.server:app --host 127.0.0.1 --port 8001
"""
from __future__ import annotations

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

# 加载当前目录 .env（若存在）
_env_path = Path(__file__).parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
)
log = logging.getLogger("show_thumb.server")

HOST = os.getenv("GAME_HOST", "127.0.0.1")
PORT = int(os.getenv("GAME_PORT", "8001"))
CORS = os.getenv("GAME_CORS_ORIGINS", "").strip()

app = FastAPI(title="办二 Show Thumb Game API", version="1.0.0")

if CORS:
    origins = [o.strip() for o in CORS.split(",") if o.strip()]
    if origins == ["*"] or "*" in origins:
        origins = ["*"]
    if origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

# 路由
from .routes_http import router as http_router  # noqa: E402
from .routes_ws import router as ws_router  # noqa: E402

app.include_router(http_router)
app.include_router(ws_router)


@app.get("/")
async def root():
    return {"service": "show-thumb (办二游戏)", "status": "ok", "docs": "/docs"}
