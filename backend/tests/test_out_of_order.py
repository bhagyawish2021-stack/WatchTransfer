def test_hackathon_scenario_out_of_order(client):
    # Base state: R001 means C001 is responsible at 10:00.
    
    # Send H002 (10:07) BEFORE H001 (10:05)
    client.post("/handoffs/", json={
        "event_id": "H002",
        "patient_id": "P001",
        "from_clinician": "C002",
        "to_clinician": "C003",
        "event_time": "2026-09-05T10:07:00",
        "received_at": "2026-09-05T10:07:30",
        "source": "SYS"
    })
    
    # Then send H001 (10:05)
    client.post("/handoffs/", json={
        "event_id": "H001",
        "patient_id": "P001",
        "from_clinician": "C001",
        "to_clinician": "C002",
        "event_time": "2026-09-05T10:05:00",
        "received_at": "2026-09-05T10:08:00",
        "source": "SYS"
    })
    
    # Query responsibility at 10:08
    response = client.get("/patients/P001/responsible?timestamp=2026-09-05T10:08:00")
    assert response.status_code == 200
    data = response.json()
    
    # C003 must be responsible, proving the timeline re-evaluated the late H001 event properly
    assert data["responsible_clinician"] == "C003"
    
def test_equal_timestamps_deterministic(client):
    # Two events at exactly 10:05:00
    client.post("/handoffs/", json={
        "event_id": "H_B", # Lexicographically second
        "patient_id": "P001",
        "from_clinician": "C001",
        "to_clinician": "C003",
        "event_time": "2026-09-05T10:05:00",
        "received_at": "2026-09-05T10:05:10",
        "source": "SYS"
    })
    client.post("/handoffs/", json={
        "event_id": "H_A", # Lexicographically first
        "patient_id": "P001",
        "from_clinician": "C001",
        "to_clinician": "C002",
        "event_time": "2026-09-05T10:05:00",
        "received_at": "2026-09-05T10:05:15",
        "source": "SYS"
    })
    
    timeline = client.get("/patients/P001/timeline").json()
    assert timeline[0]["event_id"] == "H_A"
    assert timeline[1]["event_id"] == "H_B"
