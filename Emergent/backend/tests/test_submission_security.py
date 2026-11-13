"""Local security regression tests: no real DB, network or production writes."""
import asyncio
import importlib
import sys
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from submission_security import MAX_SUBMISSION_BYTES, SubmissionBodyLimitMiddleware


@pytest.fixture
def api(monkeypatch):
    monkeypatch.setenv("MONGO_URL", "mongodb://127.0.0.1:27017")
    monkeypatch.setenv("DB_NAME", "local_security_tests")
    monkeypatch.setenv("ADMIN_TOKEN", "local-test-token")
    monkeypatch.setattr("dotenv.load_dotenv", lambda *args, **kwargs: False)
    server = importlib.import_module("server")
    monkeypatch.setattr(server, "ADMIN_TOKEN", "local-test-token")
    collection = SimpleNamespace(insert_one=AsyncMock(), find=Mock())
    monkeypatch.setattr(server, "db", SimpleNamespace(submissions=collection))
    # No lifespan: index creation and database I/O are intentionally not invoked.
    return TestClient(server.app), collection


def payload(**changes):
    return {"kind": "contact", "name": "张先生", "contact": "wechat_123", **changes}


@pytest.mark.parametrize("field", ["name", "contact", "email", "message"])
@pytest.mark.parametrize("probe", [
    '<sCRiPt sRc=//probe.invalid/check></sCrIpT>',
    '<img src=x onerror="alert(1)">',
    '<svg/onload=alert(1)>',
    '&lt;script src=//probe.invalid/check&gt;',
    '&amp;lt;script&amp;gt;alert(1)',
    '&#x3c;ScRiPt src=//probe.invalid/check&#x3e;',
    '<script src=//probe.invalid/check',
    '<!-- hidden markup -->',
])
def test_rejects_probes_before_storage(api, field, probe):
    client, collection = api
    response = client.post("/api/submissions", json=payload(**{field: probe}))
    assert response.status_code == 422
    collection.insert_one.assert_not_awaited()
    assert probe not in response.text
    assert all("input" not in error for error in response.json()["detail"])


@pytest.mark.parametrize("kind", ["contact", "join", "account_open"])
def test_accepts_normal_text_and_preserves_trading_expressions(api, kind):
    client, collection = api
    message = "风险 < 2%，盈亏比 > 1.5\nO'Reilly & 张先生：请联系我。"
    response = client.post("/api/submissions", json=payload(
        kind=kind, name=" 张先生 ", email="", message=message,
        meta={"source": "homepage", "tags": ["EA", "MT4"]},
    ))
    assert response.status_code == 200
    assert response.json()["name"] == "张先生"
    assert response.json()["email"] is None
    assert response.json()["message"] == message
    collection.insert_one.assert_awaited_once()
    assert collection.insert_one.call_args.args[0]["message"] == message
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-content-type-options"] == "nosniff"


@pytest.mark.parametrize("changes", [
    {"name": " "}, {"contact": "\t"}, {"name": "x" * 101},
    {"contact": "x" * 201}, {"message": "x" * 5001},
    {"email": "not-an-email"}, {"name": {"$ne": None}},
    {"message": "hello\u0000world"}, {"contact": "a\r\nb"},
    {"meta": {"source": {"value": "<img src=x onerror=alert(1)>"}}},
    {"meta": {"$where": "anything"}},
    {"meta": {"source": "x" * 4097}},
    {"meta": {"a": {"b": {"c": {"d": {"e": "too deep"}}}}}},
    {"id": "attacker-supplied"}, {"created_at": "2000-01-01"},
])
def test_invalid_contract_never_writes(api, changes):
    client, collection = api
    assert client.post("/api/submissions", json=payload(**changes)).status_code == 422
    collection.insert_one.assert_not_awaited()


def test_email_and_size_boundaries(api):
    client, _ = api
    response = client.post("/api/submissions", json=payload(
        name="张" * 100, contact="x" * 200, message="文" * 5000,
        email="someone@example.com",
    ))
    assert response.status_code == 200


def test_large_body_rejected(api):
    client, collection = api
    response = client.post("/api/submissions", content=b"x" * (MAX_SUBMISSION_BYTES + 1))
    assert response.status_code == 413
    collection.insert_one.assert_not_awaited()


def test_chunked_body_limit_without_content_length():
    async def run():
        downstream = AsyncMock()
        messages = iter([
            {"type": "http.request", "body": b"x" * 20000, "more_body": True},
            {"type": "http.request", "body": b"x" * 20000, "more_body": False},
        ])
        async def receive():
            return next(messages)
        send = AsyncMock()
        await SubmissionBodyLimitMiddleware(downstream)(
            {"type": "http", "method": "POST", "path": "/api/submissions/", "headers": []},
            receive, send,
        )
        downstream.assert_not_awaited()
        assert send.call_args_list[0].args[0]["status"] == 413
    asyncio.run(run())


def test_read_requires_admin_and_bounds_query(api):
    client, _ = api
    assert client.get("/api/submissions").status_code == 401
    headers = {"x-admin-token": "local-test-token"}
    for query in ("limit=0", "limit=-1", "limit=1001", "kind=unknown"):
        assert client.get(f"/api/submissions?{query}", headers=headers).status_code == 422


def test_historical_probe_remains_readable_as_json(api):
    client, collection = api
    historic = payload(
        id="legacy", name="<script src=//probe.invalid/check></script>",
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    cursor = Mock()
    cursor.sort.return_value = cursor
    cursor.limit.return_value = cursor
    cursor.to_list = AsyncMock(return_value=[historic])
    collection.find.return_value = cursor
    response = client.get("/api/submissions?limit=500", headers={"x-admin-token": "local-test-token"})
    assert response.status_code == 200
    assert response.json()[0]["name"] == historic["name"]
    assert response.headers["content-type"].startswith("application/json")
    assert response.headers["cache-control"] == "no-store"
