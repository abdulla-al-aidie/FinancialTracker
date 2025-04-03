import OpenAI from "openai";

// The newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
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

export async function generateFinancialInsights(data: FinancialData): Promise<string[]> {
  try {
    const prompt = `
      You are a financial advisor assistant. Based on the following financial data, provide 3-5 specific, actionable recommendations to help improve the user's financial situation.
      
      Financial Summary:
      - Total Monthly Income: $${data.totalIncome.toFixed(2)}
      - Total Monthly Expenses: $${data.totalExpenses.toFixed(2)}
      - Net Cashflow: $${data.netCashflow.toFixed(2)}
      - Savings Rate: ${data.savingsRate.toFixed(1)}%
      - Top Expense Categories: ${data.topExpenseCategories.map(c => `${c.category} ($${c.amount.toFixed(2)})`).join(', ')}
      - Over Budget Categories: ${data.overBudgetCategories.length > 0 ? data.overBudgetCategories.join(', ') : 'None'}
      - Total Debt: $${data.debtTotal.toFixed(2)}
      - Average Interest Rate: ${data.averageInterestRate.toFixed(1)}%
      
      Provide your recommendations in JSON format as an array of strings. Each recommendation should be specific, actionable, and based on the data above. Format the response exactly like this:
      ["Recommendation 1", "Recommendation 2", "Recommendation 3"]
    `;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return ["Unable to generate recommendations at this time."];
    }

    try {
      const parsedResponse = JSON.parse(content);
      return Array.isArray(parsedResponse) ? parsedResponse : [];
    } catch (error: any) {
      console.error("Error parsing OpenAI response:", error);
      return ["Unable to process recommendations. Please try again later."];
    }
  } catch (error: any) {
    console.error("Error calling OpenAI API:", error);
    
    // Check if it's an API key error
    if (error.message && error.message.includes('API key')) {
      return ["OpenAI API key is missing or invalid. Please provide a valid API key in your environment variables."];
    }
    
    return ["Unable to generate recommendations at this time. Please try again later."];
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