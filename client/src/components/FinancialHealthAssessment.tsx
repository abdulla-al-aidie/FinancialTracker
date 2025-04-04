import { useState, useEffect } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { 
  Loader2, 
  HeartPulse,
  ShieldCheck,
  TrendingUp,
  PiggyBank,
  CreditCard,
  AlertTriangle
} from "lucide-react";
import { analyzeFinancialHealth } from "@/lib/openai";

export default function FinancialHealthAssessment() {
  const { 
    totalIncome, 
    totalExpenses, 
    netCashflow,
    savingsRate,
    debts
  } = useFinance();
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [healthFeedback, setHealthFeedback] = useState<string | null>(null);
  
  // Calculate debt-to-income ratio (monthly debt payments / monthly income)
  const totalDebtBalance = debts.reduce((sum, debt) => sum + debt.balance, 0);
  const estimatedMonthlyDebtPayments = debts.reduce(
    (sum, debt) => sum + (debt.minimumPayment || debt.balance * 0.03), // Use minimum payment or 3% of balance
    0
  );
  const debtToIncomeRatio = totalIncome > 0 
    ? (estimatedMonthlyDebtPayments / totalIncome) * 100
    : 0;
  
  // Determine health indicators
  const determineScoreCategory = (score: number) => {
    if (score >= 80) return { label: "Excellent", color: "text-emerald-500" };
    if (score >= 65) return { label: "Good", color: "text-blue-500" };
    if (score >= 50) return { label: "Fair", color: "text-amber-500" };
    return { label: "Needs Attention", color: "text-red-500" };
  };
  
  // Function to analyze financial health
  const handleAnalyzeHealth = async () => {
    setIsAnalyzing(true);
    try {
      // Call financial health analysis function
      const result = await analyzeFinancialHealth({
        income: totalIncome,
        expenses: totalExpenses,
        debt: totalDebtBalance,
        savingsRate: savingsRate
      });
      
      setHealthScore(result.score);
      setHealthFeedback(result.feedback);
    } catch (error) {
      console.error("Error analyzing financial health:", error);
      toast({
        title: "Analysis Failed",
        description: "An error occurred while analyzing your financial health.",
        variant: "destructive"
      });
      
      // Set fallback values when API fails
      setHealthScore(calculateDefaultHealthScore());
      setHealthFeedback("Based on your current income, expenses, and debt, your financial situation requires review. Focus on building emergency savings and managing debt.");
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Calculate a default health score when the API isn't available
  const calculateDefaultHealthScore = (): number => {
    let score = 50; // Base score
    
    // Add points for positive savings rate
    if (savingsRate > 20) score += 15;
    else if (savingsRate > 10) score += 10;
    else if (savingsRate > 5) score += 5;
    else if (savingsRate < 0) score -= 10;
    
    // Subtract points for high debt-to-income ratio
    if (debtToIncomeRatio > 36) score -= 15;
    else if (debtToIncomeRatio > 28) score -= 10;
    else if (debtToIncomeRatio > 20) score -= 5;
    else if (debtToIncomeRatio < 15) score += 5;
    
    // Ensure the score is between 0 and 100
    return Math.max(0, Math.min(100, score));
  };
  
  // Health assessment indicators
  const healthIndicators = [
    {
      name: "Savings Rate",
      value: savingsRate.toFixed(1) + "%",
      icon: <PiggyBank className="h-4 w-4" />,
      status: savingsRate >= 20 ? "good" : savingsRate >= 10 ? "moderate" : "needs-improvement",
      description: savingsRate >= 20 
        ? "Excellent savings rate" 
        : savingsRate >= 10 
          ? "Good, but aim for 20%+" 
          : "Increase your savings rate"
    },
    {
      name: "Debt-to-Income",
      value: debtToIncomeRatio.toFixed(1) + "%",
      icon: <CreditCard className="h-4 w-4" />,
      status: debtToIncomeRatio <= 20 ? "good" : debtToIncomeRatio <= 36 ? "moderate" : "needs-improvement",
      description: debtToIncomeRatio <= 20 
        ? "Healthy debt levels" 
        : debtToIncomeRatio <= 36 
          ? "Monitor your debt levels" 
          : "Reduce your debt burden"
    },
    {
      name: "Monthly Cashflow",
      value: `$${netCashflow.toFixed(2)}`,
      icon: <TrendingUp className="h-4 w-4" />,
      status: netCashflow > 0 ? "good" : "needs-improvement",
      description: netCashflow > 0 
        ? "Positive cashflow" 
        : "Spending exceeds income"
    },
    {
      name: "Emergency Fund",
      value: (savingsRate > 0 && netCashflow > 0) ? "Building" : "At Risk",
      icon: <ShieldCheck className="h-4 w-4" />,
      status: (savingsRate > 0 && netCashflow > 0) ? "moderate" : "needs-improvement",
      description: (savingsRate > 0 && netCashflow > 0)
        ? "Continue building your emergency fund" 
        : "Start building an emergency fund"
    }
  ];
  
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-primary" />
              Financial Health Assessment
            </CardTitle>
            <CardDescription>
              A comprehensive analysis of your current financial well-being
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleAnalyzeHealth}
            disabled={isAnalyzing}
            className="flex items-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <HeartPulse className="h-4 w-4" />
                <span>Analyze Health</span>
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {healthScore !== null ? (
            <>
              <div className="flex flex-col items-center p-4 bg-muted/30 rounded-lg">
                <h3 className="text-lg font-medium mb-2">Your Financial Health Score</h3>
                <div className="w-full max-w-xs mb-2">
                  <Progress value={healthScore} className="h-3" />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-2xl font-bold ${determineScoreCategory(healthScore).color}`}>
                    {healthScore}
                  </span>
                  <Badge 
                    variant="outline" 
                    className={`${determineScoreCategory(healthScore).color} border-current`}
                  >
                    {determineScoreCategory(healthScore).label}
                  </Badge>
                </div>
                {healthFeedback && (
                  <p className="text-sm text-center mt-3 text-muted-foreground">
                    {healthFeedback}
                  </p>
                )}
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-3">Key Health Indicators</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {healthIndicators.map((indicator) => (
                    <div key={indicator.name} className="bg-muted/20 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className={`
                            ${indicator.status === 'good' ? 'text-emerald-500' : 
                              indicator.status === 'moderate' ? 'text-amber-500' : 'text-red-500'}
                          `}>
                            {indicator.icon}
                          </div>
                          <span className="text-sm font-medium">{indicator.name}</span>
                        </div>
                        <span className="text-sm font-semibold">{indicator.value}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{indicator.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="flex justify-center mb-4">
                <HeartPulse className="h-12 w-12 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-medium mb-2">Assess Your Financial Health</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                Click the "Analyze Health" button to get a comprehensive assessment of your 
                financial well-being based on income, spending, debt levels, and savings.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto text-sm">
                {healthIndicators.map((indicator) => (
                  <div key={indicator.name} className="flex items-center gap-2 p-2 bg-muted/20 rounded">
                    <div className="text-muted-foreground">{indicator.icon}</div>
                    <span>{indicator.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}