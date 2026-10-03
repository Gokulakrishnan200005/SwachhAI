import os
import random
import datetime
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
from sqlalchemy.orm import Session
from .config import settings
from .models import (
    User, Report, WasteDetection, CollectionTask, CollectionEvidence,
    CitizenFeedback, Escalation, Hotspot, HotspotPrediction, CollectionDemand,
    Notification, AuditLog
)
from .auth import hash_password
from .ai.priority_engine import calculate_priority_score
from .ai.segregation_engine import analyze_segregation
from .ai.hotspot_engine import cluster_reports_into_hotspots, generate_hotspot_predictions, generate_collection_demand_forecast

def create_synthetic_image(filename: str, mode: str = "garbage", category: str = "Mixed Waste") -> str:
    """
    Creates a realistic synthetic municipal image for testing and live demonstration.
    'garbage': draws a simulated waste pile with varied contours and textures.
    'clean': draws a swept clean street pavement with minimal noise.
    'partial': draws partially cleared ground with remaining residual debris.
    """
    filepath = settings.UPLOADS_DIR / filename
    if filepath.exists():
        return f"/uploads/{filename}"

    w, h = 640, 480
    if mode == "garbage":
        # Background: asphalt / street
        img = Image.new("RGB", (w, h), color=(110, 110, 105))
        draw = ImageDraw.Draw(img)
        # Add pavement lines
        draw.line([(0, 420), (w, 420)], fill=(70, 70, 70), width=4)
        draw.line([(0, 100), (w, 100)], fill=(160, 160, 150), width=3)
        
        # Draw garbage clusters
        # Wet/Organic (greens/browns)
        for _ in range(35):
            x1 = random.randint(120, 520)
            y1 = random.randint(140, 380)
            rad = random.randint(25, 70)
            c = random.choice([(45, 120, 45), (115, 80, 40), (140, 110, 50), (60, 95, 35)])
            draw.ellipse([x1, y1, x1+rad, y1+rad], fill=c)
        
        # Plastic items (bright blues, reds, yellows, whites)
        for _ in range(25):
            x1 = random.randint(140, 500)
            y1 = random.randint(160, 360)
            bw = random.randint(20, 50)
            bh = random.randint(15, 35)
            c = random.choice([(30, 100, 220), (220, 40, 40), (240, 210, 30), (230, 230, 240)])
            draw.rectangle([x1, y1, x1+bw, y1+bh], fill=c, outline=(20, 20, 20))
            # specular reflection dot
            draw.ellipse([x1+5, y1+5, x1+12, y1+10], fill=(255, 255, 255))
        
        # Paper/Cardboard
        for _ in range(15):
            x1 = random.randint(180, 460)
            y1 = random.randint(180, 340)
            bw = random.randint(35, 75)
            bh = random.randint(25, 55)
            draw.rectangle([x1, y1, x1+bw, y1+bh], fill=(205, 185, 145), outline=(130, 110, 80))

    elif mode == "clean":
        # Clean swept street
        img = Image.new("RGB", (w, h), color=(125, 125, 120))
        draw = ImageDraw.Draw(img)
        # Curb and pavement
        draw.line([(0, 420), (w, 420)], fill=(80, 80, 80), width=4)
        draw.line([(0, 100), (w, 100)], fill=(160, 160, 150), width=3)
        # Clean swept broom stroke textures
        for y in range(110, 410, 20):
            draw.line([(0, y), (w, y)], fill=(130, 130, 125), width=1)
        # Minor single leaf
        draw.ellipse([300, 250, 308, 255], fill=(80, 110, 60))

    else: # partial
        img = Image.new("RGB", (w, h), color=(118, 118, 112))
        draw = ImageDraw.Draw(img)
        draw.line([(0, 420), (w, 420)], fill=(75, 75, 75), width=4)
        # Residual debris in the corner
        for _ in range(12):
            x1 = random.randint(360, 480)
            y1 = random.randint(280, 370)
            rad = random.randint(15, 35)
            c = random.choice([(115, 80, 40), (40, 110, 210), (200, 180, 140)])
            draw.ellipse([x1, y1, x1+rad, y1+rad], fill=c)

    img.save(str(filepath), format="JPEG", quality=85)
    return f"/uploads/{filename}"

def seed_demo_database(db: Session, force: bool = False):
    """
    Populates comprehensive, realistic municipal demo data:
    - 4 Role accounts (Admin, Supervisor, Worker, Citizen)
    - 32 realistic garbage reports across 10 distinct locations
    - Multi-class waste detections, segregation analysis, transparent priority scores
    - 10 Collection tasks with Before/After verification evidence
    - Verified, Partially Cleared, and Failed collection examples
    - Citizen feedback with verified/mismatch examples
    - 2 Escalation workflows (Worker notified -> Supervisor notified -> High Admin Escalation)
    - 5 Recurring hotspots with AI Hypotheses and Recommendations
    - Hotspot predictions and hourly collection demand forecasts
    - Audit logs and in-app notifications
    """
    user_count = db.query(User).count()
    if user_count > 0 and not force:
        return {"status": "already_seeded", "message": "Demo data already loaded."}

    # Clear existing tables if force
    if force:
        db.query(AuditLog).delete()
        db.query(Notification).delete()
        db.query(CollectionDemand).delete()
        db.query(HotspotPrediction).delete()
        db.query(Hotspot).delete()
        db.query(Escalation).delete()
        db.query(CitizenFeedback).delete()
        db.query(CollectionEvidence).delete()
        db.query(CollectionTask).delete()
        db.query(WasteDetection).delete()
        db.query(Report).delete()
        db.query(User).delete()
        db.commit()

    # 1. Seed Users
    users_data = [
        {"email": "admin@swachhai.org", "pass": "admin123", "name": "Kavitha R. (Chief Municipal Health Officer)", "role": "admin", "zone": "All Zones"},
        {"email": "supervisor@swachhai.org", "pass": "super123", "name": "Murugan K. (Sanitation Inspector)", "role": "supervisor", "zone": "Zone 1 - Central Market"},
        {"email": "worker@swachhai.org", "pass": "worker123", "name": "Selvam P. (Sanitation Lead Driver)", "role": "worker", "zone": "Zone 1 - Central Market"},
        {"email": "citizen@swachhai.org", "pass": "citizen123", "name": "Aarav Sharma (Resident & RWA Sec.)", "role": "citizen", "zone": "Zone 2 - Gandhi Nagar"},
        {"email": "worker2@swachhai.org", "pass": "worker123", "name": "Ramu G. (Tipper Operator)", "role": "worker", "zone": "Zone 3 - Station Road"}
    ]

    created_users = {}
    for u in users_data:
        usr = User(
            email=u["email"],
            password_hash=hash_password(u["pass"]),
            full_name=u["name"],
            role=u["role"],
            zone=u["zone"],
            phone="+91 98401 22345",
            is_active=True
        )
        db.add(usr)
        db.flush()
        created_users[u["role"]] = usr

    admin_user = created_users["admin"]
    supervisor_user = created_users["supervisor"]
    worker_user = created_users["worker"]
    citizen_user = created_users["citizen"]

    # 2. Pre-generate synthetic demonstration images
    img_before_1 = create_synthetic_image("demo_before_market.jpg", mode="garbage")
    img_after_1 = create_synthetic_image("demo_after_market.jpg", mode="clean")
    img_after_fail = create_synthetic_image("demo_after_uncleaned.jpg", mode="garbage")
    img_after_partial = create_synthetic_image("demo_after_partial.jpg", mode="partial")
    img_before_plastic = create_synthetic_image("demo_before_plastic.jpg", mode="garbage")
    img_after_plastic = create_synthetic_image("demo_after_plastic.jpg", mode="clean")

    # 3. 10 Realistic Urban Locations (Chennai Municipal Coordinates)
    locations = [
        {"name": "M.G. Market North Gate", "lat": 13.0835, "lng": 80.2715, "zone": "Zone 1 - Central Market", "type": "market"},
        {"name": "Flower Bazaar Road", "lat": 13.0848, "lng": 80.2740, "zone": "Zone 1 - Central Market", "type": "market"},
        {"name": "Gandhi Nagar 4th Main Road", "lat": 13.0720, "lng": 80.2520, "zone": "Zone 2 - Gandhi Nagar", "type": "residential"},
        {"name": "Kasturba Hospital Lane", "lat": 13.0745, "lng": 80.2560, "zone": "Zone 2 - Gandhi Nagar", "type": "hospital"},
        {"name": "Central Railway Station West Subway", "lat": 13.0820, "lng": 80.2760, "zone": "Zone 3 - Station Road", "type": "transit"},
        {"name": "Bus Terminus Entry Bay 4", "lat": 13.0860, "lng": 80.2785, "zone": "Zone 3 - Station Road", "type": "transit"},
        {"name": "Anna Salai Commercial Junction", "lat": 13.0610, "lng": 80.2600, "zone": "Zone 4 - Anna Salai", "type": "commercial"},
        {"name": "Thousand Lights Service Road", "lat": 13.0580, "lng": 80.2540, "zone": "Zone 4 - Anna Salai", "type": "commercial"},
        {"name": "SIDCO Industrial Phase 2 Canal Gate", "lat": 13.0120, "lng": 80.2010, "zone": "Zone 5 - Industrial Area", "type": "industrial"},
        {"name": "Lakeview Prominade 2nd Avenue", "lat": 13.0240, "lng": 80.2310, "zone": "Zone 6 - Lakeview Colony", "type": "residential"}
    ]

    waste_scenarios = [
        {
            "title": "Severe Organic & Plastic Overflow at Market Corner",
            "desc": "Vegetable vendors dumped rotten produce and plastic bags near the pedestrian footpath. Foul odor spreading.",
            "lang": "en",
            "cat": "Mixed Waste",
            "detected_objs": [{"name": "Food / Organic Rotten Produce", "category": "Organic/Wet Waste", "confidence": 0.92}, {"name": "Plastic Carry Bags", "category": "Plastic", "confidence": 0.89}],
            "cats": ["Organic/Wet Waste", "Plastic"],
            "conf": 0.91,
            "sev": "CRITICAL",
            "repeat": 4
        },
        {
            "title": "Unsegregated Food Waste and PET Bottles near Bus Stand",
            "desc": "Large pile of plastic bottles and wet food containers blocking commuter path.",
            "lang": "en",
            "cat": "Plastic",
            "detected_objs": [{"name": "Discarded Plastic Bottles", "category": "Plastic", "confidence": 0.94}, {"name": "Paper Cups", "category": "Paper", "confidence": 0.85}],
            "cats": ["Plastic", "Paper"],
            "conf": 0.89,
            "sev": "HIGH",
            "repeat": 3
        },
        {
            "title": "காய்கறி சந்தை குப்பை தேக்கம் (Vegetable Market Waste)",
            "desc": "அழுகிய காய்கறிகள் மற்றும் பிளாஸ்டிக் பைகள் குவித்து வைக்கப்பட்டுள்ளன. உடனடியாக அகற்றவும்.",
            "lang": "ta",
            "cat": "Organic/Wet Waste",
            "detected_objs": [{"name": "Rotten Greens / Vegetable Waste", "category": "Organic/Wet Waste", "confidence": 0.93}],
            "cats": ["Organic/Wet Waste"],
            "conf": 0.93,
            "sev": "HIGH",
            "repeat": 5
        },
        {
            "title": "अस्पताल के पास बायोमेडिकल व सेनेटरी कचरा (Waste near Hospital)",
            "desc": "कस्तूरबा अस्पताल के पीछे खुले में सेनेटरी और प्लास्टिक कचरा फेंका हुआ है।",
            "lang": "hi",
            "cat": "Sanitary Waste",
            "detected_objs": [{"name": "Sanitary Packaging Materials", "category": "Sanitary Waste", "confidence": 0.88}, {"name": "Plastic Wrap", "category": "Plastic", "confidence": 0.86}],
            "cats": ["Sanitary Waste", "Plastic"],
            "conf": 0.87,
            "sev": "CRITICAL",
            "repeat": 3
        },
        {
            "title": "Industrial Scrap & Electronic Wiring Dump",
            "desc": "Discarded electrical circuit remnants and metallic parts dumped along the canal boundary wall.",
            "lang": "en",
            "cat": "E-Waste",
            "detected_objs": [{"name": "Industrial Electronic Enclosures", "category": "E-Waste", "confidence": 0.85}, {"name": "Scrap Metal Components", "category": "Metal", "confidence": 0.88}],
            "cats": ["E-Waste", "Metal"],
            "conf": 0.86,
            "sev": "HIGH",
            "repeat": 2
        }
    ]

    all_reports = []
    base_time = datetime.datetime.utcnow() - datetime.timedelta(days=4)

    # 4. Generate 32 Reports
    for i in range(1, 33):
        loc = locations[(i - 1) % len(locations)]
        scen = waste_scenarios[(i - 1) % len(waste_scenarios)]
        
        # Calculate dynamic priority
        p_calc = calculate_priority_score(
            severity=scen["sev"],
            age_hours=(33 - i) * 2.5,
            repeat_reports_count=scen["repeat"],
            historical_complaints=8,
            previous_failed_collections=1 if i in [5, 6, 12] else 0,
            waste_coverage_ratio=0.35,
            is_high_risk_location=(loc["type"] in ["hospital", "market", "transit"]),
            predicted_overflow_risk="HIGH" if loc["type"] == "market" else "MEDIUM"
        )

        seg_res = analyze_segregation(scen["cats"], scen["detected_objs"])

        rep_time = base_time + datetime.timedelta(hours=i * 2.8)
        
        # Determine status
        if i <= 8:
            status = "VERIFIED"
        elif i in [9, 10]:
            status = "FAILED"
        elif i in [11, 12]:
            status = "ESCALATED"
        elif i in [13, 14, 15]:
            status = "IN_PROGRESS"
        elif i in [16, 17, 18]:
            status = "ASSIGNED"
        else:
            status = "REPORTED"

        rep = Report(
            report_code=f"SWA-2026-{str(i).zfill(3)}",
            citizen_id=citizen_user.id if i % 2 == 0 else None,
            citizen_name=citizen_user.full_name if i % 2 == 0 else f"Resident of {loc['zone'].split('-')[1]}",
            citizen_contact="+91 98401 99887",
            language=scen["lang"],
            title=f"{scen['title']} - {loc['name']}",
            description=scen["desc"],
            image_url=img_before_1 if i % 2 == 0 else img_before_plastic,
            location_lat=loc["lat"] + (random.uniform(-0.0008, 0.0008)),
            location_lng=loc["lng"] + (random.uniform(-0.0008, 0.0008)),
            address=f"{loc['name']}, {loc['zone']}, Chennai",
            zone=loc["zone"],
            waste_category_claimed=scen["cat"],
            ai_detected_category=scen["cat"],
            ai_confidence=scen["conf"],
            severity=scen["sev"],
            priority_score=p_calc["priority_score"],
            priority_level=p_calc["priority_level"],
            priority_reason=p_calc["priority_reason"],
            segregation_status=seg_res["segregation_status"],
            segregation_recommendation=seg_res["recommendation"],
            model_uncertainty=False,
            status=status,
            repeat_count=scen["repeat"],
            created_at=rep_time,
            updated_at=rep_time + datetime.timedelta(minutes=45)
        )
        db.add(rep)
        db.flush()

        # Add waste detection detail
        det = WasteDetection(
            report_id=rep.id,
            detected_objects=scen["detected_objs"],
            categories=scen["cats"],
            primary_category=scen["cat"],
            confidence=scen["conf"],
            severity=scen["sev"],
            segregation_status=seg_res["segregation_status"],
            explanation=seg_res["explanation"],
            recommendation=seg_res["recommendation"],
            created_at=rep_time
        )
        db.add(det)
        all_reports.append(rep)

    # 5. Seed 10 Collection Tasks with Evidence
    for task_idx in range(1, 11):
        target_rep = all_reports[task_idx - 1]
        t_status = "VERIFIED" if task_idx <= 6 else ("FAILED" if task_idx in [7, 8] else "IN_PROGRESS")
        
        t_assigned_time = target_rep.created_at + datetime.timedelta(minutes=30)
        t_completed_time = t_assigned_time + datetime.timedelta(hours=2, minutes=15) if t_status != "IN_PROGRESS" else None

        task = CollectionTask(
            task_code=f"TSK-2026-{str(task_idx).zfill(3)}",
            report_id=target_rep.id,
            worker_id=worker_user.id,
            supervisor_id=supervisor_user.id,
            status=t_status,
            priority_level=target_rep.priority_level,
            notes=f"Dispatch collection tipper truck TN-01-CZ-4412 to {target_rep.address}.",
            assigned_at=t_assigned_time,
            started_at=t_assigned_time + datetime.timedelta(minutes=40),
            completed_at=t_completed_time
        )
        db.add(task)
        db.flush()

        # Evidence for tasks 1 to 8
        if task_idx <= 8:
            is_success = task_idx <= 6
            ev_after_img = img_after_1 if is_success else (img_after_partial if task_idx == 7 else img_after_fail)
            b_score = 0.91
            a_score = 0.12 if is_success else (0.58 if task_idx == 7 else 0.85)
            c_pct = round(((b_score - a_score) / b_score) * 100.0, 1)

            ev = CollectionEvidence(
                task_id=task.id,
                worker_id=worker_user.id,
                before_image_url=target_rep.image_url,
                after_image_url=ev_after_img,
                before_timestamp=task.started_at,
                after_timestamp=task.completed_at,
                worker_lat=target_rep.location_lat + 0.0001,
                worker_lng=target_rep.location_lng + 0.0001,
                before_waste_score=b_score,
                after_waste_score=a_score,
                clearance_percentage=c_pct,
                ai_confidence=0.92,
                verification_result="VERIFIED" if is_success else ("PARTIALLY_CLEARED" if task_idx == 7 else "NOT_CLEARED"),
                verification_notes=f"AI-ASSISTED VERIFICATION: {'Clearance verified successfully with 86.8% reduction.' if is_success else 'Verification failed: Substantial waste remains on site. Action: Re-inspection required.'}",
                validation_status="VALID_EVIDENCE",
                validation_reasons=["Passed GPS proximity check (< 20m from report)", "Passed anti-duplicate visual hash check"],
                created_at=task.completed_at or datetime.datetime.utcnow()
            )
            db.add(ev)

            # Citizen feedback for verified reports
            if is_success and task_idx in [1, 2, 3]:
                # Report 3 is an intentional MISMATCH demo: AI said verified, citizen says NO!
                is_mismatch = (task_idx == 3)
                fb = CitizenFeedback(
                    report_id=target_rep.id,
                    citizen_id=citizen_user.id,
                    was_cleared="NO" if is_mismatch else "YES",
                    rating=1 if is_mismatch else 5,
                    comment="Residual plastic was blown across the street into the storm drain. Not fully cleared!" if is_mismatch else "Prompt clearance by the municipal team. Thank you!",
                    mismatch_flag=is_mismatch,
                    created_at=task.completed_at + datetime.timedelta(hours=1)
                )
                db.add(fb)

    # 6. Seed Escalation Workflows for the 2 Failed Tasks
    # Task 7 (first failure -> worker notified)
    esc1 = Escalation(
        report_id=all_reports[6].id,
        task_id=7,
        failure_count=1,
        escalation_level="WORKER_NOTIFIED",
        reason="First verification failure: AI detected 0.58 residual waste score (insufficient clearance).",
        timeline=[
            {"time": "09:30 AM", "stage": "AI_VERIFICATION_FAILED", "note": "Clearance score 36.2% below threshold."},
            {"time": "09:32 AM", "stage": "WORKER_ALERT_DISPATCHED", "note": "Driver Selvam P. requested to return for perimeter sweep."}
        ],
        resolved=False,
        created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=18)
    )
    db.add(esc1)

    # Task 8 (repeated failure -> high escalation to admin)
    esc2 = Escalation(
        report_id=all_reports[7].id,
        task_id=8,
        failure_count=2,
        escalation_level="HIGH_ADMIN_ESCALATION",
        reason="2 failed clearances in 48 hours. After-photo shows heavy uncollected garbage pile (0.85 waste score).",
        timeline=[
            {"time": "Yesterday 11:00 AM", "stage": "FIRST_FAILURE", "note": "Worker notified to re-clear."},
            {"time": "Today 08:15 AM", "stage": "SECOND_FAILURE", "note": "Re-inspection photo rejected by AI engine."},
            {"time": "Today 08:20 AM", "stage": "HIGH_ADMIN_ESCALATION", "note": "Escalated to Chief Health Officer & Zonal Officer."}
        ],
        resolved=False,
        created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=5)
    )
    db.add(esc2)

    # 7. Seed 5 Recurring Hotspots with Root Cause & Hypotheses
    hotspot_configs = [
        {
            "name": "M.G. Market North Gate Hotspot",
            "zone": "Zone 1 - Central Market",
            "lat": 13.0835,
            "lng": 80.2715,
            "count": 9,
            "waste": "Organic/Wet Waste",
            "sev": "CRITICAL",
            "fails": 2,
            "hours": 18.2,
            "freq": 7.4,
            "risk": "CRITICAL",
            "hypo": "AI HYPOTHESIS: High volume of daily commercial food and vegetable vendor unloading without on-site composting infrastructure is driving rapid organic decomposition and repeat morning pile-ups.",
            "factors": ["Early morning wholesale unloading", "Vendor non-segregation", "Inadequate 240L bins", "Scheduled tipper arriving after market peak"],
            "action": "AI RECOMMENDATION: Schedule dedicated 06:30 AM dumper round; install dual organic bulk bins at Gate 2."
        },
        {
            "name": "Central Railway Station Subway Corridor",
            "zone": "Zone 3 - Station Road",
            "lat": 13.0820,
            "lng": 80.2760,
            "count": 7,
            "waste": "Plastic",
            "sev": "HIGH",
            "fails": 1,
            "hours": 12.4,
            "freq": 5.8,
            "risk": "HIGH",
            "hypo": "AI HYPOTHESIS: Dense passenger footfall and single-use beverage cup disposal along unmonitored subway exits without bottle-crusher kiosks.",
            "factors": ["Commuter peak rushes", "High PET bottle litter", "Overflow of small street bins", "Night-time vendor stalls"],
            "action": "AI RECOMMENDATION: Place 4 high-capacity wire mesh plastic collection cages; increase sweeping at 08:30 AM and 05:30 PM."
        },
        {
            "name": "Kasturba Hospital Rear Drainage Lane",
            "zone": "Zone 2 - Gandhi Nagar",
            "lat": 13.0745,
            "lng": 80.2560,
            "count": 5,
            "waste": "Sanitary Waste",
            "sev": "CRITICAL",
            "fails": 1,
            "hours": 15.0,
            "freq": 4.1,
            "risk": "HIGH",
            "hypo": "AI HYPOTHESIS: Mixed disposal of clinical packaging and sanitary waste from nearby clinics into standard domestic municipal bins.",
            "factors": ["Nearby private diagnostic labs", "Failure of dedicated bio-medical courier pickup", "High public health hazard risk"],
            "action": "AI RECOMMENDATION: Issue compliance notice to surrounding healthcare facilities; mandate yellow-bin segregation."
        },
        {
            "name": "Anna Salai Commercial Flyover Base",
            "zone": "Zone 4 - Anna Salai",
            "lat": 13.0610,
            "lng": 80.2600,
            "count": 4,
            "waste": "Mixed Waste",
            "sev": "HIGH",
            "fails": 0,
            "hours": 11.5,
            "freq": 3.6,
            "risk": "MEDIUM",
            "hypo": "AI HYPOTHESIS: Nocturnal commercial waste dumping by roadside eateries beneath unlit flyover pillar bays.",
            "factors": ["Late-night fast food stalls", "Unmonitored blind spot beneath flyover", "Lack of door-to-door night collection"],
            "action": "AI RECOMMENDATION: Install CCTV surveillance warning signage and deploy night patrol collection at 11:30 PM."
        },
        {
            "name": "SIDCO Industrial Canal Outflow Culvert",
            "zone": "Zone 5 - Industrial Area",
            "lat": 13.0120,
            "lng": 80.2010,
            "count": 4,
            "waste": "E-Waste",
            "sev": "HIGH",
            "fails": 1,
            "hours": 22.0,
            "freq": 3.0,
            "risk": "HIGH",
            "hypo": "AI HYPOTHESIS: Unauthorized disposal of scrap electrical insulation and circuit components to evade commercial recycling fees.",
            "factors": ["Unregistered electronic repair sheds", "Infrequent industrial sanitation routes", "Dark unlit boundary wall"],
            "action": "AI RECOMMENDATION: Organize weekly authorized E-Waste buyback camp; install solar high-mast street lighting."
        }
    ]

    for h_data in hotspot_configs:
        hs = Hotspot(
            name=h_data["name"],
            zone=h_data["zone"],
            center_lat=h_data["lat"],
            center_lng=h_data["lng"],
            report_count=h_data["count"],
            dominant_waste_type=h_data["waste"],
            avg_severity=h_data["sev"],
            failed_clearance_count=h_data["fails"],
            avg_clearance_hours=h_data["hours"],
            repeat_frequency_weekly=h_data["freq"],
            risk_level=h_data["risk"],
            ai_hypothesis=h_data["hypo"],
            contributing_factors=h_data["factors"],
            recommended_action=h_data["action"],
            is_active=True
        )
        db.add(hs)
        db.flush()

        # Add 24h Prediction for hotspot
        pred = HotspotPrediction(
            hotspot_id=hs.id,
            zone=hs.zone,
            target_date="Next 24 Hours (Tomorrow)",
            predicted_risk=hs.risk_level,
            risk_score=85.0 if hs.risk_level == "CRITICAL" else 72.0,
            expected_reports=max(2, int(hs.report_count * 0.7)),
            peak_hours="07:30 – 10:30 AM",
            explanation=f"Demo prediction based on simulated historical data: {hs.name} in {hs.zone} shows high risk of recurring waste accumulation during morning peak.",
            is_demo_data=True
        )
        db.add(pred)

    # 8. Seed Collection Demand Forecasts
    demand_slots = generate_collection_demand_forecast()
    for ds in demand_slots:
        cd = CollectionDemand(
            target_date=ds["target_date"],
            time_slot=ds["time_slot"],
            demand_level=ds["demand_level"],
            estimated_volume_kg=ds["estimated_volume_kg"],
            required_workers=ds["required_workers"],
            priority_zones=ds["priority_zones"],
            is_demo_data=True
        )
        db.add(cd)

    # 9. Seed In-App Notifications
    notifs = [
        {"role": "admin", "title": "High Escalation Triggered", "msg": "2 repeated collection clearance failures in Zone 1 - Central Market. Immediate intervention required.", "type": "ESCALATION"},
        {"role": "supervisor", "title": "Verification Failure Alert", "msg": "Task TSK-2026-008 failed AI clearance verification (0.85 residual waste).", "type": "FAILED_VERIFICATION"},
        {"role": "supervisor", "title": "Citizen Feedback Mismatch", "msg": "Report SWA-2026-003: Citizen reported 'NO' despite AI verification. Flagged for spot check.", "type": "FEEDBACK_MISMATCH"},
        {"role": "worker", "title": "New Urgent Task Assigned", "msg": "You have been assigned CRITICAL priority collection at M.G. Market North Gate.", "type": "WORKER_ASSIGNED"},
        {"role": "citizen", "title": "Complaint Status Updated", "msg": "Your report SWA-2026-001 has been collected and verified by municipal team.", "type": "NEW_REPORT"}
    ]
    for n in notifs:
        target_u = created_users.get(n["role"], admin_user)
        notif = Notification(
            user_id=target_u.id,
            target_role=n["role"],
            title=n["title"],
            message=n["msg"],
            type=n["type"],
            reference_id="DEMO-REF",
            is_read=False
        )
        db.add(notif)

    # 10. Seed Audit Logs
    audit_events = [
        {"action": "REPORT_CREATED", "type": "Report", "id": "SWA-2026-001", "details": {"waste": "Mixed Waste", "severity": "CRITICAL"}},
        {"action": "TASK_ASSIGNED", "type": "Task", "id": "TSK-2026-001", "details": {"worker": "Selvam P.", "priority": "CRITICAL"}},
        {"action": "BEFORE_IMAGE_UPLOADED", "type": "Evidence", "id": "TSK-2026-001", "details": {"score": 0.91}},
        {"action": "AFTER_IMAGE_UPLOADED", "type": "Evidence", "id": "TSK-2026-001", "details": {"score": 0.12, "clearance": "86.8%"}},
        {"action": "AI_VERIFICATION_COMPLETED", "type": "Evidence", "id": "TSK-2026-001", "details": {"result": "VERIFIED"}},
        {"action": "HIGH_ADMIN_ESCALATION", "type": "Escalation", "id": "TSK-2026-008", "details": {"reason": "2 repeated clearance failures"}}
    ]
    for ae in audit_events:
        al = AuditLog(
            user_id=admin_user.id,
            user_email=admin_user.email,
            role="admin",
            action=ae["action"],
            target_type=ae["type"],
            target_id=ae["id"],
            details=ae["details"],
            ip_address="127.0.0.1"
        )
        db.add(al)

    db.commit()
    return {
        "status": "success",
        "message": "Demo data successfully seeded: 32 reports, 10 locations, 10 tasks, 5 hotspots, escalations, and predictions loaded.",
        "reports_count": len(all_reports),
        "hotspots_count": len(hotspot_configs)
    }
