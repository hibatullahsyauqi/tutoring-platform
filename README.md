# Pedagogical OS — STEM Tutoring Platform

A multi-curriculum, syllabus-aligned pedagogical operating system designed for secondary and pre-university STEM educators. Engineered to replace administrative overhead and vanity metrics with genuine conceptual continuity, dynamic mastery tracking, and automated contract financial intelligence.

---

## 🏛️ Core Architectural Pillars

### 1. Conceptual Continuity over Vanity Ratings
Generic tutoring software relies on subjective 1–5 self-ratings (e.g. *"Rate your explanation clarity"*), introducing epistemic bias. This platform eliminates vanity scales in favor of **actionable pedagogical continuity**:
* **Tri-State Conceptual Grasp:** Every syllabus point is evaluated through three functional states:
  * 🔴 **Struggling:** Core mental model has not clicked. Dynamically triggers a targeted 2-minute diagnostic warm-up for the next session.
  * 🟡 **Developing:** Theoretical logic is understood, but execution slips (e.g. arithmetic, sign errors). Generates interleaved fluency drill targets.
  * 🟢 **Mastered:** Solves autonomously with zero hesitation. Transforms the continuity bridge into an advanced exam twist or syllabus advancement target.
* **5-Second Pre-Session Briefing:** The tutor is greeted with immediate operational takeaways before opening the virtual classroom: unexcused struggles to revisit, homework to audit, and the next strategic concept.

### 2. Universal Multi-Curriculum Differentiation
Educational systems universally track students by developmental pace and post-secondary intent. The platform dynamically models exam specifications across major international and national bodies without rigid hardcoding:
* **Cambridge (CAIE):** Extended Tier (Papers 2 & 4 targeting $A^*$) vs. Core Tier (Papers 1 & 3) [1], plus Additional Mathematics (0606) and A-Level Physics/Maths (9702/9709).
* **Pearson Edexcel:** Higher Tier (Grades 4–9) vs. Foundation Tier (Grades 1–5), plus International A-Level modular units.
* **International Baccalaureate (IB):** MYP (Standard vs. Extended) and DP (Higher Level 240 hrs vs. Standard Level 150 hrs).
* **College Board:** Digital SAT Mathematics.
* **National Curricula:** Primary, Junior, and Senior High tracks (e.g. Kurikulum Merdeka / K-13).

### 3. Contract-Compliant Financial Intelligence
Teaching contracts often carry complex piecewise rate structures, statutory withholding, and strict punctuality clauses. The platform features an automated financial engine:
* Computes gross earnings based on qualification tiers and session formats (Primary 60m, Lower Secondary 90m, IGCSE 90m, A-Level/IBDP/SAT 90m, and Trial classes).
* Enforces statutory **2.5% PPh tax withholding** automatically.
* Models unexcused lateness and absence penalties in 15-minute intervals.
* Forecasts net monthly disbursement reconciled for the standard 20th-of-the-month payroll cycle.

### 4. Zero-Friction Operational Presence Bridge
To eliminate double data-entry between the platform and agency management spreadsheets:
* Automatically derives deterministic chronological session counts (`Meeting 1`, `Meeting 2`, ...) without race conditions or fragile database sequences.
* Generates tab-separated clipboard payloads (`\t`) matching strict third-party data validation rules (exact string matching across `Date`, `Class Session`, `Type`, `Grade`, `Subject`, `Place`, and `Notes`).
* Single-click horizontal paste into Google Sheets in under 1 second with zero validation rejections.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Runtime & Package Manager** | [Bun](https://bun.sh/) (v1.4+) | High-performance execution, zero-transpilation TypeScript, rapid installs |
| **Frontend & API** | [Next.js](https://nextjs.org/) (App Router, Turbopack) | Hybrid React Server Components (RSC) and Server Actions |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | End-to-end type safety and strict schema alignment |
| **Database ORM** | [Prisma](https://www.prisma.io/) (v6.19+) | Relational modeling, migrations, and type generation |
| **Database** | [Supabase](https://supabase.com/) (PostgreSQL) | Hosted PostgreSQL instance with connection pooling |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) | Accessible, responsive, and minimalist typography |

---

## 🗄️ Database Architecture

The relational schema coordinates the full pedagogical lifecycle:

```
Tutor (1) ──────────< Student (N) ──────────< Enrollment (N) >────────── Course (1) >── ExamBoard (1)
                        │                                                   │
                        │                                                   └──< SyllabusTopic (N)
                        │                                                              │
                        └──< Session (N) ──────────────────────────< SessionSegment (N)┘
                                │                                           (Tool & Mastery Status)
                                └─── SessionReflection (1)
```

* **`tutors`:** Multi-tenant ready anchor preserving independent tutor ownership.
* **`students` & `enrollments`:** Fluid tier assignment, target exam deadlines, and curriculum specification.
* **`courses` & `syllabus_topics`:** Granular syllabus points supporting natural numerical sorting (`1.1`, `1.2`, ..., `1.10`, `1.11`).
* **`sessions` & `session_segments`:** Multi-block lesson modeling (duration, Socratic/drill activities, tool integration, and mastery status).
* **`session_reflections`:** Qualitative diagnostic continuity records (struggles, breakthroughs, homework, and next session targets).

---

## 🚀 Local Development Setup

### Prerequisites
* Linux / macOS / WSL
* [Bun](https://bun.sh/) installed: `curl -fsSL https://bun.sh/install | bash`

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/hibatullahsyauqi/tutoring-platform.git
   cd tutoring-platform
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the project root:
   ```env
   # Pooled connection (Transaction mode, port 6543)
   DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

   # Direct connection (Session mode, port 5432)
   DIRECT_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
   ```

4. **Synchronize Database Schema:**
   ```bash
   bunx prisma db push
   ```

5. **Seed Verified Curricula & Tools:**
   ```bash
   bunx prisma db seed
   ```

6. **Start the Development Server:**
   ```bash
   bun run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔒 License & Intellectual Property

Proprietary Software. All Rights Reserved.  
Unauthorized copying, modification, distribution, or commercial use of this codebase is strictly prohibited without explicit written permission from the author.