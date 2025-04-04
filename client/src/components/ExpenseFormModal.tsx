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
  
  // Set up form with default values
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: isEditMode
      ? {
          amount: expense.amount,
          date: new Date(expense.date),
          category: expense.category,
          description: expense.description,
          associatedDebtId: (expense as any).associatedDebtId,
        }
      : {
          amount: 0,
          date: new Date(),
          category: ExpenseCategory.Miscellaneous,
          description: "",
          associatedDebtId: undefined,
        },
  });
  
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
        
        // Update the debt with reduced balance and tracked payment
        const updatedDebt = {
          ...debtToUpdate,
          balance: Math.max(0, debtToUpdate.balance - values.amount),
          totalPaid: (debtToUpdate.totalPaid || 0) + values.amount,
          monthlyPayments: updatedMonthlyPayments
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
        
        // If there's a related goal, update its progress
        if (relatedGoal) {
          updateGoal({
            ...relatedGoal,
            currentAmount: Math.min(relatedGoal.targetAmount, relatedGoal.currentAmount + values.amount),
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
          // Reverse the payment on the old debt
          const updatedDebt = {
            ...debtToReverse,
            balance: debtToReverse.balance + expense.amount,
            totalPaid: Math.max(0, debtToReverse.totalPaid - expense.amount)
          };
          
          // Update monthly payment tracking if possible
          if (debtToReverse.monthlyPayments) {
            const paymentMonthId = expense.date.substring(0, 7);
            const currentMonthlyPayments = { ...debtToReverse.monthlyPayments };
            
            if (currentMonthlyPayments[paymentMonthId]) {
              currentMonthlyPayments[paymentMonthId] = Math.max(
                0, 
                currentMonthlyPayments[paymentMonthId] - expense.amount
              );
            }
            
            updatedDebt.monthlyPayments = currentMonthlyPayments;
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
            updateGoal({
              ...relatedGoal,
              currentAmount: Math.max(0, relatedGoal.currentAmount - expense.amount),
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
          // Reverse the payment impact on the debt
          const updatedDebt = {
            ...debtToUpdate,
            balance: debtToUpdate.balance + expense.amount,
            totalPaid: Math.max(0, debtToUpdate.totalPaid - expense.amount)
          };
          
          // Update monthly payment tracking if possible
          if (debtToUpdate.monthlyPayments) {
            const paymentMonthId = expense.date.substring(0, 7);
            const currentMonthlyPayments = { ...debtToUpdate.monthlyPayments };
            
            if (currentMonthlyPayments[paymentMonthId]) {
              currentMonthlyPayments[paymentMonthId] = Math.max(
                0, 
                currentMonthlyPayments[paymentMonthId] - expense.amount
              );
            }
            
            updatedDebt.monthlyPayments = currentMonthlyPayments;
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
            updateGoal({
              ...relatedGoal,
              currentAmount: Math.max(0, relatedGoal.currentAmount - expense.amount),
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