import asyncio
import importlib
import json
import os
from pathlib import Path

import pytest


os.environ.setdefault("MONGO_URL", "mongodb://127.0.0.1:27017")
os.environ.setdefault("DB_NAME", "emergent_unit_tests")

server = importlib.import_module("backend.server")


class FakeCursor:
    def __init__(self, rows):
        self.rows = rows

    def sort(self, *_args):
        return self

    def limit(self, *_args):
        return self

    async def to_list(self, limit):
        return self.rows[:limit]


class FakeCollection:
    def __init__(self, rows=None):
        self.rows = rows or []
        self.last_find_query = None
        self.last_find_one_query = None

    def find(self, query, _projection):
        self.last_find_query = query
        return FakeCursor(self.rows)

    async def find_one(self, query, _projection):
        self.last_find_one_query = query
        return self.rows[0] if self.rows else None


class FakeDb:
    def __init__(self):
        self.eas = FakeCollection([])
        self.indicators = FakeCollection([])
        self.tutorials = FakeCollection([])


def test_public_catalog_queries_only_published(monkeypatch):
    fake = FakeDb()
    monkeypatch.setattr(server, "db", fake)

    asyncio.run(server.list_eas())
    asyncio.run(server.list_indicators())
    asyncio.run(server.list_tutorials())

    assert fake.eas.last_find_query == {"status": "published"}
    assert fake.indicators.last_find_query == {"status": "published"}
    assert fake.tutorials.last_find_query == {"status": "published"}


def test_public_detail_requires_published(monkeypatch):
    fake = FakeDb()
    monkeypatch.setattr(server, "db", fake)

    with pytest.raises(server.HTTPException) as error:
        asyncio.run(server.get_ea("ea-draft"))
    assert error.value.status_code == 404
    assert fake.eas.last_find_one_query == {"id": "ea-draft", "status": "published"}


def test_evidence_schema_keeps_media_types_separate():
    item = server.IndicatorIn(
        id="ind-test",
        status="draft",
        verification_status="reviewed",
        ownership_type="collected",
        offline_test_completed=True,
        name_zh="测试",
        name_en="Test",
        category_zh="趋势",
        category_en="Trend",
        desc_zh="说明",
        desc_en="Description",
        media_assets=[
            {
                "url": "https://example.test/screenshot.webp",
                "kind": "product_screenshot",
                "source": "real",
            }
        ],
    )
    assert item.media_assets[0].kind == "product_screenshot"
    assert item.media_assets[0].source == "real"
    assert item.offline_test_completed is True


def test_seed_contains_only_confirmed_public_products():
    seed_root = Path(__file__).resolve().parents[1] / "seed"
    eas = json.loads((seed_root / "seed_eas.json").read_text(encoding="utf-8"))
    indicators = json.loads((seed_root / "seed_indicators.json").read_text(encoding="utf-8"))
    tutorials = json.loads((seed_root / "seed_tutorials.json").read_text(encoding="utf-8"))

    assert [row["id"] for row in eas] == ["ea-golden-dragon-13"]
    assert [row["id"] for row in indicators] == ["ind-tianyan-1"]
    assert indicators[0]["verification_status"] == "reviewed"
    assert indicators[0]["offline_test_completed"] is True
    assert "95%" not in indicators[0]["desc_zh"]
    assert all(row["status"] == "draft" for row in tutorials)


def test_numeric_claims_have_evidence_mapping():
    seed_path = Path(__file__).resolve().parents[1] / "seed" / "seed_eas.json"
    golden_dragon = json.loads(seed_path.read_text(encoding="utf-8"))[0]
    claims = {row["claim_key"]: row for row in golden_dragon["claim_evidence"]}
    assert claims["closed_drawdown"]["display_value"] == golden_dragon["closed_drawdown"]
    assert claims["floating_drawdown"]["display_value"] == golden_dragon["floating_drawdown"]
