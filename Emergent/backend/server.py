from fastapi import FastAPI, APIRouter, HTTPException, Header, Depends, UploadFile, File, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from submission_security import SubmissionCreate, SubmissionBodyLimitMiddleware
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
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


@api_router.get("/health")
async def health():
    await client.admin.command("ping")
    return {"ok": True}


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


VerificationStatus = Literal[
    "inbox",
    "screened",
    "testable",
    "testing",
    "reviewed",
    "approved",
    "rejected",
    "archived",
]

OwnershipType = Literal[
    "self_owned",
    "collected",
    "open_source",
    "independent_reimplementation",
]


class Reference(BaseModel):
    title: str
    url: Optional[str] = None
    note: Optional[str] = None


class VersionNote(BaseModel):
    version: str
    date: Optional[str] = None
    note: str


class MediaAsset(BaseModel):
    url: str
    kind: Literal["cover", "product_screenshot", "report_chart", "diagram", "source_image"]
    title: Optional[str] = None
    source: Literal["real", "test_data", "ai_generated", "third_party"]
    captured_at: Optional[datetime] = None
    evidence_ref: Optional[str] = None


class ClaimEvidence(BaseModel):
    claim_key: str
    display_value: str
    evidence_ref: str
    status: Literal["pending", "verified"] = "pending"
    note: Optional[str] = None


class EvidenceFields(BaseModel):
    verification_status: VerificationStatus = "inbox"
    ownership_type: OwnershipType = "collected"
    version: Optional[str] = None
    platform_versions: List[str] = Field(default_factory=list)
    source_refs: List[Reference] = Field(default_factory=list)
    evidence_refs: List[Reference] = Field(default_factory=list)
    screenshots: List[str] = Field(default_factory=list)
    media_assets: List[MediaAsset] = Field(default_factory=list)
    claim_evidence: List[ClaimEvidence] = Field(default_factory=list)
    test_period: Optional[str] = None
    test_environment: Optional[str] = None
    offline_test_completed: bool = False
    limitations: List[str] = Field(default_factory=list)
    risk_notes: List[str] = Field(default_factory=list)
    research_id: Optional[str] = None
    version_history: List[VersionNote] = Field(default_factory=list)
    published_at: Optional[datetime] = None


class EAIn(EvidenceFields):
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
    initial_capital: Optional[str] = None
    account_type: Optional[str] = None
    closed_drawdown: Optional[str] = None
    floating_drawdown: Optional[str] = None
    margin_usage: Optional[str] = None
    parameter_version: Optional[str] = None
    risk_triggers: Optional[str] = None
    data_source: Optional[str] = None
    # Support multiple trading accounts per EA
    accounts: Optional[List[EAAccountStats]] = Field(default_factory=list)


class EAOut(EAIn):
    created_at: datetime
    updated_at: datetime


class IndicatorIn(EvidenceFields):
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
    source_url: Optional[str] = None
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
    tags: Optional[List[str]] = None


class TutorialOut(TutorialIn):
    created_at: datetime
    updated_at: datetime


class ArticleIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    title: str
    summary: str
    content: str
    type: Literal["foundation", "system", "research", "guide", "case"]
    source_refs: List[Reference] = Field(default_factory=list)
    related_eas: List[str] = Field(default_factory=list)
    related_indicators: List[str] = Field(default_factory=list)
    research_id: Optional[str] = None
    status: Literal["draft", "reviewed", "published", "archived"] = "draft"
    cover: Optional[str] = None
    published_at: Optional[datetime] = None


class ArticleOut(ArticleIn):
    created_at: datetime
    updated_at: datetime


class ResearchPublicIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(pattern=r"^RES-[0-9]{4}-[0-9]{3,}$")
    title: str
    summary: str
    subject_type: Literal["ea", "indicator", "system", "tool"]
    subject_id: Optional[str] = None
    verification_status: VerificationStatus = "reviewed"
    test_period: Optional[str] = None
    test_environment: Optional[str] = None
    findings: List[str] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)
    source_refs: List[Reference] = Field(default_factory=list)
    evidence_refs: List[Reference] = Field(default_factory=list)
    status: Literal["draft", "published", "archived"] = "draft"
    published_at: Optional[datetime] = None


class ResearchPublicOut(ResearchPublicIn):
    created_at: datetime
    updated_at: datetime


class UploadOut(BaseModel):
    id: str
    url: str
    key: str
    filename: Optional[str] = None
    content_type: Optional[str] = None
    size: Optional[int] = None
    created_at: datetime


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
    now = datetime.now(timezone.utc)
    for k in ("created_at", "updated_at", "published_at"):
        v = doc.get(k)
        if v is None and k in ("created_at", "updated_at"):
            doc[k] = now
            continue
        if isinstance(v, str):
            doc[k] = datetime.fromisoformat(v)
    return doc


def _strip_mongo(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


async def _ensure_indexes() -> None:
    await db.eas.create_index("id", unique=True)
    await db.indicators.create_index("id", unique=True)
    await db.tutorials.create_index("id", unique=True)
    await db.uploads.create_index("id", unique=True)
    await db.uploads.create_index("key", unique=True)
    await db.articles.create_index("slug", unique=True)
    await db.public_research.create_index("id", unique=True)
    await db.eas.create_index("sort")
    await db.indicators.create_index("sort")
    await db.tutorials.create_index("sort")
    await db.articles.create_index([("status", 1), ("published_at", -1)])
    await db.public_research.create_index([("status", 1), ("published_at", -1)])
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
async def list_submissions(
    kind: Optional[Literal["contact", "join", "account_open"]] = None,
    limit: int = Query(default=200, ge=1, le=1000),
):
    query = {"kind": kind} if kind else {}
    cursor = db.submissions.find(query, {"_id": 0}).sort("created_at", -1).limit(limit)
    rows = await cursor.to_list(limit)
    for r in rows:
        if isinstance(r.get("created_at"), str):
            r["created_at"] = datetime.fromisoformat(r["created_at"])
    return rows


@api_router.get("/eas", response_model=List[EAOut])
async def list_eas(limit: int = 200):
    cursor = db.eas.find({"status": "published"}, {"_id": 0}).sort("sort", 1).limit(limit)
    rows = await cursor.to_list(limit)
    return [_normalize_dt(r) for r in rows]


@api_router.get("/eas/{ea_id}", response_model=EAOut)
async def get_ea(ea_id: str):
    doc = await db.eas.find_one({"id": ea_id, "status": "published"}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="EA not found")
    return _normalize_dt(doc)


@api_router.get("/admin/eas", response_model=List[EAOut], dependencies=[Depends(require_admin)])
async def admin_list_eas(limit: int = 500):
    rows = await db.eas.find({}, {"_id": 0}).sort("sort", 1).limit(limit).to_list(limit)
    return [_normalize_dt(r) for r in rows]


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
async def list_indicators(limit: int = 200):
    cursor = db.indicators.find({"status": "published"}, {"_id": 0}).sort("sort", 1).limit(limit)
    rows = await cursor.to_list(limit)
    return [_normalize_dt(r) for r in rows]


@api_router.get("/indicators/{ind_id}", response_model=IndicatorOut)
async def get_indicator(ind_id: str):
    doc = await db.indicators.find_one({"id": ind_id, "status": "published"}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Indicator not found")
    return _normalize_dt(doc)


@api_router.get("/admin/indicators", response_model=List[IndicatorOut], dependencies=[Depends(require_admin)])
async def admin_list_indicators(limit: int = 500):
    rows = await db.indicators.find({}, {"_id": 0}).sort("sort", 1).limit(limit).to_list(limit)
    return [_normalize_dt(r) for r in rows]


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
async def list_tutorials(limit: int = 200):
    cursor = db.tutorials.find({"status": "published"}, {"_id": 0}).sort("sort", 1).limit(limit)
    rows = await cursor.to_list(limit)
    return [_normalize_dt(r) for r in rows]


@api_router.get("/admin/tutorials", response_model=List[TutorialOut], dependencies=[Depends(require_admin)])
async def admin_list_tutorials(limit: int = 500):
    rows = await db.tutorials.find({}, {"_id": 0}).sort("sort", 1).limit(limit).to_list(limit)
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


@api_router.get("/articles", response_model=List[ArticleOut])
async def list_articles(article_type: Optional[str] = None, limit: int = 100):
    query: dict[str, Any] = {"status": "published"}
    if article_type:
        query["type"] = article_type
    cursor = db.articles.find(query, {"_id": 0}).sort("published_at", -1).limit(limit)
    rows = await cursor.to_list(limit)
    return [_normalize_dt(r) for r in rows]


@api_router.get("/articles/{slug}", response_model=ArticleOut)
async def get_article(slug: str):
    doc = await db.articles.find_one({"slug": slug, "status": "published"}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Article not found")
    return _normalize_dt(doc)


@api_router.get("/admin/articles", response_model=List[ArticleOut], dependencies=[Depends(require_admin)])
async def admin_list_articles(limit: int = 500):
    rows = await db.articles.find({}, {"_id": 0}).sort("updated_at", -1).limit(limit).to_list(limit)
    return [_normalize_dt(r) for r in rows]


@api_router.put("/admin/articles/{slug}", response_model=ArticleOut, dependencies=[Depends(require_admin)])
async def admin_upsert_article(slug: str, payload: ArticleIn):
    if slug != payload.slug:
        raise HTTPException(status_code=400, detail="slug does not match payload")
    now = datetime.now(timezone.utc)
    existing = await db.articles.find_one({"slug": slug})
    doc = payload.model_dump(mode="json")
    doc["created_at"] = existing.get("created_at") if existing else now.isoformat()
    doc["updated_at"] = now.isoformat()
    if payload.status == "published" and not doc.get("published_at"):
        doc["published_at"] = now.isoformat()
    await db.articles.update_one({"slug": slug}, {"$set": doc}, upsert=True)
    saved = await db.articles.find_one({"slug": slug}, {"_id": 0})
    return _normalize_dt(saved)


@api_router.delete("/admin/articles/{slug}", dependencies=[Depends(require_admin)])
async def admin_delete_article(slug: str):
    await db.articles.delete_one({"slug": slug})
    return {"ok": True}


@api_router.get("/research", response_model=List[ResearchPublicOut])
async def list_public_research(limit: int = 100):
    rows = await db.public_research.find({"status": "published"}, {"_id": 0}).sort("published_at", -1).limit(limit).to_list(limit)
    return [_normalize_dt(r) for r in rows]


@api_router.get("/research/{research_id}", response_model=ResearchPublicOut)
async def get_public_research(research_id: str):
    doc = await db.public_research.find_one({"id": research_id, "status": "published"}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Research not found")
    return _normalize_dt(doc)


@api_router.get("/admin/research", response_model=List[ResearchPublicOut], dependencies=[Depends(require_admin)])
async def admin_list_research(limit: int = 500):
    rows = await db.public_research.find({}, {"_id": 0}).sort("updated_at", -1).limit(limit).to_list(limit)
    return [_normalize_dt(r) for r in rows]


@api_router.put("/admin/research/{research_id}", response_model=ResearchPublicOut, dependencies=[Depends(require_admin)])
async def admin_upsert_research(research_id: str, payload: ResearchPublicIn):
    if research_id != payload.id:
        raise HTTPException(status_code=400, detail="research id does not match payload")
    now = datetime.now(timezone.utc)
    existing = await db.public_research.find_one({"id": research_id})
    doc = payload.model_dump(mode="json")
    doc["created_at"] = existing.get("created_at") if existing else now.isoformat()
    doc["updated_at"] = now.isoformat()
    if payload.status == "published" and not doc.get("published_at"):
        doc["published_at"] = now.isoformat()
    await db.public_research.update_one({"id": research_id}, {"$set": doc}, upsert=True)
    saved = await db.public_research.find_one({"id": research_id}, {"_id": 0})
    return _normalize_dt(saved)


@api_router.delete("/admin/research/{research_id}", dependencies=[Depends(require_admin)])
async def admin_delete_research(research_id: str):
    await db.public_research.delete_one({"id": research_id})
    return {"ok": True}


def _cos_cfg() -> dict:
    return {
        "bucket": os.environ.get("COS_BUCKET", "").strip(),
        "region": os.environ.get("COS_REGION", "").strip(),
        "secret_id": os.environ.get("COS_SECRET_ID", "").strip(),
        "secret_key": os.environ.get("COS_SECRET_KEY", "").strip(),
        "base_url": os.environ.get("COS_BASE_URL", "").strip(),
        "prefix": os.environ.get("COS_PREFIX", "images").strip().strip("/"),
        "acl": os.environ.get("COS_ACL", "").strip(),
    }


def _cos_client():
    try:
        from qcloud_cos import CosConfig, CosS3Client
    except Exception:
        raise HTTPException(status_code=500, detail="COS SDK is not installed")
    cfg = _cos_cfg()
    if not cfg["bucket"] or not cfg["region"] or not cfg["secret_id"] or not cfg["secret_key"]:
        raise HTTPException(status_code=500, detail="COS is not configured")
    conf = CosConfig(
        Region=cfg["region"],
        SecretId=cfg["secret_id"],
        SecretKey=cfg["secret_key"],
        Scheme="https",
    )
    return CosS3Client(conf), cfg


def _guess_ext(filename: str, content_type: str) -> str:
    fn = (filename or "").lower()
    if fn.endswith(".png"):
        return "png"
    if fn.endswith(".jpg") or fn.endswith(".jpeg"):
        return "jpg"
    if fn.endswith(".webp"):
        return "webp"
    if fn.endswith(".gif"):
        return "gif"
    ct = (content_type or "").lower()
    if ct == "image/png":
        return "png"
    if ct == "image/jpeg":
        return "jpg"
    if ct == "image/webp":
        return "webp"
    if ct == "image/gif":
        return "gif"
    return ""


@api_router.post("/admin/uploads/images", response_model=UploadOut, dependencies=[Depends(require_admin)])
async def admin_upload_image(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="missing file")
    if not (file.content_type or "").lower().startswith("image/"):
        raise HTTPException(status_code=400, detail="only image uploads are allowed")
    ext = _guess_ext(file.filename or "", file.content_type or "")
    if not ext:
        raise HTTPException(status_code=400, detail="unsupported image type")
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="empty file")
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="file too large")

    client_cos, cfg = _cos_client()
    now = datetime.now(timezone.utc)
    day = now.strftime("%Y/%m/%d")
    key = f"{cfg['prefix']}/{day}/{uuid.uuid4().hex}.{ext}"

    kwargs = {
        "Bucket": cfg["bucket"],
        "Key": key,
        "Body": data,
        "ContentType": file.content_type,
    }
    if cfg["acl"]:
        kwargs["ACL"] = cfg["acl"]
    try:
        await run_in_threadpool(lambda: client_cos.put_object(**kwargs))
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=502, detail="cos upload failed")

    if cfg["base_url"]:
        url = f"{cfg['base_url'].rstrip('/')}/{key}"
    else:
        url = f"https://{cfg['bucket']}.cos.{cfg['region']}.myqcloud.com/{key}"

    rec_id = str(uuid.uuid4())
    doc = {
        "id": rec_id,
        "url": url,
        "key": key,
        "filename": file.filename,
        "content_type": file.content_type,
        "size": len(data),
        "created_at": now.isoformat(),
    }
    await db.uploads.insert_one(doc)
    return UploadOut(
        id=rec_id,
        url=url,
        key=key,
        filename=file.filename,
        content_type=file.content_type,
        size=len(data),
        created_at=now,
    )


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

app.add_middleware(SubmissionBodyLimitMiddleware)


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    if request.url.path.rstrip("/") == "/api/submissions":
        # Do not reflect personal details or attack strings in error responses.
        return JSONResponse(status_code=422, content={"detail": [
            {"loc": list(error["loc"]), "msg": error["msg"], "type": error["type"]}
            for error in exc.errors()
        ]})
    from fastapi.exception_handlers import request_validation_exception_handler
    return await request_validation_exception_handler(request, exc)


@app.middleware("http")
async def submission_response_headers(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.rstrip("/") == "/api/submissions":
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
    return response

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
