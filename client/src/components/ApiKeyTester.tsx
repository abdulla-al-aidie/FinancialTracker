import { useState } from "react";
import { Button } from "@/components/ui/button";
import { openai } from "@/lib/openai";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";

export default function ApiKeyTester() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const testApiKey = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      // Make a simple request to the OpenAI API
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Hello, are you working? Just say yes if you are." }],
        max_tokens: 10
      });
      
      const content = response.choices[0]?.message?.content;
      
      if (content) {
        setTestResult({
          success: true,
          message: `API key is working! Response: "${content}"`
        });
      } else {
        setTestResult({
          success: false,
          message: "API returned an empty response. The key might be valid but there could be other issues."
        });
      }
    } catch (error: any) {
      console.error("API Test Error:", error);
      
      let errorMessage = "Unknown error occurred";
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      if (error.status === 401) {
        errorMessage = "API key is invalid or has expired.";
      } else if (error.status === 429) {
        errorMessage = "Rate limit exceeded or insufficient credits on your account.";
      }
      
      setTestResult({
        success: false,
        message: `Error: ${errorMessage}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>OpenAI API Key Tester</CardTitle>
        <CardDescription>
          Test if your OpenAI API key is working correctly
        </CardDescription>
      </CardHeader>
      <CardContent>
        {testResult && (
          <Alert variant={testResult.success ? "default" : "destructive"} className="mb-4">
            <div className="flex items-start">
              {testResult.success ? (
                <CheckCircle className="h-4 w-4 mr-2 mt-1 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 mr-2 mt-1" />
              )}
              <div>
                <AlertTitle>
                  {testResult.success ? "Success" : "Error"}
                </AlertTitle>
                <AlertDescription>
                  {testResult.message}
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={testApiKey} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Testing..." : "Test API Key"}
        </Button>
      </CardFooter>
    </Card>
  );
}