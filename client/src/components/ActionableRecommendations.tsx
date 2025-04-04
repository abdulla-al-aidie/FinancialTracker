import { useState } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronRight, 
  Sparkles, 
  TrendingUp,
  LightbulbIcon,
  CheckCircle
} from "lucide-react";

export default function ActionableRecommendations() {
  const { 
    recommendations, 
    markRecommendationAsRead, 
    analyzeSpendingForGoals 
  } = useFinance();
  
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  // Sort recommendations by read status (unread first) and then by date
  const sortedRecommendations = [...recommendations]
    .sort((a, b) => {
      // First by read status
      if (a.isRead !== b.isRead) {
        return a.isRead ? 1 : -1;
      }
      // Then by date (newest first)
      return new Date(b.dateGenerated).getTime() - new Date(a.dateGenerated).getTime();
    });
  
  const handleOptimizeSpending = async () => {
    setIsOptimizing(true);
    try {
      await analyzeSpendingForGoals();
    } catch (error) {
      console.error("Error optimizing spending:", error);
    } finally {
      setIsOptimizing(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LightbulbIcon className="h-5 w-5 text-primary" />
              Quick Action Recommendations
            </CardTitle>
            <CardDescription>
              Personalized suggestions linked to optimization opportunities
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleOptimizeSpending}
            disabled={isOptimizing}
            className="flex items-center gap-2"
          >
            {isOptimizing ? "Analyzing..." : "Find Opportunities"}
            <TrendingUp className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedRecommendations.length > 0 ? (
            sortedRecommendations.slice(0, 3).map((rec) => (
              <Alert 
                key={rec.id} 
                variant={rec.isRead ? "default" : "default"} 
                className={`${rec.isRead ? 'bg-muted/30' : 'border-primary bg-primary/5'} transition-all hover:shadow-md`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <AlertTitle className="flex items-center gap-2 mb-1">
                      <Sparkles className="h-4 w-4 text-primary" />
                      {rec.type}
                      {!rec.isRead && (
                        <Badge variant="secondary" className="text-xs">New</Badge>
                      )}
                    </AlertTitle>
                    <AlertDescription>
                      {rec.description}
                      <div className="mt-1 text-sm text-muted-foreground">
                        <span className="font-medium">Potential Impact:</span> {rec.impact}
                      </div>
                    </AlertDescription>
                  </div>
                  
                  <div className="flex gap-2">
                    {!rec.isRead && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => markRecommendationAsRead(rec.id)}
                        className="h-8 w-8"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleOptimizeSpending}
                      className="h-8 gap-1"
                    >
                      Take Action
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Alert>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <LightbulbIcon className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <h3 className="text-lg font-medium mb-2">No recommendations yet</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                Run a spending optimization analysis to get personalized recommendations 
                based on your financial data.
              </p>
              <Button onClick={handleOptimizeSpending} disabled={isOptimizing}>
                {isOptimizing ? "Analyzing..." : "Find Optimization Opportunities"}
              </Button>
            </div>
          )}
          
          {sortedRecommendations.length > 3 && (
            <div className="flex justify-center pt-2">
              <Button variant="link" size="sm">
                View All Recommendations
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}