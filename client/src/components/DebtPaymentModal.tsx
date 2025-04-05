import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, DollarSign } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { Debt, GoalType, ExpenseCategory } from "@/types/finance";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const paymentFormSchema = z.object({
  amount: z.coerce.number()
    .positive("Payment amount must be greater than zero")
    .min(1, "Payment amount must be at least $1"),
  date: z.date(),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

interface DebtPaymentModalProps {
  open: boolean;
  onClose: () => void;
  debt: Debt;
}

export default function DebtPaymentModal({ open, onClose, debt }: DebtPaymentModalProps) {
  const { updateDebt, goals, updateGoal, addExpense, activeMonth } = useFinance();
  
  // Find related debt payoff goal if any
  const relatedGoal = goals.find(
    goal => goal.type === GoalType.DebtPayoff && goal.name.includes(debt.name)
  );
  
  // Set up form with default values
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: debt.minimumPayment || 0,
      date: new Date(),
    },
  });
  
  function onSubmit(values: PaymentFormValues) {
    const paymentAmount = values.amount;
    const paymentDate = format(values.date, "yyyy-MM-dd");
    // Extract month ID (YYYY-MM) from payment date
    const paymentMonthId = paymentDate.substring(0, 7);
    
    // Initialize monthlyPayments if it doesn't exist
    const currentMonthlyPayments = debt.monthlyPayments || {};
    
    // IMPORTANT: Add payment to the monthly payment record
    const updatedMonthlyPayments = {
      ...currentMonthlyPayments,
      [paymentMonthId]: (currentMonthlyPayments[paymentMonthId] || 0) + paymentAmount
    };
    
    // Initialize monthly balances if it doesn't exist
    const currentMonthlyBalances = debt.monthlyBalances || {};
    
    // Calculate total paid across ALL months including the new payment
    let totalPaid = 0;
    Object.entries(updatedMonthlyPayments).forEach(([_, amount]) => {
      totalPaid += amount as number; 
    });
    
    // Calculate current balance based on total payments
    const newMonthBalance = Math.max(0, debt.originalPrincipal - totalPaid);
    
    // Update all monthly balances for the current and future months
    // This ensures the balance is updated consistently
    const updatedMonthlyBalances = {
      ...currentMonthlyBalances,
      // Set the current month's balance
      [paymentMonthId]: newMonthBalance
    };
    
    // Update the debt with the new balance and monthly tracking data
    const updatedDebt = {
      ...debt,
      // Always update the main balance field for proper display
      balance: newMonthBalance,
      // Also update the total paid amount
      totalPaid: totalPaid,
      // Mark as paid off if completely paid
      isPaidOff: newMonthBalance <= 0,
      // Track payments and balances by month
      monthlyPayments: updatedMonthlyPayments,
      monthlyBalances: updatedMonthlyBalances
    };
    
    // First create an expense entry for the payment with associatedDebtId
    // Do this before updating the debt to avoid circular updates
    addExpense({
      amount: paymentAmount,
      date: paymentDate,
      category: ExpenseCategory.DebtPayments,
      description: `Payment for ${debt.name}`,
      associatedDebtId: debt.id
    });
    
    // If there's a related goal, always apply payment to the goal
    if (relatedGoal) {
      // Initialize monthly progress if it doesn't exist
      const goalMonthlyProgress = relatedGoal.monthlyProgress || {};
      
      // Add payment to monthly goal progress
      const updatedGoalMonthlyProgress = {
        ...goalMonthlyProgress,
        [paymentMonthId]: (goalMonthlyProgress[paymentMonthId] || 0) + paymentAmount
      };
      
      // Recalculate total goal progress (sum of all monthly progress)
      const newCurrentAmount = Object.values(updatedGoalMonthlyProgress).reduce(
        (sum, amount) => sum + (amount as number), 0
      );
      
      // Update goal with new monthly progress and recalculated current amount
      updateGoal({
        ...relatedGoal,
        currentAmount: newCurrentAmount,
        monthlyProgress: updatedGoalMonthlyProgress,
        completed: newCurrentAmount >= relatedGoal.targetAmount
      });
    }
    
    // After handling related goal updates, update the debt (which triggers propagation)
    updateDebt(updatedDebt);
    
    onClose();
    form.reset();
  }
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Make Payment for {debt.name}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Amount field */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="0.00"
                        {...field}
                        type="number"
                        step="0.01"
                        className="pl-8"
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Current balance: ${(() => {
                      // Get monthly data from debt
                      const { monthlyBalances, monthlyPayments, originalPrincipal } = debt;
                      
                      // If we have a month-specific balance for the active month, use that
                      if (monthlyBalances && activeMonth && monthlyBalances[activeMonth] !== undefined) {
                        return monthlyBalances[activeMonth].toFixed(2);
                      }
                      
                      // Otherwise calculate from payments
                      const allPayments = monthlyPayments || {};
                      const totalPaid = Object.values(allPayments).reduce(
                        (sum, amount) => sum + amount, 0
                      );
                      
                      return Math.max(0, originalPrincipal - totalPaid).toFixed(2);
                    })()} | Minimum payment: ${debt.minimumPayment.toFixed(2)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Date field */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Payment Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Show informational message if there's a related goal */}
            {relatedGoal && (
              <div className="rounded-md border p-4 bg-blue-50">
                <div className="space-y-1 leading-none">
                  <p className="font-medium text-blue-800">Payment will be applied to goal</p>
                  <p className="text-sm text-blue-700">
                    This payment will automatically be applied to your "{relatedGoal.name}" goal progress
                  </p>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                Make Payment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}