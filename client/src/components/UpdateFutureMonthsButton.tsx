import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

export default function UpdateFutureMonthsButton() {
  const { updateFutureMonths, months } = useFinance();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Check if there are at least two months to propagate between
  const hasEnoughMonths = months.length >= 2;
  
  const handleUpdateAllMonths = async () => {
    if (!hasEnoughMonths) {
      toast({
        title: "Not Enough Months",
        description: "You need at least two months to update. Add more months first.",
        variant: "destructive"
      });
      return;
    }
    
    setIsUpdating(true);
    
    try {
      await updateFutureMonths();
      // Toast notification is handled inside updateFutureMonths
    } catch (error) {
      console.error("Error updating months:", error);
      toast({
        title: "Update Failed",
        description: "There was an error updating your monthly data",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  return (
    <div className="flex items-center gap-2">
      <Button 
        onClick={handleUpdateAllMonths} 
        disabled={isUpdating || !hasEnoughMonths}
        variant="outline"
        className="w-full"
      >
        {isUpdating ? "Updating Months..." : "Propagate All Months Sequentially"}
      </Button>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <HelpCircle className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm">
            <p>This will propagate debt and goal data through all months in sequence:</p>
            <p className="mt-1 text-xs">
              • Jan → Feb → Mar → Apr → May → Jun<br />
              • Jul → Aug → Sep → Oct → Nov → Dec<br />
              • Dec → Jan (new year)
            </p>
            <p className="mt-1 text-xs">
              Changes flow from each month to the next, ensuring proper data progression.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}