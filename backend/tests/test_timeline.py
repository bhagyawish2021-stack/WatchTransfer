def test_timeline_sorting_out_of_order_insertion(client):
    # Insert 10:10 first
    r1 = client.post("/handoffs/", json={
        "event_id": "H003",
        "patient_id": "P001",
        "from_clinician": "C002",
        "to_clinician": "C003",
        "event_time": "2026-09-05T10:10:00",
        "received_at": "2026-09-05T10:01:00",
        "source": "SYS"
    })
    assert r1.status_code == 200
    # Insert 10:05 second
    r2 = client.post("/handoffs/", json={
        "event_id": "H001",
        "patient_id": "P001",
        "from_clinician": "C001",
        "to_clinician": "C002",
        "event_time": "2026-09-05T10:05:00",
        "received_at": "2026-09-05T10:02:00",
        "source": "SYS"
    })
    assert r2.status_code == 200
    
    response = client.get("/patients/P001/timeline")
    assert response.status_code == 200
    timeline = response.json()
    
    # Must be sorted by event_time: H001 (10:05) -> H003 (10:10)
    assert len(timeline) == 2
    assert timeline[0]["event_id"] == "H001"
    assert timeline[1]["event_id"] == "H003"
