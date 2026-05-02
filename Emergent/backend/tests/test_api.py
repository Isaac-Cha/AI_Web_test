"""Backend API tests for 无限量化 MetaTrader."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://metaltrader-exchange.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Health ----------
class TestHealth:
    def test_root(self, api):
        r = api.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "ok"


# ---------- Static content ----------
class TestStaticContent:
    def test_eas(self, api):
        r = api.get(f"{BASE_URL}/api/eas")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for ea in data[:3]:
            for k in ("id", "name_zh", "name_en", "symbol", "platform"):
                assert k in ea, f"EA missing {k}"

    def test_indicators(self, api):
        r = api.get(f"{BASE_URL}/api/indicators")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for ind in data[:3]:
            assert all(k in ind for k in ("id", "name_zh", "name_en", "desc_zh", "desc_en"))

    def test_tutorials(self, api):
        r = api.get(f"{BASE_URL}/api/tutorials")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for t in data[:3]:
            assert all(k in t for k in ("id", "title_zh", "title_en", "url"))


# ---------- Submissions ----------
class TestSubmissions:
    created_ids = []

    @pytest.mark.parametrize("kind,name,contact", [
        ("join", "TEST_Alice", "13800000001"),
        ("contact", "TEST_Bob", "wechat_bob"),
        ("account_open", "TEST_Carol", "carol@test.com"),
    ])
    def test_create_submission(self, api, kind, name, contact):
        payload = {"kind": kind, "name": name, "contact": contact,
                   "email": "t@test.com", "message": "hello"}
        r = api.post(f"{BASE_URL}/api/submissions", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "id" in data and isinstance(data["id"], str) and len(data["id"]) > 0
        assert data["kind"] == kind
        assert data["name"] == name
        assert data["contact"] == contact
        TestSubmissions.created_ids.append(data["id"])

    def test_missing_name_rejected(self, api):
        r = api.post(f"{BASE_URL}/api/submissions",
                     json={"kind": "join", "name": "", "contact": "123"})
        assert r.status_code in (400, 422), r.text

    def test_missing_contact_rejected(self, api):
        r = api.post(f"{BASE_URL}/api/submissions",
                     json={"kind": "join", "name": "x", "contact": ""})
        assert r.status_code in (400, 422)

    def test_missing_field_422(self, api):
        r = api.post(f"{BASE_URL}/api/submissions",
                     json={"kind": "join", "name": "x"})
        assert r.status_code == 422

    def test_invalid_kind(self, api):
        r = api.post(f"{BASE_URL}/api/submissions",
                     json={"kind": "invalid", "name": "x", "contact": "y"})
        assert r.status_code == 422

    def test_list_submissions_excludes_objectid(self, api):
        r = api.get(f"{BASE_URL}/api/submissions")
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list) and len(rows) >= 3
        for row in rows:
            assert "_id" not in row
            assert "id" in row and "kind" in row
        # Verify at least one of the created ids is present
        all_ids = {row["id"] for row in rows}
        assert any(cid in all_ids for cid in TestSubmissions.created_ids)

    def test_list_filter_by_kind(self, api):
        r = api.get(f"{BASE_URL}/api/submissions", params={"kind": "join"})
        assert r.status_code == 200
        rows = r.json()
        for row in rows:
            assert row["kind"] == "join"
