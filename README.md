## Features

- Fetches patient data from a **paginated API**.
- Handles **rate limiting (429)** and **intermittent server errors (500/503)** with retries and exponential backoff.
- Calculates **total risk scores** based on:
  - Blood Pressure (Normal, Elevated, Stage 1, Stage 2)
  - Temperature (Normal, Low Fever, High Fever)
  - Age (Under 40, 40–65, Over 65)
- Generates **alert lists**:
  - `high_risk_patients` → Total risk score ≥ 4
  - `fever_patients` → Temperature ≥ 99.6°F
  - `data_quality_issues` → Missing or invalid patient data
- Includes a **1-second delay** between API requests to prevent rate-limiting issues.

---

## Getting Started

### Prerequisites

- Node.js (v16+ recommended)
- npm

### Installation

```bash
git clone <repository_url>
cd patient-alert-processor
npm install
