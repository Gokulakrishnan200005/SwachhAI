# SwachhAI: API Documentation

Base URL: `http://localhost:8000/api`
Interactive Swagger Docs: `http://localhost:8000/docs`

---

## 1. Authentication (`/auth`)

### `POST /auth/register`
Creates a user account.
- **Request Body**:
  ```json
  {
    "email": "user@swachhai.org",
    "password": "securepassword",
    "full_name": "Full Name",
    "role": "citizen", // "citizen", "worker", "supervisor", "admin"
    "phone": "+91 98401 22345",
    "zone": "Zone 1 - Central Market"
  }
  ```
- **Response**: JWT token and user profile object.

### `POST /auth/login`
Authenticates a user.
- **Request Body**: `{ "email": "admin@swachhai.org", "password": "admin123" }`
- **Response**: `{ "access_token": "...", "token_type": "bearer", "user": { ... } }`

### `GET /auth/me`
Returns the currently authenticated user profile based on Bearer token.

---

## 2. Reports (`/reports`)

### `POST /reports/`
Submits a citizen garbage complaint and runs the real-time AI CV pipeline, segregation analyzer, and priority scoring engine.
- **Content-Type**: `multipart/form-data`
- **Fields**:
  - `title` (string)
  - `description` (string)
  - `location_lat` (float)
  - `location_lng` (float)
  - `address` (string)
  - `zone` (string)
  - `language` (string: "en", "ta", "hi")
  - `waste_category_claimed` (string)
  - `citizen_name` (string, optional)
  - `citizen_contact` (string, optional)
  - `image` (binary file: .jpg, .png, .webp)
- **Response**:
  ```json
  {
    "report_id": 34,
    "report_code": "SWA-2026-034",
    "status": "REPORTED",
    "ai_detected_category": "Mixed Waste",
    "confidence": 0.88,
    "severity": "HIGH",
    "priority_score": 75.0,
    "priority_level": "HIGH",
    "priority_reason": "HIGH PRIORITY because: ...",
    "segregation_status": "IMPROPER",
    "segregation_recommendation": "Separate wet food waste into green bin...",
    "model_uncertainty": false,
    "detected_objects": [...],
    "bounding_boxes": [...]
  }
  ```

### `GET /reports/`
Lists complaints with optional filters.
- **Query Params**: `zone`, `status`, `priority`, `severity`, `category`, `limit`.

### `GET /reports/{report_id}`
Returns complete complaint diagnostics including detection details, worker task status, evidence photos, and citizen feedback.

### `POST /reports/{report_id}/feedback`
Citizen post-collection verification feedback.
- **Fields**: `was_cleared` ("YES", "NO", "PARTIALLY"), `rating` (1–5), `comment`.
- **Note**: If `was_cleared == "NO"` on a `VERIFIED` report, automatically triggers a `FEEDBACK_MISMATCH` alert and updates status to `MANUAL_REVIEW`.

---

## 3. Tasks & Evidence Verification (`/tasks`)

### `GET /tasks/`
Lists collection tasks.
- **Query Params**: `worker_id`, `status`, `priority`.

### `GET /tasks/{task_id}`
Returns task detail, before/after evidence photos, verification scores, and escalation history.

### `POST /tasks/{task_id}/start`
Marks crew as arrived on site. Updates task status to `ARRIVED`.

### `POST /tasks/{task_id}/upload-before`
Uploads Before Collection photographic evidence.
- **Content-Type**: `multipart/form-data`
- **Fields**: `image`, `worker_lat`, `worker_lng`.

### `POST /tasks/{task_id}/submit-verification`
Uploads After Collection photographic evidence and executes automated AI verification and anti-fraud validation.
- **Content-Type**: `multipart/form-data`
- **Fields**: `image`, `worker_lat`, `worker_lng`.
- **Response**:
  ```json
  {
    "status": "success",
    "verification_result": "VERIFIED", // "VERIFIED", "PARTIALLY_CLEARED", "NOT_CLEARED", "MANUAL_REVIEW"
    "before_waste_score": 0.89,
    "after_waste_score": 0.12,
    "clearance_percentage": 86.5,
    "ai_confidence": 0.92,
    "verification_label": "AI-ASSISTED VERIFICATION",
    "validation_status": "VALID_EVIDENCE",
    "validation_reasons": ["Passed GPS proximity check", "Passed visual hash check"]
  }
  ```

### `POST /tasks/{task_id}/override`
Supervisor manual override for disputed verifications.
- **Fields**: `override_result` ("VERIFIED", "NOT_CLEARED"), `notes`.

### `POST /tasks/optimize-route`
Runs TSP priority-weighted collection truck route planner.
- **Query Params**: `zone` (optional).
- **Response**:
  ```json
  {
    "total_distance_km": 37.4,
    "estimated_time_minutes": 160,
    "stops_count": 4,
    "stops": [
      { "stop_number": 0, "name": "Central Municipal Sanitation Depot", "type": "DEPOT", "lat": 13.0827, "lng": 80.2707 },
      { "stop_number": 1, "task_code": "TSK-001", "type": "COLLECTION_STOP", "priority_level": "CRITICAL", ... },
      ...
      { "stop_number": 5, "name": "Kodungaiyur Processing Facility", "type": "PROCESSING_CENTER" }
    ]
  }
  ```

---

## 4. Hotspots & Predictions (`/hotspots`)

### `GET /hotspots/`
Lists recurring waste hotspots with cluster metrics, dominant waste types, root-cause AI Hypotheses, and recommended actions.

### `GET /hotspots/predictions`
Returns next 24-hour predictive risk forecasts. Labeled: *"Demo prediction based on simulated historical data"*.

### `GET /hotspots/demand`
Returns time-slot collection demand predictions (07:00–10:00, 10:00–14:00, 14:00–18:00) with required staff count.

---

## 5. Analytics & Dashboard (`/analytics`)

### `GET /analytics/dashboard`
Returns:
- **KPI Summary**: Total reports, open reports, high priority, verified, failed, hotspots, response time, segregation violations.
- **SwachhAI Operational Score**: Zonal and city-wide scores (0–100).
- **Waste Stream Distribution**: Breakdown percentages for charts.
- **Daily Inflow vs Clearance Velocity**: 7-day trend series.
- **Zone Performance Table**: Total, verified, failed, and compliance percentages.

---

## 6. AI Civic Assistant (`/assistant`)

### `POST /assistant/chat`
Answers operational questions using live database queries.
- **Request Body**: `{ "question": "Which area has the most repeated complaints?" }`
- **Response**:
  ```json
  {
    "question": "Which area has the most repeated complaints?",
    "answer": "**Zone 1 - Central Market** has registered the highest volume of complaints with **9 reports**...",
    "grounding_source": "Live query on 33 municipal reports",
    "metrics": { ... }
  }
  ```

---

## 7. Demo Management (`/demo`)

### `POST /demo/load`
Re-initializes the database with 32 realistic reports, 10 locations, 10 tasks, 5 hotspots, escalations, and predictive demand forecasts.
