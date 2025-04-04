// OpenAI client services via secure backend proxy
import { apiRequest } from './queryClient';

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

type InsightResponse = Array<{ type: string; description: string; impact: string }>;
type CategoryResponse = { category: string };
type HealthResponse = { score: number; feedback: string };

/**
 * Generate financial insights by calling the backend API proxy
 */
export async function generateFinancialInsights(
  data: FinancialData
): Promise<{ type: string; description: string; impact: string }[]> {
  try {
    // Call our secure backend proxy instead of directly calling OpenAI
    const response = await fetch('/api/openai/generate-insights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }
    
    const insights: InsightResponse = await response.json();
    return insights;
  } catch (error: any) {
    console.error("Error calling insights API:", error);
    
    return [
      {
        type: "Service Unavailable",
        description: "Our AI recommendation service is temporarily unavailable. Please try again later.",
        impact: "No impact calculated",
      },
    ];
  }
}

/**
 * Categorize a transaction using AI via backend proxy
 */
export async function categorizeTransaction(description: string): Promise<string> {
  try {
    // Call our secure backend proxy
    const response = await fetch('/api/openai/categorize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ description }),
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }
    
    const data: CategoryResponse = await response.json();
    return data.category || "Miscellaneous";
  } catch (error) {
    console.error("Error categorizing transaction:", error);
    return "Miscellaneous";
  }
}

/**
 * Analyze financial health via backend proxy
 */
export async function analyzeFinancialHealth(data: {
  income: number;
  expenses: number;
  debt: number;
  savingsRate: number;
}): Promise<{ score: number; feedback: string }> {
  try {
    // Call our secure backend proxy
    const response = await fetch('/api/openai/analyze-health', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }
    
    const healthData: HealthResponse = await response.json();
    return {
      score: healthData.score || 50,
      feedback: healthData.feedback || "Analysis complete.",
    };
  } catch (error) {
    console.error("Error analyzing financial health:", error);
    return {
      score: 50,
      feedback: "Unable to analyze financial health at this time.",
    };
  }
}