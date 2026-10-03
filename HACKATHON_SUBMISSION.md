# SwachhAI: Hackathon Submission Write-Up

## Track
Primary Track: Waste Collection & Segregation  
Secondary Track: Street Action  

---

### Problem
In Indian municipalities, urban solid waste management is hindered by a breakdown in verification, source segregation non-compliance, and reactive deployment. While citizens frequently file complaints on municipal portals, urban local bodies (ULBs) struggle to verify whether waste was actually cleared or merely swept into adjacent drains. Furthermore, mixed wet and dry dumping contaminates recyclables, and recurring black-spots are addressed only after chronic public outrage.

### Why It Matters
Unsegregated solid waste dumped in public corridors leads to severe urban flooding during monsoons, foul odor, disease vector propagation (dengue, malaria), and significant municipal expenditure on unverified contractor billing. Bridging the gap between citizen reporting and physical collection accountability is essential for Swachh Bharat Mission (Urban) targets.

### Solution
**SwachhAI** is a working, software-first civic-tech MVP that connects citizen reporting, source-segregation education, worker verification, and municipal hotspot intelligence into an automated, auditable loop:
1. **Multilingual Citizen Reporting**: Citizens upload photos in English, Tamil, or Hindi.
2. **AI Waste & Segregation Classification**: Evaluates multi-stream composition (wet vs dry) and provides immediate civic disposal recommendations.
3. **Transparent Priority Scoring**: Scores complaints (0–100) using visual severity, duration elapsed, repeat report density, and public facility proximity.
4. **Before/After AI Collection Verification**: Compares pre- and post-collection photos to calculate relative waste reduction, requiring physical proof of clearance before task completion.
5. **Anti-Fraud Evidence Validation**: Analyzes image perceptual hashes, duplicate uploads, and GPS geofences to identify suspicious submissions.
6. **Hotspot & Demand Intelligence**: Clusters recurring black-spots, hypothesizes contextual root causes (e.g. morning market unloading), and forecasts next 24-hour collection demand.

### AI Innovation
Rather than relying on closed third-party APIs or ungrounded generative models, SwachhAI implements a lightweight computer-vision pipeline combining HSV color segmentation, texture entropy, and contour analysis with anti-fraud image hashing. Its AI verification engine computes structural waste presence differentials before and after clearance. For municipal governance, the AI Civic Assistant queries live database records directly, eliminating hallucinations and grounding responses in actual complaint figures.

### Technical Architecture
- **Frontend**: Responsive React 18, Vite, Tailwind CSS, Leaflet/OSM GIS mapping, Recharts analytics.
- **Backend**: FastAPI (Python 3.12), SQLAlchemy ORM, Pydantic data validation.
- **Database**: SQLite for zero-configuration hackathon evaluation (PostgreSQL-ready schema).
- **Deployment**: Multi-stage Docker containerization.

### Impact & Feasibility
SwachhAI operates entirely on existing smartphone cameras and standard cloud servers without requiring expensive IoT sensors on every street bin. By offering transparent priority explanations and multi-tier failure escalations, it provides supervisors with actionable operational oversight.

### Future Scalability
Future iterations can incorporate edge-optimized YOLOv8-nano models on worker handhelds, direct integration with Swachhata 2.0 government APIs, and automated route sync with vehicle GPS telematics units.
