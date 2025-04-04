import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, Search, BookOpen, Sparkles, GraduationCap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// Sample quick starter questions
const quickQuestions = [
  "What's the difference between a Roth IRA and a Traditional IRA?",
  "How do I build an emergency fund?",
  "What is dollar cost averaging?",
  "How do I start investing with little money?",
  "What are the best ways to pay off student loans?",
  "How do tax brackets work?",
  "What's the 50/30/20 budget rule?",
  "Should I pay off debt or invest first?"
];

export default function KnowledgeHub() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  const handleAskQuestion = async (questionToAsk: string = question) => {
    if (!questionToAsk.trim()) {
      toast({
        title: "Empty Question",
        description: "Please enter a question to get an answer.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/knowledge/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ question: questionToAsk })
      });

      if (!response.ok) {
        throw new Error(`Failed to get answer: ${response.statusText}`);
      }

      const data = await response.json();
      setAnswer(data.answer);
      
      // Add to search history if not already there
      if (!searchHistory.includes(questionToAsk)) {
        setSearchHistory(prev => [questionToAsk, ...prev].slice(0, 10));
      }
      
    } catch (error) {
      console.error("Error getting answer:", error);
      toast({
        title: "Error",
        description: "Failed to get an answer. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <BookOpen className="mr-2 h-8 w-8" />
            Knowledge Hub
          </h1>
          <p className="text-muted-foreground mt-1">
            Ask questions about personal finance and get expert answers
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="h-5 w-5 mr-2" />
                Ask a Question
              </CardTitle>
              <CardDescription>
                Ask any question about personal finance, investments, or financial planning
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="E.g., How do I start investing with little money?"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => handleAskQuestion()} 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Asking
                      </>
                    ) : (
                      "Ask"
                    )}
                  </Button>
                </div>

                {answer && (
                  <Card className="mt-4 bg-muted/40">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <GraduationCap className="h-5 w-5 mr-2 text-primary" />
                        Answer
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="whitespace-pre-line">
                        {answer}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Sparkles className="h-5 w-5 mr-2" />
                Quick Questions
              </CardTitle>
              <CardDescription>
                Popular financial questions to get you started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {quickQuestions.map((q, i) => (
                  <Button 
                    key={i} 
                    variant="outline" 
                    className="w-full justify-start h-auto py-2 px-3 text-left"
                    onClick={() => {
                      setQuestion(q);
                      handleAskQuestion(q);
                    }}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {searchHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Recent Searches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.map((q, i) => (
                    <Badge 
                      key={i} 
                      variant="outline" 
                      className="cursor-pointer"
                      onClick={() => {
                        setQuestion(q);
                        handleAskQuestion(q);
                      }}
                    >
                      {q.length > 30 ? q.substring(0, 30) + "..." : q}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}