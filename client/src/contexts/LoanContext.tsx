import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { LoanDetails, Payment, MilestoneNotification } from "../types/loan";
import { calculateRemainingBalance, calculatePercentPaid, calculatePayoffDate } from "@/lib/calculations";
import { useToast } from "@/hooks/use-toast";

// Default loan values
const DEFAULT_LOAN_DETAILS: LoanDetails = {
  principal: 0,
  interestRate: 0,
  monthlyPayment: 0
};

interface LoanContextType {
  loanDetails: LoanDetails;
  saveLoanDetails: (details: LoanDetails) => void;
  payments: Payment[];
  addPayment: (payment: Omit<Payment, "id">) => void;
  updatePayment: (payment: Payment) => void;
  deletePayment: (id: number) => void;
  currentBalance: number;
  percentPaid: number;
  payoffDate: { date: string; timeRemaining: string };
  milestoneNotification: MilestoneNotification;
  clearMilestoneNotification: () => void;
}

const LoanContext = createContext<LoanContextType | undefined>(undefined);

export function LoanProvider({ children }: { children: ReactNode }) {
  const [loanDetails, setLoanDetails] = useState<LoanDetails>(DEFAULT_LOAN_DETAILS);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [payoffDate, setPayoffDate] = useState({ date: "-", timeRemaining: "-" });
  const [percentPaid, setPercentPaid] = useState(0);
  const [lastMilestoneReached, setLastMilestoneReached] = useState(0);
  const [milestoneNotification, setMilestoneNotification] = useState<MilestoneNotification>({
    show: false,
    message: "",
    milestone: 0
  });
  
  const { toast } = useToast();

  // Load data from localStorage on initial render
  useEffect(() => {
    const savedLoanDetails = localStorage.getItem("loanDetails");
    const savedPayments = localStorage.getItem("payments");
    const savedMilestone = localStorage.getItem("lastMilestoneReached");
    
    if (savedLoanDetails) {
      setLoanDetails(JSON.parse(savedLoanDetails));
    }
    
    if (savedPayments) {
      setPayments(JSON.parse(savedPayments));
    }
    
    if (savedMilestone) {
      setLastMilestoneReached(JSON.parse(savedMilestone));
    }
  }, []);

  // Recalculate when loan details or payments change
  useEffect(() => {
    if (loanDetails.principal > 0) {
      const sortedPayments = [...payments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Calculate current balance
      const balance = calculateRemainingBalance(loanDetails, sortedPayments);
      setCurrentBalance(balance);
      
      // Calculate percentage paid
      const percent = calculatePercentPaid(loanDetails.principal, balance);
      setPercentPaid(percent);
      
      // Calculate payoff date
      const payoff = calculatePayoffDate(balance, loanDetails.monthlyPayment, loanDetails.interestRate);
      setPayoffDate(payoff);
      
      // Check for milestones
      checkForMilestones(percent);
    }
  }, [loanDetails, payments]);

  // Check if we've hit a new milestone
  const checkForMilestones = (percent: number) => {
    const milestones = [25, 50, 75, 100];
    
    // Find the highest milestone reached
    let highestMilestone = 0;
    for (const milestone of milestones) {
      if (percent >= milestone) {
        highestMilestone = milestone;
      }
    }
    
    // Check if we've reached a new milestone
    if (highestMilestone > lastMilestoneReached) {
      setLastMilestoneReached(highestMilestone);
      localStorage.setItem("lastMilestoneReached", JSON.stringify(highestMilestone));
      
      // Set milestone notification
      setMilestoneNotification({
        show: true,
        message: `Congratulations! You've paid off ${highestMilestone}% of your loan!`,
        milestone: highestMilestone
      });
      
      // Show toast
      toast({
        title: `${highestMilestone}% Milestone Reached!`,
        description: `You've paid off ${highestMilestone}% of your student loan!`,
        variant: "success"
      });
    }
  };

  // Save loan details
  const saveLoanDetails = (details: LoanDetails) => {
    setLoanDetails(details);
    localStorage.setItem("loanDetails", JSON.stringify(details));
  };

  // Add a new payment
  const addPayment = (payment: Omit<Payment, "id">) => {
    const newPayment = { ...payment, id: Date.now() };
    const updatedPayments = [...payments, newPayment];
    setPayments(updatedPayments);
    localStorage.setItem("payments", JSON.stringify(updatedPayments));
    
    toast({
      title: "Payment Added",
      description: "Your payment has been successfully recorded.",
      variant: "default"
    });
  };

  // Update an existing payment
  const updatePayment = (payment: Payment) => {
    const updatedPayments = payments.map(p => p.id === payment.id ? payment : p);
    setPayments(updatedPayments);
    localStorage.setItem("payments", JSON.stringify(updatedPayments));
    
    toast({
      title: "Payment Updated",
      description: "Your payment has been successfully updated.",
      variant: "default"
    });
  };

  // Delete a payment
  const deletePayment = (id: number) => {
    const updatedPayments = payments.filter(p => p.id !== id);
    setPayments(updatedPayments);
    localStorage.setItem("payments", JSON.stringify(updatedPayments));
    
    toast({
      title: "Payment Deleted",
      description: "Your payment has been successfully removed.",
      variant: "default"
    });
  };

  // Clear milestone notification
  const clearMilestoneNotification = () => {
    setMilestoneNotification(prev => ({ ...prev, show: false }));
  };

  return (
    <LoanContext.Provider
      value={{
        loanDetails,
        saveLoanDetails,
        payments,
        addPayment,
        updatePayment,
        deletePayment,
        currentBalance,
        percentPaid,
        payoffDate,
        milestoneNotification,
        clearMilestoneNotification
      }}
    >
      {children}
    </LoanContext.Provider>
  );
}

export function useLoan() {
  const context = useContext(LoanContext);
  if (context === undefined) {
    throw new Error("useLoan must be used within a LoanProvider");
  }
  return context;
}
