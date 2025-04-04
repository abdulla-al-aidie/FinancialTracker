import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, Search, BookOpen, Sparkles, GraduationCap, Clock } from "lucide-react";
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
          <Card className="overflow-hidden border-blue-100 shadow-md">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-slate-50 border-b pb-4">
              <CardTitle className="flex items-center">
                <Search className="h-5 w-5 mr-2 text-primary" />
                Ask a Financial Question
              </CardTitle>
              <CardDescription>
                Get expert answers about personal finance, investments, or financial planning
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    placeholder="E.g., How do I start investing with little money?"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => handleAskQuestion()} 
                    disabled={isLoading}
                    className="sm:w-auto w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Answer...
                      </>
                    ) : (
                      "Ask Question"
                    )}
                  </Button>
                </div>

                {answer && (
                  <Card className="mt-4 bg-gradient-to-br from-blue-50 to-slate-50 shadow-md">
                    <CardHeader className="pb-2 border-b">
                      <CardTitle className="text-lg flex items-center">
                        <GraduationCap className="h-5 w-5 mr-2 text-primary" />
                        Financial Insight
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="prose prose-slate max-w-none">
                        {/* Process the answer to create a consistent, aesthetically pleasing format */}
                        {(() => {
                          // Split content into paragraphs
                          const paragraphs = answer.split('\n\n').filter(p => p.trim());
                          
                          // First paragraph is the main answer - displayed prominently
                          const mainAnswer = paragraphs[0] || "";
                          
                          // Rest of the content
                          const restContent = paragraphs.slice(1);
                          
                          return (
                            <>
                              {/* Main answer - styled prominently */}
                              <p className="text-lg font-medium text-primary mb-4">{mainAnswer}</p>
                              
                              {/* Rest of the content */}
                              <div className="space-y-4 text-gray-700">
                                {restContent.map((paragraph, idx) => {
                                  // Handle section headings (with bullet points)
                                  if (paragraph.startsWith('• ')) {
                                    const headingMatch = paragraph.match(/^•\s+([^:]+)$/);
                                    if (headingMatch) {
                                      return (
                                        <h3 key={`heading-${idx}`} className="text-md font-semibold text-gray-800 mt-5 mb-2 border-b pb-1">
                                          {headingMatch[1]}
                                        </h3>
                                      );
                                    }
                                  }
                                  
                                  // Handle bullet point lists
                                  if (paragraph.includes('\n• ')) {
                                    const lines = paragraph.split('\n');
                                    
                                    // Check if first line is a heading
                                    const firstLine = lines[0];
                                    const restLines = lines.slice(1);
                                    
                                    return (
                                      <div key={`list-${idx}`} className="space-y-1">
                                        {firstLine.startsWith('• ') ? (
                                          <h3 className="text-md font-semibold text-gray-800 mt-4 mb-2 border-b pb-1">
                                            {firstLine.replace(/^•\s+/, '')}
                                          </h3>
                                        ) : (
                                          <p>{firstLine}</p>
                                        )}
                                        <ul className="space-y-2 pl-2 mt-2">
                                          {restLines.map((line, lineIdx) => 
                                            line.startsWith('• ') ? (
                                              <li key={`bullet-${lineIdx}`} className="flex items-start">
                                                <span className="text-primary mr-2 mt-1">•</span>
                                                <span>{line.replace(/^•\s+/, '')}</span>
                                              </li>
                                            ) : (
                                              <p key={`text-${lineIdx}`}>{line}</p>
                                            )
                                          )}
                                        </ul>
                                      </div>
                                    );
                                  }
                                  
                                  // Handle single bullet points
                                  if (paragraph.startsWith('• ')) {
                                    return (
                                      <div key={`single-bullet-${idx}`} className="flex items-start">
                                        <span className="text-primary mr-2 mt-1">•</span>
                                        <span>{paragraph.replace(/^•\s+/, '')}</span>
                                      </div>
                                    );
                                  }
                                  
                                  // Regular paragraphs
                                  return <p key={`para-${idx}`}>{paragraph}</p>;
                                })}
                              </div>
                            </>
                          );
                        })()}
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
          <Card className="overflow-hidden border-blue-100 shadow-md">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b pb-2">
              <CardTitle className="flex items-center text-base md:text-lg flex-wrap">
                <Sparkles className="h-5 w-5 mr-2 flex-shrink-0 text-primary" />
                <span>Quick Questions</span>
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Popular financial questions to get you started
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="space-y-2">
                {quickQuestions.map((q, i) => (
                  <Button 
                    key={i} 
                    variant="outline" 
                    className="w-full justify-start h-auto py-2 px-3 text-left text-sm whitespace-normal hover:bg-blue-50/50 transition-colors"
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
            <Card className="overflow-hidden border-blue-100 shadow-md">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b pb-2">
                <CardTitle className="flex items-center text-base">
                  <Clock className="h-4 w-4 mr-2 flex-shrink-0 text-primary" />
                  <span>Recent Searches</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="flex flex-wrap gap-2">
                  {searchHistory.map((q, i) => (
                    <Badge 
                      key={i} 
                      variant="outline" 
                      className="cursor-pointer hover:bg-blue-50/70 transition-colors py-1.5 border-blue-100"
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