# SwachhAI: 3-Minute Live Hackathon Demo Script

This script provides a structured, high-impact demonstration flow for judges and evaluators.

---

## ⏱ Minute 0:00 – 0:45 | The Problem & Citizen Reporting

1. **Open Landing Page (`http://localhost:5173`)**:
   - Point out the **SwachhAI Operational Score** (82.5/100) and the live telemetry banner.
   - Explain the core issue: *"In Indian cities, waste reports are logged, but verification is broken, leading to unsegregated dumps, ghost clearances, and chronic repeat black-spots."*
2. **Click "1. File Complaint" (or Navigate to Report Waste)**:
   - Select Language: Toggle to **தமிழ் (Tamil)** or **हिन्दी (Hindi)** to show true multilingual support for Indian citizens.
   - Click the test button: `+ Mixed Pile` (simulates photo upload).
   - Select landmark: `M.G. Market North Gate`.
   - Click **"Submit Garbage Complaint"**.
3. **Inspect Real-Time AI Output**:
   - Highlight the instant feedback modal:
     - **AI-Detected Waste**: `Mixed Waste` (88% confidence) with bounding boxes for plastic bottles and food waste.
     - **Segregation Status**: `IMPROPER` with clear recommendation: *"Separate wet food waste into green bin and dry recyclables into blue bin."*
     - **Collection Priority**: `HIGH (75.0/100)` with transparent reasons (*5 reports in 48h, high visual severity, repeat hotspot near Market Road*).

---

## ⏱ Minute 0:45 – 1:45 | Worker Execution & AI Verification

1. **Switch to Worker Persona**:
   - In the top bar, switch persona to **Sanitation Worker** (or click `3. Worker Tasks` in the Demo Guide).
   - Select the assigned task for `M.G. Market North Gate`.
2. **Arrive on Site**:
   - Click **"Mark Crew Arrived on Site"** (updates status to In-Progress).
3. **Upload Evidence**:
   - Click `+ Simulate Before Photo` &rarr; shows original cluttered site with high debris presence score (0.91).
   - Click `✓ Clean Site (Pass)` &rarr; loads swept pavement after photo.
   - Click **"Submit for AI Verification"**.
4. **Inspect Automated Verification & Anti-Fraud Checks**:
   - Show the result badge:
     - **AI-ASSISTED VERIFICATION: VERIFIED**
     - Waste Presence Score: `0.91 → 0.12` (86.8% reduction).
     - **Validation Status**: `VALID_EVIDENCE` (Passed GPS proximity check <20m and anti-duplicate perceptual hash check).
5. **Demonstrate Failure & Fraud Detection**:
   - Click `✗ Dirty Site (Fail)` or `⚠ Duplicate Photo (Fraud Test)`.
   - Show how the AI flags `NOT CLEARED` or `SUSPICIOUS_EVIDENCE`, automatically creating an entry in the **Automatic Escalation Timeline**.

---

## ⏱ Minute 1:45 – 2:30 | Citizen Feedback Mismatch & Hotspot Intelligence

1. **Citizen Verification Check (Accountability)**:
   - Switch to **Citizen** persona & open **Track Reports**.
   - Select the verified report.
   - Under *"Was the garbage actually cleared?"*, click **"No, Still Present"** and enter: *"Perimeter plastic blown into drain."*
   - Submit feedback &rarr; status updates to **MANUAL REVIEW REQUIRED** and dispatches a supervisor alert.
2. **Open Hotspot Intelligence Page**:
   - Show the 5 clustered recurring hotspots.
   - Highlight the **AI Hypothesis**:
     > *"AI HYPOTHESIS: High volume of daily commercial food and vegetable vendor unloading without on-site composting infrastructure is driving rapid organic decomposition and repeat morning pile-ups."*
   - Show the **24-Hour Predictive Risk Forecast** and **Tomorrow's Collection Demand Forecast** (07:00–10:00 High Demand, 6 workers needed).

---

## ⏱ Minute 2:30 – 3:00 | Route Planner & Grounded AI Civic Assistant

1. **Open Route Planner**:
   - Show the TSP priority-weighted collection path from **Central Depot** through high-priority stops to the **Processing Facility**.
   - Show total route distance (37.4 km) and estimated duration (160 mins).
2. **Launch AI Civic Assistant (The Climax)**:
   - Click the **"AI Assistant"** button in the navbar.
   - Click the prompt chip: *"Which area has the most repeated complaints?"*
   - Show the grounded answer citing live database figures:
     > *"Zone 1 - Central Market has registered the highest volume of complaints with 9 reports (27.3% of all city complaints)..."*
   - Click *"Where did collection fail most often?"* &rarr; shows verified failure telemetry.
3. **Closing Statement**:
   - *"SwachhAI delivers a closed-loop, fraud-resistant, AI-verified municipal intelligence system designed for real Indian streets."*
