def analyze_segregation(categories: list, detected_objects: list, model_uncertainty: bool = False):
    """
    Analyzes whether detected waste appears properly segregated into wet and dry streams,
    as required by Indian Municipal Solid Waste (Management & Handling) Rules.
    """
    wet_categories = {"Organic/Wet Waste", "Sanitary Waste"}
    dry_categories = {"Plastic", "Paper", "Metal", "Glass", "E-Waste"}

    detected_set = set(categories)
    has_wet = bool(detected_set.intersection(wet_categories))
    has_dry = bool(detected_set.intersection(dry_categories))
    has_mixed = "Mixed Waste" in detected_set

    # Collect object names
    object_names = [obj.get("name", "Unknown item") for obj in detected_objects]

    if model_uncertainty:
        return {
            "segregation_status": "UNCERTAIN",
            "expected_category": "Requires Manual Segregation Verification",
            "detected_items": object_names,
            "explanation": "Image visual clarity or occlusion prevents deterministic segregation classification.",
            "recommendation": "Field worker or sanitation supervisor must conduct an on-site physical inspection before disposal."
        }

    if (has_wet and has_dry) or has_mixed:
        return {
            "segregation_status": "IMPROPER",
            "expected_category": "Segregated Wet (Green Bin) & Dry (Blue Bin) Streams",
            "detected_items": object_names,
            "explanation": "Detected co-mingled wet organic waste and dry non-biodegradable recyclables (plastics/paper/metal) in the same unsegregated pile. Mixed dumping contaminates recyclable materials and produces toxic leachate.",
            "recommendation": "Separate wet food and organic waste into the green bin for composting/biomethanation. Clean and dry all plastic, paper, and metal containers for the blue recycling stream."
        }
    elif has_wet and not has_dry:
        return {
            "segregation_status": "PROPER",
            "expected_category": "Wet / Organic Waste (Green Bin)",
            "detected_items": object_names,
            "explanation": "Waste stream predominantly contains organic biodegradable waste without severe dry recyclable cross-contamination.",
            "recommendation": "Route to local decentralized composting facility or bio-methanation plant. Ensure no plastic liners or non-compostable wrappers are mixed."
        }
    elif has_dry and not has_wet:
        return {
            "segregation_status": "PROPER",
            "expected_category": "Dry Recyclable Waste (Blue Bin)",
            "detected_items": object_names,
            "explanation": "Waste stream consists of dry recyclable materials (plastics, paper, cardboard, metal) without wet organic food matter.",
            "recommendation": "Route to Material Recovery Facility (MRF) for sorting, baling, and authorized recycler distribution."
        }
    else:
        return {
            "segregation_status": "UNCERTAIN",
            "expected_category": "General Municipal Solid Waste",
            "detected_items": object_names,
            "explanation": "Single stream could not be isolated with high confidence.",
            "recommendation": "Dispatch sanitation team with dual-compartment tipper vehicle for on-site source segregation."
        }
