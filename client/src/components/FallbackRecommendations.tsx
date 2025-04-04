import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";

// Fallback financial insights for when the OpenAI API is unavailable
export const FALLBACK_INSIGHTS = [
  {
    type: "Budget Optimization",
    description: "Consider reviewing your top expense categories and look for opportunities to reduce spending without significantly impacting your lifestyle. Small changes in daily habits can lead to substantial monthly savings.",
    impact: "Potential monthly savings"
  },
  {
    type: "Emergency Fund",
    description: "Aim to build an emergency fund covering 3-6 months of essential expenses. This provides financial security during unexpected events like medical emergencies or job loss.",
    impact: "Increased financial security"
  },
  {
    type: "Debt Management",
    description: "If you have multiple debts, consider using either the snowball method (paying smallest balances first) or avalanche method (focusing on highest interest rates first) to systematically reduce debt.",
    impact: "Reduced interest payments"
  },
  {
    type: "Automated Savings",
    description: "Set up automatic transfers to your savings account on paydays. This 'pay yourself first' approach ensures consistent saving before you have a chance to spend the money.",
    impact: "Improved saving habits"
  },
  {
    type: "Expense Tracking",
    description: "Regularly review your transactions and categorize them correctly. This helps identify spending patterns and areas where you might be overspending without realizing it.",
    impact: "Better financial awareness"
  }
];

interface FallbackRecommendationsProps {
  count?: number;
}

export default function FallbackRecommendations({ count = 3 }: FallbackRecommendationsProps) {
  // Take only the requested number of recommendations
  const recommendations = FALLBACK_INSIGHTS.slice(0, count);
  
  return (
    <div className="space-y-4">
      {recommendations.map((insight, index) => (
        <Card key={index}>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg">{insight.type}</CardTitle>
              <Badge variant="outline" className="ml-2">{insight.impact}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-sm text-foreground">
              {insight.description}
            </CardDescription>
          </CardContent>
          <CardFooter className="pt-0 pb-2">
            <div className="flex items-center text-xs text-muted-foreground">
              <Info className="h-3 w-3 mr-1" />
              <span>General advice (not personalized)</span>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}