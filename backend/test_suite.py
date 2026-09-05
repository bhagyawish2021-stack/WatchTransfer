import unittest
from datetime import datetime, timezone
import requests

BASE_URL = "http://127.0.0.1:8000"

class WatchTransferSystematicTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # 1. Health check
        res = requests.get(f"{BASE_URL}/")
        assert res.status_code == 200, f"Root endpoint failed: {res.status_code}"

    # --- Phase C / D: Basic API & DB Operations ---
    def test_01_health_and_docs(self):
        """Step 6 & 7: Check root and openapi doc tags"""
        res = requests.get(f"{BASE_URL}/openapi.json")
        self.assertEqual(res.status_code, 200)
        spec = res.json()
        tags = {t.get("name") for t in spec.get("tags", [])}
        expected_tags = {"Patients", "Clinicians", "Requests", "Handoffs", "Results", "Notifications", "Audit Trail"}
        for t in expected_tags:
            self.assertIn(t, tags, f"Missing OpenAPI tag: {t}")

    def test_02_patients_crud(self):
        """Step 10: Patients API Positive & Negative Tests"""
        # Negative test: Nonexistent patient
        res = requests.get(f"{BASE_URL}/patients/NONEXISTENT_XYZ")
        self.assertEqual(res.status_code, 404)

        # Positive test: Create test patient
        pid = f"TEST_P_{int(datetime.now().timestamp())}"
        payload = {"patient_id": pid, "name": "Systematic Test Patient"}
        res = requests.post(f"{BASE_URL}/patients/", json=payload)
        self.assertIn(res.status_code, (200, 201))

        # Get one
        res = requests.get(f"{BASE_URL}/patients/{pid}")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["name"], "Systematic Test Patient")

        # Get all
        res = requests.get(f"{BASE_URL}/patients/")
        self.assertEqual(res.status_code, 200)
        p_ids = [p["patient_id"] for p in res.json()]
        self.assertIn(pid, p_ids)

    def test_03_clinicians_api(self):
        """Step 11: Clinicians API"""
        # Ensure C001, C002, C003 exist
        for cid, name, role in [
            ("C001", "Dr. Sarah Smith", "Attending"),
            ("C002", "Dr. Alex Patel", "Fellow"),
            ("C003", "Dr. Clinician Three", "Resident"),
        ]:
            res = requests.get(f"{BASE_URL}/clinicians/{cid}")
            if res.status_code == 404:
                create_res = requests.post(
                    f"{BASE_URL}/clinicians/",
                    json={"clinician_id": cid, "name": name, "role": role},
                )
                self.assertIn(create_res.status_code, (200, 201))

        # Check all appear
        res = requests.get(f"{BASE_URL}/clinicians/")
        self.assertEqual(res.status_code, 200)
        all_cids = {c["clinician_id"] for c in res.json()}
        self.assertTrue({"C001", "C002", "C003"}.issubset(all_cids))

        # Negative test
        res = requests.get(f"{BASE_URL}/clinicians/C999_NONEXISTENT")
        self.assertEqual(res.status_code, 404)

    # --- Phase E & F: Handoffs, Ordering & Responsibility Engine ---
    def test_04_out_of_order_handoff_timeline_and_resolution(self):
        """Steps 14, 16, 17, 18, 19, 20: Out-of-order timeline reconstruction and exact event_time resolution"""
        ts = int(datetime.now().timestamp())
        pid = f"P_TEMPORAL_{ts}"
        requests.post(f"{BASE_URL}/patients/", json={"patient_id": pid, "name": "Temporal Test Patient"})

        # Send 10:07 handoff FIRST (C002 -> C003)
        h2_payload = {
            "event_id": f"H2_{ts}",
            "patient_id": pid,
            "from_clinician": "C002",
            "to_clinician": "C003",
            "event_time": "2026-09-05T10:07:00",
        }
        res = requests.post(f"{BASE_URL}/handoffs/", json=h2_payload)
        self.assertIn(res.status_code, (200, 201))

        # Send 10:05 handoff SECOND (C001 -> C002)
        h1_payload = {
            "event_id": f"H1_{ts}",
            "patient_id": pid,
            "from_clinician": "C001",
            "to_clinician": "C002",
            "event_time": "2026-09-05T10:05:00",
        }
        res = requests.post(f"{BASE_URL}/handoffs/", json=h1_payload)
        self.assertIn(res.status_code, (200, 201))

        # Verify duplicate handoff is rejected (Step 15)
        res_dup = requests.post(f"{BASE_URL}/handoffs/", json=h1_payload)
        self.assertIn(res_dup.status_code, (400, 409))

        # Check Timeline API is ordered by event_time (10:05 before 10:07)
        res_tl = requests.get(f"{BASE_URL}/patients/{pid}/timeline")
        self.assertEqual(res_tl.status_code, 200)
        tl = res_tl.json()
        self.assertEqual(len(tl), 2)
        self.assertEqual(tl[0]["event_id"], f"H1_{ts}")
        self.assertEqual(tl[1]["event_id"], f"H2_{ts}")

        # Step 16: Result at 10:08 (after 10:07) -> Responsible = C003
        res_resp1 = requests.get(
            f"{BASE_URL}/patients/{pid}/responsible",
            params={"timestamp": "2026-09-05T10:08:00"},
        )
        self.assertEqual(res_resp1.status_code, 200)
        self.assertEqual(res_resp1.json()["responsible_clinician"], "C003")

        # Step 17: Result at 10:06 (between 10:05 and 10:07) -> Responsible = C002
        res_resp2 = requests.get(
            f"{BASE_URL}/patients/{pid}/responsible",
            params={"timestamp": "2026-09-05T10:06:00"},
        )
        self.assertEqual(res_resp2.status_code, 200)
        self.assertEqual(res_resp2.json()["responsible_clinician"], "C002")

        # Step 18: Result at exactly 10:05:00 -> Responsible = C002
        res_resp3 = requests.get(
            f"{BASE_URL}/patients/{pid}/responsible",
            params={"timestamp": "2026-09-05T10:05:00"},
        )
        self.assertEqual(res_resp3.status_code, 200)
        self.assertEqual(res_resp3.json()["responsible_clinician"], "C002")

        # Result before 10:05:00 -> Initial clinician C001
        res_resp0 = requests.get(
            f"{BASE_URL}/patients/{pid}/responsible",
            params={"timestamp": "2026-09-05T10:04:00"},
        )
        self.assertEqual(res_resp0.status_code, 200)
        self.assertEqual(res_resp0.json()["responsible_clinician"], "C001")

    # --- Phase G, H, I: Result, Notification & Audit Chain ---
    def test_05_complete_clinical_flow_with_audit_and_notification(self):
        """Phase N & Steps 21-31: End-to-end clinical workflow test"""
        ts = int(datetime.now().timestamp())
        pid = f"P_E2E_{ts}"
        req_id = f"R_E2E_{ts}"
        res_id = f"RES_E2E_{ts}"

        # 1. Create Patient
        requests.post(f"{BASE_URL}/patients/", json={"patient_id": pid, "name": "E2E Patient"})

        # 2. Create Standing Request by C001 for 'Blood Chemistry'
        req_res = requests.post(f"{BASE_URL}/requests/", json={
            "request_id": req_id,
            "patient_id": pid,
            "requested_by": "C001",
            "result_type": "Blood Chemistry",
            "condition": "When available",
            "status": "ACTIVE"
        })
        self.assertIn(req_res.status_code, (200, 201))

        # 3. Handoffs out of order: C002 -> C003 at 10:07, C001 -> C002 at 10:05
        requests.post(f"{BASE_URL}/handoffs/", json={
            "event_id": f"H_E2E_2_{ts}",
            "patient_id": pid,
            "from_clinician": "C002",
            "to_clinician": "C003",
            "event_time": "2026-09-05T10:07:00"
        })
        requests.post(f"{BASE_URL}/handoffs/", json={
            "event_id": f"H_E2E_1_{ts}",
            "patient_id": pid,
            "from_clinician": "C001",
            "to_clinician": "C002",
            "event_time": "2026-09-05T10:05:00"
        })

        # 4. Result arrives at 10:08 (after both handoffs)
        res_resp = requests.post(f"{BASE_URL}/results/", json={
            "result_id": res_id,
            "patient_id": pid,
            "result_type": "Blood Chemistry",
            "result_data": "Potassium: 2.9 mmol/L (Low)",
            "event_time": "2026-09-05T10:08:00"
        })
        self.assertIn(res_resp.status_code, (200, 201))

        # 5. Duplicate result rejection check (Step 25)
        res_dup = requests.post(f"{BASE_URL}/results/", json={
            "result_id": res_id,
            "patient_id": pid,
            "result_type": "Blood Chemistry",
            "result_data": "Duplicate",
            "event_time": "2026-09-05T10:08:00"
        })
        self.assertIn(res_dup.status_code, (400, 409))

        # 6. Check Notification was generated specifically for C003 (NOT C001!) (Step 26)
        all_notifs = requests.get(f"{BASE_URL}/notifications/").json()
        target_notifs = [n for n in all_notifs if n.get("result_id") == res_id]
        self.assertEqual(len(target_notifs), 1, "Expected exactly one notification generated for the result")
        notif = target_notifs[0]
        self.assertEqual(notif["clinician_id"], "C003", "Notification MUST be routed to C003, not C001!")
        self.assertEqual(notif["status"], "PENDING")

        # 7. Acknowledge notification (Step 27)
        notif_id = notif["notification_id"]
        ack_res = requests.patch(f"{BASE_URL}/notifications/{notif_id}/acknowledge")
        self.assertEqual(ack_res.status_code, 200)
        self.assertEqual(ack_res.json()["status"], "ACKNOWLEDGED")

        # 8. Verify Audit Trail completeness (Step 29 & 31)
        audit_res = requests.get(f"{BASE_URL}/patients/{pid}/audit")
        self.assertEqual(audit_res.status_code, 200)
        audit_records = audit_res.json()
        event_types = [a["event_type"] for a in audit_records]

        expected_audit_types = [
            "REQUEST_CREATED",
            "HANDOFF_RECEIVED",
            "RESULT_RECEIVED",
            "NOTIFICATION_CREATED",
            "NOTIFICATION_ACKNOWLEDGED",
        ]
        for eat in expected_audit_types:
            self.assertIn(eat, event_types, f"Audit trail missing {eat}")

        # Ensure no DELETE or PUT on audit trail (Step 31 immutability check)
        del_res = requests.delete(f"{BASE_URL}/audit/")
        self.assertIn(del_res.status_code, (404, 405))
        put_res = requests.put(f"{BASE_URL}/audit/", json={})
        self.assertIn(put_res.status_code, (404, 405))

    # --- Phase M: Edge Cases ---
    def test_06_edge_cases_no_request_or_wrong_type(self):
        """Steps 23 & 24: No notification if no active request or wrong result type"""
        ts = int(datetime.now().timestamp())
        pid = f"P_EDGE_{ts}"
        requests.post(f"{BASE_URL}/patients/", json={"patient_id": pid, "name": "Edge Patient"})

        # Send result with NO active standing request
        res_no_req = requests.post(f"{BASE_URL}/results/", json={
            "result_id": f"RES_NO_REQ_{ts}",
            "patient_id": pid,
            "result_type": "Blood Test",
            "result_data": "Normal",
            "event_time": "2026-09-05T10:00:00"
        })
        self.assertIn(res_no_req.status_code, (200, 201))

        # Notification should NOT be created
        all_notifs = requests.get(f"{BASE_URL}/notifications/").json()
        matching = [n for n in all_notifs if n.get("result_id") == f"RES_NO_REQ_{ts}"]
        self.assertEqual(len(matching), 0, "No notification should be created when no active standing request exists")

        # Now create request for 'Blood Test', but send 'MRI'
        requests.post(f"{BASE_URL}/requests/", json={
            "request_id": f"R_EDGE_{ts}",
            "patient_id": pid,
            "requested_by": "C001",
            "result_type": "Blood Test",
            "condition": "When available",
            "status": "ACTIVE"
        })
        res_mri = requests.post(f"{BASE_URL}/results/", json={
            "result_id": f"RES_MRI_{ts}",
            "patient_id": pid,
            "result_type": "MRI",
            "result_data": "Normal scan",
            "event_time": "2026-09-05T10:05:00"
        })
        self.assertIn(res_mri.status_code, (200, 201))

        # Should still be no notification for MRI
        all_notifs = requests.get(f"{BASE_URL}/notifications/").json()
        matching_mri = [n for n in all_notifs if n.get("result_id") == f"RES_MRI_{ts}"]
        self.assertEqual(len(matching_mri), 0, "No notification should be created for mismatched result_type")

if __name__ == "__main__":
    unittest.main(verbosity=2)
