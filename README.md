# SolarFlow CRM SaaS ☀️
### Production-Ready Multi-Tenant Solar Company Lead & Pipeline Management Platform

SolarFlow CRM is a modern, enterprise-grade SaaS platform purpose-built for rooftop and commercial solar installation companies to capture, qualify, survey, quote, and convert solar prospects through the complete sales pipeline.

---

## 🌟 Key Product Capabilities

- **🏢 Multi-Tenant SaaS Isolation**: Every company record (`leads`, `quotations`, `surveys`, `followups`, `users`, `sources`) is strictly isolated by `company_id`.
- **⚡ Smart Solar Lead Scoring (0–100)**: Automatically calculates Hot (80–100), Warm (50–79), and Cold (<50) scoring tiers based on monthly electricity bill, roof area, property type, and source quality.
- **📊 Interactive Operations Dashboard**:
  - 9 Top KPI cards with percentage change badges.
  - Interactive Recharts charts: Lead Trend Area chart (7D, 30D, 90D), Lead Acquisition Sources Donut, Pipeline Velocity Funnel, Revenue Forecast vs Won Contracts, and Sales Team Leaderboard.
  - Live side-widgets for Today's Follow-up Schedule, Overdue alerts, and Hot Leads.
- **📑 Full-Featured Leads CRM Table**:
  - Filter by stage, source, assigned rep, score tier, and city.
  - Search by customer name, phone, email, or sequential lead ID (`SOL-2026-XXXX`).
  - Bulk actions: Bulk assign sales representative, bulk status updates, and filtered CSV export.
- **🔍 360-Degree Lead Detail Page**:
  - Customer contact snapshot with one-click Direct Call and WhatsApp chat.
  - Detailed Solar & Energy Profile (kW array, monthly bill, units consumed, roof type/area, DISCOM provider, battery, EV charger).
  - Opportunity and win probability tracking with payback estimations.
  - Interactive chronological Activity Timeline.
  - Team Sales Notes thread.
- **🗂️ Sales Pipeline Kanban Board**:
  - Visual drag-and-drop / quick-advance stages: `New Lead` ➔ `Contacted` ➔ `Qualified` ➔ `Site Survey` ➔ `Survey Completed` ➔ `Quotation Sent` ➔ `Negotiation` ➔ `Deal Won` / `Deal Lost`.
  - Automatically logs an activity timeline entry and recalculates win probability upon stage transitions.
- **📞 Follow-Up & Touchpoint Hub**:
  - Track Call, WhatsApp, Email, Site Visit, and Meeting appointments.
  - Segmented filters for Today's Schedule, Overdue Tasks, Upcoming, and Completed.
- **📅 Solar Operations Calendar**:
  - Month, Week, and Day views displaying scheduled follow-ups and rooftop site surveys.
- **📐 Site Survey Technical Engineering Hub**:
  - Log shadow-free roof area, azimuth direction, electrical phase, sanctioned load, DISCOM meter numbers, and photos.
- **🧾 Solar Quotation Calculation Engine**:
  - Real-time automated pricing formula:
    $$\text{Final Price} = (\text{Hardware Base} + \text{Installation} + \text{Other} - \text{Discount}) + \text{GST} - \text{Subsidy}$$
  - Direct PM Surya Ghar Central Government Subsidy integration (₹30,000 for 1kW, ₹60,000 for 2kW, ₹78,000 for >=3kW).
  - Professional Printable / PDF Quotation view with company branding, BOM hardware specs, 25-year panel warranties, and payback ROI.
- **🤖 GenAI Solar Assistant Drawer**:
  - One-click AI Technical Lead Qualification.
  - Personalized WhatsApp Pitch Generator (initial outreach, survey arrival, quotation follow-up, 0% EMI incentives).
  - Proposal Executive Summaries with next best step and urgency rating.
  - Instant interactive solar rooftop sizing and electricity bill savings calculator.
- **⚡ Workflow Automation Engine**:
  - Event-driven rules: automatic sales rep assignment, WhatsApp welcome dispatch, quotation follow-up alerts.
- **👥 Role-Based Access Control (RBAC)**:
  - Super Admin, Company Admin, Sales Manager, Sales Representative, and Survey Engineer.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide React, Recharts |
| **Backend** | Python 3.14, FastAPI, SQLAlchemy 2.0, Pydantic v2, Uvicorn |
| **Database** | PostgreSQL & SQLite dual-support with automatic fallback |
| **Security** | JWT (JSON Web Tokens), Bcrypt password hashing, Multi-tenant dependency isolation |
| **Integrations** | WhatsApp Cloud API ready, Meta Lead Ads webhook ready, SMTP relay ready |

---

## 🚀 Quickstart Local Setup

### 1. Backend Setup

```bash
cd backend

# Install dependencies
python -m pip install -r requirements.txt

# Seed realistic demo data (50 leads, 10 team members, follow-ups, surveys, quotations)
python -m app.seeds.seed_data

# Run backend API server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend API Swagger documentation will be available at: `http://127.0.0.1:8000/docs`

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run frontend Vite dev server
npm run dev
```

Open `http://127.0.0.1:5173/` in your browser.

---

## 🔑 Pre-Configured Demo Accounts (True Sun Energy)

| Role | Email | Password | Access Level |
|---|---|---|---|
| **Company Admin** (Full Access) | `admin@truesunenergy.in` | `SolarAdmin123!` | Executive analytics, platform settings, team, and pipeline |
| **Sales Manager** | `manager@truesunenergy.in` | `SolarAdmin123!` | Sales pipeline, rep targets, and survey allocations |
| **Sales Representative** | `rep@truesunenergy.in` | `SolarAdmin123!` | Lead management, follow-ups, calls, and quotation generator |
| **Survey Engineer** | `engineer@truesunenergy.in` | `SolarAdmin123!` | Rooftop site surveys, electrical load checks, and survey notes |
| **Super Admin** (Platform Admin) | `superadmin@solarplatform.com` | `SolarAdmin123!` | Platform-wide tenant management |

*(You can also effortlessly switch roles at any time using the "Switch Demo Role" dropdown in the application's sidebar!)*
