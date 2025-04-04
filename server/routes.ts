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

      const response = await openaiClient.chat.completions.create({
        model: "gpt-3.5-turbo",
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
      
      // Check for API key issues
      if (error instanceof Error && 
          (error.message.includes("API key") || error.message.includes("authentication"))) {
        log("OpenAI API key error detected. Please check your API key configuration.");
        return res.status(500).json({
          error: "API Configuration Error",
          message: "There's an issue with the OpenAI API key. Please contact the administrator."
        });
      }
      
      // Handle other errors
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
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

      const response = await openaiClient.chat.completions.create({
        model: "gpt-3.5-turbo",
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

      const response = await openaiClient.chat.completions.create({
        model: "gpt-3.5-turbo",
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
  // No server-side routes needed for this application
  // All data is stored in client-side localStorage
  
  const httpServer = createServer(app);

  return httpServer;
}
