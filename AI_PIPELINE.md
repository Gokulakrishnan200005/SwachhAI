# SwachhAI: AI & Computer Vision Pipeline Technical Specification

This document details the algorithms, mathematical formulations, and operational mechanics powering SwachhAI's intelligence layer.

---

## 1. Computer Vision Waste Detection Pipeline (`app/ai/cv_engine.py`)

### 1.1 Objective
To classify waste streams from arbitrary citizen and worker photographs without requiring expensive GPU infrastructure on municipal servers.

### 1.2 Pipeline Steps
1. **Color Space Transformation**:
   - The input RGB image is mapped to **HSV (Hue-Saturation-Value)** and grayscale spaces.
   - HSV enables illumination-invariant color segmentation:
     - **Organic/Wet Waste**: Segmented in range $H \in [20, 85]$, capturing decomposing vegetative greens, wet kitchen peels, and dark food stains.
     - **Plastic Packaging**: Dual synthetic masks for vibrant polymer dyes:
       - Blue: $H \in [90, 130]$
       - Red: $H \in [0, 10] \cup [170, 180]$
     - **Specular Highlights (Glossy Plastics & Foil)**: High Value ($V \ge 210$) with low Saturation ($S \le 40$).
     - **Paper / Cardboard**: Low saturation beige tones ($H \in [15, 35], S \in [20, 90], V \in [140, 230]$).
     - **Metal / Cans**: Uniform mid-value specular reflectance.

2. **Edge Density & Clutter Analysis**:
   - Canny Edge Detection ($T_{\text{lower}}=50, T_{\text{upper}}=150$) measures surface fragmentation:
     $$\text{Edge Density} = \frac{\sum (E(x,y) > 0)}{W \times H}$$
   - Laplacian variance ($\text{Var}(\nabla^2 I)$) assesses image sharpness and micro-texture chaos.

3. **Contour Extraction & Bounding Box Generation**:
   - Adaptive Gaussian thresholding ($k=15, C=3$) identifies discrete debris clusters.
   - External contours with area between $1.5\%$ and $85\%$ of frame are extracted.
   - Regional color/texture histograms are evaluated within each bounding box to output normalized relative coordinates:
     $$[x_{\text{rel}}, y_{\text{rel}}, w_{\text{rel}}, h_{\text{rel}}] = \left[\frac{x}{W}, \frac{y}{H}, \frac{\text{width}}{W}, \frac{\text{height}}{H}\right]$$

4. **Multi-Class Aggregation & Uncertainty Handling**:
   - If co-occurring items span multiple streams (e.g. wet food + plastic containers), the primary stream is designated as `Mixed Waste`.
   - **Model Uncertainty Flag**: If overall confidence is $< 0.68$ or contour resolution is degraded, `model_uncertainty` is set to `True`, displaying:
     > *"Model uncertainty – manual review recommended."*

---

## 2. Waste Segregation Analysis Engine (`app/ai/segregation_engine.py`)

### 2.1 Rule-Based Multi-Stream Verification
In accordance with Indian Solid Waste Management Rules (2016), waste must be segregated at source into distinct channels:
- **Wet Biodegradable**: `Organic/Wet Waste`, `Sanitary Waste` (hazardous sub-stream)
- **Dry Recyclables**: `Plastic`, `Paper`, `Metal`, `Glass`, `E-Waste`

### 2.2 Classification Logic
- If $(\text{Wet} \cap \text{Detected}) \neq \emptyset$ AND $(\text{Dry} \cap \text{Detected}) \neq \emptyset$:
  - Status: `IMPROPER`
  - Output: Civic education warning explaining that mixing wet food with dry recyclables generates methane and prevents plastic recovery.
- If only single category stream exists:
  - Status: `PROPER`
- If ambiguous:
  - Status: `UNCERTAIN`

---

## 3. Collection Priority Engine (`app/ai/priority_engine.py`)

### 3.1 Mathematical Scoring Formula
$$\text{Score} = \text{Severity} + \text{Age} + \text{RepeatCount} + \text{FailedClearances} + \text{Vulnerability} + \text{Overflow}$$

| Factor | Calculation Formula | Maximum Points |
|---|---|---|
| **Base Visual Severity** | CRITICAL = 35, HIGH = 25, MEDIUM = 15, LOW = 5 | 35 pts |
| **Duration Pending** | $\min(20, \text{Hours} \times 0.5)$ | 20 pts |
| **Repeat Citizen Reports** | $\min(15, (\text{Repeats} - 1) \times 4)$ | 15 pts |
| **Previous Clearance Failures**| $\min(15, \text{Failures} \times 7.5)$ | 15 pts |
| **Location Vulnerability** | $+10$ if within 250m of school, hospital, or market | 10 pts |
| **Predicted Overflow Probability** | HIGH = 10, MEDIUM = 5, LOW = 0 | 10 pts |

### 3.2 Output Categorization
- $\text{Score} \ge 80 \implies$ **CRITICAL PRIORITY**
- $60 \le \text{Score} < 80 \implies$ **HIGH PRIORITY**
- $40 \le \text{Score} < 60 \implies$ **MEDIUM PRIORITY**
- $\text{Score} < 40 \implies$ **LOW PRIORITY**

---

## 4. Before/After Collection Verification Engine (`app/ai/verification_engine.py`)

### 4.1 Debris Presence Scoring Function
Given an image $I$, its waste score $S(I) \in [0.05, 0.98]$ is formulated as:
$$S(I) = 0.35 \times (3.5 \times \text{EdgeRatio}) + 0.45 \times \text{DebrisCoverage} + 0.20 \times \text{ColorClutter}$$

### 4.2 Relative Change Formulation
$$\Delta_{\text{clearance}}\% = \max\left(0, \frac{S(I_{\text{before}}) - S(I_{\text{after}})}{\max(0.1, S(I_{\text{before}}))} \times 100\right)$$

### 4.3 Automated Decision Thresholds
- **VERIFIED**: $\Delta_{\text{clearance}} \ge 65\%$ AND $S(I_{\text{after}}) \le 0.30$.
- **PARTIALLY CLEARED**: $35\% \le \Delta_{\text{clearance}} < 65\%$ OR $0.30 < S(I_{\text{after}}) \le 0.48$.
- **NOT CLEARED**: $\Delta_{\text{clearance}} < 35\%$ OR $S(I_{\text{after}}) > 0.48$ &rarr; triggers automatic multi-tier escalation.
- **MANUAL REVIEW**: Mean pixel difference $< 5.0$ (identical photo fraud).

---

## 5. Anti-Fraud Evidence Validation Engine (`app/ai/evidence_validator.py`)

1. **Perceptual Average Hash (aHash)**:
   - Resizes photo to $8 \times 8$ grayscale.
   - Evaluates 64 bits based on pixel mean comparison.
   - Detects image reuse across tasks and identical before/after submissions.
2. **GPS Geofence Validation**:
   - Haversine Distance ($R=6371\text{ km}$):
     $$d = 2R \arcsin\left(\sqrt{\sin^2(\Delta\phi/2) + \cos(\phi_1)\cos(\phi_2)\sin^2(\Delta\lambda/2)}\right)$$
   - If distance between worker upload coordinates and complaint coordinates $> 600\text{ m}$, flags `SUSPICIOUS_EVIDENCE`.
3. **Temporal Reality Check**:
   - Rejects submissions if clearance interval $< 30\text{ seconds}$ or if after timestamp precedes before timestamp.

---

## 6. Hotspot Clustering & Root-Cause Intelligence (`app/ai/hotspot_engine.py`)

### 6.1 Spatial Clustering
Reports within $\approx 220\text{ m}$ radius ($\Delta \text{deg} < 0.0025$) are grouped into chronic clusters.

### 6.2 Root-Cause Hypothesis Generator (AI HYPOTHESIS)
- Evaluates temporal patterns, dominant waste streams, and surrounding land use:
  - *Market Zone + Organic Waste*: Hypothesizes morning vendor produce unloading without decentralized composting.
  - *Transit Corridor + Plastic Bottles*: Hypothesizes commuter footfall bottle litter without high-capacity crusher cages.
  - *Industrial Area + E-Waste*: Hypothesizes nocturnal scrap dumping to evade tipping fees.
- **Strict Labeling**: All generated causes are labeled `AI HYPOTHESIS` and recommendations labeled `AI RECOMMENDATION`.

---

## 7. Priority-Constrained Route Optimizer (`app/ai/route_optimizer.py`)

- Formulates collection truck routing as a TSP with Priority Weights:
  $$\text{Next Stop Score} = \frac{\text{Distance}(\text{Current}, \text{Stop})}{\text{PriorityWeight}}$$
  where $\text{Weight}_{\text{CRITICAL}} = 4.0, \text{Weight}_{\text{HIGH}} = 2.5, \text{Weight}_{\text{MEDIUM}} = 1.2$.
- Incorporates urban road-tortuosity factor ($1.35\times$) on Haversine matrix.
- Route starts at the **Central Municipal Sanitation Depot** and concludes at the **Kodungaiyur Integrated Waste Processing Facility**.
