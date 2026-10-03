from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Hotspot, HotspotPrediction, CollectionDemand, Report
from ..ai.hotspot_engine import cluster_reports_into_hotspots, generate_hotspot_predictions, generate_collection_demand_forecast

router = APIRouter(prefix="/hotspots", tags=["Hotspot Intelligence"])

@router.get("/")
def get_hotspots(
    zone: Optional[str] = None,
    risk: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Hotspot).filter(Hotspot.is_active == True)
    if zone:
        query = query.filter(Hotspot.zone == zone)
    if risk:
        query = query.filter(Hotspot.risk_level == risk)
    
    hotspots = query.order_by(Hotspot.report_count.desc()).all()
    
    # If no hotspots in DB, dynamically cluster from reports
    if not hotspots:
        reps = db.query(Report).all()
        rep_dicts = [
            {
                "id": r.id,
                "location_lat": r.location_lat,
                "location_lng": r.location_lng,
                "zone": r.zone,
                "ai_detected_category": r.ai_detected_category,
                "status": r.status
            }
            for r in reps
        ]
        return cluster_reports_into_hotspots(rep_dicts)

    return [
        {
            "id": h.id,
            "name": h.name,
            "zone": h.zone,
            "center_lat": h.center_lat,
            "center_lng": h.center_lng,
            "radius_meters": h.radius_meters,
            "report_count": h.report_count,
            "dominant_waste_type": h.dominant_waste_type,
            "avg_severity": h.avg_severity,
            "failed_clearance_count": h.failed_clearance_count,
            "avg_clearance_hours": h.avg_clearance_hours,
            "repeat_frequency_weekly": h.repeat_frequency_weekly,
            "risk_level": h.risk_level,
            "ai_hypothesis": h.ai_hypothesis,
            "contributing_factors": h.contributing_factors or [],
            "recommended_action": h.recommended_action
        }
        for h in hotspots
    ]

@router.get("/predictions")
def get_predictions(db: Session = Depends(get_db)):
    preds = db.query(HotspotPrediction).all()
    if not preds:
        # Fallback dynamic generator
        hotspots = db.query(Hotspot).all()
        h_dicts = [{"id": h.id, "zone": h.zone, "name": h.name, "report_count": h.report_count, "risk_level": h.risk_level} for h in hotspots]
        return generate_hotspot_predictions(h_dicts)

    return [
        {
            "id": p.id,
            "hotspot_id": p.hotspot_id,
            "zone": p.zone,
            "target_date": p.target_date,
            "predicted_risk": p.predicted_risk,
            "risk_score": p.risk_score,
            "expected_reports": p.expected_reports,
            "peak_hours": p.peak_hours,
            "explanation": p.explanation,
            "is_demo_data": p.is_demo_data,
            "disclaimer": "Demo prediction based on simulated historical data. Not guaranteed statutory forecast."
        }
        for p in preds
    ]

@router.get("/demand")
def get_collection_demand(db: Session = Depends(get_db)):
    demands = db.query(CollectionDemand).all()
    if not demands:
        return generate_collection_demand_forecast()
    
    return [
        {
            "id": d.id,
            "target_date": d.target_date,
            "time_slot": d.time_slot,
            "demand_level": d.demand_level,
            "estimated_volume_kg": d.estimated_volume_kg,
            "required_workers": d.required_workers,
            "priority_zones": d.priority_zones or [],
            "is_demo_data": d.is_demo_data,
            "disclaimer": "Demo demand model based on simulated historical load patterns."
        }
        for d in demands
    ]
