import hashlib
import math
from datetime import datetime
from pathlib import Path
from PIL import Image

def compute_image_sha256(image_path: str) -> str:
    """Computes exact cryptographic hash of file."""
    h = hashlib.sha256()
    with open(image_path, "rb") as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()

def compute_perceptual_hash(image_path: str) -> str:
    """Computes a simple 64-bit average perceptual hash (aHash) for visual duplication detection."""
    try:
        with Image.open(image_path) as img:
            img_gray = img.convert('L').resize((8, 8), Image.Resampling.LANCZOS)
            pixels = list(img_gray.getdata())
            avg = sum(pixels) / len(pixels)
            bits = "".join(['1' if p >= avg else '0' for p in pixels])
            return hex(int(bits, 2))[2:].zfill(16)
    except Exception:
        return compute_image_sha256(image_path)[:16]

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates distance between two coordinates in meters."""
    R = 6371000.0 # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def validate_collection_evidence(
    before_image_path: str,
    after_image_path: str,
    before_time: datetime,
    after_time: datetime,
    worker_lat: float,
    worker_lng: float,
    report_lat: float,
    report_lng: float,
    existing_hashes: list = None # list of past image hashes
):
    """
    AI-Assisted Evidence Validation.
    Executes anti-fraud and physical reality checks on submitted evidence.
    Label: 'AI-assisted evidence validation. Does not guarantee fraud detection.'
    """
    reasons = []
    is_suspicious = False

    # 1. Compute perceptual and exact hashes
    hash_b = compute_perceptual_hash(before_image_path)
    hash_a = compute_perceptual_hash(after_image_path)

    # 2. Check if before image == after image (exact same photo uploaded)
    if hash_b == hash_a:
        is_suspicious = True
        reasons.append("Identical visual hash detected between Before and After photos. No actual clearance occurred.")

    # 3. Check against previously submitted images in other tasks (image recycling fraud)
    if existing_hashes:
        if hash_b in existing_hashes:
            is_suspicious = True
            reasons.append("Before photo matches a previously submitted image from another task (suspected image recycling).")
        if hash_a in existing_hashes:
            is_suspicious = True
            reasons.append("After photo matches a previously archived clean image from another task.")

    # 4. Timestamp consistency check
    if after_time and before_time:
        duration_seconds = (after_time - before_time).total_seconds()
        if duration_seconds < 0:
            is_suspicious = True
            reasons.append("Temporal anomaly: After timestamp is earlier than Before timestamp.")
        elif duration_seconds < 30: # Completed heavy waste clearance in under 30 seconds
            is_suspicious = True
            reasons.append(f"Suspiciously rapid clearance elapsed time: {int(duration_seconds)} seconds between photos.")

    # 5. GPS distance consistency check (worker location vs report coordinates)
    if worker_lat and worker_lng and report_lat and report_lng:
        distance_meters = haversine_distance(worker_lat, worker_lng, report_lat, report_lng)
        if distance_meters > 600.0: # More than 600m away from garbage pile
            is_suspicious = True
            reasons.append(f"GPS Discrepancy: Worker upload location is {round(distance_meters, 0)} meters away from the reported garbage coordinates (exceeds 500m geofence).")

    status = "SUSPICIOUS_EVIDENCE" if is_suspicious else "VALID_EVIDENCE"
    
    return {
        "validation_status": status,
        "is_suspicious": is_suspicious,
        "reasons": reasons if reasons else ["Evidence passed all AI consistency, geofence, and temporal validity checks."],
        "hash_before": hash_b,
        "hash_after": hash_a,
        "validation_label": "AI-assisted evidence validation"
    }
