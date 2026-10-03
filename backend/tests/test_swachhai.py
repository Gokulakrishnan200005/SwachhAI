import pytest
import os
import io
from pathlib import Path
from PIL import Image
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.database import Base, get_db, SessionLocal
from app.main import app
from app.models import User, Report, CollectionTask
from app.auth import hash_password, verify_password, create_access_token
from app.ai.cv_engine import analyze_waste_image
from app.ai.segregation_engine import analyze_segregation
from app.ai.priority_engine import calculate_priority_score
from app.ai.verification_engine import verify_collection
from app.ai.evidence_validator import validate_collection_evidence
from app.ai.hotspot_engine import cluster_reports_into_hotspots, generate_hotspot_predictions
from app.ai.route_optimizer import optimize_collection_route
from app.demo_data import create_synthetic_image, seed_demo_database

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Ensure demo database is populated before running API tests."""
    db = SessionLocal()
    try:
        seed_demo_database(db, force=True)
    finally:
        db.close()

# Test 1: Authentication & Hashing
def test_authentication_and_password_hashing():
    pw = "SuperSecure2026!"
    hashed = hash_password(pw)
    assert verify_password(pw, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

    token = create_access_token({"sub": "admin@swachhai.org", "role": "admin"})
    assert isinstance(token, str)
    assert len(token) > 20

# Test 2: Segregation Analysis Engine
def test_segregation_analysis_engine():
    # Mixed wet and dry
    res1 = analyze_segregation(["Organic/Wet Waste", "Plastic"], [{"name": "food"}, {"name": "bottle"}])
    assert res1["segregation_status"] == "IMPROPER"
    assert "Separate wet" in res1["recommendation"]

    # Only Organic
    res2 = analyze_segregation(["Organic/Wet Waste"], [{"name": "vegetable scraps"}])
    assert res2["segregation_status"] == "PROPER"

    # Only Dry
    res3 = analyze_segregation(["Plastic", "Paper"], [{"name": "packaging"}])
    assert res3["segregation_status"] == "PROPER"

# Test 3: Priority Scoring Engine
def test_priority_scoring_engine():
    # Critical condition
    p_crit = calculate_priority_score(
        severity="CRITICAL",
        age_hours=36.0,
        repeat_reports_count=5,
        previous_failed_collections=2,
        is_high_risk_location=True
    )
    assert p_crit["priority_level"] in ["CRITICAL", "HIGH"]
    assert p_crit["priority_score"] >= 75.0
    assert "CRITICAL visual severity" in p_crit["priority_reason"]
    assert "disclaimer" in p_crit

    # Low condition
    p_low = calculate_priority_score(severity="LOW", age_hours=0.5, repeat_reports_count=1)
    assert p_low["priority_level"] == "LOW"

# Test 4: Computer Vision Pipeline on Synthetic Images
def test_computer_vision_waste_detection(tmp_path):
    img_file = tmp_path / "test_waste.jpg"
    img = Image.new("RGB", (320, 240), color=(100, 150, 80)) # Greenish organic tint
    img.save(str(img_file))

    res = analyze_waste_image(str(img_file))
    assert "primary_category" in res
    assert "confidence" in res
    assert "severity" in res
    assert "bounding_boxes" in res
    assert res["confidence"] > 0.0

# Test 5: Before / After Verification Engine
def test_before_after_verification_engine(tmp_path):
    p_before = tmp_path / "before.jpg"
    p_after = tmp_path / "after.jpg"
    
    # Before: cluttered dark image
    img_b = Image.new("RGB", (320, 240), color=(60, 50, 40))
    img_b.save(str(p_before))
    
    # After: clean light surface
    img_a = Image.new("RGB", (320, 240), color=(180, 180, 175))
    img_a.save(str(p_after))

    verif = verify_collection(str(p_before), str(p_after))
    assert "verification_result" in verif
    assert "clearance_percentage" in verif
    assert "before_waste_score" in verif
    assert "after_waste_score" in verif
    assert verif["verification_label"] == "AI-ASSISTED VERIFICATION"

# Test 6: Evidence Validation (Anti-Fraud checks)
def test_evidence_validation():
    # Test identical photos (fraud)
    img_path = create_synthetic_image("test_ev_dup.jpg", mode="garbage")
    real_path = os.path.join(os.path.dirname(__file__), "..", img_path.lstrip("/"))

    import datetime
    now = datetime.datetime.utcnow()

    res = validate_collection_evidence(
        before_image_path=real_path,
        after_image_path=real_path, # identical!
        before_time=now,
        after_time=now,
        worker_lat=13.0827,
        worker_lng=80.2707,
        report_lat=13.0827,
        report_lng=80.2707
    )
    assert res["validation_status"] == "SUSPICIOUS_EVIDENCE"
    assert res["is_suspicious"] is True
    assert "Identical visual hash" in res["reasons"][0]

# Test 7: Hotspot Detection and Prediction
def test_hotspot_detection_and_prediction():
    sample_reports = [
        {"location_lat": 13.0820, "location_lng": 80.2700, "zone": "Zone 1 - Central Market", "ai_detected_category": "Organic/Wet Waste", "status": "REPORTED"},
        {"location_lat": 13.0821, "location_lng": 80.2701, "zone": "Zone 1 - Central Market", "ai_detected_category": "Organic/Wet Waste", "status": "REPORTED"},
        {"location_lat": 13.0822, "location_lng": 80.2702, "zone": "Zone 1 - Central Market", "ai_detected_category": "Plastic", "status": "FAILED"}
    ]
    hotspots = cluster_reports_into_hotspots(sample_reports)
    assert len(hotspots) >= 1
    assert hotspots[0]["report_count"] == 3
    assert "AI HYPOTHESIS" in hotspots[0]["ai_hypothesis"]
    assert "AI RECOMMENDATION" in hotspots[0]["recommended_action"]

    preds = generate_hotspot_predictions(hotspots)
    assert len(preds) >= 1
    assert "Demo prediction based on simulated historical data" in preds[0]["label"]

# Test 8: Route Optimization
def test_route_optimization():
    tasks = [
        {"id": 1, "task_code": "TSK-1", "title": "Stop 1", "lat": 13.0830, "lng": 80.2710, "priority_level": "CRITICAL"},
        {"id": 2, "task_code": "TSK-2", "title": "Stop 2", "lat": 13.0750, "lng": 80.2550, "priority_level": "LOW"},
        {"id": 3, "task_code": "TSK-3", "title": "Stop 3", "lat": 13.0825, "lng": 80.2755, "priority_level": "HIGH"}
    ]
    route = optimize_collection_route(tasks)
    assert "total_distance_km" in route
    assert "estimated_time_minutes" in route
    assert route["stops_count"] == 3
    assert len(route["stops"]) == 5 # depot + 3 stops + processing center
    assert route["stops"][0]["type"] == "DEPOT"

# Test 9: API - Health & Auth Endpoints
def test_api_health_and_auth():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "healthy"}

    # Login with seeded demo admin
    login_res = client.post("/api/auth/login", json={
        "email": "admin@swachhai.org",
        "password": "admin123"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    assert token is not None

# Test 10: API - Dashboard Analytics
def test_api_analytics_dashboard():
    r = client.get("/api/analytics/dashboard")
    assert r.status_code == 200
    data = r.json()
    assert "kpis" in data
    assert data["kpis"]["total_reports"] >= 30
    assert "waste_distribution" in data
    assert "zone_operational_scores" in data
    assert len(data["zone_operational_scores"]) > 0

# Test 11: API - AI Civic Assistant Query
def test_api_civic_assistant():
    q_res = client.post("/api/assistant/chat", json={
        "question": "Which area has the most repeated complaints?"
    })
    assert q_res.status_code == 200
    ans = q_res.json()
    assert "answer" in ans
    assert "Zone" in ans["answer"]

# Test 12: API - Report Creation Flow
def test_api_report_creation():
    # Create sample image in memory
    img = Image.new("RGB", (200, 200), color=(120, 90, 60))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    form_data = {
        "title": "Automated Test Garbage Pile",
        "description": "Footpath obstruction with mixed plastic waste.",
        "location_lat": 13.0835,
        "location_lng": 80.2715,
        "address": "Test Junction, Zone 1 - Central Market",
        "zone": "Zone 1 - Central Market",
        "language": "en",
        "waste_category_claimed": "Plastic"
    }

    files = {"image": ("test.jpg", buf, "image/jpeg")}
    r = client.post("/api/reports/", data=form_data, files=files)
    assert r.status_code == 200
    body = r.json()
    assert "report_id" in body
    assert "report_code" in body
    assert "priority_score" in body
    assert "segregation_status" in body

# Test 13: API - Citizen Feedback and Mismatch
def test_api_citizen_feedback_mismatch():
    # Submit feedback asserting NO on report 1
    fb_res = client.post("/api/reports/1/feedback", data={
        "was_cleared": "NO",
        "rating": 1,
        "comment": "Site still has debris scattered into gutters."
    })
    assert fb_res.status_code == 200
    fb_body = fb_res.json()
    assert fb_body["status"] == "success"
    assert fb_body["was_cleared"] == "NO"
