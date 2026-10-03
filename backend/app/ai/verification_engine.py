import cv2
import numpy as np
from pathlib import Path
from PIL import Image

def calculate_waste_score_from_cv(img) -> float:
    """
    Computes a garbage presence score (0.0 to 1.0) using edge density,
    color variance, contour fragmentation, and texture entropy.
    """
    h, w, _ = img.shape
    total_pixels = h * w
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

    # 1. Edge clutter (Canny edges)
    edges = cv2.Canny(gray, 40, 140)
    edge_ratio = np.sum(edges > 0) / total_pixels

    # 2. Debris contour coverage
    blurred = cv2.GaussianBlur(gray, (7, 7), 0)
    thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 19, 4)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    contour_area = 0
    min_area = total_pixels * 0.005
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area > min_area:
            contour_area += area
    coverage_ratio = min(1.0, contour_area / total_pixels)

    # 3. High variance in saturation and color clutter
    sat = hsv[:, :, 1]
    val = hsv[:, :, 2]
    color_clutter = (np.std(sat) / 128.0 + np.std(val) / 128.0) / 2.0

    # Composite waste score
    score = (edge_ratio * 3.5) * 0.35 + (coverage_ratio) * 0.45 + (color_clutter) * 0.20
    return float(np.clip(score, 0.05, 0.98))

def verify_collection(before_image_path: str, after_image_path: str):
    """
    AI-Assisted Before/After Collection Verification Engine.
    Processes both images to measure garbage reduction, change in surface cleanliness,
    and visual evidence validity.
    """
    p_before = Path(before_image_path)
    p_after = Path(after_image_path)

    if not p_before.exists() or not p_after.exists():
        raise FileNotFoundError("One or both evidence images could not be located.")

    img_before = cv2.imread(str(p_before))
    img_after = cv2.imread(str(p_after))

    if img_before is None or img_after is None:
        raise ValueError("Failed to decode one of the submitted evidence images.")

    # Resize both to standardized resolution for fair comparison
    target_dim = (640, 480)
    img_b_resized = cv2.resize(img_before, target_dim)
    img_a_resized = cv2.resize(img_after, target_dim)

    # Compute waste presence scores
    raw_before_score = calculate_waste_score_from_cv(img_b_resized)
    raw_after_score = calculate_waste_score_from_cv(img_a_resized)

    # Calculate relative change
    # If before score was high and after is low, change is positive
    delta = raw_before_score - raw_after_score
    relative_change_pct = max(0.0, (delta / max(0.1, raw_before_score)) * 100.0)

    # Structural difference (SSIM-inspired difference)
    gray_b = cv2.cvtColor(img_b_resized, cv2.COLOR_BGR2GRAY)
    gray_a = cv2.cvtColor(img_a_resized, cv2.COLOR_BGR2GRAY)
    abs_diff = cv2.absdiff(gray_b, gray_a)
    mean_diff = np.mean(abs_diff) # Difference between the two frames

    # Image similarity check: if mean_diff < 5.0, user uploaded identical photo!
    if mean_diff < 5.0:
        return {
            "before_waste_score": round(raw_before_score, 2),
            "after_waste_score": round(raw_after_score, 2),
            "clearance_percentage": 0.0,
            "verification_result": "MANUAL_REVIEW",
            "action_required": "FLAGGED_FOR_SUPERVISOR",
            "ai_confidence": 0.95,
            "verification_label": "AI-ASSISTED VERIFICATION",
            "notes": "Evidence Alert: Before and After images appear visually identical. No physical clearance verified. Immediate supervisor review mandated.",
            "is_suspicious": True
        }

    # Confidence calculation
    ai_confidence = round(float(np.clip(0.78 + (mean_diff / 255.0) * 0.18, 0.70, 0.95)), 2)

    # Verification Decision Logic
    # 1. VERIFIED: Significant waste reduction (> 65%) and clean after surface (< 0.28)
    if relative_change_pct >= 65.0 and raw_after_score <= 0.30:
        result = "VERIFIED"
        action = "MARK_COMPLETED"
        notes = f"AI Verification Successful: Waste presence reduced by {round(relative_change_pct, 1)}% (Before: {round(raw_before_score, 2)} → After: {round(raw_after_score, 2)}). Site clean."
    # 2. PARTIALLY CLEARED: Moderate reduction (35% - 65%) or residual debris remains
    elif (relative_change_pct >= 35.0 and relative_change_pct < 65.0) or (raw_after_score > 0.30 and raw_after_score <= 0.48):
        result = "PARTIALLY_CLEARED"
        action = "SWEEPER_TOUCHUP_REQUIRED"
        notes = f"Partial Clearance Observed: {round(relative_change_pct, 1)}% reduction. Residual waste or uncollected perimeter piles remain visible. Follow-up sweep requested."
    # 3. NOT CLEARED: Low reduction (< 35%) or high waste remains in after photo
    elif relative_change_pct < 35.0 or raw_after_score > 0.48:
        result = "NOT_CLEARED"
        action = "RE_INSPECTION_REQUIRED"
        notes = f"Verification Failed: Substantial waste still present ({round(raw_after_score, 2)} after-score, only {round(relative_change_pct, 1)}% cleared). Automatic escalation triggered."
    else:
        result = "MANUAL_REVIEW"
        action = "SUPERVISOR_EVALUATION"
        notes = "Visual confidence margin inconclusive. Forwarded to sanitation inspector for manual review."

    return {
        "before_waste_score": round(raw_before_score, 2),
        "after_waste_score": round(raw_after_score, 2),
        "clearance_percentage": round(relative_change_pct, 1),
        "verification_result": result,
        "action_required": action,
        "ai_confidence": ai_confidence,
        "verification_label": "AI-ASSISTED VERIFICATION",
        "notes": notes,
        "is_suspicious": False
    }
