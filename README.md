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

## 🌐 Live Deployment

**Production URL:** https://duo-financial-harmony.vercel.app

The app is deployed on Vercel with automatic deployments on every push to `main` branch.

**Test Supabase Connection:** https://duo-financial-harmony.vercel.app/test-supabase

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

**Feedback welcome!** Feel free to:

- ✅ Open issues with suggestions or architecture ideas
- ✅ Point out bugs or potential improvements
- ✅ Ask questions about the implementation

**Not accepting:**

- ❌ Pull requests with code implementations
- ❌ Direct code contributions

If you're interested in similar features, feel free to fork this repo and experiment!

## 📄 License

MIT License - see LICENSE file for details

---

**Status:** 🚧 In Active Development (Phase 1)

- [x] **Phase 0:** Foundation (Nov 25 - Dec 1) - Setup & Deploy ✅
