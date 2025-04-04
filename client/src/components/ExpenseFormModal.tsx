import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { Expense, ExpenseCategory, Debt } from "@/types/finance";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
  const { addExpense, updateExpense, categorizeExpense, debts, updateDebt } = useFinance();
  const isEditMode = !!expense;
  
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
        
        // Update the debt with reduced balance
        const updatedDebt = {
          ...debtToUpdate,
          balance: Math.max(0, debtToUpdate.balance - values.amount)
        };
        
        // Update the debt
        updateDebt(updatedDebt);
      }
    }

    if (isEditMode && expense) {
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
  
  return (
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
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {isEditMode ? "Save Changes" : "Add Expense"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}