# SwachhAI: System Architecture & Technical Design

## 1. Architectural Philosophy

SwachhAI is designed with three core engineering principles:
1. **Understandable for 1–2 Person Teams**: No sprawling microservices or heavy message queues required for the MVP; all modules communicate via well-typed FastAPI routers and a clean SQLite/PostgreSQL-ready persistence tier.
2. **Grounded AI with Transparent Explainability**: Every AI model decision (waste classification, segregation recommendation, priority scoring, before/after clearance verification, root-cause hypothesis) includes an auditable explanation and confidence metric.
3. **Closed-Loop Verification**: A civic complaint cannot be closed by a simple checkbox; it requires photographic evidence, computer vision verification, geofenced evidence validation, and citizen feedback reconciliation.

---

## 2. Component Topology

```
┌────────────────────────────────────────────────────────┐
│                   React + Vite Frontend                │
│  - Tailwind CSS Responsive Design                      │
│  - Leaflet GIS Mapping & Recharts Analytics            │
│  - Multilingual Engine (EN, TA, HI)                    │
│  - Role Portals: Citizen, Worker, Supervisor, Admin    │
└───────────────────────────▲────────────────────────────┘
                            │ REST / JSON & Multipart
┌───────────────────────────▼────────────────────────────┐
│                    FastAPI Backend                     │
│  ├── /auth          : Salted PBKDF2 & JWT Security     │
│  ├── /reports       : CV Pipeline & Priority Engine    │
│  ├── /tasks         : Worker Flow & Before/After Engine│
│  ├── /hotspots      : Clustering & Predictive Demand   │
│  ├── /analytics     : Aggregations & SwachhAI Score    │
│  └── /assistant     : Database Grounded Q&A Assistant  │
└───────┬───────────────────┬───────────────────┬────────┘
        │                   │                   │
┌───────▼───────┐   ┌───────▼───────┐   ┌───────▼───────┐
│ AI Engines    │   │ SQLite / PG   │   │ Uploads Store │
│ - OpenCV CV   │   │ - Reports     │   │ - Before/After│
│ - Segregation │   │ - Tasks/Evid. │   │ - Cryptohash  │
│ - Priority    │   │ - Hotspots    │   │   Storage     │
│ - Validator   │   │ - Audit Logs  │   │               │
│ - TSP Solver  │   │ - Feedback    │   │               │
└───────────────┘   └───────────────┘   └───────────────┘
```

---

## 3. Core Subsystems

### 3.1 Computer Vision & Waste Detection Engine (`app/ai/cv_engine.py`)
- Analyzes raw visual signatures using OpenCV and color/texture space transformations:
  - **HSV Color Segmentation**: Separates organic greens/vegetative browns from high-saturation synthetic polymers (blue, red, orange plastic packaging).
  - **Canny Edge & Texture Clutter (Laplacian Variance)**: Distinguishes between flat clean surfaces and chaotic debris clusters.
  - **Specular Reflectance Filtering**: Identifies glossy plastics and metallic gradients.
  - **Contour Extraction**: Identifies bounding boxes and debris area coverage.
- Outputs multi-class detections across 9 categories:
  - `Organic/Wet Waste`, `Plastic`, `Paper`, `Metal`, `Glass`, `E-Waste`, `Sanitary Waste`, `Mixed Waste`, `Other`.
- Assesses severity: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` based on total waste area coverage and hazardous components.
- Handles model ambiguity: If confidence is `< 0.68`, flags `model_uncertainty = True` and warns: *"Model uncertainty – manual review recommended."*

### 3.2 Source Segregation Engine (`app/ai/segregation_engine.py`)
- Evaluates whether co-mingled wet and dry categories exist in the same report.
- If wet waste (food/vegetables) and dry recyclables (plastics/cardboard/metal) are detected together:
  - Status: `IMPROPER`
  - Actionable recommendation generated based on Indian Solid Waste Management Rules.
- If single stream detected: Status `PROPER`.

### 3.3 Transparent Priority Scoring Engine (`app/ai/priority_engine.py`)
Computes an auditable 0–100 score:
$$\text{Score} = \text{Severity} + \text{Age} + \text{Repeat Reports} + \text{Failed Collections} + \text{Location Risk} + \text{Overflow Risk}$$
- Base Severity: CRITICAL (35 pts), HIGH (25 pts), MEDIUM (15 pts), LOW (5 pts)
- Age: Up to 20 pts (0.5 pt per hour pending)
- Repeat complaints in vicinity: Up to 15 pts
- Previous failed collections: Up to 15 pts (7.5 pts per failure)
- High-risk public zones (schools, hospitals, transit hubs): +10 pts
- Generates a human-readable list explaining each contribution.

### 3.4 Before/After Collection Verification Engine (`app/ai/verification_engine.py`)
- Standardizes Before and After images to 640×480.
- Computes `before_waste_score` and `after_waste_score` via OpenCV clutter and debris contour analysis.
- Computes relative clearance:
  $$\Delta\% = \max\left(0, \frac{\text{Score}_{\text{before}} - \text{Score}_{\text{after}}}{\max(0.1, \text{Score}_{\text{before}})} \times 100\right)$$
- Decision Matrix:
  - $\Delta\% \ge 65\%$ and $\text{Score}_{\text{after}} \le 0.30$ &rarr; `VERIFIED`
  - $35\% \le \Delta\% < 65\%$ &rarr; `PARTIALLY_CLEARED` (Sweeper touch-up required)
  - $\Delta\% < 35\%$ or $\text{Score}_{\text{after}} > 0.48$ &rarr; `NOT_CLEARED` (Triggers automatic escalation)
  - Identical images or inconclusive &rarr; `MANUAL_REVIEW`

### 3.5 Anti-Fraud Evidence Validation Engine (`app/ai/evidence_validator.py`)
Executes 5 reality checks:
1. **Duplicate Perceptual Hash Check**: Checks average 64-bit image hash against all past database submissions.
2. **Before vs After Image Identity Check**: Detects if a worker uploaded the exact same photo twice.
3. **Temporal Consistency**: Verifies clearance duration is $\ge 30$ seconds and timestamps are sequential.
4. **GPS Distance Geofencing**: Computes Haversine distance between worker upload coordinates and reported garbage point. Flags if $> 600$ meters away.
5. Returns `VALID_EVIDENCE` or `SUSPICIOUS_EVIDENCE`.

### 3.6 Route Optimization Engine (`app/ai/route_optimizer.py`)
- Formulates collection as a Traveling Salesperson Problem with Priority Weight Constraints.
- Start Point: Central Municipal Sanitation Depot
- End Point: Integrated Waste Processing Facility (Landfill/MRF)
- Solves stop sequence prioritizing CRITICAL and HIGH points first using a road-tortuosity-adjusted (1.35×) Haversine distance matrix.

### 3.7 Data-Grounded AI Civic Assistant (`app/ai/civic_assistant.py`)
- Directly runs live SQL queries on reports, tasks, hotspots, and feedback tables.
- Formulates factual natural language answers citing actual numbers and percentages.
- Returns *"Insufficient data."* whenever the queried criteria is absent. Zero hallucination.

---

## 4. Database Schema

The database utilizes 11 relational entities with foreign keys and indexes:
- `users`: User accounts with role-based access (`citizen`, `worker`, `supervisor`, `admin`).
- `reports`: Citizen complaints with AI category, severity, priority score, and status.
- `waste_detections`: Fine-grained bounding box coordinates, detected categories, and confidence.
- `collection_tasks`: Operational tasks assigned to workers.
- `collection_evidence`: Before/After photo URLs, waste scores, clearance %, anti-fraud hashes, and supervisor override fields.
- `citizen_feedback`: Post-collection verification responses (`YES`, `NO`, `PARTIALLY`) and mismatch flags.
- `escalations`: Multi-tier escalation tracker with failure count and audit timeline.
- `hotspots`: Geoclustered recurring waste black-spots with root-cause hypotheses and recommendations.
- `hotspot_predictions`: 24-hour predictive risk forecasts.
- `collection_demands`: Time-slot demand volume and worker requirements.
- `notifications`: In-app alert dispatch records.
- `audit_logs`: Immutable tracking of who, what, when, and IP address.
