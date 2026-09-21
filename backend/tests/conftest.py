import pytest
from sqlalchemy import text
from app.db.session import SessionLocal


@pytest.fixture(scope="session", autouse=True)
def reset_dev_state():
    # Les tests tournent sur la base de dev : on remet stocks, seuils et niveaux à l'état du seed pour qu'ils soient rejouables
    db = SessionLocal()
    try:
        db.execute(text("UPDATE stocks SET current_quantity = initial_quantity, retention_threshold_pct = 30"))
        db.execute(text("UPDATE districts SET disaster_level = 1"))
        db.commit()
    finally:
        db.close()