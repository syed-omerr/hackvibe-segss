# HackVibe 2.0 — Hackathon Registration & Segregation Portal

A modern, high-performance web portal built for HackVibe 2.0 to centralize team registrations, track live event attendance, and generate the complete, fully segregated 12-sheet Excel workbook on demand.

---

## 🌟 Key Features

1. **Secure Organizer Authentication**:
   - Protected routes guarded with signed HttpOnly SameSite session cookies (`jose` JWT).
   - Configurable organizer passcode (default: `hackvibe2026`) with in-memory brute-force rate limiting.

2. **Dynamic Team Registration Form**:
   - Team meta: Team Name, Track, and optional Registration ID override (default auto-generates atomic `HV2-2026-OCT-NNNN`).
   - Dynamic 1–3 participants per team with Leader designation.
   - Searchable College Combobox featuring the canonical host institution (`Vignan Institute of Technology and Science`) and free entry confirmation.
   - Quick-fill toggle: copies Leader's College, Branch, and Year to all members.
   - Real-time duplicate phone warnings and duplicate ID prevention.

3. **Registry & 1-Tap Live Attendance**:
   - Real-time search across Team Name, Member Name, Phone, Reg ID, and College.
   - Multi-filtering by Track (`AI`, `CS`, `IOT`, `NA`), Highest Year (`1ST`, `2ND`, `3RD`, `4TH`), College (`VIGNAN`, `OTHERS`), and Attendance.
   - Segregation badges (`Mixed-Year`, `Mixed-College`).
   - 1-tap Attendance status toggles per member (`UNMARKED` / `PRESENT` / `ABSENT`).
   - Soft-delete and instantaneous restore with optimistic locking (`version`).

4. **Automated 12-Sheet ExcelJS Generator**:
   Generates the exact workbook structure matching `Hackathon Registration Details.xlsx` on demand:
   - `Team Wise`: Vertically merged cells (`S.No`, `ID`, `Team Name`, `Track`, and `College`/`Branch`/`Year` where identical), alternating team shading, yellow Attendance column with `Present,Absent` data validation dropdown.
   - `Team Evaluation`: Dynamic formulas for `Members` (`COUNTA`), `Members Present` (`COUNTIF`), `Total` (`SUM`), `Percentage`, and `Rank in Track` (`COUNTIFS`).
   - `AI`, `CS`, `IOT`, `NA`: Segregated by competition track.
   - `1ST`, `2ND`, `3RD`, `4TH`: Segregated by highest year of study in team (`1st < 2nd < 3rd < 4th / PG`).
   - `VIGNAN`, `OTHERS`: Segregated by team Leader's institution (canonical match with `Vignan Institute of Technology and Science`).
   - Filename format: `HackVibe_Registration_Details_YYYYMMDD_HHmm.xlsx` (IST).

5. **Initial Data Import & Seeding**:
   - Built-in dry-run analyzer for `.xlsx` uploads.
   - 1-click seeder from local `Hackathon Registration Details.xlsx` to populate the baseline 214 teams and 639 members.

6. **Audit Trail**:
   - Persistent activity stream recording `CREATE`, `UPDATE`, `DELETE`, `RESTORE`, `ATTENDANCE`, `IMPORT`, and `EXPORT` events.

---

## 🛠 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack) & React 19
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS with custom glassmorphic dark theme
- **Excel Generation & Parsing**: [ExcelJS](https://github.com/exceljs/exceljs)
- **Database**: SQLite (`node:sqlite` built-in, zero external C++ build issues)
- **Validation**: [Zod](https://zod.dev/)
- **Auth**: [jose](https://github.com/panva/jose) (JWT) & [bcryptjs](https://github.com/dcodeIO/bcrypt.js)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🚀 Getting Started

### Prerequisites

- Node.js `v22+` or `v26+`
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/syed-omerr/hackvibe-segss.git
cd hackvibe-segss

# Install dependencies
npm install

# Start local dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

- Default Organizer Passcode: `hackvibe2026`

### Seeding Baseline Data

1. Log in to the portal at `/login`.
2. Go to **Import Data** (`/admin/import`).
3. Click **Dry-Run Baseline File (214 Teams)**.
4. Click **Commit Teams to Database**.
5. View the dashboard to confirm all 214 teams and 639 members are live with 100% balanced invariants!

---

## 📐 Segregation Invariants

The portal continuously verifies that:
1. `AI + CS + IOT + NA = Total Teams`
2. `1ST + 2ND + 3RD + 4TH = Total Teams`
3. `VIGNAN + OTHERS = Total Teams`

---

## 📄 License

Internal tool for HackVibe 2.0 Organizing Committee.
