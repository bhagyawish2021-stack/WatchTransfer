def test_create_handoff(client):
    response = client.post("/handoffs/", json={
        "event_id": "H001",
        "patient_id": "P001",
        "from_clinician": "C001",
        "to_clinician": "C002",
        "event_time": "2026-09-05T10:05:00",
        "received_at": "2026-09-05T10:08:00",
        "source": "SYS"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["event_id"] == "H001"

def test_duplicate_handoff(client):
    payload = {
        "event_id": "H001",
        "patient_id": "P001",
        "from_clinician": "C001",
        "to_clinician": "C002",
        "event_time": "2026-09-05T10:05:00",
        "received_at": "2026-09-05T10:08:00",
        "source": "SYS"
    }
    client.post("/handoffs/", json=payload)
    response = client.post("/handoffs/", json=payload)
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]
