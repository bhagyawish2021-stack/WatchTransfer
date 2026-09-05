import os
import pytest

# Override environment BEFORE importing database so create_engine uses sqlite for tests
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base, get_db
from main import app

# Use in-memory SQLite with StaticPool to keep tables across connections
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="function")
def client():
    # Fresh database for every test
    Base.metadata.create_all(bind=engine)
    
    with TestClient(app) as c:
        # Pre-populate base entities
        c.post("/patients/", json={"patient_id": "P001", "name": "Ravi"})
        c.post("/clinicians/", json={"clinician_id": "C001", "name": "Dr. A", "role": "Physician"})
        c.post("/clinicians/", json={"clinician_id": "C002", "name": "Dr. B", "role": "Physician"})
        c.post("/clinicians/", json={"clinician_id": "C003", "name": "Dr. C", "role": "Physician"})
        c.post("/clinicians/", json={"clinician_id": "C004", "name": "Dr. D", "role": "Physician"})
        
        c.post("/requests/", json={
            "request_id": "R001",
            "patient_id": "P001",
            "requested_by": "C001",
            "result_type": "Blood Test",
            "condition": "When available",
            "status": "ACTIVE"
        })
        yield c
        
    Base.metadata.drop_all(bind=engine)
