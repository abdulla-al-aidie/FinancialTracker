import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useFinance } from "@/contexts/FinanceContext";
import { analyzeSurplusFunds } from "@/lib/openai";
import { AlertCircle, ArrowRight, CheckCircle2, Coins, DollarSign, LineChart, PiggyBank, Repeat } from "lucide-react";
import { formatCurrency } from "@/lib/calculations";
import { ExpenseCategory, Goal, GoalType } from "@/types/finance";

interface Recommendation {
  title: string;
  description: string;
  impact: string;
  percentageAllocation: number;
  priority: 'high' | 'medium' | 'low';
  benefits: string[];
  estimatedReturn?: string;
}

export default function SurplusFundsRecommendation() {
  const { toast } = useToast();
  const { 
    incomes, 
    expenses, 
    debts, 
    goals,
    netCashflow,
    totalIncome,
    totalExpenses,
    savingsRate
  } = useFinance();
  
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300';
      case 'medium': return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300';
    }
  };
  
  const getImpactColor = (impact: string) => {
    if (impact.includes('High')) return 'text-green-600 dark:text-green-400';
    if (impact.includes('Medium')) return 'text-amber-600 dark:text-amber-400';
    if (impact.includes('Low')) return 'text-blue-600 dark:text-blue-400';
    return 'text-foreground';
  };
  
  const generateRecommendations = async () => {
    if (netCashflow <= 0) {
      setError("You don't have any surplus funds this month. Try reducing expenses to create some surplus for recommendations.");
      setRecommendations([]);
      setSummary('');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Estimate emergency fund target (3-6 months of expenses)
      const emergencyFundTarget = totalExpenses * 6;
      
      // Estimate current emergency fund
      // We'll assume emergency fund is tracked as a goal with type "Emergency Fund"
      const emergencyFundGoal = goals.find(g => 
        g.type === GoalType.EmergencyFund || 
        g.name.toLowerCase().includes('emergency') || 
        g.name.toLowerCase().includes('rainy day')
      );
      
      const emergencyFundCurrent = emergencyFundGoal?.currentAmount || 0;
      const monthsCovered = emergencyFundCurrent > 0 ? emergencyFundCurrent / totalExpenses : 0;
      
      // Call the OpenAI API to get recommendations
      const result = await analyzeSurplusFunds({
        surplus: netCashflow,
        financialSituation: {
          totalIncome,
          totalExpenses,
          savingsRate,
          emergencyFundStatus: {
            currentAmount: emergencyFundCurrent,
            targetAmount: emergencyFundTarget,
            monthsOfExpensesCovered: monthsCovered
          }
        },
        debts: debts.map(debt => ({
          name: debt.name,
          balance: debt.balance,
          interestRate: debt.interestRate || 0,
          minimumPayment: debt.minimumPayment || 0,
          priority: debt.priority
        })),
        goals: goals.filter(g => !g.completed).map(goal => ({
          id: goal.id,
          name: goal.name,
          type: goal.type,
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount,
          targetDate: goal.targetDate,
          priority: goal.priority
        })),
        investmentPreference: 'moderate', // Default can be adjusted based on user preferences
        timeline: 'medium' // Default can be adjusted based on user preferences
      });
      
      setRecommendations(result.recommendations);
      setSummary(result.summary);
      
      toast({
        title: "Recommendations Generated",
        description: "We've analyzed your surplus funds and created personalized allocation recommendations.",
        variant: "default"
      });
    } catch (error) {
      console.error("Error generating surplus fund recommendations:", error);
      setError("We couldn't generate recommendations at this time. Please try again later.");
      
      toast({
        title: "Recommendation Error",
        description: "We couldn't analyze your surplus funds at this time. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    // Don't auto-generate on mount to avoid API costs
    // User will need to click the button
  }, []);
  
  const renderSkeletons = () => (
    <>
      <div className="space-y-3">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="space-y-3 mt-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </>
  );
  
  const renderEmptyState = () => (
    <div className="text-center py-8">
      <PiggyBank className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">No Recommendations Yet</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Click the button below to analyze your leftover money and get personalized recommendations on how to best allocate it.
      </p>
      <Button onClick={generateRecommendations}>
        Generate Recommendations
      </Button>
    </div>
  );
  
  const renderError = () => (
    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-center">
      <AlertCircle className="h-6 w-6 text-destructive mx-auto mb-2" />
      <h3 className="font-medium text-destructive mb-1">Could Not Generate Recommendations</h3>
      <p className="text-sm text-muted-foreground mb-4">{error}</p>
      <Button variant="outline" size="sm" onClick={generateRecommendations}>
        Try Again
      </Button>
    </div>
  );
  
  const renderRecommendations = () => (
    <>
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Summary</h3>
        <p className="text-muted-foreground">{summary}</p>
      </div>
      
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-medium">Recommended Allocation</h3>
        <Badge variant="outline" className="ml-2">
          {formatCurrency(netCashflow)} available
        </Badge>
      </div>
      
      <div className="space-y-4">
        {recommendations.map((rec, index) => (
          <Card key={index} className="overflow-hidden">
            <div className={`h-1 ${getPriorityColor(rec.priority)}`} />
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-base">{rec.title}</CardTitle>
                <Badge variant="outline" className={getPriorityColor(rec.priority)}>
                  {rec.priority.charAt(0).toUpperCase() + rec.priority.slice(1)} Priority
                </Badge>
              </div>
              <CardDescription>
                {formatCurrency(netCashflow * (rec.percentageAllocation / 100))} 
                {' '}({rec.percentageAllocation}% of surplus)
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-3">
              <p className="text-sm mb-3">{rec.description}</p>
              <div className="text-sm mb-3">
                <span className="font-medium">Impact: </span>
                <span className={getImpactColor(rec.impact)}>{rec.impact}</span>
              </div>
              {rec.estimatedReturn && (
                <div className="text-sm mb-3">
                  <span className="font-medium">Estimated Return: </span>
                  <span>{rec.estimatedReturn}</span>
                </div>
              )}
              <div className="text-sm">
                <span className="font-medium">Benefits:</span>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  {rec.benefits.map((benefit, i) => (
                    <li key={i} className="text-muted-foreground">{benefit}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="mt-6 flex justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          className="mr-2"
          onClick={generateRecommendations}
          disabled={loading}
        >
          <Repeat className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>
    </>
  );
  
  return (
    <div className="my-6">
      <h2 className="text-2xl font-bold tracking-tight mb-2">
        Surplus Funds Recommendations
      </h2>
      <p className="text-muted-foreground mb-6">
        Get AI-powered recommendations on how to best allocate your leftover money based on your financial situation.
      </p>
      
      <div className="bg-card rounded-lg border p-6">
        {loading ? renderSkeletons() : 
          error ? renderError() : 
            recommendations.length > 0 ? renderRecommendations() : 
              renderEmptyState()
        }
      </div>
    </div>
  );
}