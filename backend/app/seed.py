from app.db.session import SessionLocal
from app.models.district import District, DistrictAdjacency
from app.models.resource import Resource
from app.models.stock import Stock
import math

# Districts
DISTRICTS = [
    {"code": "A", "name": "Apex", "has_maritime_access": False},
    {"code": "E", "name": "Echo", "has_maritime_access": True},
    {"code": "W", "name": "Warden", "has_maritime_access": False},
    {"code": "X", "name": "Xeno", "has_maritime_access": True},
    {"code": "Z", "name": "Zion", "has_maritime_access": True},
]

# Adjacency (paires uniques, non orientées)
ADJACENCY_PAIRS = [
    ("A", "E"),
    ("A", "W"),
    ("A", "X"),
    ("E", "X"),
    ("W", "X"),
    ("W", "Z"),
    ("X", "Z"),
]

# Resources
RESOURCES = [
    "Medical personnel",
    "Rescue teams",
    "Transport vehicles",
    "Emergency shelters",
    "Food & water supplies",
    "Communication equipment",
    "Power generators",
    "Engineering crews",
    "Security units",
    "Hazmat equipment",
]

# Initial distribution: {resource: {district_code: quantity}}
INITIAL_DISTRIBUTION = {
    "Medical personnel":        {"A": 12, "E": 5, "W": 8,  "X": 3,  "Z": 7},
    "Rescue teams":              {"A": 4,  "E": 9, "W": 3,  "X": 6,  "Z": 5},
    "Transport vehicles":        {"A": 6,  "E": 3, "W": 10, "X": 4,  "Z": 7},
    "Emergency shelters":        {"A": 8,  "E": 6, "W": 4,  "X": 10, "Z": 2},
    "Food & water supplies":     {"A": 5,  "E": 8, "W": 6,  "X": 7,  "Z": 9},
    "Communication equipment":   {"A": 3,  "E": 7, "W": 5,  "X": 8,  "Z": 4},
    "Power generators":          {"A": 7,  "E": 2, "W": 9,  "X": 5,  "Z": 6},
    "Engineering crews":         {"A": 2,  "E": 6, "W": 7,  "X": 4,  "Z": 8},
    "Security units":            {"A": 9,  "E": 4, "W": 2,  "X": 6,  "Z": 3},
    "Hazmat equipment":          {"A": 3,  "E": 5, "W": 4,  "X": 2,  "Z": 10},
}

RETENTION_PCT = 30.0  # seuil par défaut, CD peut le baisser à 15% en level 5


def retention_min(initial_qty: int) -> int:
    return math.ceil(initial_qty * RETENTION_PCT / 100)


def seed():
    db = SessionLocal()
    try:
        # Districts
        district_map = {}
        for d in DISTRICTS:
            existing = db.query(District).filter_by(code=d["code"]).first()
            if existing:
                district_map[d["code"]] = existing
                continue
            obj = District(**d)
            db.add(obj)
            db.flush()
            district_map[d["code"]] = obj

        # Adjacency
        for code_a, code_b in ADJACENCY_PAIRS:
            a, b = district_map[code_a], district_map[code_b]
            exists = db.query(DistrictAdjacency).filter(
                ((DistrictAdjacency.district_a_id == a.id) & (DistrictAdjacency.district_b_id == b.id))
                | ((DistrictAdjacency.district_a_id == b.id) & (DistrictAdjacency.district_b_id == a.id))
            ).first()
            if not exists:
                db.add(DistrictAdjacency(district_a_id=a.id, district_b_id=b.id))

        # Resources
        resource_map = {}
        for name in RESOURCES:
            existing = db.query(Resource).filter_by(name=name).first()
            if existing:
                resource_map[name] = existing
                continue
            obj = Resource(name=name)
            db.add(obj)
            db.flush()
            resource_map[name] = obj

        # Stocks
        for resource_name, per_district in INITIAL_DISTRIBUTION.items():
            resource = resource_map[resource_name]
            for code, qty in per_district.items():
                district = district_map[code]
                existing = db.query(Stock).filter_by(
                    district_id=district.id, resource_id=resource.id
                ).first()
                if existing:
                    continue
                db.add(Stock(
                    district_id=district.id,
                    resource_id=resource.id,
                    initial_quantity=qty,
                    current_quantity=qty,
                    retention_threshold_pct=RETENTION_PCT,
                ))

        db.commit()
        print("Seed completed successfully.")
    except Exception as e:
        db.rollback()
        print(f"Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()