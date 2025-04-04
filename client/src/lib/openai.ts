import OpenAI from "openai";

// Using a reliable model that should be available to most API keys
const MODEL = "gpt-3.5-turbo";

// Get API key from environment
const apiKey = import.meta.env.VITE_OPENAI_API_KEY || "";

// Initialize OpenAI client with API key
export const openai = new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true // Note: For production, use a backend proxy
});

// Log if API key is missing
if (!apiKey) {
  console.warn("OpenAI API key is missing. AI features will not work properly.");
}

interface FinancialData {
  totalIncome: number;
  totalExpenses: number;
  netCashflow: number;
  savingsRate: number;
  topExpenseCategories: { category: string; amount: number }[];
  overBudgetCategories: string[];
  debtTotal: number;
  averageInterestRate: number;
}

export async function generateFinancialInsights(
  data: FinancialData
): Promise<{ type: string; description: string; impact: string }[]> {
  try {
    const prompt = `
      You are a financial advisor assistant. Based on the following financial data, generate detailed recommendations:
      
      Financial Summary:
      - Total Monthly Income: $${data.totalIncome.toFixed(2)}
      - Total Monthly Expenses: $${data.totalExpenses.toFixed(2)}
      - Net Cashflow: $${data.netCashflow.toFixed(2)}
      - Savings Rate: ${data.savingsRate.toFixed(1)}%
      - Top Expense Categories: ${data.topExpenseCategories.map((c) => `${c.category} ($${c.amount.toFixed(2)})`).join(", ")}
      - Over Budget Categories: ${data.overBudgetCategories.length > 0 ? data.overBudgetCategories.join(", ") : "None"}
      - Total Debt: $${data.debtTotal.toFixed(2)}
      - Average Interest Rate: ${data.averageInterestRate.toFixed(1)}%
      
      Generate 3-5 recommendations with:
      1. A type/category (e.g., "Budget Optimization", "Debt Reduction")
      2. A detailed description with specific actions
      3. A potential impact (e.g., "Save $X per month")
      
      Format as JSON array of objects with "type", "description", and "impact" fields.
    `;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      return [
        {
          type: "Error",
          description: "Unable to generate recommendations at this time.",
          impact: "No impact calculated",
        },
      ];
    }

    try {
      const parsedResponse = JSON.parse(content);
      if (Array.isArray(parsedResponse) && parsedResponse.length > 0) {
        return parsedResponse.map((item) => ({
          type: item.type || "Financial Insight",
          description: item.description || "No description provided",
          impact: item.impact || "Impact not calculated",
        }));
      }
      
      return [
        {
          type: "General Advice",
          description: "We couldn't generate personalized recommendations based on your current data.",
          impact: "Impact can't be calculated with limited data",
        },
      ];
    } catch (error) {
      console.error("Error parsing OpenAI response:", error);
      return [
        {
          type: "Error",
          description: "We encountered an issue processing the financial analysis.",
          impact: "No impact calculated",
        },
      ];
    }
  } catch (error: any) {
    console.error("Error calling OpenAI API:", error);
    
    // Check if it's an API key error
    if (error.message && error.message.includes("API key")) {
      return [
        {
          type: "API Configuration Error",
          description: "OpenAI API key is missing or invalid. Please provide a valid API key.",
          impact: "No impact calculated",
        },
      ];
    }
    
    return [
      {
        type: "Service Unavailable",
        description: "Our AI recommendation service is temporarily unavailable. Please try again later.",
        impact: "No impact calculated",
      },
    ];
  }
}

export async function categorizeTransaction(description: string): Promise<string> {
  try {
    const prompt = `
      Categorize this transaction into one of these categories:
      Housing, Transportation, Food, Healthcare, Insurance, Debt, Personal, Entertainment, Gifts, Education, Miscellaneous
      
      Transaction: "${description}"
      
      Respond with ONLY the category name.
    `;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 20,
    });

    const category = response.choices[0]?.message?.content?.trim() || "Miscellaneous";
    return category;
  } catch (error) {
    console.error("Error categorizing transaction:", error);
    return "Miscellaneous";
  }
}

export async function analyzeFinancialHealth(data: {
  income: number;
  expenses: number;
  debt: number;
  savingsRate: number;
}): Promise<{ score: number; feedback: string }> {
  try {
    const prompt = `
      Based on this financial data, provide a financial health score (0-100) and brief feedback:
      
      - Monthly Income: $${data.income.toFixed(2)}
      - Monthly Expenses: $${data.expenses.toFixed(2)}
      - Total Debt: $${data.debt.toFixed(2)}
      - Savings Rate: ${data.savingsRate.toFixed(1)}%
      
      Respond in JSON with "score" and "feedback" properties.
      Example: { "score": 75, "feedback": "Your savings rate is good, but your debt level is high." }
    `;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return {
        score: 50,
        feedback: "Unable to analyze financial health at this time.",
      };
    }

    try {
      const parsedResponse = JSON.parse(content);
      return {
        score: parsedResponse.score || 50,
        feedback: parsedResponse.feedback || "Analysis complete.",
      };
    } catch (error) {
      console.error("Error parsing OpenAI response:", error);
      return {
        score: 50,
        feedback: "Unable to analyze financial health at this time.",
      };
    }
  } catch (error) {
    console.error("Error analyzing financial health:", error);
    return {
      score: 50,
      feedback: "Unable to analyze financial health at this time.",
    };
  }
}