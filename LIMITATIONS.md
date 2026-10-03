# SwachhAI: Known Limitations & Future Roadmap

To uphold scientific integrity and hackathon transparency, this document details the operational boundaries and technical constraints of the current SwachhAI MVP.

---

## 1. Computer Vision & Environmental Boundaries

### 1.1 Extreme Lighting & Nocturnal Photography
- **Constraint**: The HSV color and texture segmentation pipeline performs reliably under daylight and standard municipal street illumination. However, photos captured in near-total darkness or with harsh monochromatic LED glare can experience color channel distortion.
- **Mitigation in Place**: When visual confidence drops below 68%, the system automatically flags `model_uncertainty = True` and prompts: *"Model uncertainty – manual review recommended."*

### 1.2 Occlusion and Bagged Waste
- **Constraint**: When solid waste is enclosed inside opaque black polythene garbage bags, optical computer vision cannot inspect internal composition. A pile consisting entirely of sealed black bags will be classified as `Plastic` or `Mixed Waste`, but cannot identify whether wet food scraps are concealed within.
- **Mitigation in Place**: The segregation engine flags high visual occlusion as `UNCERTAIN` and instructs the collection crew to conduct an on-site dual-compartment tipper inspection.

---

## 2. GPS & Evidence Verification Boundaries

### 2.1 Dense Urban Canyons & Multi-Story Shadowing
- **Constraint**: High-density urban areas (e.g. narrow market gullies with 4-story tenements) can cause GPS multipath drift of 30–80 meters on standard mobile chipsets.
- **Mitigation in Place**: The geofencing tolerance in `evidence_validator.py` is configured with a 600-meter safety buffer rather than a strict 10-meter boundary, preventing false fraud accusations against honest sanitation workers.

### 2.2 Camera Angle Discrepancies in Before/After Shots
- **Constraint**: If a worker captures the Before photo looking North from 5 meters away, and the After photo looking East from 15 meters away, structural perspective differences can distort raw SSIM comparison.
- **Mitigation in Place**: The verification engine focuses on relative debris contour density reduction and pavement cleanliness thresholds rather than strict pixel-for-pixel alignment. A manual supervisor override interface is explicitly provided.

---

## 3. Data & Predictive Modeling Boundaries

### 3.1 Simulated Historical Baseline
- **Constraint**: The 24-hour hotspot risk forecasts and collection demand curves in the MVP utilize synthetic municipal load curves modeled on typical Indian metropolitan waste cycles (early morning wholesale market turnover, midday residential door-to-door, afternoon commercial turnover).
- **Explicit Labeling**: All predictive outputs carry mandatory disclaimers:
  > *"Demo prediction based on simulated historical data. Not a guaranteed statutory forecast."*

---

## 4. Planned Engineering Roadmap

1. **Edge Inference**: Deploy quantization-tuned YOLOv8-nano models via ONNX Runtime on low-cost Android sanitation tablets for offline rural operation.
2. **State & ULB Portal Interoperability**: Direct API webhooks into MoHUA Swachhata 2.0 and state grievance redressal portals (e.g., CPGRAMS).
3. **Vehicle Telematics (IoT Integration)**: Automatic route transmission to in-cab GPS navigation tablets with weigh-bridge automated gross weight logging.
4. **Additional Regional Languages**: Extension from English, Tamil, and Hindi to Telugu, Kannada, Bengali, Marathi, and Gujarati.
