import OpenAI from "openai";

// Using gpt-4o-mini which is more cost-effective than gpt-4o
const MODEL = "gpt-4o-mini";

// Initialize OpenAI client with the API key directly 
// (This is not ideal for production but works for our development environment)
export const openai = new OpenAI({
  apiKey: "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",
  dangerouslyAllowBrowser: true // Note: For production, you would typically proxy requests through your backend
});

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

export async function generateFinancialInsights(data: FinancialData): Promise<{type: string; description: string; impact: string}[]> {
  try {
    const prompt = `
      You are a financial advisor assistant with expertise across personal finance. Based on the following financial data, generate detailed, specific, and personalized recommendations to help improve the user's financial situation.
      
      Financial Summary:
      - Total Monthly Income: $${data.totalIncome.toFixed(2)}
      - Total Monthly Expenses: $${data.totalExpenses.toFixed(2)}
      - Net Cashflow: $${data.netCashflow.toFixed(2)}
      - Savings Rate: ${data.savingsRate.toFixed(1)}%
      - Top Expense Categories: ${data.topExpenseCategories.map(c => `${c.category} ($${c.amount.toFixed(2)})`).join(', ')}
      - Over Budget Categories: ${data.overBudgetCategories.length > 0 ? data.overBudgetCategories.join(', ') : 'None'}
      - Total Debt: $${data.debtTotal.toFixed(2)}
      - Average Interest Rate: ${data.averageInterestRate.toFixed(1)}%
      
      Generate 4-6 unique recommendations covering different aspects of the user's finances:
      1. Specific budget adjustments
      2. Debt management strategies
      3. Spending pattern optimizations
      4. Savings opportunities
      5. Income enhancement possibilities
      6. Investment considerations
      
      For each recommendation, provide:
      1. A concise type/category (e.g., "Budget Optimization", "Debt Reduction", "Income Growth")
      2. A detailed, personalized description with specific actions (at least 2-3 sentences)
      3. A clear quantification of the potential impact (e.g., "Save $X per month", "Reduce interest payments by Y%", "Reach goal Z months earlier")
      
      Format your response as a JSON array of objects, each with "type", "description", and "impact" fields. Use realistic numbers based on the financial data provided. Ensure each recommendation is diverse and not repetitive of others.
      
      Example format:
      [
        {
          "type": "Budget Optimization",
          "description": "Consider reducing your spending on Entertainment by 15%, which is currently higher than average for your income level. Limiting streaming subscriptions to 2-3 services and using free alternatives for others could help. Additionally, look for discounted activities through services like Groupon.",
          "impact": "Potential savings of $87 per month, accelerating your Emergency Fund goal by approximately 3 months."
        },
        {...}
      ]
    `;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7 // Add some variability to responses
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return [{
        type: "Error",
        description: "Unable to generate recommendations at this time.",
        impact: "No impact calculated"
      }];
    }

    try {
      const parsedResponse = JSON.parse(content);
      if (Array.isArray(parsedResponse) && parsedResponse.length > 0) {
        return parsedResponse.map(item => ({
          type: item.type || "Financial Insight",
          description: item.description || "No description provided",
          impact: item.impact || "Impact not calculated"
        }));
      } else {
        return [{
          type: "General Advice",
          description: "We couldn't generate personalized recommendations based on your current data. Try adding more transactions and budget information.",
          impact: "Impact can't be calculated with limited data"
        }];
      }
    } catch (error: any) {
      console.error("Error parsing OpenAI response:", error);
      return [{
        type: "Error",
        description: "We encountered an issue processing the financial analysis. Our team has been notified.",
        impact: "No impact calculated"
      }];
    }
  } catch (error: any) {
    console.error("Error calling OpenAI API:", error);
    
    // Check if it's an API key error
    if (error.message && error.message.includes('API key')) {
      return [{
        type: "API Configuration Error",
        description: "OpenAI API key is missing or invalid. Please provide a valid API key in your environment variables.",
        impact: "No impact calculated"
      }];
    }
    
    return [{
      type: "Service Unavailable",
      description: "Our AI recommendation service is temporarily unavailable. Please try again later.",
      impact: "No impact calculated"
    }];
  }
}

export async function categorizeTransaction(description: string): Promise<string> {
  try {
    const prompt = `
      You are a financial categorization assistant. Based on the following transaction description, categorize it into one of these categories:
      - Housing
      - Transportation
      - Food
      - Healthcare
      - Insurance & Personal Protection
      - Debt & Loans
      - Personal & Family
      - Entertainment & Leisure
      - Gifts & Charity
      - Education & Professional Development
      - Miscellaneous & Other
      
      Transaction: "${description}"
      
      Respond with ONLY the category name, nothing else.
    `;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 20
    });

    const category = response.choices[0]?.message?.content?.trim() || "Miscellaneous & Other";
    return category;
  } catch (error: any) {
    console.error("Error categorizing transaction:", error);
    return "Miscellaneous & Other";
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
      You are a financial health analysis assistant. Based on the following financial data, provide a financial health score (0-100) and brief feedback.
      
      Financial Data:
      - Monthly Income: $${data.income.toFixed(2)}
      - Monthly Expenses: $${data.expenses.toFixed(2)}
      - Total Debt: $${data.debt.toFixed(2)}
      - Savings Rate: ${data.savingsRate.toFixed(1)}%
      
      Respond in JSON format with a score and feedback property. The score should be a number between 0 and 100. The feedback should be a brief 1-2 sentence explanation of the score.
      Example: { "score": 75, "feedback": "Your savings rate is good, but your debt level is moderately high. Focus on reducing high-interest debt while maintaining your savings rate." }
    `;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { 
        score: 50, 
        feedback: "Unable to analyze financial health at this time." 
      };
    }

    try {
      const parsedResponse = JSON.parse(content);
      return {
        score: parsedResponse.score || 50,
        feedback: parsedResponse.feedback || "Analysis complete."
      };
    } catch (error: any) {
      console.error("Error parsing OpenAI response:", error);
      return { 
        score: 50, 
        feedback: "Unable to analyze financial health at this time." 
      };
    }
  } catch (error: any) {
    console.error("Error analyzing financial health:", error);
    return { 
      score: 50, 
      feedback: "Unable to analyze financial health at this time." 
    };
  }
}