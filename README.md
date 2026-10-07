# SmartERP

![MERN](https://img.shields.io/badge/stack-MERN-087bb5) ![Demo](https://img.shields.io/badge/status-live_demo-259f7a)

**[Open the live demo](https://smarterp-y59t.onrender.com/) · React · Express · MongoDB · Node.js**

A modern student and teacher college workspace built with MongoDB, Express, React and Node. This is an independent application, not an integration with or copy of a university ERP. Screenshots use fictional demo records.

## Quick start: local demo without installing MongoDB

Requires Node.js 22.12+ and npm. From the repository root:

```sh
npm ci
npm run demo
```

Open http://localhost:5173. The demo downloads a disposable MongoDB binary on first run; allow network access. It uses an in-memory database and resets whenever restarted. Use demo data only.

| Role    | Email                 | Password         |
| ------- | --------------------- | ---------------- |
| Student | student@smarterp.demo | SmartERPdemo123! |
| Teacher | teacher@smarterp.demo | SmartERPdemo123! |

Local demo teacher registration code: `DEMO-FACULTY-2026`. These credentials are fixtures, not real accounts. Never seed them into a production database.

## Persistent development setup

1. Start MongoDB locally or use your own MongoDB Atlas connection.
2. `npm ci`
3. Copy `server/.env.example` to `server/.env`.
4. Set `MONGODB_URI`, a randomly generated `JWT_SECRET` of at least 32 characters, and a private `TEACHER_INVITE_CODE`. Do not share or commit the real `.env`.
5. `npm run seed` optionally inserts fictional sample users and records. Use only on a development database.
6. `npm run dev`
7. Open http://localhost:5173. API runs on http://localhost:4000.

Teachers can create courses, enroll a registered student by email, enter attendance totals and grade points, publish assignments, upload briefs, download submissions and add grades/feedback. Students see only enrolled courses and their own submissions.

## ✨ Features in this version

- Student and teacher signup/sign-in. JWT session in HttpOnly cookies, bcrypt password hashes, restricted faculty invite code, rate limiting, origin checks and course-level permissions.
- Responsive student and teacher dashboards. Light and dark themes saved to the browser.
- Teacher assignment publishing with optional brief, PDF/TXT/DOCX upload up to 10 MB. Authenticated file download.
- Student submission and replacement until the deadline. Replacement clears previous feedback and grade. Late submissions are blocked.
- Faculty submission review, scores out of 100 and feedback.
- Deadline alerts inside the dashboard and assignment list. Overdue and submitted states.
- Attendance entry by teacher and student calculator. Advice uses **at least 75%**, not strictly greater than 75%. `floor(attended / 0.75 - total)` is the safe number of future missed classes; the recovery count assumes consecutive attendance.
- Credit-weighted CGPA from published grade points on a 0-10 scale. Confirm your university's grading rules before using this as an official transcript. Only graded courses count; multi-semester transcript management is not yet included.
- Campus notices.
- Local Hindi/English copilot intents for profile, roll/enrollment, attendance, grades/CGPA, fees and pending assignments. Unknown personal questions fall back clearly. Optional Groq general-question AI is restricted to the private workspace; stored profile and academic records are not sent to Groq. Only the question and a fixed generic prompt are sent. Keep general questions free of private details.
- Web app manifest and mobile app-style layout. **No service worker, offline authenticated data, push notifications or background alerts yet.**

## 📁 Project layout

```text
client/
  src/App.jsx           student and faculty UI, forms, theme
  src/style.css         responsive UI styling + Tailwind
  src/main.jsx          React entrypoint
  public/               app manifest and icon
  verify.mjs            browser smoke test
server/
  src/app.js            Express API, auth, permissions, file routes
  src/models.js         MongoDB models
  src/math.js           attendance and CGPA calculations
  src/index.js          persistent API entrypoint
  src/seed.js            development-only fixtures
  src/demo.js            disposable demo API
  tests/                API integration + calculation tests
  uploads/              private local file storage
screenshots/            inspected desktop and mobile captures
```

## ✅ Test and build

```sh
npm test
npm run build
npm audit
```

API integration tests run against disposable MongoDB. Browser smoke test, with `npm run demo` already running in a separate terminal:

```sh
npx playwright install chromium
node client/verify.mjs
```

Run browser test against a fresh demo instance; it changes demo records and captures screenshots. It checks student login, each page at mobile/desktop widths, horizontal overflow, theme, assistant, submission upload, teacher login, assignment creation and grading.

## API

All authenticated routes use the session cookie. Vite proxies `/api` in development.

- `POST /api/auth/register`, `/login`, `/logout`; `GET /api/auth/me`
- `GET/POST /api/courses`
- `POST /api/courses/:id/enroll`; `GET /api/courses/:id/students`
- `GET /api/assignments`; `POST /api/assignments?course=<id>` (multipart)
- `POST /api/assignments/:id/submit` (multipart)
- `GET /api/assignments/:id/submissions`, `/download`
- `GET /api/submissions/:id/download`; `PUT /api/submissions/:id/grade`
- `GET /api/attendance`; `PUT /api/courses/:id/attendance`
- `GET /api/results`; `PUT /api/courses/:id/result`
- `GET/POST /api/notices`; `POST /api/assistant`
- `GET /api/health`

## Deployment and remaining work

This source is runnable locally; it is not a deployed university production system. Build the frontend with `npm run build`, serve `client/dist` through your HTTPS web server, and proxy `/api` to the backend on the same origin. Start the backend with `npm run start -w server`. Set `NODE_ENV=production`, `CLIENT_ORIGIN` to the frontend HTTPS origin, and your private environment variables. Cookies require HTTPS in production. Use a persistent upload volume and back it up with the database. Configure trusted proxy handling/rate limits for your actual infrastructure before deployment.

Before use with real student records: security review, per-account teacher invitations or admin provisioning, email verification/password reset, audit trail, CSRF hardening for the deployment, file-content inspection and malware scanning, storage quotas, object storage, robust upload replacement transaction/concurrency handling, monitoring/backups, record correction/deletion, pagination and institution/semester separation. File allowlisting currently checks extensions, not content; downloaded files are attachments and should not be trusted. Notices are global within this single-institution app. There is no integration with an existing college database.

Next phases: scheduled/push/email alerts, semester-aware transcripts and CGPA rules, stronger PWA/offline support and production hardening. Do not add AI credentials to frontend code; keep any provider key server-side.

## Render fictional-data demo

`render.yaml` defines a free web service named SmartERP. It builds React and caches the disposable MongoDB binary, then serves both frontend and API from one origin. The public demo disables registration, generates a temporary JWT secret on startup, uses fictional seeded accounts and warns against real student data. Anyone with the demo accounts can change these shared fictional records. The database and uploaded files reset on service restart. Do not use this mode for real college records.

If deploying manually: build command `npm ci && npm run build && npm run prepare-demo`, start command `npm run demo:host`, environment `NODE_ENV=production`, `MONGOMS_DOWNLOAD_DIR=/opt/render/project/src/.cache/mongodb`. Choose the Free compute plan. Render free services may sleep after inactivity; check the host's current limits before deploying.

The latest visual theme is based on observed plain blue panels, module grid and white layout of the requested college ERP. No university branding or real account data is included.

## Campus workspace release

Clean page-based navigation with browser history and direct module paths; separate student fee subsections and library menus; day-based weekly timetable; credit-weighted grade and recorded attendance charts; fictional exam datesheet, seating and calendar-file export. Faculty can add classes and exams for their courses. Class time/course and room overlaps are rejected. Students can renew their own issued books once before the due date.

Library issue/return endpoints are admin-only; the accounts-admin UI remains fee-focused. The demo does not charge fines, send background reminders or give general AI to shared-demo accounts. Attendance and grade charts describe existing records, not invented semester trends.

### Student simulated checkout

In the public fictional demo, Fees > Pay demo fees lets the signed-in student review and settle the full outstanding balance of one of their own demo fee records. Confirmation creates a marked fictional receipt and transaction entry. No card/bank fields, real gateway or real money are involved. A stale balance or repeated checkout is rejected atomically. This endpoint is disabled outside public demo mode. Accounts-admin edit and recording permissions remain separate.

### Fictional student services, batch 1

Applications supports Certificate, Document copy, ID card and Degree requests. Hostel supports an IST departure/return range, purpose and fictional destination. Grievances supports subject/details. Students see only their own request histories. Demo admins use Requests to approve/reject document and leave requests, or review/resolve grievances, with a reviewer note. These actions never send a request to a college or issue an official document or outpass. Do not enter real personal data. All shared demo requests reset with the service.

### Fictional campus expansion, batch 2

Exam requests supports Back paper and Makeup exam applications with admin approval. Approved students can download a clearly marked fictional admit-card TXT, never valid for an exam and without invented eligibility/date/seat. Resources contains searchable example practice papers and syllabus TXT by course/session; these are authored demo samples, not real past university papers. Clubs supports join/leave; achievements are explicitly self-reported and unverified. No real college membership, exam application or document is created.

### Configured demo fee plans, batch 3

Accounts admins can configure a base fee, manual fine, manual scholarship and optional installment schedule. Net = base + fine - scholarship. Schedule amounts must total the net, and the net cannot fall below recorded payments. Students see the configured adjustments and installment balances allocated by due-date order. There are no automatic fine rules or scholarship eligibility checks; student simulated checkout still settles the full outstanding fee, while admins may record partial fictional entries. No payment gateway, real charge, card collection or official receipt is involved.

### Optional isolated private demo workspace

Set PRIVATE_MONGODB_URI only in the host's private environment to use a separate persistent Mongo database for a provisioned private student. The shared fictional demo still resets. Realm-bound sessions and separate models keep the public demo teacher/admin out of the private database. Provisioning is server-side only; public registration stays disabled. A random 24-hour single-use setup link stores only a token hash; the student sets their password directly, saved bcrypt-hashed. Do not put personal account details, setup tokens or database credentials in source. This is still a fictional-record demo, not an audited production ERP. Private in-app review by the public demo admin is intentionally unavailable. Upload storage remains ephemeral; do not upload real documents.

## General AI configuration

Set `GROQ_API_KEY` server-side to enable general questions in the isolated private workspace. The default model is `openai/gpt-oss-20b`; `GROQ_MODEL` can override it. Public shared-demo accounts cannot call Groq. Free-tier limits and timeouts show an unavailable message; local record answers remain available. No browsing, tool execution or record mutations are offered by the AI.
