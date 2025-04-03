import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Zap } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { Expense, Income, Budget, Goal, Debt, Recommendation } from "@/types/finance";

export default function AIInsightsGenerator() {
  const { 
    incomes, 
    expenses, 
    budgets, 
    goals, 
    debts, 
    generateRecommendations,
    totalIncome,
    totalExpenses,
    netCashflow,
    savingsRate
  } = useFinance();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  const handleGenerateInsights = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    
    try {
      // Call the generateRecommendations function from the finance context
      // Since it's now async, we need to properly await it
      await generateRecommendations();
    } catch (error) {
      console.error("Error generating insights:", error);
      setGenerationError("Failed to generate insights. Please try again later.");
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Calculate financial summary for the AI to use
  const financialSummary = {
    incomeCount: incomes.length,
    expenseCount: expenses.length,
    averageIncome: incomes.length > 0 
      ? incomes.reduce((sum, income) => sum + income.amount, 0) / incomes.length 
      : 0,
    averageExpense: expenses.length > 0 
      ? expenses.reduce((sum, expense) => sum + expense.amount, 0) / expenses.length 
      : 0,
    highestExpenseCategory: expenses.length > 0
      ? Object.entries(
          expenses.reduce((acc, expense) => {
            acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
            return acc;
          }, {} as Record<string, number>)
        )
        .sort((a, b) => b[1] - a[1])[0][0]
      : "None",
    overBudgetCategories: budgets
      .filter(budget => budget.spent > budget.limit)
      .map(budget => budget.category),
    goalsProgress: goals.map(goal => ({
      name: goal.name,
      progress: (goal.currentAmount / goal.targetAmount) * 100
    })),
    totalDebt: debts.reduce((sum, debt) => sum + debt.balance, 0),
    avgInterestRate: debts.length > 0
      ? debts.reduce((sum, debt) => sum + debt.interestRate, 0) / debts.length
      : 0
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>AI Financial Insights</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleGenerateInsights}
            disabled={isGenerating}
            className="flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                <span>Generate New Insights</span>
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {generationError ? (
          <div className="rounded-md bg-red-50 p-4 text-red-700 text-sm">
            {generationError}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md bg-blue-50 p-4">
              <p className="text-sm text-blue-800 mb-2 font-medium">
                Financial AI Assistant
              </p>
              <p className="text-sm text-blue-700">
                Our AI can analyze your financial data to provide personalized recommendations.
                Click the button above to generate new insights based on your latest transactions,
                budgets, goals, and spending patterns.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="font-medium mb-1 text-gray-900">Income Summary</p>
                <p className="text-gray-600">Total: ${totalIncome.toFixed(2)}</p>
                <p className="text-gray-600">Sources: {financialSummary.incomeCount}</p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="font-medium mb-1 text-gray-900">Expense Summary</p>
                <p className="text-gray-600">Total: ${totalExpenses.toFixed(2)}</p>
                <p className="text-gray-600">Categories: {financialSummary.expenseCount}</p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="font-medium mb-1 text-gray-900">Savings</p>
                <p className="text-gray-600">Net: ${netCashflow.toFixed(2)}</p>
                <p className="text-gray-600">Rate: {savingsRate.toFixed(1)}%</p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="font-medium mb-1 text-gray-900">Debt</p>
                <p className="text-gray-600">Total: ${financialSummary.totalDebt.toFixed(2)}</p>
                <p className="text-gray-600">Avg Rate: {financialSummary.avgInterestRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}