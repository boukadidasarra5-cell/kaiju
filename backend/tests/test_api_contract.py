import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def _token(username, role, district_id=None):
    body = {"username": username, "password": "test123", "role": role}
    if district_id is not None:
        body["district_id"] = district_id
    client.post("/auth/register", json=body)
    r = client.post("/auth/login", json={"username": username, "password": "test123"})
    return r.json()["access_token"]


def h(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def cd():
    return _token("cd_test", "CD")


@pytest.fixture
def lc():
    return _token("lc_test", "LC")


@pytest.fixture
def qc_apex():
    return _token("qc_test", "QC", 1)


@pytest.fixture
def qc_echo():
    return _token("qc_echo_test", "QC", 2)


def _stock(token, district_id, resource_id):
    rows = client.get(f"/districts/{district_id}/stock", headers=h(token)).json()
    return next(r["current_quantity"] for r in rows if r["resource_id"] == resource_id)


def _create_transfer(token, quantity=1):
    # Apex -> Echo, resource 1 (Medical personnel) : voisins directs
    r = client.post("/transfers", headers=h(token), json={
        "resource_id": 1, "from_district_id": 1, "to_district_id": 2,
        "quantity": quantity, "route_type": "direct",
    })
    assert r.status_code == 201, r.json()
    return r.json()["id"]


def test_districts_public_list():
    r = client.get("/districts")
    assert r.status_code == 200
    assert all(1 <= d["disaster_level"] <= 5 for d in r.json())
    codes = [d["code"] for d in r.json()]
    assert codes == ["A", "E", "W", "X", "Z"]
    maritime = {d["code"] for d in r.json() if d["has_maritime_access"]}
    assert maritime == {"E", "X", "Z"}


def test_adjacency_of_xeno_is_everyone(qc_apex):
    xeno = next(d["id"] for d in client.get("/districts").json() if d["code"] == "X")
    r = client.get(f"/districts/{xeno}/adjacency", headers=h(qc_apex))
    assert r.status_code == 200
    assert r.json()["adjacent_to"] == ["A", "E", "W", "Z"]


def test_adjacency_requires_auth():
    assert client.get("/districts/1/adjacency").status_code == 401


def test_adjacency_unknown_district(qc_apex):
    r = client.get("/districts/999/adjacency", headers=h(qc_apex))
    assert r.status_code == 404
    assert r.json()["error_code"] == "NOT_FOUND"


def test_resources_list(qc_apex):
    r = client.get("/resources", headers=h(qc_apex))
    assert r.status_code == 200
    assert len(r.json()) == 10
    assert r.json()[0] == {"id": 1, "name": "Medical personnel"}


def test_me_returns_current_user(qc_apex):
    r = client.get("/auth/me", headers=h(qc_apex))
    assert r.status_code == 200
    assert r.json()["username"] == "qc_test"
    assert r.json()["role"] == "QC"
    assert r.json()["district_id"] == 1


def test_me_requires_auth():
    assert client.get("/auth/me").status_code == 401


def test_list_transfers_filtered_by_status(cd, qc_apex):
    client.patch("/districts/1/disaster", json={"level": 3}, headers=h(cd))
    tid = _create_transfer(qc_apex)
    pending = client.get("/transfers?status=pending", headers=h(qc_apex))
    assert pending.status_code == 200
    assert tid in [t["id"] for t in pending.json()]
    assert all(t["status"] == "pending" for t in pending.json())


def test_list_transfers_bad_status(qc_apex):
    r = client.get("/transfers?status=bogus", headers=h(qc_apex))
    assert r.status_code == 400
    assert r.json()["error_code"] == "VALIDATION_ERROR"


def test_approve_moves_stock(cd, qc_apex):
    client.patch("/districts/1/disaster", json={"level": 3}, headers=h(cd))
    tid = _create_transfer(qc_apex)
    src_before = _stock(qc_apex, 1, 1)
    dst_before = _stock(qc_apex, 2, 1)

    r = client.patch(f"/transfers/{tid}/approve", headers=h(qc_apex))
    assert r.status_code == 200
    assert r.json() == {"id": tid, "status": "approved"}
    assert _stock(qc_apex, 1, 1) == src_before - 1
    assert _stock(qc_apex, 2, 1) == dst_before + 1

    again = client.patch(f"/transfers/{tid}/approve", headers=h(qc_apex))
    assert again.status_code == 422


def test_approve_forbidden_for_lc_and_other_qc(cd, qc_apex, lc, qc_echo):
    client.patch("/districts/1/disaster", json={"level": 3}, headers=h(cd))
    tid = _create_transfer(qc_apex)
    assert client.patch(f"/transfers/{tid}/approve", headers=h(lc)).status_code == 403
    assert client.patch(f"/transfers/{tid}/approve", headers=h(qc_echo)).status_code == 403
    assert client.patch(f"/transfers/{tid}/reject", headers=h(lc)).status_code == 403


def test_reject_leaves_stock_untouched(cd, qc_apex):
    client.patch("/districts/1/disaster", json={"level": 3}, headers=h(cd))
    tid = _create_transfer(qc_apex)
    before = _stock(qc_apex, 1, 1)
    r = client.patch(f"/transfers/{tid}/reject", headers=h(qc_apex))
    assert r.status_code == 200
    assert r.json()["status"] == "rejected"
    assert _stock(qc_apex, 1, 1) == before


def test_approve_unknown_transfer(cd):
    r = client.patch("/transfers/999999/approve", headers=h(cd))
    assert r.status_code == 404


def test_malformed_body_returns_contract_error():
    r = client.post("/auth/login", json={"username": "x"})
    assert r.status_code == 400
    body = r.json()
    assert body["error_code"] == "VALIDATION_ERROR"
    assert body["status"] == 400


def test_levels_are_independent_per_district(cd, qc_apex):
    client.patch("/districts/1/disaster", json={"level": 3}, headers=h(cd))
    client.patch("/districts/2/disaster", json={"level": 1}, headers=h(cd))
    levels = {d["district_id"]: d["level"] for d in client.get("/disaster").json()}
    assert levels[1] == 3 and levels[2] == 1

    # Apex (niveau 3) peut émettre un transfert, Echo (niveau 1) non
    ok = client.post("/transfers", headers=h(qc_apex), json={
        "resource_id": 1, "from_district_id": 1, "to_district_id": 2, "quantity": 1, "route_type": "direct"})
    assert ok.status_code == 201
    qc_echo = _token("qc_echo_test", "QC", 2)
    denied = client.post("/transfers", headers=h(qc_echo), json={
        "resource_id": 1, "from_district_id": 2, "to_district_id": 1, "quantity": 1, "route_type": "direct"})
    assert denied.status_code == 422
    assert denied.json()["error_code"] == "DISASTER_LEVEL_FORBIDDEN"


def test_set_district_level_requires_cd(qc_apex):
    r = client.patch("/districts/1/disaster", json={"level": 2}, headers=h(qc_apex))
    assert r.status_code == 403


def test_set_level_unknown_district(cd):
    r = client.patch("/districts/999/disaster", json={"level": 2}, headers=h(cd))
    assert r.status_code == 404


def test_retention_lowered_only_for_that_district(cd, qc_apex):
    client.patch("/districts/2/disaster", json={"level": 5, "retention_threshold_pct": 15}, headers=h(cd))
    echo = client.get("/districts/2/stock", headers=h(qc_apex)).json()
    apex = client.get("/districts/1/stock", headers=h(qc_apex)).json()
    # Echo : médical initial 5 -> ceil(5*15%) = 1 ; Apex garde 30% : ceil(12*30%) = 4
    assert next(r for r in echo if r["resource_id"] == 1)["retention_min"] == 1
    assert next(r for r in apex if r["resource_id"] == 1)["retention_min"] == 4
    # remet le seuil à 30 % : niveau 5 requis pour repasser par l'API
    client.patch("/districts/2/disaster", json={"level": 5, "retention_threshold_pct": 30}, headers=h(cd))
    client.patch("/districts/2/disaster", json={"level": 1}, headers=h(cd))
