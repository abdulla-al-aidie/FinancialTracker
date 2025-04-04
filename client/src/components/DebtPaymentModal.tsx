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
  applyToGoal: z.boolean().default(true),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

interface DebtPaymentModalProps {
  open: boolean;
  onClose: () => void;
  debt: Debt;
}

export default function DebtPaymentModal({ open, onClose, debt }: DebtPaymentModalProps) {
  const { updateDebt, goals, updateGoal, addExpense } = useFinance();
  
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
      applyToGoal: true,
    },
  });
  
  function onSubmit(values: PaymentFormValues) {
    const paymentAmount = values.amount;
    const paymentDate = format(values.date, "yyyy-MM-dd");
    // Extract month ID (YYYY-MM) from payment date
    const paymentMonthId = paymentDate.substring(0, 7);
    
    // Initialize monthlyPayments if it doesn't exist
    const currentMonthlyPayments = debt.monthlyPayments || {};
    
    // Add payment to the monthly payment record
    const updatedMonthlyPayments = {
      ...currentMonthlyPayments,
      [paymentMonthId]: (currentMonthlyPayments[paymentMonthId] || 0) + paymentAmount
    };
    
    // Update the debt balance and track payment
    const updatedDebt = {
      ...debt,
      balance: Math.max(0, debt.balance - paymentAmount),
      totalPaid: debt.totalPaid + paymentAmount,
      monthlyPayments: updatedMonthlyPayments
    };
    
    // Update the debt
    updateDebt(updatedDebt);
    
    // Create an expense entry for the payment with associatedDebtId
    addExpense({
      amount: paymentAmount,
      date: paymentDate,
      category: ExpenseCategory.DebtPayments,
      description: `Payment for ${debt.name}`,
      associatedDebtId: debt.id
    });
    
    // If there's a related goal and user wants to apply payment to goal
    if (relatedGoal && values.applyToGoal) {
      updateGoal({
        ...relatedGoal,
        currentAmount: Math.min(relatedGoal.targetAmount, relatedGoal.currentAmount + paymentAmount),
      });
    }
    
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
                    Current balance: ${debt.balance.toFixed(2)} | Minimum payment: ${debt.minimumPayment.toFixed(2)}
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
            
            {/* Apply to goal field - only show if there's a related goal */}
            {relatedGoal && (
              <FormField
                control={form.control}
                name="applyToGoal"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 mt-1"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Apply to debt payoff goal</FormLabel>
                      <FormDescription>
                        Update your "{relatedGoal.name}" goal progress with this payment
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
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