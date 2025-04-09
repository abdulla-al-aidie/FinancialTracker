
# Minty Finance Tracker

A comprehensive personal finance management application built with React, TypeScript, and Express. Track your income, expenses, debts, and financial goals with AI-powered insights and recommendations.

## Features

### Financial Dashboard
- Track income and expenses with detailed categorization
- Monitor net cashflow and savings rate
- Visual breakdown of spending patterns
- Monthly financial summaries

### Debt Management
- Track multiple debts with interest rates and payment schedules
- Payment history tracking
- Debt payoff progress visualization
- Smart debt prioritization recommendations

### Goal Setting & Tracking
- Create and monitor financial goals
- AI-powered goal prioritization
- Progress tracking with visual indicators
- Goal contribution system

### AI-Powered Insights
- Financial health assessment
- Personalized spending optimization recommendations
- Surplus funds allocation advice
- Actionable financial recommendations

### Knowledge Hub
- Educational resources on personal finance
- AI-assisted financial learning
- Topics covering investments, debt management, budgeting, and tax planning

## Tech Stack

- Frontend: React, TypeScript, TailwindCSS, Shadcn/UI
- Backend: Express.js
- AI Integration: OpenAI API
- Data Visualization: Recharts
- Email Notifications: SendGrid

## Setup Instructions

1. First, ensure you have Node.js installed (version 18+ recommended)

2. Install project dependencies:
```bash
npm install
```

3. Configure environment variables:
   - Go to the Secrets tab in your Replit workspace
   - Add the following secrets:
     - `OPENAI_API_KEY`: Your OpenAI API key for AI features
     - `SENDGRID_API_KEY`: SendGrid API key for email notifications
     - `SESSION_SECRET`: A random string for session security

4. Start the development server:
```bash
npm run dev
```

5. Load sample data (optional):
   - Click the "Load Sample Data" button in the dashboard
   - This will populate your account with example transactions, budgets, and goals

The application will be running on port 5000. The development server includes:
- Hot reloading for React components
- Automatic TypeScript compilation
- Express API server
- Database connectivity

### Development Tips

- Use the AI Insights feature to get personalized financial recommendations
- Test email notifications with the SendGrid integration
- Check the console for API logs and debugging information
- Use the Knowledge Hub for learning about personal finance concepts

## Environment Variables

The following environment variables are required:

- `OPENAI_API_KEY`: Your OpenAI API key for AI features
- `SENDGRID_API_KEY`: SendGrid API key for email notifications
- `SESSION_SECRET`: Secret key for session management

## License

MIT License

## Acknowledgments

- Built with [Shadcn/UI](https://ui.shadcn.com/) components
- Icons by [Lucide](https://lucide.dev/)
- Charts powered by [Recharts](https://recharts.org/)
