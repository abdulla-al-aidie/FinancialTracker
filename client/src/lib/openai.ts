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
type GoalPriorityResponse = Array<{ 
  goalId: number; 
  priorityScore: number; 
  reasoning: string; // Detailed reasoning provided by the AI for the priority score
}>;
type GoalRecommendationResponse = Array<{
  goalId: number;
  recommendations: Array<{ 
    description: string; 
    potentialImpact: string;
    estimatedTimeReduction: string;
    requiredActions: string[];
  }>;
}>;

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

/**
 * Prioritize financial goals using comprehensive AI analysis of the user's financial situation
 * This calculates the optimal priority order for user goals based on all financial data including
 * goals, expenses, income, debts, and their respective details
 */
export async function prioritizeGoals(data: {
  goals: Array<{
    id: number;
    name: string;
    type: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: string;
    description: string;
  }>;
  financialSnapshot: {
    totalIncome: number;
    totalExpenses: number; 
    savingsRate: number;
    debtTotal: number;
    monthlyNetCashflow: number;
  };
  expenseBreakdown: Array<{ 
    category: string; 
    amount: number;
    percentOfTotalExpenses: number;
  }>;
  // New parameters for better analysis
  debts?: Array<{
    name: string;
    balance: number;
    interestRate: number;
    minimumPayment: number;
    priority?: number;
    originalPrincipal: number;
    totalPaid: number;
  }>;
  income?: Array<{
    type: string;
    amount: number;
    description?: string;
  }>;
}): Promise<Array<{ goalId: number; priorityScore: number; reasoning: string }>> {
  try {
    const response = await fetch('/api/openai/prioritize-goals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }
    
    const priorityData: GoalPriorityResponse = await response.json();
    return priorityData;
  } catch (error) {
    console.error("Error prioritizing goals:", error);
    // Return empty array to handle error gracefully in UI
    return [];
  }
}

/**
 * Generate recommendations for achieving goals faster
 * This analyzes spending patterns and suggests specific actions to meet goals ahead of target dates
 */
export async function generateGoalRecommendations(data: {
  goal: {
    id: number;
    name: string;
    type: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: string;
    description: string;
    priority: number;
  };
  financialData: {
    income: Array<{ source: string; amount: number }>;
    expenses: Array<{ category: string; amount: number }>;
    savingsRate: number;
    cashflowTrend: Array<{ month: string; netAmount: number }>;
  };
  spendingInsights: {
    nonEssentialSpending: number;
    topExpenseCategories: Array<{ category: string; amount: number; isReducible: boolean }>;
  };
}): Promise<Array<{
  description: string;
  potentialImpact: string;
  estimatedTimeReduction: string;
  requiredActions: string[];
}>> {
  try {
    const response = await fetch('/api/openai/goal-recommendations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }
    
    const recommendationsData: GoalRecommendationResponse = await response.json();
    // Return the recommendations for the specified goal
    return recommendationsData[0]?.recommendations || [];
  } catch (error) {
    console.error("Error generating goal recommendations:", error);
    return [];
  }
}

/**
 * Analyze spending patterns for optimization opportunities
 * This identifies specific expense areas where optimization can accelerate goal achievement
 */
export async function analyzeSpendingPatterns(data: {
  expenses: Array<{ 
    category: string; 
    amount: number; 
    date: string;
    description?: string; 
  }>;
  income: number;
  targetSavingsRate: number;
}): Promise<{
  optimizationAreas: Array<{
    category: string;
    currentSpending: number;
    recommendedReduction: number;
    potentialSavings: number;
    specificSuggestions: string[];
  }>;
  projectedImpact: {
    newSavingsRate: number;
    monthlyIncrease: number;
    yearlyIncrease: number;
  };
}> {
  try {
    const response = await fetch('/api/openai/analyze-spending', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }
    
    const analysisData = await response.json();
    return analysisData;
  } catch (error) {
    console.error("Error analyzing spending patterns:", error);
    return {
      optimizationAreas: [],
      projectedImpact: {
        newSavingsRate: 0,
        monthlyIncrease: 0,
        yearlyIncrease: 0
      }
    };
  }
}