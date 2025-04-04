import { useState } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Goal, GoalType } from "@/types/finance";
import { toast } from "@/hooks/use-toast";
import { Loader2, Target, Sparkles, TrendingUp, Clock, CheckCircle, AlertTriangle } from "lucide-react";

export default function AIGoalPrioritization() {
  const { 
    goals, 
    prioritizeGoalsWithAI, 
    getGoalRecommendations,
    analyzeSpendingForGoals
  } = useFinance();
  
  const [isPrioritizing, setIsPrioritizing] = useState(false);
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState<number | null>(null);
  const [isAnalyzingSpending, setIsAnalyzingSpending] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
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
  } | null>(null);

  // Function to prioritize goals using AI
  const handlePrioritizeGoals = async () => {
    if (goals.length === 0) {
      toast({
        title: "No Goals Found",
        description: "Please add at least one goal to use this feature.",
        variant: "destructive"
      });
      return;
    }
    
    setIsPrioritizing(true);
    try {
      await prioritizeGoalsWithAI();
    } catch (error) {
      console.error("Error prioritizing goals:", error);
      toast({
        title: "Prioritization Failed",
        description: "An error occurred while prioritizing your goals.",
        variant: "destructive"
      });
    } finally {
      setIsPrioritizing(false);
    }
  };

  // Function to generate recommendations for a specific goal
  const handleGetRecommendations = async (goalId: number) => {
    setIsGeneratingRecommendations(goalId);
    try {
      await getGoalRecommendations(goalId);
      // Find the updated goal with recommendations to display
      const goal = goals.find(g => g.id === goalId);
      if (goal) {
        setSelectedGoal(goal);
      }
    } catch (error) {
      console.error("Error generating recommendations:", error);
    } finally {
      setIsGeneratingRecommendations(null);
    }
  };

  // Function to analyze spending patterns for goal optimization
  const handleAnalyzeSpending = async () => {
    setIsAnalyzingSpending(true);
    try {
      const result = await analyzeSpendingForGoals();
      setOptimizationData(result);
    } catch (error) {
      console.error("Error analyzing spending:", error);
    } finally {
      setIsAnalyzingSpending(false);
    }
  };

  // Function to render priority badge with appropriate color
  const renderPriorityBadge = (priority: number | undefined) => {
    // Set default priority to 5 (medium) if not explicitly set
    const priorityValue = priority !== undefined ? priority : 5;
    
    if (priorityValue >= 8) {
      return <Badge className="bg-red-500 hover:bg-red-600">Critical Priority: {priorityValue}/10</Badge>;
    } else if (priorityValue >= 5) {
      return <Badge className="bg-amber-500 hover:bg-amber-600">Medium Priority: {priorityValue}/10</Badge>;
    } else {
      return <Badge className="bg-green-500 hover:bg-green-600">Low Priority: {priorityValue}/10</Badge>;
    }
  };

  // Function to render goal type badge
  const renderGoalTypeBadge = (type: GoalType) => {
    if (type === GoalType.Saving) {
      return <Badge className="bg-blue-500 hover:bg-blue-600">Saving</Badge>;
    } else {
      return <Badge className="bg-purple-500 hover:bg-purple-600">Debt Payoff</Badge>;
    }
  };

  // Sort goals by priority (highest first)
  const sortedGoals = [...goals].sort((a, b) => {
    const priorityA = a.priority || 0;
    const priorityB = b.priority || 0;
    return priorityB - priorityA;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Goal Optimization</h2>
          <p className="text-muted-foreground">
            Use AI to prioritize your goals and get personalized recommendations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="default" 
            onClick={handlePrioritizeGoals}
            disabled={isPrioritizing || goals.length === 0}
          >
            {isPrioritizing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Target className="mr-2 h-4 w-4" />
                Prioritize Goals
              </>
            )}
          </Button>
        </div>
      </div>

      {sortedGoals.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Goals Found</CardTitle>
            <CardDescription>
              Create financial goals to use the AI prioritization and recommendation system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              You haven't created any financial goals yet. Add goals in the Goals tab to get
              personalized recommendations and prioritization.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedGoals.map((goal) => (
            <Card key={goal.id} className="transition-all hover:shadow-md">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{goal.name}</CardTitle>
                    <CardDescription>
                      Target: ${goal.targetAmount.toLocaleString()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {renderGoalTypeBadge(goal.type)}
                    {renderPriorityBadge(goal.priority)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Progress:</span>
                    <span className="text-sm font-medium">
                      ${goal.currentAmount.toLocaleString()} of ${goal.targetAmount.toLocaleString()}
                      {" "}
                      ({Math.round((goal.currentAmount / goal.targetAmount) * 100)}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary" 
                      style={{ 
                        width: `${Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)}%`
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <Clock className="h-4 w-4" />
                    <span className="text-muted-foreground">
                      Target Date: {new Date(goal.targetDate).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {goal.aiRecommendations && goal.aiRecommendations.length > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center gap-1 mb-1">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="font-medium">AI Recommendations</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {/* Show truncated description but ensure it's not too long for the card */}
                        {goal.aiRecommendations[0].description.length > 150 
                          ? `${goal.aiRecommendations[0].description.substring(0, 150)}...` 
                          : goal.aiRecommendations[0].description}
                        <div className="mt-1 flex items-center text-xs">
                          <span className="font-medium text-primary">
                            Impact: {goal.aiRecommendations[0].potentialImpact}
                          </span>
                          <span className="mx-2">•</span>
                          <span>
                            {goal.aiRecommendations[0].estimatedTimeReduction}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="secondary" 
                  className="w-full"
                  onClick={() => handleGetRecommendations(goal.id)} 
                  disabled={isGeneratingRecommendations !== null}
                >
                  {isGeneratingRecommendations === goal.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      {goal.aiRecommendations && goal.aiRecommendations.length > 0
                        ? "View All Recommendations"
                        : "Get Recommendations"
                      }
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {selectedGoal && selectedGoal.aiRecommendations && selectedGoal.aiRecommendations.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Recommendations for {selectedGoal.name}
                </CardTitle>
                <CardDescription>
                  AI-generated insights to help you achieve your goal faster
                </CardDescription>
              </div>
              <Button variant="ghost" onClick={() => setSelectedGoal(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {selectedGoal.aiRecommendations.map((rec, index) => (
                <div key={rec.id} className="pb-4">
                  {index > 0 && <Separator className="mb-4" />}
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">
                      {index + 1}. {rec.description}
                    </h3>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant={
                        rec.potentialImpact.toLowerCase().includes('high') ? 'destructive' :
                        rec.potentialImpact.toLowerCase().includes('medium') ? 'default' : 'outline'
                      }>
                        {rec.potentialImpact} impact
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {rec.estimatedTimeReduction}
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <p className="text-sm font-medium mb-1">Required actions:</p>
                      <ul className="space-y-1">
                        {rec.requiredActions.map((action, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {optimizationData && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Spending Optimization Analysis
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

                <h3 className="text-lg font-medium mb-4">Recommended Spending Adjustments</h3>
                <div className="space-y-4">
                  {optimizationData.optimizationAreas.map((area, index) => (
                    <Card key={index} className="overflow-hidden">
                      <div className="border-l-4 pl-4 py-4 pr-6" style={{ borderColor: getColorForCategory(area.category) }}>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-base">{area.category}</h4>
                            <div className="flex items-center gap-4 text-sm mt-1">
                              <span>Current: ${area.currentSpending.toFixed(2)}</span>
                              <span className="flex items-center gap-1 text-green-600">
                                <span>Potential Savings: ${area.potentialSavings.toFixed(2)}</span>
                              </span>
                            </div>
                          </div>
                          <Badge>
                            {Math.round((area.recommendedReduction / area.currentSpending) * 100)}% reduction
                          </Badge>
                        </div>
                        
                        <div className="mt-3">
                          <p className="text-sm font-medium mb-1">Suggestions:</p>
                          <ul className="space-y-1">
                            {area.specificSuggestions.map((suggestion, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper function to get a color based on expense category
function getColorForCategory(category: string): string {
  const categoryColors: Record<string, string> = {
    "Entertainment and Dining Out": "#f97316", // orange
    "Subscriptions and Memberships": "#8b5cf6", // purple
    "Personal Care and Clothing": "#ec4899", // pink
    "Transportation": "#3b82f6", // blue
    "Miscellaneous": "#6b7280", // gray
    "Pet Expenses": "#84cc16" // lime
  };
  
  return categoryColors[category] || "#6b7280"; // Default to gray if category not found
}