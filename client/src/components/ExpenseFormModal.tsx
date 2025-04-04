import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Trash2 } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { Expense, ExpenseCategory, Debt, GoalType } from "@/types/finance";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const expenseFormSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  date: z.date(),
  category: z.nativeEnum(ExpenseCategory),
  description: z.string().optional(),
  associatedDebtId: z.number().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

interface ExpenseFormModalProps {
  open: boolean;
  onClose: () => void;
  expense?: Expense; // Optional for edit mode
}

export default function ExpenseFormModal({ open, onClose, expense }: ExpenseFormModalProps) {
  const { addExpense, updateExpense, deleteExpense, categorizeExpense, debts, updateDebt, goals, updateGoal } = useFinance();
  const isEditMode = !!expense;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Set up form with empty default values for new entries
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amount: undefined,
      date: new Date(),
      category: ExpenseCategory.Miscellaneous,
      description: "",
      associatedDebtId: undefined,
    }
  });
  
  // Set form values when opened or when expense changes
  useEffect(() => {
    if (expense && open) {
      // For editing existing entries - populate with expense data
      form.reset({
        amount: expense.amount,
        date: new Date(expense.date),
        category: expense.category,
        description: expense.description,
        associatedDebtId: (expense as any).associatedDebtId,
      });
    } else if (open) {
      // For new entries - reset to blank form
      form.reset({
        amount: undefined,
        date: new Date(),
        category: ExpenseCategory.Miscellaneous,
        description: "",
        associatedDebtId: undefined,
      });
    }
  }, [form, expense, open]);
  
  // Auto-categorize when description changes if we're not in edit mode
  const watchDescription = form.watch("description");
  const watchCategory = form.watch("category");
  
  useEffect(() => {
    if (!isEditMode && watchDescription && watchDescription.length > 3) {
      const suggestedCategory = categorizeExpense(watchDescription);
      form.setValue("category", suggestedCategory);
    }
  }, [watchDescription, isEditMode, categorizeExpense, form]);
  
  function onSubmit(values: ExpenseFormValues) {
    // Create expense data with required fields
    const expenseData = {
      date: format(values.date, "yyyy-MM-dd"),
      amount: values.amount,
      category: values.category,
      // Only include description if it's not empty
      ...(values.description ? { description: values.description } : {}),
      // Include associatedDebtId if it's a debt payment
      ...(values.category === ExpenseCategory.DebtPayments && values.associatedDebtId 
          ? { associatedDebtId: values.associatedDebtId } 
          : {})
    };

    // If this is a debt payment and we have a debtId, update the debt balance
    if (values.category === ExpenseCategory.DebtPayments && values.associatedDebtId) {
      // Find the debt
      const debtToUpdate = debts.find(debt => debt.id === values.associatedDebtId);
      
      if (debtToUpdate) {
        // Create an automatic description if none was provided
        if (!expenseData.description) {
          expenseData.description = `Payment towards ${debtToUpdate.name}`;
        }
        
        // Extract month ID (YYYY-MM) from payment date for monthly tracking
        const paymentDate = format(values.date, "yyyy-MM-dd");
        const paymentMonthId = paymentDate.substring(0, 7);
        
        // Initialize or update the monthly payments record
        const currentMonthlyPayments = debtToUpdate.monthlyPayments || {};
        const updatedMonthlyPayments = {
          ...currentMonthlyPayments,
          [paymentMonthId]: (currentMonthlyPayments[paymentMonthId] || 0) + values.amount
        };
        
        // Get the current month's starting balance or calculate from original principal and payments
        let startingBalanceForMonth = debtToUpdate.originalPrincipal;
        
        // Look for the previous month's balance as starting point
        const monthParts = paymentMonthId.split('-');
        let prevYear = parseInt(monthParts[0]);
        let prevMonth = parseInt(monthParts[1]) - 1;
        
        if (prevMonth === 0) {
          prevMonth = 12;
          prevYear -= 1;
        }
        
        const prevMonthId = `${prevYear}-${prevMonth.toString().padStart(2, '0')}`;
        
        // Initialize monthly balances if it doesn't exist
        const currentMonthlyBalances = debtToUpdate.monthlyBalances || {};
        
        // If we have a balance for the previous month, use that as our starting point
        if (currentMonthlyBalances[prevMonthId] !== undefined) {
          startingBalanceForMonth = currentMonthlyBalances[prevMonthId];
        }
        
        // Calculate new month-specific balance
        // Starting balance minus the current month's payments (including this one)
        const newMonthBalance = Math.max(0, startingBalanceForMonth - 
          (updatedMonthlyPayments[paymentMonthId] || 0));
        
        // Update the monthly balances record - ONLY for this month
        const updatedMonthlyBalances = {
          ...currentMonthlyBalances,
          [paymentMonthId]: newMonthBalance
        };
        
        // Calculate month-specific payments for tracking purposes
        const monthlyPaymentAmount = updatedMonthlyPayments[paymentMonthId] || 0;
        
        // Update the debt with ONLY month-specific changes
        // Do NOT update the main balance field which affects all months
        const updatedDebt = {
          ...debtToUpdate,
          monthlyPayments: updatedMonthlyPayments,
          monthlyBalances: updatedMonthlyBalances
        };
        
        // Update the debt
        updateDebt(updatedDebt);
        
        // Find related debt payoff goal if any (first by debt ID, then by name)
        const relatedGoal = goals.find(
          goal => goal.type === GoalType.DebtPayoff && goal.associatedDebtId === debtToUpdate.id
        ) || goals.find(
          goal => goal.type === GoalType.DebtPayoff && 
                 !goal.associatedDebtId && 
                 goal.name.includes(debtToUpdate.name)
        );
        
        // If there's a related goal, update its progress by month
        if (relatedGoal) {
          // Initialize monthly progress if it doesn't exist
          const goalMonthlyProgress = relatedGoal.monthlyProgress || {};
          
          // Add payment to monthly goal progress
          const updatedGoalMonthlyProgress = {
            ...goalMonthlyProgress,
            [paymentMonthId]: (goalMonthlyProgress[paymentMonthId] || 0) + values.amount
          };
          
          // Calculate new total progress (sum of all monthly progress)
          const newTotalProgress = Object.values(updatedGoalMonthlyProgress).reduce(
            (sum, value) => sum + value, 0
          );
          
          updateGoal({
            ...relatedGoal,
            // No longer update currentAmount directly - use only month-specific progress
            monthlyProgress: updatedGoalMonthlyProgress
          });
        }
      }
    }

    if (isEditMode && expense) {
      // If editing an existing expense, we need to handle debt payments appropriately
      if (expense.category === ExpenseCategory.DebtPayments && 
          (expense as any).associatedDebtId && 
          (values.category !== ExpenseCategory.DebtPayments || 
           values.associatedDebtId !== (expense as any).associatedDebtId ||
           values.amount !== expense.amount)) {
            
        // We're changing a debt payment - need to reverse the old payment first
        const oldDebtId = (expense as any).associatedDebtId;
        const debtToReverse = debts.find(debt => debt.id === oldDebtId);
        
        if (debtToReverse) {
          // Get the month of the original payment
          const paymentMonthId = expense.date.substring(0, 7);
          
          // Reverse the payment on the old debt - ONLY for the specific month
          const updatedDebt = {
            ...debtToReverse
            // Remove balance and totalPaid updates - we no longer update these
          };
          
          // Update monthly payment tracking if possible
          if (debtToReverse.monthlyPayments) {
            const currentMonthlyPayments = { ...debtToReverse.monthlyPayments };
            
            if (currentMonthlyPayments[paymentMonthId]) {
              currentMonthlyPayments[paymentMonthId] = Math.max(
                0, 
                currentMonthlyPayments[paymentMonthId] - expense.amount
              );
            }
            
            updatedDebt.monthlyPayments = currentMonthlyPayments;
          }
          
          // Update monthly balance tracking if possible
          if (debtToReverse.monthlyBalances) {
            const currentMonthlyBalances = { ...debtToReverse.monthlyBalances };
            
            // Update the balance for the month this expense occurred in
            if (currentMonthlyBalances[paymentMonthId] !== undefined) {
              currentMonthlyBalances[paymentMonthId] = 
                currentMonthlyBalances[paymentMonthId] + expense.amount;
            }
            
            updatedDebt.monthlyBalances = currentMonthlyBalances;
          }
          
          // Update the debt with reversed payment
          updateDebt(updatedDebt);
          
          // Find related debt payoff goal if any (first by debt ID, then by name)
          const relatedGoal = goals.find(
            goal => goal.type === GoalType.DebtPayoff && goal.associatedDebtId === debtToReverse.id
          ) || goals.find(
            goal => goal.type === GoalType.DebtPayoff && 
                   !goal.associatedDebtId && 
                   goal.name.includes(debtToReverse.name)
          );
          
          // If there's a related goal, update its progress by removing the amount
          if (relatedGoal) {
            // Update monthly progress tracking
            const monthlyProgress = { ...relatedGoal.monthlyProgress };
            
            if (monthlyProgress[paymentMonthId]) {
              monthlyProgress[paymentMonthId] = Math.max(
                0,
                monthlyProgress[paymentMonthId] - expense.amount
              );
            }
            
            // Recalculate total progress
            const newTotalProgress = Object.values(monthlyProgress).reduce(
              (sum, value) => sum + value, 0
            );
            
            updateGoal({
              ...relatedGoal,
              // No longer update currentAmount directly
              monthlyProgress: monthlyProgress
            });
          }
        }
      }
      
      updateExpense({
        ...expense,
        ...expenseData,
      });
    } else {
      addExpense(expenseData);
    }
    
    onClose();
    form.reset();
  }
  
  // Handle expense deletion
  const handleDelete = () => {
    if (expense) {
      // If this was a debt payment, we need to update the debt record
      if (expense.category === ExpenseCategory.DebtPayments && (expense as any).associatedDebtId) {
        const debtId = (expense as any).associatedDebtId;
        const debtToUpdate = debts.find(debt => debt.id === debtId);
        
        if (debtToUpdate) {
          // Get the month of the payment
          const paymentMonthId = expense.date.substring(0, 7);
          
          // Reverse the payment impact on the debt - ONLY for the specific month
          const updatedDebt = {
            ...debtToUpdate
            // No longer update the main balance field
          };
          
          // Update monthly payment tracking if possible
          if (debtToUpdate.monthlyPayments) {
            const currentMonthlyPayments = { ...debtToUpdate.monthlyPayments };
            
            if (currentMonthlyPayments[paymentMonthId]) {
              currentMonthlyPayments[paymentMonthId] = Math.max(
                0, 
                currentMonthlyPayments[paymentMonthId] - expense.amount
              );
            }
            
            updatedDebt.monthlyPayments = currentMonthlyPayments;
          }
          
          // Update monthly balance tracking if possible
          if (debtToUpdate.monthlyBalances) {
            const currentMonthlyBalances = { ...debtToUpdate.monthlyBalances };
            
            // Update the balance for the month this expense occurred in
            if (currentMonthlyBalances[paymentMonthId] !== undefined) {
              currentMonthlyBalances[paymentMonthId] = 
                currentMonthlyBalances[paymentMonthId] + expense.amount;
            }
            
            updatedDebt.monthlyBalances = currentMonthlyBalances;
          }
          
          // Update the debt with reversed payment
          updateDebt(updatedDebt);
          
          // Find related debt payoff goal if any (first by debt ID, then by name)
          const relatedGoal = goals.find(
            goal => goal.type === GoalType.DebtPayoff && goal.associatedDebtId === debtToUpdate.id
          ) || goals.find(
            goal => goal.type === GoalType.DebtPayoff && 
                   !goal.associatedDebtId && 
                   goal.name.includes(debtToUpdate.name)
          );
          
          // If there's a related goal, update its progress by removing the amount
          if (relatedGoal) {
            // Update monthly progress tracking
            const updatedMonthlyProgress = { ...relatedGoal.monthlyProgress };
            
            if (updatedMonthlyProgress[paymentMonthId]) {
              updatedMonthlyProgress[paymentMonthId] = Math.max(
                0,
                updatedMonthlyProgress[paymentMonthId] - expense.amount
              );
            }
            
            // Recalculate total progress
            const newTotalProgress = Object.values(updatedMonthlyProgress).reduce(
              (sum, value) => sum + value, 0
            );
            
            updateGoal({
              ...relatedGoal,
              // No longer update currentAmount directly
              monthlyProgress: updatedMonthlyProgress
            });
          }
        }
      }
      
      // Delete the expense
      deleteExpense(expense.id);
      setShowDeleteConfirm(false);
      onClose();
    }
  };
  
  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Expense" : "Add Expense"}</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Amount field */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0.00"
                        {...field}
                        type="number"
                        step="0.01"
                      />
                    </FormControl>
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
                    <FormLabel>Date</FormLabel>
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
              
              {/* Description field (placed before category for auto-categorization) */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Category field */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(ExpenseCategory).map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Associated Debt field - Only show when Debt Payments is selected */}
              {watchCategory === ExpenseCategory.DebtPayments && debts.length > 0 && (
                <FormField
                  control={form.control}
                  name="associatedDebtId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Which Debt?</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value, 10))}
                        value={field.value?.toString() || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a debt to pay" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {debts.map((debt) => (
                            <SelectItem key={debt.id} value={debt.id.toString()}>
                              {debt.name} (${debt.balance.toFixed(2)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <DialogFooter className="flex justify-between">
                <div className="flex items-center">
                  {isEditMode && (
                    <Button 
                      type="button" 
                      variant="destructive" 
                      size="sm"
                      className="gap-1 mr-2"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {isEditMode ? "Save Changes" : "Add Expense"}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this expense record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}