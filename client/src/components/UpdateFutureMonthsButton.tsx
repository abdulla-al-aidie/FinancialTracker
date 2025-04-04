import { useState } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function UpdateFutureMonthsButton() {
  const [isUpdating, setIsUpdating] = useState(false);
  const { 
    months, 
    activeMonth, 
    goals,
    debts,
    updateFutureMonths,
  } = useFinance();
  const { toast } = useToast();

  // Count how many future months exist
  const futureMonthsCount = months.filter(
    month => month.id > activeMonth
  ).length;

  const handleUpdateFutureMonths = async () => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    try {
      // Call the context function to update all future months
      await updateFutureMonths();
      
      toast({
        title: "Future Months Updated",
        description: `Successfully propagated current goals and debts to ${futureMonthsCount} future month${futureMonthsCount !== 1 ? 's' : ''}.`,
        variant: "default"
      });
    } catch (error) {
      console.error("Error updating future months:", error);
      toast({
        title: "Update Failed",
        description: "There was a problem updating future months. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (futureMonthsCount === 0) {
    return null; // Don't show the button if there are no future months
  }

  return (
    <Button 
      onClick={handleUpdateFutureMonths}
      disabled={isUpdating}
      variant="outline"
      className="gap-2"
    >
      {isUpdating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : null}
      Save & Update Future Months ({futureMonthsCount})
    </Button>
  );
}