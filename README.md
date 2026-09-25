# BeaErgon - Calendar & Kanban Workspace

[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel&logoColor=white)](https://vercel.com/)

A modern, high-performance split-screen productivity suite integrating an **Interactive Monthly Calendar** and an **Agile Kanban Board** (50% / 50% split) with direct cloud persistence powered by **Supabase (PostgreSQL)** and hosted on **Vercel**.

Designed specifically for operational workflows, accounting management, deadlines, and meeting schedules.

---

## 🚀 Key Features

### 📅 Left Pane: Interactive Monthly Calendar
- **Full Navigation**: Smooth transitions between months, quick month dropdown jump, year selector, and one-click "Today" reset.
- **Smart Day Grid**: Identifies current days, today's highlight, and seamlessly visualizes meetings and tasks scheduled for each day.
- **Meeting & Task Agenda Modal**:
  - Click any day to view or schedule tasks and meetings.
  - Categorization: *Meeting, Task, Reminder, Urgent, Idea*.
  - Time allocation (`HH:mm`), client/company linkage, and checklist toggle.
  - Quick note search bar with instantaneous filtering.
- **12-Month Recurring Events**: Set recurring monthly tasks (e.g., tax submissions, payroll) that automatically propagate for the next 12 months.
- **Bi-directional Kanban Sync**: Any demand or meeting scheduled in the calendar automatically appears in the Kanban board under "To Do".

---

### 📋 Right Pane: 4-Column Kanban Board
1. **To Do** (*Navy Blue*)
2. **In Progress** (*Amber / Yellow*)
3. **Done** (*Emerald Green*)
4. **Delayed** (*Rose / Red*)

- **Native HTML5 Drag & Drop**: Effortlessly drag cards between columns with live visual feedback.
- **SLA & Deadline Tracking**: Define strict deadlines and target times. Overdue tasks are automatically identified and flagged with one-click escalation to the "Delayed" column.
- **Time Auditing & Cycle Metrics**: Tracks cumulative time spent in each stage (*To Do, In Progress, Delayed*) with detailed transitions history.
- **Client & Company Management**: Filter and assign tasks to specific clients or accounting entities with on-the-fly company creation.
- **Filters & Search**: Fast multi-attribute filtering by title, description, client, priority (*Low, Medium, High, Urgent*), and custom tags.

---

### 🎨 Custom Color Bands (Kanban & Calendar)
- **Visual Color Picker**: Choose from curated corporate color swatches (*Ergon Navy, Emerald, Amber, Violet, Rose, Sky Blue, Indigo, Slate*) or pick any custom hex color.
- **Unified Visual Identity**: Selected color bands are rendered as top stripes and left accent borders on Kanban cards, as well as colored event badges inside the calendar cells.

---

### ☁️ Cloud Persistence (Supabase + Vercel)
- **Serverless Architecture**: Direct, secure communication between the Vite frontend and Supabase's managed PostgreSQL database.
- **Zero Idle Sleep**: Instant response times without cold starts or sleeping free-tier servers.
- **Automatic Fallback**: Graceful local fallback ensuring offline resilience.

---

## 🛠️ Tech Stack

- **Frontend Core**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Tooling**: [Vite](https://vitejs.dev/) with [OxLint](https://oxc.rs/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) + `@tailwindcss/vite`
- **Icons**: [Lucide React](https://lucide.dev/)
- **Cloud Database**: [Supabase](https://supabase.com/) (PostgreSQL with Row Level Security)
- **Hosting & CI/CD**: [Vercel](https://vercel.com/)

---

## 📦 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)

### 1. Clone the repository
```bash
git clone https://github.com/miguelGoncalvss/beaErgonCalendarioKanban.git
cd beaErgonCalendarioKanban
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Setup Database Schema
In your Supabase project, navigate to the **SQL Editor**, paste the contents of [`supabase-setup.sql`](./supabase-setup.sql), and click **Run**. This will create the `tasks`, `day_notes`, and `companies` tables with all necessary indexes and RLS policies.

### 5. Start Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## 🚀 Production Build

To build the optimized static bundle:
```bash
npm run build
```
To preview the production build locally:
```bash
npm run preview
```

---

## 🌐 Deploying to Vercel

1. Push your code to your GitHub repository.
2. Sign in to [Vercel](https://vercel.com) and import the repository.
3. In the project setup screen, add your Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Click **Deploy**. Your application will be live in under a minute with continuous integration.

---

## 📄 License
This project is proprietary and intended for internal team operations.
