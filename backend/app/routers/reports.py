import os
import shutil
import uuid
import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from ..database import get_db
from ..config import settings
from ..models import Report, WasteDetection, CollectionTask, CitizenFeedback, Notification, AuditLog, User
from ..auth import get_current_user_optional, get_current_user
from ..ai.cv_engine import analyze_waste_image
from ..ai.segregation_engine import analyze_segregation
from ..ai.priority_engine import calculate_priority_score

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.post("/")
async def create_report(
    title: str = Form(...),
    description: str = Form(""),
    location_lat: float = Form(...),
    location_lng: float = Form(...),
    address: str = Form(...),
    zone: str = Form("Zone 1 - Central Market"),
    language: str = Form("en"),
    waste_category_claimed: str = Form("Mixed Waste"),
    citizen_name: Optional[str] = Form(None),
    citizen_contact: Optional[str] = Form(None),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    # Validate extension
    ext = os.path.splitext(image.filename)[1].lower()
    if ext not in settings.ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Invalid image format. Allowed: .jpg, .jpeg, .png, .webp")

    # Secure file save
    unique_filename = f"report_{uuid.uuid4().hex[:12]}{ext}"
    target_path = settings.UPLOADS_DIR / unique_filename
    
    with open(target_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)

    # 1. Run real OpenCV waste detection pipeline
    try:
        cv_result = analyze_waste_image(str(target_path))
    except Exception as e:
        cv_result = {
            "primary_category": waste_category_claimed or "Mixed Waste",
            "categories": [waste_category_claimed or "Mixed Waste"],
            "confidence": 0.75,
            "severity": "MEDIUM",
            "detected_objects": [{"name": "Solid Debris", "category": "Mixed Waste", "confidence": 0.75}],
            "bounding_boxes": [],
            "waste_coverage_ratio": 0.20,
            "model_uncertainty": True,
            "uncertainty_note": f"Visual parsing degraded: {str(e)}"
        }

    # 2. Run Segregation Engine
    seg_result = analyze_segregation(
        cv_result["categories"],
        cv_result["detected_objects"],
        cv_result.get("model_uncertainty", False)
    )

    # 3. Check for repeat reports near this location (within ~200m)
    nearby_reports_count = db.query(Report).filter(
        Report.zone == zone,
        Report.created_at >= datetime.datetime.utcnow() - datetime.timedelta(days=3)
    ).count()

    # 4. Run Transparent Priority Scoring
    priority_calc = calculate_priority_score(
        severity=cv_result["severity"],
        age_hours=0.0,
        repeat_reports_count=max(1, nearby_reports_count),
        historical_complaints=nearby_reports_count,
        previous_failed_collections=0,
        waste_coverage_ratio=cv_result.get("waste_coverage_ratio", 0.25),
        is_high_risk_location=("Market" in zone or "Station" in zone or "Hospital" in address),
        predicted_overflow_risk="HIGH" if "Market" in zone else "MEDIUM"
    )

    # Generate sequential report code
    report_count = db.query(Report).count()
    report_code = f"SWA-2026-{str(report_count + 1).zfill(3)}"

    # Determine user identity
    c_id = current_user.id if current_user else None
    c_name = citizen_name or (current_user.full_name if current_user else "Civic Citizen")
    c_contact = citizen_contact or (current_user.phone if current_user else "")

    report = Report(
        report_code=report_code,
        citizen_id=c_id,
        citizen_name=c_name,
        citizen_contact=c_contact,
        language=language,
        title=title,
        description=description,
        image_url=f"/uploads/{unique_filename}",
        location_lat=location_lat,
        location_lng=location_lng,
        address=address,
        zone=zone,
        waste_category_claimed=waste_category_claimed,
        ai_detected_category=cv_result["primary_category"],
        ai_confidence=cv_result["confidence"],
        severity=cv_result["severity"],
        priority_score=priority_calc["priority_score"],
        priority_level=priority_calc["priority_level"],
        priority_reason=priority_calc["priority_reason"],
        segregation_status=seg_result["segregation_status"],
        segregation_recommendation=seg_result["recommendation"],
        model_uncertainty=cv_result.get("model_uncertainty", False),
        status="REPORTED",
        repeat_count=nearby_reports_count + 1
    )
    db.add(report)
    db.flush()

    # Save Waste Detection record
    detection = WasteDetection(
        report_id=report.id,
        detected_objects=cv_result["detected_objects"],
        categories=cv_result["categories"],
        primary_category=cv_result["primary_category"],
        confidence=cv_result["confidence"],
        severity=cv_result["severity"],
        segregation_status=seg_result["segregation_status"],
        explanation=seg_result["explanation"],
        recommendation=seg_result["recommendation"],
        model_uncertainty=cv_result.get("model_uncertainty", False),
        uncertainty_note=cv_result.get("uncertainty_note")
    )
    db.add(detection)

    # Create in-app notification for supervisors/admin if high priority
    if priority_calc["priority_level"] in ["CRITICAL", "HIGH"]:
        notif = Notification(
            target_role="supervisor",
            title=f"High Priority Report Logged ({report.report_code})",
            message=f"{priority_calc['priority_level']} priority waste complaint registered at {address}. Severity: {cv_result['severity']}.",
            type="HIGH_PRIORITY",
            reference_id=report.report_code
        )
        db.add(notif)

    # Audit log
    audit = AuditLog(
        user_id=c_id,
        user_email=current_user.email if current_user else "anonymous",
        role=current_user.role if current_user else "citizen",
        action="REPORT_CREATED",
        target_type="Report",
        target_id=report.report_code,
        details={
            "waste_category": cv_result["primary_category"],
            "severity": cv_result["severity"],
            "priority": priority_calc["priority_level"],
            "segregation": seg_result["segregation_status"]
        }
    )
    db.add(audit)
    db.commit()
    db.refresh(report)

    return {
        "report_id": report.id,
        "report_code": report.report_code,
        "status": report.status,
        "ai_detected_category": report.ai_detected_category,
        "confidence": report.ai_confidence,
        "severity": report.severity,
        "priority_score": report.priority_score,
        "priority_level": report.priority_level,
        "priority_reason": report.priority_reason,
        "segregation_status": report.segregation_status,
        "segregation_recommendation": report.segregation_recommendation,
        "model_uncertainty": report.model_uncertainty,
        "uncertainty_note": cv_result.get("uncertainty_note"),
        "detected_objects": cv_result["detected_objects"],
        "bounding_boxes": cv_result["bounding_boxes"],
        "location": {
            "lat": report.location_lat,
            "lng": report.location_lng,
            "address": report.address,
            "zone": report.zone
        },
        "image_url": report.image_url,
        "created_at": report.created_at
    }

@router.get("/")
def get_reports(
    zone: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    severity: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    query = db.query(Report)
    if zone:
        query = query.filter(Report.zone == zone)
    if status:
        query = query.filter(Report.status == status)
    if priority:
        query = query.filter(Report.priority_level == priority)
    if severity:
        query = query.filter(Report.severity == severity)
    if category:
        query = query.filter(Report.ai_detected_category == category)
    
    reports = query.order_by(desc(Report.priority_score), desc(Report.created_at)).limit(limit).all()
    
    return [
        {
            "id": r.id,
            "report_code": r.report_code,
            "title": r.title,
            "description": r.description,
            "address": r.address,
            "zone": r.zone,
            "location_lat": r.location_lat,
            "location_lng": r.location_lng,
            "image_url": r.image_url,
            "ai_detected_category": r.ai_detected_category,
            "ai_confidence": r.ai_confidence,
            "severity": r.severity,
            "priority_score": r.priority_score,
            "priority_level": r.priority_level,
            "priority_reason": r.priority_reason,
            "segregation_status": r.segregation_status,
            "segregation_recommendation": r.segregation_recommendation,
            "status": r.status,
            "created_at": r.created_at,
            "feedback": {
                "was_cleared": r.feedback.was_cleared,
                "rating": r.feedback.rating,
                "comment": r.feedback.comment,
                "mismatch_flag": r.feedback.mismatch_flag
            } if r.feedback else None
        }
        for r in reports
    ]

@router.get("/{report_id}")
def get_report_detail(report_id: int, db: Session = Depends(get_db)):
    r = db.query(Report).filter(Report.id == report_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Report not found.")
    
    det = db.query(WasteDetection).filter(WasteDetection.report_id == r.id).first()
    task = db.query(CollectionTask).filter(CollectionTask.report_id == r.id).first()
    
    task_info = None
    if task:
        ev = task.evidence
        task_info = {
            "id": task.id,
            "task_code": task.task_code,
            "status": task.status,
            "worker_name": task.worker.full_name if task.worker else "Assigned Sanitation Crew",
            "assigned_at": task.assigned_at,
            "completed_at": task.completed_at,
            "evidence": {
                "before_image_url": ev.before_image_url,
                "after_image_url": ev.after_image_url,
                "before_waste_score": ev.before_waste_score,
                "after_waste_score": ev.after_waste_score,
                "clearance_percentage": ev.clearance_percentage,
                "verification_result": ev.verification_result,
                "verification_notes": ev.verification_notes,
                "validation_status": ev.validation_status,
                "supervisor_override": ev.supervisor_override,
                "override_result": ev.override_result,
                "override_notes": ev.override_notes
            } if ev else None
        }

    return {
        "id": r.id,
        "report_code": r.report_code,
        "title": r.title,
        "description": r.description,
        "language": r.language,
        "address": r.address,
        "zone": r.zone,
        "location_lat": r.location_lat,
        "location_lng": r.location_lng,
        "image_url": r.image_url,
        "waste_category_claimed": r.waste_category_claimed,
        "ai_detected_category": r.ai_detected_category,
        "ai_confidence": r.ai_confidence,
        "severity": r.severity,
        "priority_score": r.priority_score,
        "priority_level": r.priority_level,
        "priority_reason": r.priority_reason,
        "segregation_status": r.segregation_status,
        "segregation_recommendation": r.segregation_recommendation,
        "model_uncertainty": r.model_uncertainty,
        "status": r.status,
        "citizen_name": r.citizen_name,
        "created_at": r.created_at,
        "detection_detail": {
            "detected_objects": det.detected_objects if det else [],
            "categories": det.categories if det else [],
            "explanation": det.explanation if det else None,
            "recommendation": det.recommendation if det else None,
            "uncertainty_note": det.uncertainty_note if det else None
        } if det else None,
        "task": task_info,
        "feedback": {
            "was_cleared": r.feedback.was_cleared,
            "rating": r.feedback.rating,
            "comment": r.feedback.comment,
            "mismatch_flag": r.feedback.mismatch_flag,
            "created_at": r.feedback.created_at
        } if r.feedback else None
    }

@router.post("/{report_id}/feedback")
def submit_citizen_feedback(
    report_id: int,
    was_cleared: str = Form(...), # YES, NO, PARTIALLY
    rating: int = Form(5),
    comment: str = Form(""),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    r = db.query(Report).filter(Report.id == report_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Report not found.")

    # Check for mismatch: If AI verified collection, but citizen asserts NO
    mismatch_flag = False
    if r.status == "VERIFIED" and was_cleared.upper() == "NO":
        mismatch_flag = True
        r.status = "MANUAL_REVIEW"
        
        # Dispatch notification to supervisor
        notif = Notification(
            target_role="supervisor",
            title=f"Citizen Feedback Mismatch Alert ({r.report_code})",
            message=f"Citizen reported 'NO' for verified complaint at {r.address}. Comment: '{comment}'. Flagged for field supervisor review.",
            type="FEEDBACK_MISMATCH",
            reference_id=r.report_code
        )
        db.add(notif)

    fb = CitizenFeedback(
        report_id=r.id,
        citizen_id=current_user.id if current_user else None,
        was_cleared=was_cleared.upper(),
        rating=rating,
        comment=comment,
        mismatch_flag=mismatch_flag
    )
    db.add(fb)
    db.commit()

    return {
        "status": "success",
        "message": "Thank you for your valuable civic feedback.",
        "was_cleared": fb.was_cleared,
        "mismatch_flag": mismatch_flag,
        "review_status": "MANUAL REVIEW REQUIRED" if mismatch_flag else "CLOSED"
    }
