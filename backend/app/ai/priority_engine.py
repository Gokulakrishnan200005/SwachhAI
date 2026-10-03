def calculate_priority_score(
    severity: str,
    age_hours: float = 0.0,
    repeat_reports_count: int = 1,
    historical_complaints: int = 0,
    previous_failed_collections: int = 0,
    waste_coverage_ratio: float = 0.2,
    is_high_risk_location: bool = False,
    predicted_overflow_risk: str = "MEDIUM" # LOW, MEDIUM, HIGH
):
    """
    Transparent SwachhAI Collection Priority Engine.
    Combines visual severity, duration elapsed, citizen report density, historical failure rate,
    and civic vulnerability into an auditable 0-100 priority score.
    """
    score = 0.0
    reasons = []

    # 1. Base severity component (0 to 35 pts)
    severity_map = {
        "CRITICAL": 35.0,
        "HIGH": 25.0,
        "MEDIUM": 15.0,
        "LOW": 5.0
    }
    base_sev = severity_map.get(severity.upper(), 15.0)
    score += base_sev
    reasons.append(f"{severity.upper()} visual severity (+{int(base_sev)} pts)")

    # 2. Report age component (0 to 20 pts: 1 pt per 2 hours pending, capped at 20)
    age_pts = min(20.0, age_hours * 0.5)
    if age_pts > 0:
        score += age_pts
        reasons.append(f"Report age {round(age_hours, 1)} hrs without clearance (+{round(age_pts, 1)} pts)")

    # 3. Duplicate / Repeat complaints count (0 to 15 pts)
    if repeat_reports_count > 1:
        repeat_pts = min(15.0, (repeat_reports_count - 1) * 4.0)
        score += repeat_pts
        reasons.append(f"{repeat_reports_count} repeat citizen reports logged in vicinity (+{int(repeat_pts)} pts)")

    # 4. Previous failed clearances (0 to 15 pts)
    if previous_failed_collections > 0:
        failed_pts = min(15.0, previous_failed_collections * 7.5)
        score += failed_pts
        reasons.append(f"{previous_failed_collections} previous failed collection attempt(s) (+{round(failed_pts, 1)} pts)")

    # 5. Historical complaints in zone (0 to 10 pts)
    if historical_complaints > 3:
        hist_pts = min(10.0, historical_complaints * 0.8)
        score += hist_pts
        reasons.append(f"Zone has {historical_complaints} historical complaints on record (+{round(hist_pts, 1)} pts)")

    # 6. Location risk / sensitive zone (0 to 10 pts)
    if is_high_risk_location:
        score += 10.0
        reasons.append("High-density public zone (market / school / hospital proximity) (+10 pts)")

    # 7. Predicted overflow risk (0 to 10 pts)
    overflow_pts = {"HIGH": 10.0, "MEDIUM": 5.0, "LOW": 0.0}.get(predicted_overflow_risk.upper(), 0.0)
    if overflow_pts > 0:
        score += overflow_pts
        reasons.append(f"Predictive model flags {predicted_overflow_risk} overflow probability (+{int(overflow_pts)} pts)")

    # Normalize to 0-100
    final_score = min(100.0, max(0.0, score))

    if final_score >= 80.0:
        priority_level = "CRITICAL"
    elif final_score >= 60.0:
        priority_level = "HIGH"
    elif final_score >= 40.0:
        priority_level = "MEDIUM"
    else:
        priority_level = "LOW"

    reason_summary = f"{priority_level} PRIORITY because:\n• " + "\n• ".join(reasons)

    return {
        "priority_score": round(final_score, 1),
        "priority_level": priority_level,
        "priority_reason": reason_summary,
        "reasons_breakdown": reasons,
        "disclaimer": "AI-calculated priority score based on municipal operational parameters. Not an official statutory order."
    }
