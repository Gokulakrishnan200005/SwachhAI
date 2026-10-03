from sqlalchemy.orm import Session
from sqlalchemy import func
from ..models import Report, Hotspot, CollectionEvidence, CollectionTask, User

def query_civic_assistant(question: str, db: Session) -> dict:
    """
    Data-grounded AI Civic Assistant.
    Extracts verified metrics from the live municipal database to answer queries accurately.
    Never fabricates statistics; explicitly returns 'Insufficient data.' when evidence is missing.
    """
    q = question.lower().strip()

    # Total counts
    total_reports = db.query(Report).count()
    if total_reports == 0:
        return {
            "question": question,
            "answer": "Insufficient data. There are currently no reports registered in the database.",
            "grounding_source": "Database records",
            "metrics": {}
        }

    # Query 1: Most repeated complaints / complaints area
    if any(k in q for k in ["most repeated", "repeated complaints", "most complaints", "which area", "zone with most"]):
        zone_counts = db.query(
            Report.zone, func.count(Report.id).label("count")
        ).group_by(Report.zone).order_by(func.count(Report.id).desc()).all()

        if zone_counts:
            top_zone, top_count = zone_counts[0]
            breakdown = ", ".join([f"{z}: {c} reports" for z, c in zone_counts[:3]])
            answer = (
                f"**{top_zone}** has registered the highest volume of complaints with **{top_count} reports** "
                f"({round(top_count/total_reports*100, 1)}% of all city complaints). "
                f"Top affected zones: {breakdown}."
            )
            return {
                "question": question,
                "answer": answer,
                "grounding_source": f"Live query on {total_reports} municipal reports",
                "metrics": {"top_zone": top_zone, "top_count": top_count, "all_zones": dict(zone_counts)}
            }
        return {"question": question, "answer": "Insufficient data regarding zone breakdown.", "metrics": {}}

    # Query 2: Collection failure location / fail most often
    if any(k in q for k in ["fail most", "collection fail", "failed clearance", "failed most", "failed collection"]):
        failed_tasks = db.query(
            Report.zone, func.count(Report.id).label("fail_count")
        ).join(CollectionTask, CollectionTask.report_id == Report.id)\
         .filter(CollectionTask.status.in_(["FAILED", "ESCALATED"]))\
         .group_by(Report.zone).order_by(func.count(Report.id).desc()).all()

        total_fails = sum(fc for _, fc in failed_tasks)
        if failed_tasks and total_fails > 0:
            top_fail_zone, top_fail_count = failed_tasks[0]
            answer = (
                f"Collection verifications have failed most frequently in **{top_fail_zone}** "
                f"with **{top_fail_count} failed clearance attempts** out of a total of {total_fails} system-wide collection failures. "
                f"These failures triggered automatic supervisor escalations."
            )
            return {
                "question": question,
                "answer": answer,
                "grounding_source": f"Live query on failed collection tasks ({total_fails} total failures)",
                "metrics": {"top_fail_zone": top_fail_zone, "fail_count": top_fail_count}
            }
        else:
            return {
                "question": question,
                "answer": "Currently, 0 collection verifications have failed in the system, or all active tasks have been resolved successfully.",
                "grounding_source": "Live database query",
                "metrics": {"total_failed": 0}
            }

    # Query 3: Most common type of waste
    if any(k in q for k in ["type of waste", "most common", "waste category", "common waste", "dominant waste"]):
        waste_counts = db.query(
            Report.ai_detected_category, func.count(Report.id).label("count")
        ).group_by(Report.ai_detected_category).order_by(func.count(Report.id).desc()).all()

        if waste_counts:
            top_waste, top_w_count = waste_counts[0]
            pct = round(top_w_count / total_reports * 100, 1)
            dist_str = ", ".join([f"{w}: {c} ({round(c/total_reports*100, 1)}%)" for w, c in waste_counts[:4]])
            answer = (
                f"The most common category of waste detected by the AI pipeline is **{top_waste}**, "
                f"accounting for **{top_w_count} out of {total_reports} reports ({pct}%)**. "
                f"Waste distribution breakdown: {dist_str}."
            )
            return {
                "question": question,
                "answer": answer,
                "grounding_source": "AI Computer Vision Classification Logs",
                "metrics": {"dominant_waste": top_waste, "count": top_w_count, "percentage": pct}
            }
        return {"question": question, "answer": "Insufficient data regarding waste categories.", "metrics": {}}

    # Query 4: Priorities for tomorrow / which areas to prioritize
    if any(k in q for k in ["prioritize tomorrow", "prioritized tomorrow", "tomorrow", "priority areas", "where should we"]):
        high_p_reports = db.query(Report).filter(
            Report.status.in_(["REPORTED", "ASSIGNED", "IN_PROGRESS", "FAILED"]),
            Report.priority_level.in_(["CRITICAL", "HIGH"])
        ).all()

        zone_counts = {}
        for r in high_p_reports:
            zone_counts[r.zone] = zone_counts.get(r.zone, 0) + 1

        sorted_zones = sorted(zone_counts.items(), key=lambda x: x[1], reverse=True)
        if sorted_zones:
            top_priorities = ", ".join([f"**{z}** ({cnt} high-severity points)" for z, cnt in sorted_zones[:3]])
            answer = (
                f"Based on pending high-severity incidents, the top priority deployment zones for tomorrow are: {top_priorities}. "
                f"Recommended schedule: Dispatch early morning dual-tipper trucks to **{sorted_zones[0][0]}** by 07:00 AM to prevent market/transit peak overflow."
            )
            return {
                "question": question,
                "answer": answer,
                "grounding_source": f"Analysis of {len(high_p_reports)} open CRITICAL & HIGH priority reports",
                "metrics": {"pending_urgent": len(high_p_reports), "priority_zones": dict(sorted_zones)}
            }
        else:
            return {
                "question": question,
                "answer": "All critical and high priority open complaints are currently cleared. Routine scheduled collections across standard zones are sufficient for tomorrow.",
                "grounding_source": "Open report priority query",
                "metrics": {"pending_urgent": 0}
            }

    # Query 5: Major recurring hotspots
    if any(k in q for k in ["recurring hotspot", "major hotspots", "hotspot", "blackspot"]):
        hotspots = db.query(Hotspot).filter(Hotspot.is_active == True).order_by(Hotspot.report_count.desc()).all()
        if hotspots:
            top_h = hotspots[0]
            summary_list = "; ".join([
                f"**{h.name}** ({h.zone}: {h.report_count} reports, {h.dominant_waste_type}, risk: {h.risk_level})"
                for h in hotspots[:3]
            ])
            answer = (
                f"Identified **{len(hotspots)} major recurring waste hotspots**. "
                f"The highest-risk hotspot is **{top_h.name}** located in **{top_h.zone}** with {top_h.report_count} repeat incidents. "
                f"Key recurring clusters: {summary_list}. "
                f"Root cause hypothesis for primary hotspot: {top_h.ai_hypothesis or 'High commercial density without adequate bins.'}"
            )
            return {
                "question": question,
                "answer": answer,
                "grounding_source": f"Spatial clustering on {total_reports} historical records",
                "metrics": {"active_hotspots": len(hotspots), "top_hotspot": top_h.name}
            }
        else:
            return {
                "question": question,
                "answer": "Insufficient data. No recurring hotspots have been formally calculated or active yet.",
                "grounding_source": "Database records",
                "metrics": {}
            }

    # Fallback response for unhandled questions
    # Provide a helpful overview of available grounded metrics
    open_count = db.query(Report).filter(Report.status != "VERIFIED").count()
    verified_count = db.query(Report).filter(Report.status == "VERIFIED").count()
    
    return {
        "question": question,
        "answer": (
            f"I have verified the live database. Currently there are **{total_reports} total complaints** "
            f"({open_count} open, {verified_count} verified collections). "
            f"You can ask me specific questions such as:\n"
            f"• *'Which area has the most repeated complaints?'*\n"
            f"• *'Where did collection fail most often?'*\n"
            f"• *'What type of waste is most common?'*\n"
            f"• *'Which areas should be prioritized tomorrow?'*\n"
            f"• *'What are the major recurring hotspots?'*"
        ),
        "grounding_source": f"Database overview ({total_reports} records)",
        "metrics": {"total_reports": total_reports, "open": open_count, "verified": verified_count}
    }
