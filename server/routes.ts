import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

// Import OpenAI for server-side API calls
import OpenAI from "openai";
import { log } from "./vite";

// Get API key from environment variable
const apiKey = process.env.OPENAI_API_KEY || "";

// Log API key status (but not the actual key)
log(`OpenAI API key ${apiKey ? "is available" : "is missing"}`);

// Initialize OpenAI client with API key from environment variable
const openaiClient = new OpenAI({
  apiKey: apiKey
});

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
      const { goals, financialSnapshot, expenseBreakdown } = req.body;
      
      // Ensure we have goals to analyze
      if (!goals || !Array.isArray(goals) || goals.length === 0) {
        return res.status(400).json({
          error: "Invalid request",
          message: "No goals provided for prioritization"
        });
      }

      const prompt = `
        As an AI financial advisor, prioritize these financial goals based on the financial data provided.
        Assign each goal a priority score from 1-10 (10 being highest) and provide reasoning.
        
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
        
        Based on the current financial situation:
        1. Prioritize debt-related goals when debt is significant
        2. Prioritize emergency funding if it's not adequate
        3. Consider time sensitivity of goals
        4. Evaluate realistic achievement potential within the timeframe
        5. Consider the current progress toward each goal
        
        Respond with a JSON array containing objects with these properties:
        - goalId: the ID of the goal
        - priorityScore: number from 1-10
        - reasoning: brief explanation for the score
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
      const { expenses, income, targetSavingsRate } = req.body;
      
      if (!expenses || !Array.isArray(expenses) || expenses.length === 0) {
        return res.status(400).json({
          error: "Invalid request",
          message: "No expense data provided for analysis"
        });
      }

      const totalSpending = expenses.reduce((sum, expense) => sum + expense.amount, 0);
      const currentSavingsRate = income > 0 ? ((income - totalSpending) / income) * 100 : 0;

      const prompt = `
        As a financial analyst, analyze these expenses to find optimization opportunities to reach a target savings rate.
        
        CURRENT FINANCIAL SITUATION:
        - Monthly Income: $${income}
        - Total Monthly Expenses: $${totalSpending}
        - Current Savings Rate: ${currentSavingsRate.toFixed(1)}%
        - Target Savings Rate: ${targetSavingsRate}%
        
        EXPENSE BREAKDOWN:
        ${expenses.map((exp: { category: string; amount: number; date: string; description?: string }) => 
          `- ${exp.category}: $${exp.amount} (${exp.date})${exp.description ? ` - ${exp.description}` : ''}`
        ).join('\n')}
        
        Based on common financial wisdom and typical spending patterns:
        1. Identify the top areas where spending could be optimized
        2. Suggest specific, actionable reductions for each area
        3. Calculate the potential impact on the savings rate
        4. Provide realistic specific suggestions for each category
        
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
  
  // All data is stored in client-side localStorage
  
  const httpServer = createServer(app);

  return httpServer;
}
