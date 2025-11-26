# Duo: The Financial Harmony App

A Progressive Web App (PWA) for couples to manage shared finances with AI-powered categorization and transparent spending tracking.

## 🎯 Vision

Eliminate the "financial blindness" newlyweds face by creating a single, emotionally intelligent dashboard that merges individual and joint finances.

## 🛠 Tech Stack

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS, Shadcn UI
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **AI:** OpenAI GPT-4o-mini (Transaction categorization)
- **Banking:** Plaid API (Sandbox for MVP)
- **Deployment:** Vercel
- **Analytics:** PostHog

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase account (free tier)
- Plaid developer account (sandbox mode)
- OpenAI API key

### Installation

1. Clone the repository

```bash
git clone https://github.com/Sailesh2577/Duo-Financial-Harmony.git
cd Duo-Financial-Harmony
```

2. Install dependencies

```bash
npm install
```

3. Set up environment variables

```bash
cp .env.example .env.local
# Then fill in your actual API keys
```

4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## 📁 Project Structure

```
duo-financial-harmony/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── api/          # API routes
│   │   └── ...
│   ├── components/       # React components
│   │   └── ui/           # Shadcn UI components
│   ├── lib/              # Utility functions
│   │   └── supabase/     # Supabase clients
│   └── types/            # TypeScript type definitions
├── docs/                 # Documentation
├── scripts/              # Database seed scripts
└── public/               # Static assets
```

## 📅 Development Phases

- [x] **Phase 0:** Foundation (Nov 25 - Dec 1) - Setup & Deploy
- [ ] **Phase 1:** Auth & Household (Dec 2 - Dec 8)
- [ ] **Phase 2:** Plaid Integration (Dec 9 - Dec 15)
- [ ] **Phase 3A:** Pre-Holiday Setup (Dec 16 - Dec 23)
- [ ] **Phase 3B:** Holiday Sprint (Dec 24 - Jan 4)
- [ ] **Phase 4:** Insights & Control (Jan 6 - Jan 19)
- [ ] **Phase 5:** V1.1 Features (Jan 20 - Feb 2)
- [ ] **Phase 6:** Public Launch (Feb 3 - Feb 16)

## 🎯 Milestones

- **MVP Launch:** January 4, 2026 (Family Alpha with Raven)
- **Beta Launch:** February 1, 2026 (5 couple-friends)
- **Public Launch:** February 16, 2026

## 📝 Key Features

### Must Have (MVP)

- ✅ Household authentication & partner invites
- ✅ Bank account linking via Plaid
- ✅ AI-powered transaction categorization
- ✅ Personal vs. Joint expense toggle
- ✅ Unified spending dashboard
- ✅ Manual expense entry
- ✅ Savings goal tracker

### Should Have (V1.1)

- 📊 Spending trends & charts
- 💰 Budget progress bars
- 🔍 Transaction filtering
- 🔒 "Hide from Partner" toggle
- 🏠 Household settings

### Could Have (V2.0)

- 🤖 AI Financial Therapist
- 😊 Spending mood tracking
- 🎉 Goal completion animations
- 🏷️ Custom categories

## 🔐 Environment Variables

Required environment variables (see `.env.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
PLAID_CLIENT_ID=
PLAID_SECRET=
OPENAI_API_KEY=
```

## 🤝 Contributing

This is a personal portfolio project, but feedback is welcome! Open an issue to suggest improvements.

## 📄 License

MIT License - see LICENSE file for details

## 👤 Author

**Sailesh** - Building Duo as a portfolio project to demonstrate full-stack development skills.

---

**Status:** 🚧 In Active Development (Phase 0)
