"""Safely prepare production content for the evidence-first V3 model.

The command is a dry run unless --apply is supplied. An apply always exports
the affected collections before changing exact, known records.
"""

from __future__ import annotations

import argparse
import os
from datetime import datetime, timezone
from pathlib import Path

from bson import json_util
from dotenv import load_dotenv
from pymongo import MongoClient


FAKE_INDICATOR_IDS = ("ind-liquidity-map", "ind-session-clock")
PLACEHOLDER_TUTORIAL_IDS = ("t-mt4-setup", "t-ea-install")
BACKUP_COLLECTIONS = ("eas", "indicators", "tutorials", "articles", "public_research")


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def backup_database(db, output_root: Path) -> Path:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    target = output_root / f"v3-pre-migration-{stamp}"
    target.mkdir(parents=True, exist_ok=False)
    for name in BACKUP_COLLECTIONS:
        rows = list(db[name].find({}))
        (target / f"{name}.json").write_text(
            json_util.dumps(rows, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    return target


def inspect_changes(db) -> dict:
    return {
        "fake_indicators": list(
            db.indicators.find(
                {"id": {"$in": list(FAKE_INDICATOR_IDS)}},
                {"_id": 0, "id": 1, "name_zh": 1, "status": 1},
            )
        ),
        "placeholder_tutorials": list(
            db.tutorials.find(
                {
                    "id": {"$in": list(PLACEHOLDER_TUTORIAL_IDS)},
                    "url": {"$regex": "placeholder", "$options": "i"},
                },
                {"_id": 0, "id": 1, "title_zh": 1, "status": 1, "url": 1},
            )
        ),
        "tianyan_exists": db.indicators.count_documents({"id": "ind-tianyan-1"}) == 1,
        "golden_dragon_exists": db.eas.count_documents({"id": "ea-golden-dragon-13"}) == 1,
    }


def apply_changes(db) -> dict:
    now = utc_now_iso()
    removed = db.indicators.delete_many({"id": {"$in": list(FAKE_INDICATOR_IDS)}})
    tutorials = db.tutorials.update_many(
        {
            "id": {"$in": list(PLACEHOLDER_TUTORIAL_IDS)},
            "url": {"$regex": "placeholder", "$options": "i"},
        },
        {"$set": {"status": "draft", "updated_at": now}},
    )
    tianyan = db.indicators.update_one(
        {"id": "ind-tianyan-1"},
        {
            "$set": {
                "sort": 10,
                "verification_status": "reviewed",
                "ownership_type": "collected",
                "offline_test_completed": True,
                "research_id": "RES-2026-001",
                "source_refs": [
                    {
                        "title": "EAHub 原始论坛帖",
                        "url": "https://www.eahub.cn/thread-70924-1-1.html",
                        "note": "原作者宣称命中率 95%+；该说法仅代表来源观点，不是本站测试结论。",
                    }
                ],
                "evidence_refs": [
                    {
                        "title": "天眼一号线下测试档案",
                        "note": "线下测试已完成；文件哈希、平台版本、品种周期、参数、日期与实际截图待录入。",
                    }
                ],
                "limitations": [
                    "公开档案尚未补齐测试区间、参数和平台版本，因此不展示命中率或收益率。",
                    "趋势提示工具在震荡和快速反转环境中可能产生连续无效信号。",
                ],
                "risk_notes": [
                    "信号是否重绘、是否必须收线确认，应以保留的逐根 K 线测试记录为准。",
                    "指标仅用于辅助判断，不能替代仓位、止损和总风险控制。",
                ],
                "desc_zh": "已完成线下测试的趋势提示工具。当前页面只公开可追溯的使用逻辑、限制和风险，不采用来源帖的命中率宣传作为本站结论。",
                "desc_en": "An offline-reviewed trend signal tool. Source accuracy claims are not treated as our findings.",
                "updated_at": now,
            }
        },
    )
    golden_dragon = db.eas.update_one(
        {"id": "ea-golden-dragon-13"},
        {
            "$set": {
                "verification_status": "approved",
                "ownership_type": "self_owned",
                "research_id": "RES-2026-002",
                "closed_drawdown": "≤1%",
                "floating_drawdown": "约40%",
                "limitations": [
                    "对冲网格策略在持续单边且缺少回调的行情中可能快速扩大浮动亏损。",
                    "历史数据不代表未来表现，不构成收益承诺。",
                ],
                "risk_notes": [
                    "已平仓回撤与持仓中的最大浮动回撤必须分别评估。",
                    "不得在低于策略风险阈值的账户中运行。",
                ],
                "claim_evidence": [
                    {
                        "claim_key": "closed_drawdown",
                        "display_value": "≤1%",
                        "evidence_ref": "金龙13号本地测试档案",
                        "status": "pending",
                    },
                    {
                        "claim_key": "floating_drawdown",
                        "display_value": "约40%",
                        "evidence_ref": "金龙13号本地测试档案",
                        "status": "pending",
                    },
                ],
                "updated_at": now,
            }
        },
    )
    return {
        "deleted_fake_indicators": removed.deleted_count,
        "drafted_placeholder_tutorials": tutorials.modified_count,
        "updated_tianyan": tianyan.modified_count,
        "updated_golden_dragon": golden_dragon.modified_count,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Back up and apply the exact V3 migration")
    parser.add_argument(
        "--backup-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "backups",
    )
    args = parser.parse_args()

    backend_root = Path(__file__).resolve().parents[1]
    load_dotenv(backend_root / ".env")
    uri = os.environ.get("DB_URI") or os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not uri or not db_name:
        raise SystemExit("Set DB_URI (or MONGO_URL) and DB_NAME before running this command")

    client = MongoClient(uri, serverSelectionTimeoutMS=10000)
    db = client[db_name]
    client.admin.command("ping")
    preview = inspect_changes(db)
    print(json_util.dumps({"mode": "apply" if args.apply else "dry-run", "preview": preview}, ensure_ascii=False, indent=2))
    if not args.apply:
        print("Dry run only. Re-run with --apply to create a backup and perform these exact changes.")
        return

    backup_path = backup_database(db, args.backup_dir.resolve())
    result = apply_changes(db)
    print(json_util.dumps({"backup": str(backup_path), "result": result}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
