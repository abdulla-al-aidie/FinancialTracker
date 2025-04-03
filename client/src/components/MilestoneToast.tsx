import { useEffect } from "react";
import { useLoan } from "@/contexts/LoanContext";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { PartyPopper } from "lucide-react";

export default function MilestoneToast() {
  const { milestoneNotification, clearMilestoneNotification } = useLoan();
  const { toast } = useToast();

  useEffect(() => {
    if (milestoneNotification.show) {
      // Show toast when milestone reached
      toast({
        title: `${milestoneNotification.milestone}% Milestone Reached!`,
        description: milestoneNotification.message,
        action: (
          <ToastAction altText="Dismiss" onClick={clearMilestoneNotification}>
            Dismiss
          </ToastAction>
        ),
      });
      
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        clearMilestoneNotification();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [milestoneNotification, clearMilestoneNotification, toast]);

  return (
    <div 
      className={`fixed bottom-4 right-4 bg-green-500 text-white py-2 px-4 rounded-lg shadow-lg flex items-center cursor-pointer ${milestoneNotification.show ? 'block' : 'hidden'}`}
      onClick={clearMilestoneNotification}
    >
      <PartyPopper className="h-5 w-5 mr-2" />
      <div>
        <p className="font-medium">{milestoneNotification.message}</p>
        <p className="text-xs">Keep up the good work!</p>
      </div>
    </div>
  );
}
