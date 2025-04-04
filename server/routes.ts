import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

// Import OpenAI for server-side API calls
import OpenAI from "openai";
import { log } from "./vite";
import Database from '@replit/database';

// Get API key from environment variable
const apiKey = process.env.OPENAI_API_KEY || "";

// Log API key status (but not the actual key)
log(`OpenAI API key ${apiKey ? "is available" : "is missing"}`);

// Initialize OpenAI client with API key from environment variable
const openaiClient = new OpenAI({
  apiKey: apiKey
});

// Initialize Replit Database
const replitDb = new Database();
const DB_PREFIX = 'finance_app_';

export async function registerRoutes(app: Express): Promise<Server> {
  // Add OpenAI proxy endpoint for secure API requests from frontend
  app.post("/api/openai/generate-insights", async (req, res) => {
    try {
      const data = req.body;
      const prompt = `
        You are a financial advisor assistant. Based on the following financial data, generate detailed recommendations:
        
        Financial Summary:
        - Total Monthly Income: $${data.totalIncome.toFixed(2)}
        - Total Monthly Expenses: $${data.totalExpenses.toFixed(2)}
        - Net Cashflow: $${data.netCashflow.toFixed(2)}
        - Savings Rate: ${data.savingsRate.toFixed(1)}%
        - Top Expense Categories: ${data.topExpenseCategories.map((c: { category: string; amount: number }) => `${c.category} ($${c.amount.toFixed(2)})`).join(", ")}
        - Over Budget Categories: ${data.overBudgetCategories.length > 0 ? data.overBudgetCategories.join(", ") : "None"}
        - Total Debt: $${data.debtTotal.toFixed(2)}
        - Average Interest Rate: ${data.averageInterestRate.toFixed(1)}%
        
        Generate 3-5 recommendations with:
        1. A type/category (e.g., "Budget Optimization", "Debt Reduction")
        2. A detailed description with specific actions
        3. A potential impact (e.g., "Save $X per month")
        
        Format as JSON array of objects with "type", "description", and "impact" fields.
      `;

      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7
      });

      const content = response.choices[0]?.message?.content;
      let result;
      
      if (!content) {
        result = [
          {
            type: "Error",
            description: "Unable to generate recommendations at this time.",
            impact: "No impact calculated",
          },
        ];
      } else {
        try {
          const parsedResponse = JSON.parse(content);
          if (Array.isArray(parsedResponse) && parsedResponse.length > 0) {
            result = parsedResponse.map((item) => ({
              type: item.type || "Financial Insight",
              description: item.description || "No description provided",
              impact: item.impact || "Impact not calculated",
            }));
          } else {
            result = [
              {
                type: "General Advice",
                description: "We couldn't generate personalized recommendations based on your data.",
                impact: "Impact can't be calculated with limited data",
              },
            ];
          }
        } catch (error) {
          console.error("Error parsing OpenAI response:", error);
          result = [
            {
              type: "Error",
              description: "We encountered an issue processing the financial analysis.",
              impact: "No impact calculated",
            },
          ];
        }
      }
      
      res.json(result);
    } catch (error: unknown) {
      console.error("Error calling OpenAI API:", error);
      
      // Enhanced error logging for debugging
      if (error instanceof Error) {
        log(`OpenAI API Error Details: ${error.name}: ${error.message}`);
        if (error.stack) {
          log(`Error Stack: ${error.stack.split('\n')[0]}`);
        }
      }
      
      // Check for API key issues
      if (error instanceof Error && 
          (error.message.includes("API key") || error.message.includes("authentication") || 
           error.message.includes("key") || error.message.includes("auth"))) {
        log("OpenAI API key error detected. Please check your API key configuration.");
        log("API Key Status: " + (apiKey ? "Key exists but might be invalid" : "Key is missing"));
        return res.status(500).json({
          error: "API Configuration Error",
          message: "There's an issue with the OpenAI API key. Please contact the administrator."
        });
      }
      
      // Handle rate limit issues
      if (error instanceof Error && 
          (error.message.includes("rate") || error.message.includes("limit") || 
           error.message.includes("quota") || error.message.includes("capacity"))) {
        log("OpenAI API rate limit exceeded or quota reached.");
        return res.status(429).json({
          error: "API Rate Limit",
          message: "OpenAI API rate limit exceeded. Please try again later."
        });
      }
      
      // Handle other errors
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      log(`Fallback recommendations used due to error: ${errorMessage}`);
      res.status(500).json({
        error: "Failed to generate insights",
        message: errorMessage
      });
    }
  });
  
  // Add endpoint for categorizing transactions
  app.post("/api/openai/categorize", async (req, res) => {
    try {
      const { description } = req.body;
      const prompt = `
        Categorize this transaction into one of these categories:
        Housing, Transportation, Food, Healthcare, Insurance, Debt, Personal, Entertainment, Gifts, Education, Miscellaneous
        
        Transaction: "${description}"
        
        Respond with ONLY the category name.
      `;

      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 20,
      });

      const category = response.choices[0]?.message?.content?.trim() || "Miscellaneous";
      res.json({ category });
    } catch (error) {
      console.error("Error categorizing transaction:", error);
      res.status(500).json({ 
        error: "Failed to categorize transaction",
        category: "Miscellaneous" 
      });
    }
  });
  
  // Add endpoint for financial health analysis
  app.post("/api/openai/analyze-health", async (req, res) => {
    try {
      const { income, expenses, debt, savingsRate } = req.body;
      const prompt = `
        Based on this financial data, provide a financial health score (0-100) and brief feedback:
        
        - Monthly Income: $${income.toFixed(2)}
        - Monthly Expenses: $${expenses.toFixed(2)}
        - Total Debt: $${debt.toFixed(2)}
        - Savings Rate: ${savingsRate.toFixed(1)}%
        
        Respond in JSON with "score" and "feedback" properties.
        Example: { "score": 75, "feedback": "Your savings rate is good, but your debt level is high." }
      `;

      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        res.json({
          score: 50,
          feedback: "Unable to analyze financial health at this time.",
        });
        return;
      }

      try {
        const parsedResponse = JSON.parse(content);
        res.json({
          score: parsedResponse.score || 50,
          feedback: parsedResponse.feedback || "Analysis complete.",
        });
      } catch (error) {
        console.error("Error parsing OpenAI response:", error);
        res.json({
          score: 50,
          feedback: "Unable to analyze financial health at this time.",
        });
      }
    } catch (error) {
      console.error("Error analyzing financial health:", error);
      res.status(500).json({
        error: "Failed to analyze financial health",
        score: 50,
        feedback: "Unable to analyze financial health at this time.",
      });
    }
  });

  // Add endpoint for goal prioritization
  app.post("/api/openai/prioritize-goals", async (req, res) => {
    try {
      const { goals, financialSnapshot, expenseBreakdown, debts, income } = req.body;
      
      // Ensure we have goals to analyze
      if (!goals || !Array.isArray(goals) || goals.length === 0) {
        return res.status(400).json({
          error: "Invalid request",
          message: "No goals provided for prioritization"
        });
      }

      const prompt = `
        As an expert financial advisor, carefully prioritize these financial goals based on a comprehensive analysis of this person's entire financial situation.
        Assign each goal a priority score from 1-10 (10 being highest) and provide detailed reasoning.
        
        GOALS:
        ${goals.map((goal, index) => `
          Goal ${index + 1}: ${goal.name}
          - Type: ${goal.type}
          - Target Amount: $${goal.targetAmount}
          - Current Progress: $${goal.currentAmount}
          - Target Date: ${goal.targetDate}
          - Description: ${goal.description}
        `).join('\n')}
        
        FINANCIAL SNAPSHOT:
        - Total Income: $${financialSnapshot.totalIncome}
        - Total Expenses: $${financialSnapshot.totalExpenses}
        - Savings Rate: ${financialSnapshot.savingsRate}%
        - Total Debt: $${financialSnapshot.debtTotal}
        - Monthly Net Cashflow: $${financialSnapshot.monthlyNetCashflow}
        
        EXPENSE BREAKDOWN:
        ${expenseBreakdown.map((expense: { category: string; amount: number; percentOfTotalExpenses: number }) => 
          `- ${expense.category}: $${expense.amount} (${expense.percentOfTotalExpenses}% of expenses)`
        ).join('\n')}
        
        INCOME SOURCES:
        ${income ? income.map((inc: { type: string; amount: number; description?: string }) => 
          `- ${inc.type}${inc.description ? ` - ${inc.description}` : ''}: $${inc.amount}`
        ).join('\n') : 'No income details provided'}
        
        DEBTS:
        ${debts && debts.length > 0 ? debts.map((debt: { 
          name: string; 
          balance: number; 
          interestRate: number; 
          minimumPayment: number;
          priority?: number;
          originalPrincipal: number;
          totalPaid: number;
        }) => `
          - ${debt.name}
          - Current Balance: $${debt.balance}
          - Interest Rate: ${debt.interestRate}%
          - Minimum Payment: $${debt.minimumPayment}
          - Original Amount: $${debt.originalPrincipal}
          - Total Paid: $${debt.totalPaid}
          - User-Assigned Priority: ${debt.priority !== undefined ? `${debt.priority}/10` : 'Not specified'}
          - Paid Off Percentage: ${debt.originalPrincipal > 0 ? Math.round((debt.totalPaid / debt.originalPrincipal) * 100) : 0}%
        `).join('\n') : 'No debt information provided'}
        
        PRIORITIZATION RULES:
        1. Consider all aspects of the financial situation holistically
        2. Prioritize high-interest debt payoff when significantly impacting cashflow
        3. Respect user-assigned debt priorities when evaluating debt-related goals
        4. Prioritize emergency funds if they're inadequate (less than 3-6 months of expenses)
        5. For savings goals, consider:
           - Time sensitivity (how soon the goal deadline is)
           - Progress already made (momentum)
           - Impact on overall financial wellbeing
           - Realistic achievability given current financial situation
        6. For debt payoff goals, consider:
           - Interest rate (higher rates generally get higher priority)
           - Debt-to-income ratio impact
           - Alignment with any user-assigned debt priorities
        7. Balance short-term needs with long-term financial health
        8. Consider special circumstances mentioned in goal descriptions
        
        PROVIDE ACTIONABLE REASONS:
        For each goal, include specific, personalized reasoning that explains:
        - Why this priority level was assigned
        - How it relates to the person's overall financial situation
        - Any trade-offs considered
        - Brief 1-2 sentence advice on how to approach this goal given its priority
        
        Respond with a JSON array containing objects with these properties:
        - goalId: the ID of the goal
        - priorityScore: number from 1-10 (10 highest)
        - reasoning: detailed explanation for the score with actionable advice
      `;

      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.2
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({
          error: "Failed to generate priorities",
          message: "No response from AI"
        });
      }

      try {
        const parsedResponse = JSON.parse(content);
        // Verify the response format is correct
        if (Array.isArray(parsedResponse)) {
          res.json(parsedResponse);
        } else {
          // If the response is not an array, we'll try to extract from a possible nested structure
          res.json(parsedResponse.priorities || parsedResponse.goals || []);
        }
      } catch (error) {
        console.error("Error parsing OpenAI response:", error);
        res.status(500).json({
          error: "Failed to parse AI response",
          message: "The AI response could not be processed"
        });
      }
    } catch (error) {
      console.error("Error prioritizing goals:", error);
      res.status(500).json({
        error: "Failed to prioritize goals",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });

  // Add endpoint for generating goal-specific recommendations
  app.post("/api/openai/goal-recommendations", async (req, res) => {
    try {
      const { goal, financialData, spendingInsights } = req.body;
      
      if (!goal) {
        return res.status(400).json({
          error: "Invalid request",
          message: "No goal provided for recommendations"
        });
      }

      const prompt = `
        As an expert financial advisor, generate specific recommendations to help achieve this financial goal faster:
        
        GOAL DETAILS:
        - Name: ${goal.name}
        - Type: ${goal.type}
        - Target Amount: $${goal.targetAmount}
        - Current Progress: $${goal.currentAmount} (${((goal.currentAmount / goal.targetAmount) * 100).toFixed(1)}%)
        - Target Date: ${goal.targetDate}
        - Description: ${goal.description}
        - Priority: ${goal.priority}/10
        
        FINANCIAL DATA:
        Income Sources:
        ${financialData.income.map((inc: { source: string; amount: number }) => 
          `- ${inc.source}: $${inc.amount}`
        ).join('\n')}
        
        Expenses:
        ${financialData.expenses.map((exp: { category: string; amount: number }) => 
          `- ${exp.category}: $${exp.amount}`
        ).join('\n')}
        
        - Savings Rate: ${financialData.savingsRate}%
        
        Cashflow Trend:
        ${financialData.cashflowTrend.map((cf: { month: string; netAmount: number }) => 
          `- ${cf.month}: $${cf.netAmount}`
        ).join('\n')}
        
        SPENDING INSIGHTS:
        - Non-essential Spending: $${spendingInsights.nonEssentialSpending}
        
        Top Expense Categories:
        ${spendingInsights.topExpenseCategories.map((cat: { category: string; amount: number; isReducible: boolean }) => 
          `- ${cat.category}: $${cat.amount} (${cat.isReducible ? 'Reducible' : 'Non-reducible'})`
        ).join('\n')}
        
        Generate 3-5 specific recommendations that would help achieve this goal faster.
        For each recommendation, include:
        1. A clear description of the action
        2. The potential impact (High/Medium/Low)
        3. An estimate of how much time could be saved (e.g., "2 months faster")
        4. 2-3 specific required actions to implement the recommendation
        
        Respond with a JSON array with one object containing:
        - goalId: the ID of the goal
        - recommendations: array of objects with these properties:
          - description: string
          - potentialImpact: string (High/Medium/Low)
          - estimatedTimeReduction: string
          - requiredActions: array of strings
      `;

      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({
          error: "Failed to generate recommendations",
          message: "No response from AI"
        });
      }

      try {
        const parsedResponse = JSON.parse(content);
        res.json(Array.isArray(parsedResponse) ? parsedResponse : [parsedResponse]);
      } catch (error) {
        console.error("Error parsing OpenAI response:", error);
        res.status(500).json({
          error: "Failed to parse AI response",
          message: "The AI response could not be processed"
        });
      }
    } catch (error) {
      console.error("Error generating goal recommendations:", error);
      res.status(500).json({
        error: "Failed to generate recommendations",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });

  // Add endpoint for analyzing spending patterns
  app.post("/api/openai/analyze-spending", async (req, res) => {
    try {
      const { expenses, historicalExpenses, income, targetSavingsRate, currentMonth } = req.body;
      
      if (!expenses || !Array.isArray(expenses) || expenses.length === 0) {
        return res.status(400).json({
          error: "Invalid request",
          message: "No expense data provided for analysis"
        });
      }

      const totalSpending = expenses.reduce((sum, expense) => sum + expense.amount, 0);
      const currentSavingsRate = income > 0 ? ((income - totalSpending) / income) * 100 : 0;

      // Format historical expense data for comparison
      let historicalExpenseText = '';
      if (historicalExpenses && Array.isArray(historicalExpenses) && historicalExpenses.length > 0) {
        historicalExpenseText = `
HISTORICAL EXPENSES:`;

        for (const monthData of historicalExpenses) {
          if (monthData.expenses && monthData.expenses.length > 0) {
            const monthTotal = monthData.expenses.reduce((sum, exp) => sum + exp.amount, 0);
            
            historicalExpenseText += `
Month: ${monthData.monthId}
Total Spending: $${monthTotal.toFixed(2)}
Breakdown:
${monthData.expenses.map((exp: { category: string; amount: number; date: string; description?: string }) => 
  `- ${exp.category}: $${exp.amount} (${exp.date})${exp.description ? ` - ${exp.description}` : ''}`
).join('\n')}
`;
          }
        }
      }

      const prompt = `
        As a financial analyst, analyze these expenses to find optimization opportunities to reach a target savings rate, and provide insights on spending patterns compared to previous months.
        
        CURRENT FINANCIAL SITUATION (${currentMonth}):
        - Monthly Income: $${income}
        - Total Monthly Expenses: $${totalSpending}
        - Current Savings Rate: ${currentSavingsRate.toFixed(1)}%
        - Target Savings Rate: ${targetSavingsRate}%
        
        CURRENT EXPENSE BREAKDOWN:
        ${expenses.map((exp: { category: string; amount: number; date: string; description?: string }) => 
          `- ${exp.category}: $${exp.amount} (${exp.date})${exp.description ? ` - ${exp.description}` : ''}`
        ).join('\n')}
        
        ${historicalExpenseText}
        
        Based on common financial wisdom and typical spending patterns:
        1. Identify the top areas where spending could be optimized
        2. Suggest specific, actionable reductions for each area
        3. Calculate the potential impact on the savings rate
        4. Provide realistic specific suggestions for each category
        5. Compare current month spending with previous months to identify trends and patterns
        
        Respond with a JSON object containing:
        - optimizationAreas: array of objects with these properties:
          - category: string
          - currentSpending: number
          - recommendedReduction: number
          - potentialSavings: number
          - specificSuggestions: array of strings with actionable advice
        - projectedImpact: object with these properties:
          - newSavingsRate: number
          - monthlyIncrease: number
          - yearlyIncrease: number
        - monthlyInsights: array of objects with these properties:
          - type: string (like "Increase", "Decrease", "Pattern")
          - description: string (detailed insight finding)
          - comparison: string (percentage or amount change)
          - months: array of strings (the months being compared)
      `;

      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.2
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({
          error: "Failed to analyze spending",
          message: "No response from AI"
        });
      }

      try {
        const parsedResponse = JSON.parse(content);
        res.json(parsedResponse);
      } catch (error) {
        console.error("Error parsing OpenAI response:", error);
        res.status(500).json({
          error: "Failed to parse AI response",
          message: "The AI response could not be processed"
        });
      }
    } catch (error) {
      console.error("Error analyzing spending patterns:", error);
      res.status(500).json({
        error: "Failed to analyze spending",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });
  
  // Knowledge Hub - Answer financial questions
  app.post("/api/knowledge/ask", async (req, res) => {
    try {
      const { question } = req.body;
      
      if (!question || typeof question !== 'string' || question.trim() === '') {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Please provide a valid question'
        });
      }

      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      const prompt = `
        As a financial advisor and educator, answer the following question about personal finance, investments, financial planning, or related topics.

        Provide a visually appealing, accurate, and educational response that helps the user understand the financial concept or answer to their question.
        Format your response with clear headings, concise paragraphs, and bullet points for better readability.
        Avoid using formats like "1. **Direct Answer:**" that look like generic AI responses.
        
        Use a conversational, friendly tone and explain complex terms in an accessible way.
        If the question is ambiguous or requires more context, provide the most helpful general information you can.

        QUESTION: ${question}

        Structure your response in the following way:
        - Start with a direct, plain language answer to the question (no heading needed)
        - Then add 2-3 clear sections with helpful contextual information
        - Use bullet points (• symbol) for lists of tips or examples
        - End with important considerations or next steps if applicable
      `;

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
        max_tokens: 1000
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({
          error: 'Failed to generate answer',
          message: 'No response from AI'
        });
      }

      res.json({ answer: content });
    } catch (error) {
      console.error('Error answering financial question:', error);
      res.status(500).json({
        error: 'Failed to answer question',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });
  
  // All data is stored in client-side localStorage
  
  // Database API endpoints
  
  // User profile endpoints
  app.get("/api/user-profile/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const profile = await storage.getUserProfile(userId);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      res.json(profile);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  });

  app.post("/api/user-profile", async (req, res) => {
    try {
      const profile = req.body;
      const createdProfile = await storage.createUserProfile(profile);
      res.status(201).json(createdProfile);
    } catch (error) {
      console.error("Error creating user profile:", error);
      res.status(500).json({ error: "Failed to create user profile" });
    }
  });

  app.put("/api/user-profile/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const profile = req.body;
      const updatedProfile = await storage.updateUserProfile(userId, profile);
      res.json(updatedProfile);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ error: "Failed to update user profile" });
    }
  });

  // Month management endpoints
  app.get("/api/months/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const months = await storage.getMonths(userId);
      res.json(months);
    } catch (error) {
      console.error("Error fetching months:", error);
      res.status(500).json({ error: "Failed to fetch months" });
    }
  });

  app.post("/api/months", async (req, res) => {
    try {
      const month = req.body;
      const createdMonth = await storage.createMonth(month);
      res.status(201).json(createdMonth);
    } catch (error) {
      console.error("Error creating month:", error);
      res.status(500).json({ error: "Failed to create month" });
    }
  });

  app.put("/api/months/:userId/active/:monthId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const monthId = req.params.monthId;
      await storage.setActiveMonth(userId, monthId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error setting active month:", error);
      res.status(500).json({ error: "Failed to set active month" });
    }
  });

  // Income endpoints
  app.get("/api/incomes/:userId/:monthId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const monthId = req.params.monthId;
      const incomes = await storage.getIncomes(userId, monthId);
      res.json(incomes);
    } catch (error) {
      console.error("Error fetching incomes:", error);
      res.status(500).json({ error: "Failed to fetch incomes" });
    }
  });

  app.post("/api/incomes", async (req, res) => {
    try {
      const income = req.body;
      const createdIncome = await storage.createIncome(income);
      res.status(201).json(createdIncome);
    } catch (error) {
      console.error("Error creating income:", error);
      res.status(500).json({ error: "Failed to create income" });
    }
  });

  app.put("/api/incomes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const income = req.body;
      const updatedIncome = await storage.updateIncome(id, income);
      res.json(updatedIncome);
    } catch (error) {
      console.error("Error updating income:", error);
      res.status(500).json({ error: "Failed to update income" });
    }
  });

  app.delete("/api/incomes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteIncome(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting income:", error);
      res.status(500).json({ error: "Failed to delete income" });
    }
  });

  // Expense endpoints
  app.get("/api/expenses/:userId/:monthId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const monthId = req.params.monthId;
      const expenses = await storage.getExpenses(userId, monthId);
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      const expense = req.body;
      const createdExpense = await storage.createExpense(expense);
      res.status(201).json(createdExpense);
    } catch (error) {
      console.error("Error creating expense:", error);
      res.status(500).json({ error: "Failed to create expense" });
    }
  });

  app.put("/api/expenses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const expense = req.body;
      const updatedExpense = await storage.updateExpense(id, expense);
      res.json(updatedExpense);
    } catch (error) {
      console.error("Error updating expense:", error);
      res.status(500).json({ error: "Failed to update expense" });
    }
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteExpense(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ error: "Failed to delete expense" });
    }
  });

  // Budget endpoints
  app.get("/api/budgets/:userId/:monthId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const monthId = req.params.monthId;
      const budgets = await storage.getBudgets(userId, monthId);
      res.json(budgets);
    } catch (error) {
      console.error("Error fetching budgets:", error);
      res.status(500).json({ error: "Failed to fetch budgets" });
    }
  });

  app.post("/api/budgets", async (req, res) => {
    try {
      const budget = req.body;
      const createdBudget = await storage.createBudget(budget);
      res.status(201).json(createdBudget);
    } catch (error) {
      console.error("Error creating budget:", error);
      res.status(500).json({ error: "Failed to create budget" });
    }
  });

  app.put("/api/budgets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const budget = req.body;
      const updatedBudget = await storage.updateBudget(id, budget);
      res.json(updatedBudget);
    } catch (error) {
      console.error("Error updating budget:", error);
      res.status(500).json({ error: "Failed to update budget" });
    }
  });

  app.delete("/api/budgets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteBudget(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting budget:", error);
      res.status(500).json({ error: "Failed to delete budget" });
    }
  });

  // Goal endpoints
  app.get("/api/goals/:userId/:monthId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const monthId = req.params.monthId;
      const goals = await storage.getGoals(userId, monthId);
      res.json(goals);
    } catch (error) {
      console.error("Error fetching goals:", error);
      res.status(500).json({ error: "Failed to fetch goals" });
    }
  });

  app.post("/api/goals", async (req, res) => {
    try {
      const goal = req.body;
      const createdGoal = await storage.createGoal(goal);
      res.status(201).json(createdGoal);
    } catch (error) {
      console.error("Error creating goal:", error);
      res.status(500).json({ error: "Failed to create goal" });
    }
  });

  app.put("/api/goals/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const goal = req.body;
      const updatedGoal = await storage.updateGoal(id, goal);
      res.json(updatedGoal);
    } catch (error) {
      console.error("Error updating goal:", error);
      res.status(500).json({ error: "Failed to update goal" });
    }
  });

  app.delete("/api/goals/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteGoal(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting goal:", error);
      res.status(500).json({ error: "Failed to delete goal" });
    }
  });

  // Debt endpoints
  app.get("/api/debts/:userId/:monthId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const monthId = req.params.monthId;
      const debts = await storage.getDebts(userId, monthId);
      res.json(debts);
    } catch (error) {
      console.error("Error fetching debts:", error);
      res.status(500).json({ error: "Failed to fetch debts" });
    }
  });

  app.post("/api/debts", async (req, res) => {
    try {
      const debt = req.body;
      const createdDebt = await storage.createDebt(debt);
      res.status(201).json(createdDebt);
    } catch (error) {
      console.error("Error creating debt:", error);
      res.status(500).json({ error: "Failed to create debt" });
    }
  });

  app.put("/api/debts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const debt = req.body;
      const updatedDebt = await storage.updateDebt(id, debt);
      res.json(updatedDebt);
    } catch (error) {
      console.error("Error updating debt:", error);
      res.status(500).json({ error: "Failed to update debt" });
    }
  });

  app.delete("/api/debts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteDebt(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting debt:", error);
      res.status(500).json({ error: "Failed to delete debt" });
    }
  });

  // Recommendations endpoints
  app.get("/api/recommendations/:userId/:monthId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const monthId = req.params.monthId;
      const recommendations = await storage.getRecommendations(userId, monthId);
      res.json(recommendations);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      res.status(500).json({ error: "Failed to fetch recommendations" });
    }
  });

  app.post("/api/recommendations", async (req, res) => {
    try {
      const recommendation = req.body;
      const createdRecommendation = await storage.createRecommendation(recommendation);
      res.status(201).json(createdRecommendation);
    } catch (error) {
      console.error("Error creating recommendation:", error);
      res.status(500).json({ error: "Failed to create recommendation" });
    }
  });

  app.put("/api/recommendations/:id/read", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.markRecommendationAsRead(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking recommendation as read:", error);
      res.status(500).json({ error: "Failed to mark recommendation as read" });
    }
  });

  // Alert endpoints
  app.get("/api/alerts/:userId/:monthId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const monthId = req.params.monthId;
      const alerts = await storage.getAlerts(userId, monthId);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  app.post("/api/alerts", async (req, res) => {
    try {
      const alert = req.body;
      const createdAlert = await storage.createAlert(alert);
      res.status(201).json(createdAlert);
    } catch (error) {
      console.error("Error creating alert:", error);
      res.status(500).json({ error: "Failed to create alert" });
    }
  });

  app.put("/api/alerts/:id/read", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.markAlertAsRead(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking alert as read:", error);
      res.status(500).json({ error: "Failed to mark alert as read" });
    }
  });

  app.put("/api/alerts/:userId/:monthId/clear", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const monthId = req.params.monthId;
      await storage.clearAllAlerts(userId, monthId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing alerts:", error);
      res.status(500).json({ error: "Failed to clear alerts" });
    }
  });

  // Scenario endpoints
  app.get("/api/scenarios/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const scenarios = await storage.getScenarios(userId);
      res.json(scenarios);
    } catch (error) {
      console.error("Error fetching scenarios:", error);
      res.status(500).json({ error: "Failed to fetch scenarios" });
    }
  });

  app.post("/api/scenarios", async (req, res) => {
    try {
      const scenario = req.body;
      const createdScenario = await storage.createScenario(scenario);
      res.status(201).json(createdScenario);
    } catch (error) {
      console.error("Error creating scenario:", error);
      res.status(500).json({ error: "Failed to create scenario" });
    }
  });

  app.put("/api/scenarios/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const scenario = req.body;
      const updatedScenario = await storage.updateScenario(id, scenario);
      res.json(updatedScenario);
    } catch (error) {
      console.error("Error updating scenario:", error);
      res.status(500).json({ error: "Failed to update scenario" });
    }
  });

  app.delete("/api/scenarios/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteScenario(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting scenario:", error);
      res.status(500).json({ error: "Failed to delete scenario" });
    }
  });
  
  // Add endpoint for saving financial data to database
  app.post("/api/save-data", async (req, res) => {
    try {
      const {
        userProfile,
        months,
        activeMonth,
        incomes,
        expenses,
        budgets,
        goals,
        debts,
        recommendations,
        alerts,
        scenarios
      } = req.body;

      // For demo purposes, log the data to be saved
      console.log("Saving data to database:", {
        userProfileId: userProfile?.id,
        monthsCount: months?.length,
        activeMonth,
        incomesCount: incomes?.length,
        expensesCount: expenses?.length,
        budgetsCount: budgets?.length,
        goalsCount: goals?.length,
        debtsCount: debts?.length,
        recommendationsCount: recommendations?.length,
        alertsCount: alerts?.length,
        scenariosCount: scenarios?.length
      });
      
      // First, make sure a default user exists
      try {
        // Check if default user exists, if not create it
        let defaultUser = await storage.getUser(1);
        if (!defaultUser) {
          defaultUser = await storage.createUser({
            username: "default",
            password: "defaultpassword"
          });
        }
        
        // Now handle user profile creation or update
        let savedUserProfile;
        if (userProfile) {
          const existingProfile = await storage.getUserProfile(defaultUser.id);
          
          if (existingProfile) {
            // Update existing profile
            savedUserProfile = await storage.updateUserProfile(
              defaultUser.id,
              {
                ...userProfile,
                userId: defaultUser.id
              }
            );
          } else {
            // Create new profile
            savedUserProfile = await storage.createUserProfile({
              userId: defaultUser.id,
              name: userProfile?.name || "Default User",
              email: userProfile?.email || "user@example.com",
              currency: userProfile?.currency || "USD",
              notificationPreferences: {}
            });
          }
        }
      } catch (error) {
        console.error("Error setting up user:", error);
        // Continue with other operations even if user setup fails
      }
      
      // Process and save months
      if (months && months.length > 0) {
        for (const month of months) {
          // Check if month already exists
          const existingMonth = await storage.getMonth(1, month.id);
          if (!existingMonth) {
            // Create new month
            await storage.createMonth({
              id: month.id,
              name: month.name,
              userId: 1,
              isActive: month.id === activeMonth
            });
          }
        }
        
        // Set active month
        if (activeMonth) {
          await storage.setActiveMonth(1, activeMonth);
        }
      }
      
      // Process financial data for active month only
      if (activeMonth) {
        // Save incomes for active month
        if (incomes && incomes.length > 0) {
          for (const income of incomes) {
            if (income.id && income.id > 0) {
              // Update existing income
              // Clean and validate the income data
              const cleanIncome = {
                source: income.source,
                amount: String(income.amount), // Convert to string for numeric column
                category: income.category,
                description: income.description,
                date: income.date instanceof Date ? income.date : new Date(income.date),
                recurring: Boolean(income.isRecurring),
                notes: income.description || "",
                userId: 1,
                monthId: activeMonth
              };
              
              await storage.updateIncome(income.id, cleanIncome);
            } else {
              // Create new income
              // Clean and validate the income data
              const newIncome = {
                source: income.source,
                amount: String(income.amount), // Convert to string for numeric column
                date: income.date instanceof Date ? income.date : new Date(income.date || Date.now()),
                recurring: Boolean(income.isRecurring),
                notes: income.description || "",
                userId: 1,
                monthId: activeMonth,
                createdAt: new Date()
              };
              
              await storage.createIncome(newIncome);
            }
          }
        }
        
        // Save expenses for active month
        if (expenses && expenses.length > 0) {
          for (const expense of expenses) {
            if (expense.id && expense.id > 0) {
              // Update existing expense
              // Clean and validate the expense data
              const cleanExpense = {
                category: expense.category,
                amount: String(expense.amount), // Convert to string for numeric column
                description: expense.description || "",
                date: expense.date instanceof Date ? expense.date : new Date(expense.date || Date.now()),
                recurring: Boolean(expense.recurring || expense.isRecurring),
                essential: Boolean(expense.essential),
                userId: 1,
                monthId: activeMonth
              };
              
              await storage.updateExpense(expense.id, cleanExpense);
            } else {
              // Create new expense
              // Clean and validate the expense data
              const newExpense = {
                category: expense.category,
                amount: String(expense.amount), // Convert to string for numeric column
                description: expense.description || "",
                date: expense.date instanceof Date ? expense.date : new Date(expense.date || Date.now()),
                recurring: Boolean(expense.recurring || expense.isRecurring),
                essential: Boolean(expense.essential),
                userId: 1,
                monthId: activeMonth,
                createdAt: new Date()
              };
              
              await storage.createExpense(newExpense);
            }
          }
        }
        
        // Save budgets for active month
        if (budgets && budgets.length > 0) {
          for (const budget of budgets) {
            if (budget.id && budget.id > 0) {
              // Update existing budget
              // Clean and validate the budget data
              const cleanBudget = {
                category: budget.category,
                limit: String(budget.limit), // Convert to string for numeric column
                userId: 1,
                monthId: activeMonth
              };
              
              await storage.updateBudget(budget.id, cleanBudget);
            } else {
              // Create new budget
              // Clean and validate the budget data
              const newBudget = {
                category: budget.category,
                limit: String(budget.limit), // Convert to string for numeric column
                userId: 1,
                monthId: activeMonth,
                createdAt: new Date()
              };
              
              await storage.createBudget(newBudget);
            }
          }
        }
        
        // Save goals for active month
        if (goals && goals.length > 0) {
          for (const goal of goals) {
            if (goal.id && goal.id > 0) {
              // Update existing goal
              // Clean and validate the goal data
              const cleanGoal = {
                name: goal.name,
                description: goal.description || "",
                targetAmount: String(goal.targetAmount), // Convert to string for numeric column
                currentAmount: String(goal.currentAmount || 0), // Convert to string for numeric column
                targetDate: goal.targetDate instanceof Date ? goal.targetDate : new Date(goal.targetDate || Date.now()),
                type: goal.type,
                priority: goal.priority || 0,
                userId: 1,
                monthId: activeMonth
              };
              
              await storage.updateGoal(goal.id, cleanGoal);
            } else {
              // Create new goal
              // Clean and validate the goal data
              const newGoal = {
                name: goal.name,
                description: goal.description || "",
                targetAmount: String(goal.targetAmount), // Convert to string for numeric column
                currentAmount: String(goal.currentAmount || 0), // Convert to string for numeric column
                targetDate: goal.targetDate instanceof Date ? goal.targetDate : new Date(goal.targetDate || Date.now()),
                type: goal.type,
                priority: goal.priority || 0,
                userId: 1,
                monthId: activeMonth,
                createdAt: new Date()
              };
              
              await storage.createGoal(newGoal);
            }
          }
        }
        
        // Save debts for active month
        if (debts && debts.length > 0) {
          for (const debt of debts) {
            if (debt.id && debt.id > 0) {
              // Update existing debt
              // Clean and validate the debt data
              const cleanDebt = {
                name: debt.name,
                balance: String(debt.balance), // Convert to string for numeric column
                interestRate: debt.interestRate ? String(debt.interestRate) : null,
                minimumPayment: debt.minimumPayment ? String(debt.minimumPayment) : null,
                priority: debt.priority || 0,
                dueDate: debt.dueDate instanceof Date ? debt.dueDate : (debt.dueDate ? new Date(debt.dueDate) : null),
                userId: 1,
                monthId: activeMonth
              };
              
              await storage.updateDebt(debt.id, cleanDebt);
            } else {
              // Create new debt
              // Clean and validate the debt data
              const newDebt = {
                name: debt.name,
                balance: String(debt.balance), // Convert to string for numeric column
                interestRate: debt.interestRate ? String(debt.interestRate) : null,
                minimumPayment: debt.minimumPayment ? String(debt.minimumPayment) : null,
                priority: debt.priority || 0,
                dueDate: debt.dueDate instanceof Date ? debt.dueDate : (debt.dueDate ? new Date(debt.dueDate) : null),
                userId: 1,
                monthId: activeMonth,
                createdAt: new Date()
              };
              
              await storage.createDebt(newDebt);
            }
          }
        }
      }
      
      // Return success response
      res.json({ 
        success: true,
        message: "Data saved successfully to database"
      });
    } catch (error) {
      console.error("Error saving data:", error);
      res.status(500).json({
        error: "Failed to save data",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });

  // Replit Database Endpoints
  
  // Endpoint to save data to Replit Database
  app.post("/api/replit-db/save", async (req, res) => {
    try {
      const { key, data } = req.body;
      
      if (!key) {
        return res.status(400).json({
          error: "Invalid request",
          message: "Key is required"
        });
      }
      
      const prefixedKey = `${DB_PREFIX}${key}`;
      await replitDb.set(prefixedKey, JSON.stringify(data));
      
      // Update last save timestamp
      await replitDb.set(`${DB_PREFIX}lastAutoSaveTime`, new Date().toISOString());
      
      res.json({
        success: true,
        message: "Data saved successfully"
      });
    } catch (error) {
      console.error(`Error saving data to Replit DB:`, error);
      res.status(500).json({
        error: "Failed to save data",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });
  
  // Endpoint to get data from Replit Database
  app.get("/api/replit-db/get/:key", async (req, res) => {
    try {
      const { key } = req.params;
      
      if (!key) {
        return res.status(400).json({
          error: "Invalid request",
          message: "Key is required"
        });
      }
      
      const prefixedKey = `${DB_PREFIX}${key}`;
      const storedData = await replitDb.get(prefixedKey);
      
      if (storedData === null || storedData === undefined) {
        return res.json({ data: null });
      }
      
      // Check if storedData is already an object (this happens with @replit/database)
      if (typeof storedData === 'object') {
        return res.json({ data: storedData });
      }
      
      // Otherwise, parse it from string
      try {
        res.json({
          data: JSON.parse(storedData as string)
        });
      } catch (parseError) {
        console.error(`Error parsing JSON data:`, parseError);
        res.json({ data: storedData });
      }
    } catch (error) {
      console.error(`Error retrieving data from Replit DB:`, error);
      res.status(500).json({
        error: "Failed to retrieve data",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });
  
  // Endpoint to delete data from Replit Database
  app.delete("/api/replit-db/delete/:key", async (req, res) => {
    try {
      const { key } = req.params;
      
      if (!key) {
        return res.status(400).json({
          error: "Invalid request",
          message: "Key is required"
        });
      }
      
      const prefixedKey = `${DB_PREFIX}${key}`;
      await replitDb.delete(prefixedKey);
      
      res.json({
        success: true,
        message: "Data deleted successfully"
      });
    } catch (error) {
      console.error(`Error deleting data from Replit DB:`, error);
      res.status(500).json({
        error: "Failed to delete data",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });
  
  // Endpoint to list keys from Replit Database
  app.get("/api/replit-db/list/:prefix?", async (req, res) => {
    try {
      const { prefix } = req.params;
      const fullPrefix = prefix ? `${DB_PREFIX}${prefix}` : DB_PREFIX;
      
      const keys = await replitDb.list(fullPrefix);
      
      // Remove DB_PREFIX from keys
      const processedKeys = Array.isArray(keys) 
        ? keys.map(key => key.substring(DB_PREFIX.length))
        : [];
      
      res.json({
        keys: processedKeys
      });
    } catch (error) {
      console.error(`Error listing keys from Replit DB:`, error);
      res.status(500).json({
        error: "Failed to list keys",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });
  
  // Endpoint to get last save time
  app.get("/api/replit-db/last-save-time", async (req, res) => {
    try {
      const timestamp = await replitDb.get(`${DB_PREFIX}lastAutoSaveTime`);
      
      res.json({
        timestamp: timestamp || null
      });
    } catch (error) {
      console.error(`Error getting last save time:`, error);
      res.status(500).json({
        error: "Failed to get last save time",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });
  
  // Endpoint to save data from localStorage (called by client)
  app.post("/api/replit-db/save-all", async (req, res) => {
    try {
      const { data } = req.body;
      
      if (!data || Object.keys(data).length === 0) {
        return res.status(400).json({
          error: "Invalid request",
          message: "No data provided for saving"
        });
      }
      
      // Save each key-value pair to the database
      for (const key of Object.keys(data)) {
        const prefixedKey = `${DB_PREFIX}${key}`;
        await replitDb.set(prefixedKey, JSON.stringify(data[key]));
      }
      
      // Set the last save time
      await replitDb.set(`${DB_PREFIX}lastAutoSaveTime`, new Date().toISOString());
      
      res.json({
        success: true,
        message: "Data saved successfully"
      });
    } catch (error) {
      console.error(`Error saving data to Replit DB:`, error);
      res.status(500).json({
        error: "Failed to save data",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });
  
  const httpServer = createServer(app);

  return httpServer;
}
