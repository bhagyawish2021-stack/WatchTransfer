def test_normal_end_to_end(client):
    # Handoff C001 -> C002 at 10:05
    client.post("/handoffs/", json={
        "event_id": "H001", "patient_id": "P001", "from_clinician": "C001",
        "to_clinician": "C002", "event_time": "2026-09-05T10:05:00",
        "received_at": "2026-09-05T10:05:30", "source": "SYS"
    })
    # Handoff C002 -> C003 at 10:07
    client.post("/handoffs/", json={
        "event_id": "H002", "patient_id": "P001", "from_clinician": "C002",
        "to_clinician": "C003", "event_time": "2026-09-05T10:07:00",
        "received_at": "2026-09-05T10:07:30", "source": "SYS"
    })
    
    # Result at 10:08
    r = client.post("/results/", json={
        "result_id": "RES001", "patient_id": "P001", "result_type": "Blood Test",
        "result_data": "Hgb: 13.2", "event_time": "2026-09-05T10:08:00",
        "received_at": "2026-09-05T10:09:00"
    })
    assert r.status_code == 200
    
    # Verify C003 got the notification
    nots = client.get("/notifications/C003").json()
    assert len(nots) == 1
    assert nots[0]["result_id"] == "RES001"
    
def test_hackathon_out_of_order_handoffs(client):
    # 10:07 handoff arrives FIRST
    client.post("/handoffs/", json={
        "event_id": "H002", "patient_id": "P001", "from_clinician": "C002",
        "to_clinician": "C003", "event_time": "2026-09-05T10:07:00",
        "received_at": "2026-09-05T10:07:00", "source": "SYS"
    })
    # 10:05 handoff arrives SECOND
    client.post("/handoffs/", json={
        "event_id": "H001", "patient_id": "P001", "from_clinician": "C001",
        "to_clinician": "C002", "event_time": "2026-09-05T10:05:00",
        "received_at": "2026-09-05T10:08:00", "source": "SYS"
    })
    # Result at 10:08
    client.post("/results/", json={
        "result_id": "RES002", "patient_id": "P001", "result_type": "Blood Test",
        "result_data": "Hgb: 12.0", "event_time": "2026-09-05T10:08:00",
        "received_at": "2026-09-05T10:09:00"
    })
    
    nots = client.get("/notifications/C003").json()
    assert len(nots) >= 1
    assert any(n["result_id"] == "RES002" for n in nots)

def test_result_before_handoff(client):
    client.post("/handoffs/", json={
        "event_id": "H001", "patient_id": "P001", "from_clinician": "C001",
        "to_clinician": "C002", "event_time": "2026-09-05T10:05:00",
        "received_at": "2026-09-05T10:05:30", "source": "SYS"
    })
    # Result at 10:04
    client.post("/results/", json={
        "result_id": "RES003", "patient_id": "P001", "result_type": "Blood Test",
        "result_data": "Data", "event_time": "2026-09-05T10:04:00",
        "received_at": "2026-09-05T10:04:30"
    })
    
    # Should go to C001
    nots = client.get("/notifications/C001").json()
    assert any(n["result_id"] == "RES003" for n in nots)

def test_result_exactly_at_handoff(client):
    client.post("/handoffs/", json={
        "event_id": "H001", "patient_id": "P001", "from_clinician": "C001",
        "to_clinician": "C002", "event_time": "2026-09-05T10:05:00",
        "received_at": "2026-09-05T10:05:00", "source": "SYS"
    })
    # Result EXACTLY at 10:05
    client.post("/results/", json={
        "result_id": "RES004", "patient_id": "P001", "result_type": "Blood Test",
        "result_data": "Data", "event_time": "2026-09-05T10:05:00",
        "received_at": "2026-09-05T10:06:00"
    })
    
    # Should go to C002 based on our exact-time rule
    nots = client.get("/notifications/C002").json()
    assert any(n["result_id"] == "RES004" for n in nots)

def test_multiple_rapid_handoffs(client):
    client.post("/handoffs/", json={
        "event_id": "H001", "patient_id": "P001", "from_clinician": "C001", "to_clinician": "C002", "event_time": "2026-09-05T10:01:00", "received_at": "2026-09-05T10:01:30", "source": "SYS"
    })
    client.post("/handoffs/", json={
        "event_id": "H002", "patient_id": "P001", "from_clinician": "C002", "to_clinician": "C003", "event_time": "2026-09-05T10:03:00", "received_at": "2026-09-05T10:03:30", "source": "SYS"
    })
    client.post("/handoffs/", json={
        "event_id": "H003", "patient_id": "P001", "from_clinician": "C003", "to_clinician": "C001", "event_time": "2026-09-05T10:05:00", "received_at": "2026-09-05T10:05:30", "source": "SYS"
    })
    client.post("/handoffs/", json={
        "event_id": "H004", "patient_id": "P001", "from_clinician": "C001", "to_clinician": "C002", "event_time": "2026-09-05T10:07:00", "received_at": "2026-09-05T10:07:30", "source": "SYS"
    })
    # Result at 10:08
    client.post("/results/", json={
        "result_id": "RES005", "patient_id": "P001", "result_type": "Blood Test",
        "result_data": "Data", "event_time": "2026-09-05T10:08:00", "received_at": "2026-09-05T10:08:30"
    })
    
    nots = client.get("/notifications/C002").json()
    assert any(n["result_id"] == "RES005" for n in nots)

def test_no_active_request(client):
    # Send X-Ray result, but we only have a Blood Test standing request
    client.post("/results/", json={
        "result_id": "RES006", "patient_id": "P001", "result_type": "X-Ray",
        "result_data": "Data", "event_time": "2026-09-05T10:08:00", "received_at": "2026-09-05T10:08:30"
    })
    
    # All notifications should NOT have RES006
    nots = client.get("/notifications/").json()
    assert not any(n["result_id"] == "RES006" for n in nots)

def test_duplicate_result(client):
    r1 = client.post("/results/", json={
        "result_id": "RES007", "patient_id": "P001", "result_type": "Blood Test",
        "result_data": "Data", "event_time": "2026-09-05T10:08:00", "received_at": "2026-09-05T10:08:30"
    })
    assert r1.status_code == 200
    
    r2 = client.post("/results/", json={
        "result_id": "RES007", "patient_id": "P001", "result_type": "Blood Test",
        "result_data": "Data", "event_time": "2026-09-05T10:08:00", "received_at": "2026-09-05T10:08:30"
    })
    assert r2.status_code == 400
    
    # Make sure only one notification was created for RES007
    nots = client.get("/notifications/").json()
    res007_nots = [n for n in nots if n["result_id"] == "RES007"]
    assert len(res007_nots) == 1
