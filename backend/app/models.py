import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="citizen") # citizen, worker, supervisor, admin
    phone = Column(String(50), nullable=True)
    zone = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    reports = relationship("Report", back_populates="citizen", foreign_keys="Report.citizen_id")
    tasks = relationship("CollectionTask", back_populates="worker", foreign_keys="CollectionTask.worker_id")
    notifications = relationship("Notification", back_populates="user")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    report_code = Column(String(50), unique=True, index=True, nullable=False) # e.g. SWA-2026-001
    citizen_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    citizen_name = Column(String(255), nullable=True)
    citizen_contact = Column(String(100), nullable=True)
    language = Column(String(10), default="en") # en, hi, ta
    
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=False)
    
    location_lat = Column(Float, nullable=False)
    location_lng = Column(Float, nullable=False)
    address = Column(String(500), nullable=False)
    zone = Column(String(100), nullable=False)
    
    waste_category_claimed = Column(String(100), nullable=True) # citizen reported
    ai_detected_category = Column(String(100), nullable=False) # Organic, Plastic, Mixed, etc.
    ai_confidence = Column(Float, default=0.0)
    severity = Column(String(20), default="MEDIUM") # CRITICAL, HIGH, MEDIUM, LOW
    
    priority_score = Column(Float, default=50.0)
    priority_level = Column(String(20), default="MEDIUM") # CRITICAL, HIGH, MEDIUM, LOW
    priority_reason = Column(Text, nullable=True)
    
    segregation_status = Column(String(30), default="PROPER") # PROPER, IMPROPER, UNCERTAIN
    segregation_recommendation = Column(Text, nullable=True)
    model_uncertainty = Column(Boolean, default=False)
    
    status = Column(String(50), default="REPORTED") # REPORTED, ASSIGNED, IN_PROGRESS, COLLECTED, VERIFIED, FAILED, ESCALATED, CLOSED
    is_suspicious = Column(Boolean, default=False)
    repeat_count = Column(Integer, default=1)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    citizen = relationship("User", back_populates="reports", foreign_keys=[citizen_id])
    detections = relationship("WasteDetection", back_populates="report", cascade="all, delete-orphan")
    task = relationship("CollectionTask", back_populates="report", uselist=False)
    feedback = relationship("CitizenFeedback", back_populates="report", uselist=False)
    escalations = relationship("Escalation", back_populates="report")


class WasteDetection(Base):
    __tablename__ = "waste_detections"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False)
    detected_objects = Column(JSON, nullable=True) # [{"name": "plastic bottle", "confidence": 0.91, "box": [...]}]
    categories = Column(JSON, nullable=True) # ["Plastic", "Organic/Wet Waste"]
    primary_category = Column(String(100), nullable=False)
    confidence = Column(Float, default=0.0)
    severity = Column(String(20), default="MEDIUM")
    segregation_status = Column(String(30), default="PROPER")
    explanation = Column(Text, nullable=True)
    recommendation = Column(Text, nullable=True)
    model_uncertainty = Column(Boolean, default=False)
    uncertainty_note = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    report = relationship("Report", back_populates="detections")


class CollectionTask(Base):
    __tablename__ = "collection_tasks"

    id = Column(Integer, primary_key=True, index=True)
    task_code = Column(String(50), unique=True, index=True, nullable=False) # e.g. TSK-001
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False)
    worker_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    supervisor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    status = Column(String(50), default="ASSIGNED") # PENDING, ASSIGNED, ARRIVED, BEFORE_UPLOADED, AFTER_UPLOADED, VERIFIED, FAILED, ESCALATED
    priority_level = Column(String(20), default="MEDIUM")
    notes = Column(Text, nullable=True)
    
    assigned_at = Column(DateTime, default=datetime.datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    report = relationship("Report", back_populates="task")
    worker = relationship("User", back_populates="tasks", foreign_keys=[worker_id])
    evidence = relationship("CollectionEvidence", back_populates="task", uselist=False)
    escalations = relationship("Escalation", back_populates="task")


class CollectionEvidence(Base):
    __tablename__ = "collection_evidence"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("collection_tasks.id"), nullable=False)
    worker_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    before_image_url = Column(String(500), nullable=False)
    after_image_url = Column(String(500), nullable=True)
    
    before_timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    after_timestamp = Column(DateTime, nullable=True)
    
    worker_lat = Column(Float, nullable=True)
    worker_lng = Column(Float, nullable=True)
    
    before_waste_score = Column(Float, default=0.0) # e.g. 0.91
    after_waste_score = Column(Float, default=0.0) # e.g. 0.12
    clearance_percentage = Column(Float, default=0.0) # e.g. 86.8%
    ai_confidence = Column(Float, default=0.0)
    
    verification_result = Column(String(50), default="PENDING") # VERIFIED, PARTIALLY_CLEARED, NOT_CLEARED, MANUAL_REVIEW
    verification_notes = Column(Text, nullable=True)
    
    # Evidence validation / anti-fraud
    validation_status = Column(String(50), default="VALID_EVIDENCE") # VALID_EVIDENCE, SUSPICIOUS_EVIDENCE
    validation_reasons = Column(JSON, nullable=True) # list of reason strings
    image_hash_before = Column(String(64), nullable=True)
    image_hash_after = Column(String(64), nullable=True)
    
    # Manual supervisor override
    supervisor_override = Column(Boolean, default=False)
    override_result = Column(String(50), nullable=True)
    override_by = Column(String(255), nullable=True)
    override_notes = Column(Text, nullable=True)
    override_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    task = relationship("CollectionTask", back_populates="evidence")


class CitizenFeedback(Base):
    __tablename__ = "citizen_feedback"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False)
    citizen_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    was_cleared = Column(String(20), nullable=False) # YES, NO, PARTIALLY
    rating = Column(Integer, default=5) # 1 to 5
    comment = Column(Text, nullable=True)
    mismatch_flag = Column(Boolean, default=False) # True if AI verified but citizen says NO
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    report = relationship("Report", back_populates="feedback")


class Escalation(Base):
    __tablename__ = "escalations"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("collection_tasks.id"), nullable=True)
    
    failure_count = Column(Integer, default=1)
    escalation_level = Column(String(50), nullable=False) # WORKER_NOTIFIED, SUPERVISOR_NOTIFIED, HIGH_ADMIN_ESCALATION
    reason = Column(Text, nullable=False)
    timeline = Column(JSON, nullable=True) # [{"time": "...", "stage": "...", "note": "..."}]
    
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(String(255), nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    report = relationship("Report", back_populates="escalations")
    task = relationship("CollectionTask", back_populates="escalations")


class Hotspot(Base):
    __tablename__ = "hotspots"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    zone = Column(String(100), nullable=False)
    center_lat = Column(Float, nullable=False)
    center_lng = Column(Float, nullable=False)
    radius_meters = Column(Float, default=150.0)
    
    report_count = Column(Integer, default=0)
    dominant_waste_type = Column(String(100), default="Mixed Waste")
    avg_severity = Column(String(20), default="HIGH")
    failed_clearance_count = Column(Integer, default=0)
    avg_clearance_hours = Column(Float, default=12.5)
    repeat_frequency_weekly = Column(Float, default=5.2)
    risk_level = Column(String(20), default="HIGH") # CRITICAL, HIGH, MEDIUM, LOW
    
    ai_hypothesis = Column(Text, nullable=True)
    contributing_factors = Column(JSON, nullable=True)
    recommended_action = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    predictions = relationship("HotspotPrediction", back_populates="hotspot")


class HotspotPrediction(Base):
    __tablename__ = "hotspot_predictions"

    id = Column(Integer, primary_key=True, index=True)
    hotspot_id = Column(Integer, ForeignKey("hotspots.id"), nullable=True)
    zone = Column(String(100), nullable=False)
    target_date = Column(String(50), nullable=False) # e.g. "Next 24 Hours (Tomorrow)"
    
    predicted_risk = Column(String(20), default="HIGH") # CRITICAL, HIGH, MEDIUM, LOW
    risk_score = Column(Float, default=75.0) # 0 to 100
    expected_reports = Column(Integer, default=5)
    peak_hours = Column(String(100), default="08:00 - 11:00")
    explanation = Column(Text, nullable=False)
    
    is_demo_data = Column(Boolean, default=True) # Always clearly labeled demo
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    hotspot = relationship("Hotspot", back_populates="predictions")


class CollectionDemand(Base):
    __tablename__ = "collection_demands"

    id = Column(Integer, primary_key=True, index=True)
    target_date = Column(String(50), nullable=False)
    time_slot = Column(String(50), nullable=False) # e.g. "07:00 - 10:00"
    demand_level = Column(String(20), nullable=False) # HIGH DEMAND, MEDIUM DEMAND, LOW DEMAND
    estimated_volume_kg = Column(Float, default=450.0)
    required_workers = Column(Integer, default=4)
    priority_zones = Column(JSON, nullable=True)
    is_demo_data = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # None = broadcast to role/all
    target_role = Column(String(50), nullable=True) # worker, supervisor, admin, citizen
    
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="INFO") # NEW_REPORT, HIGH_PRIORITY, WORKER_ASSIGNED, FAILED_VERIFICATION, ESCALATION, HOTSPOT_ALERT, FEEDBACK_MISMATCH
    reference_id = Column(String(100), nullable=True)
    is_read = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    user = relationship("User", back_populates="notifications")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    user_email = Column(String(255), nullable=True)
    role = Column(String(50), nullable=True)
    action = Column(String(100), nullable=False) # REPORT_CREATED, TASK_STARTED, BEFORE_UPLOADED, AFTER_UPLOADED, VERIFIED, OVERRIDDEN, ESCALATED
    target_type = Column(String(50), nullable=False) # Report, Task, Evidence, Hotspot
    target_id = Column(String(50), nullable=False)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
