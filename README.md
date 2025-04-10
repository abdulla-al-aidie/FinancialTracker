
# Minty Finance Tracker

A comprehensive personal finance management application built with React, TypeScript, and Express. Track your income, expenses, debts, and financial goals with AI-powered insights and recommendations.

## Project Structure

```
├── client/                   # Frontend React application
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── ui/         # Reusable UI components
│   │   │   └── ...         # Feature-specific components
│   │   ├── contexts/       # React context providers
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/           # Utility functions and API clients
│   │   ├── pages/         # Page components
│   │   ├── types/         # TypeScript type definitions
│   │   └── utils/         # Helper functions
├── server/                  # Backend Express server
│   ├── routes.ts           # API route definitions
│   ├── storage.ts          # Data storage logic
│   └── index.ts            # Server entry point
└── shared/                 # Shared code between client and server
    └── schema.ts           # Database schema definitions
```

## Features

- **Financial Dashboard**: Track income, expenses, and net cashflow
- **Debt Management**: Track debts with interest rates and payment schedules
- **Goal Setting & Tracking**: Create and monitor financial goals
- **AI-Powered Insights**: Get personalized financial recommendations
- **Knowledge Hub**: Access financial education resources

## Tech Stack

- Frontend: React, TypeScript, TailwindCSS, Shadcn/UI
- Backend: Express.js
- AI Integration: OpenAI API
- Data Visualization: Recharts
- Email Notifications: SendGrid

## Prerequisites

- Node.js 18+ installed
- OpenAI API key for AI features
- SendGrid API key for email notifications

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd minty-finance-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Create environment variables:
Create a `.env` file in the root directory with:
```
OPENAI_API_KEY=your_openai_api_key
SENDGRID_API_KEY=your_sendgrid_api_key
SESSION_SECRET=your_session_secret
```

## Development

1. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Project Architecture

### Frontend

- Uses React with TypeScript for type safety
- State management through React Context
- Styled with TailwindCSS and Shadcn/UI components
- Real-time data visualization with Recharts

### Backend

- Express.js server handling API requests
- OpenAI integration for financial insights
- Replit Database for data persistence
- RESTful API endpoints for:
  - User profiles
  - Financial transactions
  - Goals and budgets
  - AI-powered recommendations

### Data Flow

1. User interactions trigger React component updates
2. Components call API endpoints through service functions
3. Express routes handle requests and interact with storage
4. Data is persisted in Replit Database
5. Real-time updates are reflected in the UI

## API Endpoints

The server exposes RESTful endpoints for:

- `/api/user-profile`: User profile management
- `/api/months`: Month data management
- `/api/incomes`: Income tracking
- `/api/expenses`: Expense management
- `/api/budgets`: Budget setting
- `/api/goals`: Financial goals
- `/api/debts`: Debt tracking
- `/api/openai/*`: AI-powered insights

## Environment Variables

Required environment variables:

- `OPENAI_API_KEY`: Your OpenAI API key
- `SENDGRID_API_KEY`: SendGrid API key for email
- `SESSION_SECRET`: Secret for session management

## License

MIT License

## Acknowledgments

- Built with [Shadcn/UI](https://ui.shadcn.com/) components
- Icons by [Lucide](https://lucide.dev/)
- Charts powered by [Recharts](https://recharts.org/)
