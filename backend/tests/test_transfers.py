import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


@pytest.fixture
def qc_token(): # QC assigné au district 1 (Apex)

    client.post("/auth/register", json={
        "username": "qc_test", "password": "test123",
        "role": "QC", "district_id": 1,
    })
    r = client.post("/auth/login", json={"username": "qc_test", "password": "test123"})
    return r.json()["access_token"]


@pytest.fixture
def cd_token(): # CD, autorité ville entière

    client.post("/auth/register", json={
        "username": "cd_test", "password": "test123",
        "role": "CD",
    })
    r = client.post("/auth/login", json={"username": "cd_test", "password": "test123"})
    return r.json()["access_token"]


@pytest.fixture
def lc_token(): # LC, multi-quartier (pas d'assignation à un seul district)

    client.post("/auth/register", json={
        "username": "lc_test", "password": "test123",
        "role": "LC",
    })
    r = client.post("/auth/login", json={"username": "lc_test", "password": "test123"})
    return r.json()["access_token"]


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


# Transfert valide (parcours heureux)

def test_transfer_direct_valid(qc_token, cd_token):
    """Transfert direct entre deux quartiers adjacents (Apex -> Echo)."""
    client.patch("/districts/1/disaster", json={"level": 3}, headers=auth_header(cd_token))
    response = client.post(
        "/transfers",
        json={
            "resource_id": 1,
            "from_district_id": 1,
            "to_district_id": 2,
            "quantity": 1,
            "route_type": "direct",
        },
        headers=auth_header(qc_token),
    )
    print(f"\n[transfer direct valid] status={response.status_code} body={response.json()}")
    assert response.status_code == 201, f"Attendu 201, reçu {response.status_code} : {response.json()}"
    assert response.json()["status"] == "pending", f"Attendu status=pending, reçu {response.json()['status']}"


# Transfert refusé : adjacence

def test_transfer_rejected_adjacency_violation(qc_token): # Transfert direct entre deux quartiers non adjacents (Echo -> Warden)

    response = client.post(
        "/transfers",
        json={
            "resource_id": 1,
            "from_district_id": 2,
            "to_district_id": 3,
            "quantity": 1,
            "route_type": "direct",
        },
        headers=auth_header(qc_token),
    )
    print(f"\n[adjacency violation] status={response.status_code} body={response.json()}")
    assert response.status_code == 422, f"Attendu 422, reçu {response.status_code} : {response.json()}"
    assert response.json()["error_code"] == "ADJACENCY_VIOLATION", (
        f"Attendu error_code=ADJACENCY_VIOLATION, reçu {response.json().get('error_code')}"
    )


# Transfert refusé : rétention

def test_transfer_rejected_retention_violation(qc_token): # Communication equipment (resource_id=6) à Apex : initial=3, min=1

    response = client.post(
        "/transfers",
        json={
            "resource_id": 6,
            "from_district_id": 1,
            "to_district_id": 2,
            "quantity": 3, # Transférer 3 unités ferait descendre à 0, sous le minimum
            "route_type": "direct",
        },
        headers=auth_header(qc_token),
    )
    print(f"\n[retention violation] status={response.status_code} body={response.json()}")
    assert response.status_code == 422, f"Attendu 422, reçu {response.status_code} : {response.json()}"
    assert response.json()["error_code"] == "RETENTION_VIOLATION", (
        f"Attendu error_code=RETENTION_VIOLATION, reçu {response.json().get('error_code')}"
    )


# Transfert refusé : non authentifié

def test_transfer_rejected_unauthenticated():
    response = client.post(
        "/transfers",
        json={
            "resource_id": 1,
            "from_district_id": 1,
            "to_district_id": 2,
            "quantity": 1,
            "route_type": "direct",
        },
    )
    print(f"\n[unauthenticated] status={response.status_code} body={response.json()}")
    assert response.status_code == 401, f"Attendu 401, reçu {response.status_code} : {response.json()}"
    assert response.json()["error_code"] == "UNAUTHENTICATED", (
        f"Attendu error_code=UNAUTHENTICATED, reçu {response.json().get('error_code')}"
    )


# Permission refusée : abaisser le seuil sans être CD

def test_lower_retention_rejected_wrong_role(qc_token):
    response = client.patch(
        "/districts/1/disaster",
        json={"level": 5, "retention_threshold_pct": 15},
        headers=auth_header(qc_token),
    )
    print(f"\n[wrong role] status={response.status_code} body={response.json()}")
    assert response.status_code == 403, f"Attendu 403, reçu {response.status_code} : {response.json()}"
    assert response.json()["error_code"] == "PERMISSION_DENIED", (
        f"Attendu error_code=PERMISSION_DENIED, reçu {response.json().get('error_code')}"
    )


# Permission refusée : CD abaisse le seuil avant le niveau 5

def test_lower_retention_rejected_wrong_level(cd_token):
    response = client.patch(
        "/districts/1/disaster",
        json={"level": 3, "retention_threshold_pct": 15},
        headers=auth_header(cd_token),
    )
    print(f"\n[wrong level] status={response.status_code} body={response.json()}")
    assert response.status_code == 422, f"Attendu 422, reçu {response.status_code} : {response.json()}"
    assert response.json()["error_code"] == "DISASTER_LEVEL_FORBIDDEN", (
        f"Attendu error_code=DISASTER_LEVEL_FORBIDDEN, reçu {response.json().get('error_code')}"
    )


# Escalade de niveau réussie

def test_disaster_level_escalation(cd_token):
    response = client.patch(
        "/districts/1/disaster",
        json={"level": 3},
        headers=auth_header(cd_token),
    )
    print(f"\n[level escalation] status={response.status_code} body={response.json()}")
    assert response.status_code == 200, f"Attendu 200, reçu {response.status_code} : {response.json()}"
    assert response.json()["level"] == 3, f"Attendu level=3, reçu {response.json()['level']}"


# CD abaisse le seuil à 15% au niveau 5 (parcours complet)

def test_lower_retention_success_at_level_5(cd_token):
    response = client.patch(
        "/districts/1/disaster",
        json={"level": 5, "retention_threshold_pct": 15},
        headers=auth_header(cd_token),
    )
    print(f"\n[lower retention success] status={response.status_code} body={response.json()}")
    assert response.status_code == 200, f"Attendu 200, reçu {response.status_code} : {response.json()}"
    assert response.json()["level"] == 5, f"Attendu level=5, reçu {response.json()['level']}"


# LC peut aussi créer un transfert

def test_transfer_direct_valid_as_lc(lc_token, cd_token):
    """Un LC (multi-quartier) peut créer un transfert, comme un QC."""
    client.patch("/districts/1/disaster", json={"level": 4}, headers=auth_header(cd_token))
    response = client.post(
        "/transfers",
        json={
            "resource_id": 1,
            "from_district_id": 1,
            "to_district_id": 2,
            "quantity": 1,
            "route_type": "direct",
        },
        headers=auth_header(lc_token),
    )
    print(f"\n[transfer as LC] status={response.status_code} body={response.json()}")
    assert response.status_code == 201, f"Attendu 201, reçu {response.status_code} : {response.json()}"
    assert response.json()["status"] == "pending", f"Attendu status=pending, reçu {response.json()['status']}"


# Réquisition refusée : rôle non-CD (mauvais token)

def test_requisition_rejected_wrong_role(qc_token):
    response = client.post(
        "/transfers/requisition",
        json={"resource_id": 2, "from_district_id": 1, "to_district_id": 2, "quantity": 1},
        headers=auth_header(qc_token),
    )
    print(f"\n[requisition wrong role] status={response.status_code} body={response.json()}")
    assert response.status_code == 403, f"Attendu 403, reçu {response.status_code} : {response.json()}"
    assert response.json()["error_code"] == "PERMISSION_DENIED", (
        f"Attendu error_code=PERMISSION_DENIED, reçu {response.json().get('error_code')}"
    )


# Réquisition refusée : niveau inférieur à 4

def test_requisition_rejected_wrong_level(cd_token):
    client.patch("/districts/1/disaster", json={"level": 3}, headers=auth_header(cd_token)) # on repasse explicitement au niveau 3

    response = client.post(
        "/transfers/requisition",
        json={"resource_id": 2, "from_district_id": 1, "to_district_id": 2, "quantity": 1},
        headers=auth_header(cd_token),
    )
    print(f"\n[requisition wrong level] status={response.status_code} body={response.json()}")
    assert response.status_code == 422, f"Attendu 422, reçu {response.status_code} : {response.json()}"
    assert response.json()["error_code"] == "DISASTER_LEVEL_FORBIDDEN", (
        f"Attendu error_code=DISASTER_LEVEL_FORBIDDEN, reçu {response.json().get('error_code')}"
    )


# Réquisition réussie au niveau 4, mouvement immédiat du stock

def test_requisition_success_at_level_4(cd_token):
    client.patch("/districts/1/disaster", json={"level": 4}, headers=auth_header(cd_token))

    stock_before = client.get("/districts/1/stock", headers=auth_header(cd_token)).json()
    qty_before = next(s["current_quantity"] for s in stock_before if s["resource_id"] == 2)

    response = client.post(
        "/transfers/requisition",
        json={"resource_id": 2, "from_district_id": 1, "to_district_id": 2, "quantity": 1},
        headers=auth_header(cd_token),
    )
    print(f"\n[requisition success] status={response.status_code} body={response.json()}")
    assert response.status_code == 201, f"Attendu 201, reçu {response.status_code} : {response.json()}"
    assert response.json()["status"] == "completed", (
        f"Attendu status=completed (pas pending), reçu {response.json()['status']}"
    )

    stock_after = client.get("/districts/1/stock", headers=auth_header(cd_token)).json()
    qty_after = next(s["current_quantity"] for s in stock_after if s["resource_id"] == 2)

    print(f"[requisition success] stock avant={qty_before}, après={qty_after}")
    assert qty_after == qty_before - 1, (
        f"Le stock aurait dû diminuer de 1 immédiatement, avant={qty_before}, après={qty_after}"
    )