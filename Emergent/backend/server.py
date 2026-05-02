from fastapi import FastAPI, APIRouter, HTTPException, Header, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal, Any
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "").strip()

app = FastAPI(title="无限量化 MetaTrader API")
api_router = APIRouter(prefix="/api")


def require_admin(x_admin_token: Optional[str] = Header(default=None)) -> None:
    if not ADMIN_TOKEN:
        raise HTTPException(status_code=500, detail="ADMIN_TOKEN is not configured")
    if not x_admin_token or x_admin_token.strip() != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="unauthorized")


# ---------- Models ----------
class SubmissionBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    kind: Literal["contact", "join", "account_open"]
    name: str
    contact: str
    email: Optional[str] = None
    message: Optional[str] = None
    meta: Optional[dict] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SubmissionCreate(BaseModel):
    kind: Literal["contact", "join", "account_open"]
    name: str
    contact: str
    email: Optional[str] = None
    message: Optional[str] = None
    meta: Optional[dict] = None


class SubmissionOut(BaseModel):
    id: str
    kind: str
    name: str
    contact: str
    email: Optional[str] = None
    message: Optional[str] = None
    meta: Optional[dict] = None
    created_at: datetime


class EAAccountStats(BaseModel):
    model_config = ConfigDict(extra="ignore")
    account: str
    server: str
    currency: str
    platform: str = "MT4"
    initial_deposit: float
    total_profit: float
    win_rate: float
    min_lots: float
    max_lots: float
    holding_time_min: str
    holding_time_avg: str
    holding_time_max: str
    max_drawdown: float
    profit_percentage: float
    profit_by_day: Optional[dict] = None
    profit_by_week: Optional[dict] = None
    profit_by_month: Optional[dict] = None
    last_sync_time: str

class EAIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    sort: int = 1000
    status: Literal["draft", "published"] = "published"
    name_zh: str
    name_en: str
    symbol: str
    platform: str
    profit_monthly: str
    max_drawdown: str
    risk_level: str
    strategy_zh: str
    strategy_en: str
    min_capital: str
    cooperation_zh: str
    cooperation_en: str
    cover: Optional[str] = None
    equity: Optional[List[float]] = None
    features_zh: Optional[List[str]] = None
    features_en: Optional[List[str]] = None
    setup_zh: Optional[str] = None
    setup_en: Optional[str] = None
    # Advanced metrics from desktop analysis tool (aggregated/primary account)
    profit_percentage: Optional[str] = None
    win_rate: Optional[str] = None
    min_lots: Optional[float] = None
    max_lots: Optional[float] = None
    holding_time_min: Optional[str] = None
    holding_time_avg: Optional[str] = None
    holding_time_max: Optional[str] = None
    profit_by_day: Optional[dict] = None
    profit_by_week: Optional[dict] = None
    profit_by_month: Optional[dict] = None
    last_sync_time: Optional[str] = None
    # Support multiple trading accounts per EA
    accounts: Optional[List[EAAccountStats]] = Field(default_factory=list)


class EAOut(EAIn):
    created_at: datetime
    updated_at: datetime


class IndicatorIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    sort: int = 1000
    status: Literal["draft", "published"] = "published"
    name_zh: str
    name_en: str
    category_zh: str
    category_en: str
    desc_zh: str
    desc_en: str
    cover: Optional[str] = None
    usage_zh: Optional[str] = None
    usage_en: Optional[str] = None
    features_zh: Optional[List[str]] = None
    features_en: Optional[List[str]] = None


class IndicatorOut(IndicatorIn):
    created_at: datetime
    updated_at: datetime


class TutorialIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    sort: int = 1000
    status: Literal["draft", "published"] = "published"
    title_zh: str
    title_en: str
    cloud_zh: str
    cloud_en: str
    url: str


class TutorialOut(TutorialIn):
    created_at: datetime
    updated_at: datetime


class TickIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    ts: datetime
    bid: float
    ask: float
    volume: Optional[float] = None


class OrderIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    ticket: str
    symbol: str
    side: Literal["buy", "sell"]
    volume: float
    open_time: datetime
    open_price: float
    close_time: Optional[datetime] = None
    close_price: Optional[float] = None
    profit: Optional[float] = None
    swap: Optional[float] = None
    commission: Optional[float] = None


def _normalize_dt(doc: dict) -> dict:
    for k in ("created_at", "updated_at"):
        if isinstance(doc.get(k), str):
            doc[k] = datetime.fromisoformat(doc[k])
    return doc


def _strip_mongo(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


async def _ensure_indexes() -> None:
    await db.eas.create_index("id", unique=True)
    await db.indicators.create_index("id", unique=True)
    await db.tutorials.create_index("id", unique=True)
    await db.eas.create_index("sort")
    await db.indicators.create_index("sort")
    await db.tutorials.create_index("sort")
    await db.ticks_xauusd.create_index("ts")
    await db.account_orders.create_index([("account_id", 1), ("ticket", 1)], unique=True)


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"service": "wuxianliangh-metatrader", "status": "ok"}


@api_router.post("/submissions", response_model=SubmissionOut)
async def create_submission(payload: SubmissionCreate):
    if not payload.name.strip() or not payload.contact.strip():
        raise HTTPException(status_code=400, detail="name and contact are required")
    record = SubmissionBase(**payload.model_dump())
    doc = record.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.submissions.insert_one(doc)
    return SubmissionOut(**record.model_dump())


@api_router.get("/submissions", response_model=List[SubmissionOut], dependencies=[Depends(require_admin)])
async def list_submissions(kind: Optional[str] = None, limit: int = 200):
    query = {"kind": kind} if kind else {}
    cursor = db.submissions.find(query, {"_id": 0}).sort("created_at", -1).limit(limit)
    rows = await cursor.to_list(limit)
    for r in rows:
        if isinstance(r.get("created_at"), str):
            r["created_at"] = datetime.fromisoformat(r["created_at"])
    return rows


@api_router.get("/eas", response_model=List[EAOut])
async def list_eas(include_draft: bool = False, limit: int = 200):
    query: dict[str, Any] = {}
    if not include_draft:
        query["status"] = "published"
    cursor = db.eas.find(query, {"_id": 0}).sort("sort", 1).limit(limit)
    rows = await cursor.to_list(limit)
    return [_normalize_dt(r) for r in rows]


@api_router.get("/eas/{ea_id}", response_model=EAOut)
async def get_ea(ea_id: str):
    doc = await db.eas.find_one({"id": ea_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="EA not found")
    return _normalize_dt(doc)


@api_router.post("/admin/eas", response_model=EAOut, dependencies=[Depends(require_admin)])
async def admin_create_ea(payload: EAIn):
    now = datetime.now(timezone.utc)
    doc = payload.model_dump()
    doc["created_at"] = now.isoformat()
    doc["updated_at"] = now.isoformat()
    try:
        await db.eas.insert_one(doc)
    except Exception:
        raise HTTPException(status_code=409, detail="EA id already exists")
    doc = _strip_mongo(doc)
    return _normalize_dt(doc)


@api_router.put("/admin/eas/{ea_id}", response_model=EAOut, dependencies=[Depends(require_admin)])
async def admin_update_ea(ea_id: str, payload: EAIn):
    now = datetime.now(timezone.utc)
    update = payload.model_dump()
    update["id"] = ea_id
    update["updated_at"] = now.isoformat()
    existing = await db.eas.find_one({"id": ea_id})
    if not existing:
        update["created_at"] = now.isoformat()
    else:
        update["created_at"] = existing.get("created_at")
    await db.eas.update_one({"id": ea_id}, {"$set": update}, upsert=True)
    doc = await db.eas.find_one({"id": ea_id}, {"_id": 0})
    return _normalize_dt(doc)


@api_router.delete("/admin/eas/{ea_id}", dependencies=[Depends(require_admin)])
async def admin_delete_ea(ea_id: str):
    await db.eas.delete_one({"id": ea_id})
    return {"ok": True}


@api_router.get("/indicators", response_model=List[IndicatorOut])
async def list_indicators(include_draft: bool = False, limit: int = 200):
    query: dict[str, Any] = {}
    if not include_draft:
        query["status"] = "published"
    cursor = db.indicators.find(query, {"_id": 0}).sort("sort", 1).limit(limit)
    rows = await cursor.to_list(limit)
    return [_normalize_dt(r) for r in rows]


@api_router.get("/indicators/{ind_id}", response_model=IndicatorOut)
async def get_indicator(ind_id: str):
    doc = await db.indicators.find_one({"id": ind_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Indicator not found")
    return _normalize_dt(doc)


@api_router.post("/admin/indicators", response_model=IndicatorOut, dependencies=[Depends(require_admin)])
async def admin_create_indicator(payload: IndicatorIn):
    now = datetime.now(timezone.utc)
    doc = payload.model_dump()
    doc["created_at"] = now.isoformat()
    doc["updated_at"] = now.isoformat()
    try:
        await db.indicators.insert_one(doc)
    except Exception:
        raise HTTPException(status_code=409, detail="Indicator id already exists")
    doc = _strip_mongo(doc)
    return _normalize_dt(doc)


@api_router.put("/admin/indicators/{ind_id}", response_model=IndicatorOut, dependencies=[Depends(require_admin)])
async def admin_update_indicator(ind_id: str, payload: IndicatorIn):
    now = datetime.now(timezone.utc)
    update = payload.model_dump()
    update["id"] = ind_id
    update["updated_at"] = now.isoformat()
    existing = await db.indicators.find_one({"id": ind_id})
    if not existing:
        update["created_at"] = now.isoformat()
    else:
        update["created_at"] = existing.get("created_at")
    await db.indicators.update_one({"id": ind_id}, {"$set": update}, upsert=True)
    doc = await db.indicators.find_one({"id": ind_id}, {"_id": 0})
    return _normalize_dt(doc)


@api_router.delete("/admin/indicators/{ind_id}", dependencies=[Depends(require_admin)])
async def admin_delete_indicator(ind_id: str):
    await db.indicators.delete_one({"id": ind_id})
    return {"ok": True}


@api_router.get("/tutorials", response_model=List[TutorialOut])
async def list_tutorials(include_draft: bool = False, limit: int = 200):
    query: dict[str, Any] = {}
    if not include_draft:
        query["status"] = "published"
    cursor = db.tutorials.find(query, {"_id": 0}).sort("sort", 1).limit(limit)
    rows = await cursor.to_list(limit)
    return [_normalize_dt(r) for r in rows]


@api_router.post("/admin/tutorials", response_model=TutorialOut, dependencies=[Depends(require_admin)])
async def admin_create_tutorial(payload: TutorialIn):
    now = datetime.now(timezone.utc)
    doc = payload.model_dump()
    doc["created_at"] = now.isoformat()
    doc["updated_at"] = now.isoformat()
    try:
        await db.tutorials.insert_one(doc)
    except Exception:
        raise HTTPException(status_code=409, detail="Tutorial id already exists")
    doc = _strip_mongo(doc)
    return _normalize_dt(doc)


@api_router.put("/admin/tutorials/{t_id}", response_model=TutorialOut, dependencies=[Depends(require_admin)])
async def admin_update_tutorial(t_id: str, payload: TutorialIn):
    now = datetime.now(timezone.utc)
    update = payload.model_dump()
    update["id"] = t_id
    update["updated_at"] = now.isoformat()
    existing = await db.tutorials.find_one({"id": t_id})
    if not existing:
        update["created_at"] = now.isoformat()
    else:
        update["created_at"] = existing.get("created_at")
    await db.tutorials.update_one({"id": t_id}, {"$set": update}, upsert=True)
    doc = await db.tutorials.find_one({"id": t_id}, {"_id": 0})
    return _normalize_dt(doc)


@api_router.delete("/admin/tutorials/{t_id}", dependencies=[Depends(require_admin)])
async def admin_delete_tutorial(t_id: str):
    await db.tutorials.delete_one({"id": t_id})
    return {"ok": True}


@api_router.post("/admin/ticks/xauusd/batch", dependencies=[Depends(require_admin)])
async def admin_insert_ticks_xauusd(rows: List[TickIn]):
    if not rows:
        return {"inserted": 0}
    docs = []
    for r in rows:
        d = r.model_dump()
        d["ts"] = d["ts"].isoformat()
        docs.append(d)
    try:
        res = await db.ticks_xauusd.insert_many(docs, ordered=False)
        return {"inserted": len(res.inserted_ids)}
    except Exception:
        return {"inserted": 0}


@api_router.post("/admin/accounts/{account_id}/orders/batch", dependencies=[Depends(require_admin)])
async def admin_insert_account_orders(account_id: str, rows: List[OrderIn]):
    if not rows:
        return {"inserted": 0}
    docs = []
    for r in rows:
        d = r.model_dump()
        d["account_id"] = account_id
        d["open_time"] = d["open_time"].isoformat()
        if d.get("close_time"):
            d["close_time"] = d["close_time"].isoformat()
        docs.append(d)
    inserted = 0
    for d in docs:
        try:
            await db.account_orders.insert_one(d)
            inserted += 1
        except Exception:
            continue
    return {"inserted": inserted}


@api_router.get("/accounts/{account_id}/equity")
async def get_account_equity(account_id: str):
    raise HTTPException(status_code=501, detail="equity curve calculation not implemented yet")


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup_indexes():
    await _ensure_indexes()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
