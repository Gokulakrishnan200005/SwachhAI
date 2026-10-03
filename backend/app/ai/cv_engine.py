import os
import cv2
import numpy as np
from pathlib import Path
from PIL import Image

CATEGORIES = [
    "Organic/Wet Waste",
    "Plastic",
    "Paper",
    "Metal",
    "Glass",
    "E-Waste",
    "Sanitary Waste",
    "Mixed Waste",
    "Other"
]

def analyze_waste_image(image_path: str):
    """
    Real Computer Vision Pipeline for Waste Detection using OpenCV & Color/Texture Feature Extraction.
    Analyzes visual signatures (color distribution, edge contours, specular highlights, texture variance)
    to classify waste components, detect bounding boxes, assess severity and evaluate model confidence.
    """
    path = Path(image_path)
    if not path.exists():
        raise FileNotFoundError(f"Image not found at {image_path}")

    # Load image using OpenCV
    img = cv2.imread(str(path))
    if img is None:
        # Fallback using PIL
        pil_img = Image.open(str(path)).convert('RGB')
        img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

    h, w, _ = img.shape
    total_pixels = h * w

    # Convert to HSV and Grayscale
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 1. Texture analysis (Laplacian variance for sharpness and clutter)
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    
    # 2. Edge density using Canny
    edges = cv2.Canny(gray, 50, 150)
    edge_density = np.sum(edges > 0) / total_pixels

    # 3. Color channel masks for waste signatures
    # Wet/Organic Waste: Greens, yellows, organic browns, vegetative hues
    lower_organic1 = np.array([20, 40, 30])
    upper_organic1 = np.array([85, 255, 200])
    organic_mask = cv2.inRange(hsv, lower_organic1, upper_organic1)
    organic_ratio = np.sum(organic_mask > 0) / total_pixels

    # Plastic: Bright synthetic colors (vibrant blues, reds, synthetic yellow/orange wrappers) + specular highlights
    lower_blue = np.array([90, 60, 60])
    upper_blue = np.array([130, 255, 255])
    lower_red1 = np.array([0, 70, 70])
    upper_red1 = np.array([10, 255, 255])
    lower_red2 = np.array([170, 70, 70])
    upper_red2 = np.array([180, 255, 255])
    
    blue_mask = cv2.inRange(hsv, lower_blue, upper_blue)
    red_mask = cv2.bitwise_or(cv2.inRange(hsv, lower_red1, upper_red1), cv2.inRange(hsv, lower_red2, upper_red2))
    plastic_color_mask = cv2.bitwise_or(blue_mask, red_mask)
    plastic_color_ratio = np.sum(plastic_color_mask > 0) / total_pixels

    # Specular highlights (smooth glossy plastics or metals)
    lower_specular = np.array([0, 0, 210])
    upper_specular = np.array([180, 40, 255])
    specular_mask = cv2.inRange(hsv, lower_specular, upper_specular)
    specular_ratio = np.sum(specular_mask > 0) / total_pixels

    # Paper / Cardboard: Beige, diffuse light brown/grey, flat planar texture
    lower_paper = np.array([15, 20, 140])
    upper_paper = np.array([35, 90, 230])
    paper_mask = cv2.inRange(hsv, lower_paper, upper_paper)
    paper_ratio = np.sum(paper_mask > 0) / total_pixels

    # Metal: High luminance contrast, metallic gray tones with sharp edges
    lower_metal = np.array([0, 0, 100])
    upper_metal = np.array([180, 30, 200])
    metal_mask = cv2.inRange(hsv, lower_metal, upper_metal)
    metal_ratio = np.sum(metal_mask > 0) / total_pixels

    # Contour detection to identify distinct waste clusters and bounding boxes
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 15, 3)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    detected_boxes = []
    min_area = total_pixels * 0.015 # Minimum 1.5% of frame
    max_area = total_pixels * 0.85

    detected_items = []
    
    # Sort contours by area descending
    valid_contours = [c for c in contours if min_area < cv2.contourArea(c) < max_area]
    valid_contours = sorted(valid_contours, key=cv2.contourArea, reverse=True)[:8]

    waste_area_total = 0

    for i, cnt in enumerate(valid_contours):
        area = cv2.contourArea(cnt)
        waste_area_total += area
        x, y, bw, bh = cv2.boundingRect(cnt)
        
        # Crop region of interest for localized classification
        roi_hsv = hsv[y:y+bh, x:x+bw]
        roi_pixels = bw * bh
        if roi_pixels == 0:
            continue

        r_org = np.sum(cv2.inRange(roi_hsv, lower_organic1, upper_organic1) > 0) / roi_pixels
        r_plas = np.sum(cv2.bitwise_or(
            cv2.inRange(roi_hsv, lower_blue, upper_blue),
            cv2.bitwise_or(cv2.inRange(roi_hsv, lower_red1, upper_red1), cv2.inRange(roi_hsv, lower_red2, upper_red2))
        ) > 0) / roi_pixels
        r_spec = np.sum(cv2.inRange(roi_hsv, lower_specular, upper_specular) > 0) / roi_pixels
        r_pap = np.sum(cv2.inRange(roi_hsv, lower_paper, upper_paper) > 0) / roi_pixels

        # Local classification
        if r_plas > 0.18 or (r_spec > 0.12 and r_plas > 0.08):
            label = "Plastic Bottle / Packaging"
            cat = "Plastic"
            conf = min(0.96, 0.72 + r_plas * 0.6)
        elif r_org > 0.20:
            label = "Organic / Food Waste Cluster"
            cat = "Organic/Wet Waste"
            conf = min(0.95, 0.70 + r_org * 0.5)
        elif r_pap > 0.25:
            label = "Paper / Cardboard Debris"
            cat = "Paper"
            conf = min(0.92, 0.68 + r_pap * 0.5)
        elif r_spec > 0.18 and edge_density > 0.08:
            label = "Metal Can / Foil"
            cat = "Metal"
            conf = min(0.90, 0.65 + r_spec * 0.5)
        else:
            label = "Unclassified Solid Debris"
            cat = "Other"
            conf = 0.62

        detected_boxes.append({
            "id": i + 1,
            "label": label,
            "category": cat,
            "confidence": round(float(conf), 2),
            "box": [int(x), int(y), int(bw), int(bh)],
            "box_relative": [
                round(float(x / w), 4),
                round(float(y / h), 4),
                round(float(bw / w), 4),
                round(float(bh / h), 4)
            ]
        })
        detected_items.append({"name": label, "category": cat, "confidence": round(float(conf), 2)})

    # Determine aggregate category and multi-class composition
    categories_found = list(set(b["category"] for b in detected_boxes if b["category"] != "Other"))
    if not categories_found:
        categories_found = ["Mixed Waste"]

    is_mixed = len(categories_found) >= 2 or ("Plastic" in categories_found and "Organic/Wet Waste" in categories_found)
    
    if is_mixed:
        primary_category = "Mixed Waste"
        overall_confidence = 0.88
    elif len(categories_found) == 1:
        primary_category = categories_found[0]
        # Average confidence of that category
        matched_confs = [b["confidence"] for b in detected_boxes if b["category"] == primary_category]
        overall_confidence = round(sum(matched_confs) / max(1, len(matched_confs)), 2) if matched_confs else 0.82
    else:
        primary_category = "Mixed Waste"
        overall_confidence = 0.75

    # Estimate overall waste coverage ratio
    waste_coverage_ratio = waste_area_total / max(1, total_pixels)

    # Compute Severity
    if waste_coverage_ratio > 0.35 or len(detected_boxes) >= 5 or (primary_category == "Mixed Waste" and waste_coverage_ratio > 0.25):
        severity = "HIGH"
        if waste_coverage_ratio > 0.55:
            severity = "CRITICAL"
    elif waste_coverage_ratio > 0.15 or len(detected_boxes) >= 3:
        severity = "MEDIUM"
    else:
        severity = "LOW"

    # Model uncertainty check
    model_uncertainty = False
    uncertainty_note = None
    if overall_confidence < 0.68 or len(detected_boxes) == 0:
        model_uncertainty = True
        uncertainty_note = "Model uncertainty – manual review recommended."

    # If no contours were detected, provide sensible default item
    if not detected_boxes:
        detected_boxes = [{
            "id": 1,
            "label": "Diffuse Waste Mass",
            "category": primary_category,
            "confidence": 0.65,
            "box": [int(w*0.1), int(h*0.1), int(w*0.8), int(h*0.8)],
            "box_relative": [0.1, 0.1, 0.8, 0.8]
        }]
        detected_items = [{"name": "Diffuse Waste Mass", "category": primary_category, "confidence": 0.65}]

    return {
        "primary_category": primary_category,
        "categories": categories_found,
        "confidence": overall_confidence,
        "severity": severity,
        "detected_objects": detected_items,
        "bounding_boxes": detected_boxes,
        "waste_coverage_ratio": round(float(waste_coverage_ratio), 3),
        "model_uncertainty": model_uncertainty,
        "uncertainty_note": uncertainty_note,
        "image_dimensions": {"width": w, "height": h}
    }
