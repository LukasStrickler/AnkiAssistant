# AnkiAssistant Web Application

This directory contains the web application for AnkiAssistant, built with Next.js, tRPC, and TypeScript.

## 🗂️ Directory Structure

```
web/
├── src/                 # Source code
│   ├── app/             # Next.js App Router
│   │   ├── api/         # API routes
│   │   │   ├── auth/    # Authentication API routes
│   │   │   └── trpc/    # tRPC API endpoints
│   │   ├── chat/        # Chat interface
│   │   │   └── [...slug]/ # Dynamic chat routes
│   │   ├── deck/        # Deck management
│   │   │   └── [...slug]/ # Dynamic deck routes
│   │   └── page.tsx     # Main application page
│   ├── components/      # Reusable UI components
│   │   ├── ui/          # Basic UI components (buttons, inputs, etc.)
│   │   └── features/    # Feature-specific components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility functions and libraries
│   ├── server/          # Server-side code
│   │   ├── auth/        # Authentication setup
│   │   └── db/          # Database configuration
│   ├── stores/          # State management
│   ├── styles/          # Global styles
│   ├── trpc/            # tRPC setup
│   └── types/           # TypeScript type definitions
│
├── public/              # Static assets
└── docs/                # Documentation
```

## 🔧 Technologies

- **Framework**: [Next.js](https://nextjs.org/) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **API**: [tRPC](https://trpc.io/) for type-safe APIs
- **Database**: [Drizzle ORM](https://orm.drizzle.team/) with SQLite/Turso
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) and [ShadCN UI](https://ui.shadcn.com/)
- **Authentication**: [BetterAuth](https://better-auth.com/)
- **State Management**: React Context and React Query

## 🚀 Development Setup

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` with your specific configuration values.

3. Start the development server:
   ```bash
   npm run dev
   ```
   The application will be available at [http://localhost:3000](http://localhost:3000).

### Environment Variables

Check the [env.example](.env.example) file for the environment variables.

## 🧪 Testing

Run the tests with:

```bash
npm run test
```

## 🌐 AI Integration

The application integrates with AI services to generate flashcards:

- local Ollama integration for offline/self-hosted operation
