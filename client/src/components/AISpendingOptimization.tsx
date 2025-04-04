import { useState } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { 
  Loader2, 
  TrendingUp, 
  Sparkles, 
  AlertTriangle, 
  ArrowDownIcon, 
  ArrowUpIcon, 
  TrendingDown, 
  CalendarIcon,
  BarChart3Icon
} from "lucide-react";

export default function AISpendingOptimization() {
  const { analyzeSpendingForGoals, months } = useFinance();
  
  const [isAnalyzingSpending, setIsAnalyzingSpending] = useState(false);
  const [optimizationData, setOptimizationData] = useState<{
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
    monthlyInsights: Array<{
      type: string;
      description: string;
      comparison: string;
      months: string[];
    }>;
  } | null>(null);

  // Function to analyze spending patterns for goal optimization
  const handleAnalyzeSpending = async () => {
    setIsAnalyzingSpending(true);
    try {
      const result = await analyzeSpendingForGoals();
      setOptimizationData(result);
    } catch (error) {
      console.error("Error analyzing spending:", error);
      toast({
        title: "Analysis Failed",
        description: "An error occurred while analyzing your spending patterns.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzingSpending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-xl font-bold">Spending Optimization</CardTitle>
              <CardDescription>
                AI-powered analysis to help you optimize your spending and reach goals faster
              </CardDescription>
            </div>
            <Button 
              variant="default" 
              onClick={handleAnalyzeSpending}
              disabled={isAnalyzingSpending}
            >
              {isAnalyzingSpending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Optimize Spending
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!optimizationData ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground">
                Click the "Optimize Spending" button to analyze your spending patterns and receive personalized recommendations for optimizing your budget.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {optimizationData && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Spending Optimization Results
                </CardTitle>
                <CardDescription>
                  AI-identified areas where you can adjust spending to reach your goals faster
                </CardDescription>
              </div>
              <Button variant="ghost" onClick={() => setOptimizationData(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {optimizationData.optimizationAreas.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <AlertTriangle className="h-12 w-12 text-yellow-500 mb-2" />
                <h3 className="text-lg font-medium mb-1">No Optimization Areas Found</h3>
                <p className="text-muted-foreground">
                  Your spending patterns appear well-balanced. Continue tracking your expenses 
                  to get more detailed recommendations.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card className="bg-primary/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">
                        Projected New Savings Rate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">
                        {optimizationData.projectedImpact.newSavingsRate.toFixed(1)}%
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-primary/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">
                        Monthly Savings Increase
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">
                        ${optimizationData.projectedImpact.monthlyIncrease.toFixed(2)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-primary/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">
                        Yearly Savings Increase
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">
                        ${optimizationData.projectedImpact.yearlyIncrease.toFixed(2)}
                      </p>
                    </CardContent>
                  </Card>
                </div>
                
                <h3 className="text-lg font-semibold mb-4">Optimization Areas</h3>
                <div className="space-y-6">
                  {optimizationData.optimizationAreas.map((area, index) => (
                    <div key={area.category} className="border rounded-lg p-4">
                      {index > 0 && <Separator className="my-4" />}
                      <div className="flex flex-col md:flex-row justify-between md:items-center mb-2">
                        <h4 className="text-lg font-medium">
                          {area.category}
                        </h4>
                        <div className="flex gap-2 mt-1 md:mt-0">
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            Current: ${area.currentSpending.toFixed(2)}
                          </Badge>
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            Potential Savings: ${area.potentialSavings.toFixed(2)}
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">
                        Recommended reduction: {area.recommendedReduction}%
                      </p>
                      
                      <div className="mt-3">
                        <h5 className="text-sm font-medium mb-2">Specific Suggestions:</h5>
                        <ul className="space-y-1 text-sm list-disc pl-5">
                          {area.specificSuggestions.map((suggestion, i) => (
                            <li key={i}>{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
                
                {optimizationData.monthlyInsights && optimizationData.monthlyInsights.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <BarChart3Icon className="h-5 w-5 mr-2 text-primary" />
                      Monthly Spending Insights
                    </h3>
                    <div className="space-y-4">
                      {optimizationData.monthlyInsights.map((insight, index) => (
                        <Card key={index} className="bg-muted/50">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              {insight.type === "Increase" && (
                                <ArrowUpIcon className="h-5 w-5 text-red-500 mt-1 flex-shrink-0" />
                              )}
                              {insight.type === "Decrease" && (
                                <ArrowDownIcon className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                              )}
                              {insight.type === "Pattern" && (
                                <TrendingUp className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
                              )}
                              {insight.type === "Trend" && (
                                <TrendingDown className="h-5 w-5 text-amber-500 mt-1 flex-shrink-0" />
                              )}
                              {insight.type === "Comparison" && (
                                <CalendarIcon className="h-5 w-5 text-purple-500 mt-1 flex-shrink-0" />
                              )}
                              
                              <div>
                                <div className="font-medium">{insight.description}</div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {insight.comparison}
                                </div>
                                {insight.months && insight.months.length > 0 && (
                                  <div className="flex gap-2 mt-2">
                                    {insight.months.map(month => (
                                      <Badge key={month} variant="outline" className="text-xs">
                                        {month}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}