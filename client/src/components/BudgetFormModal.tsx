import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinance } from "@/contexts/FinanceContext";
import { ExpenseCategory, Budget } from "@/types/finance";
import { formatCurrency } from "@/lib/calculations";

// Form schema for budget validation
const budgetFormSchema = z.object({
  category: z.nativeEnum(ExpenseCategory, {
    required_error: "Please select an expense category",
  }),
  limit: z.coerce.number().min(1, "Budget limit must be at least 1"),
});

type BudgetFormValues = z.infer<typeof budgetFormSchema>;

interface BudgetFormModalProps {
  open: boolean;
  onClose: () => void;
  budget?: Budget; // Optional for edit mode
}

export default function BudgetFormModal({ open, onClose, budget }: BudgetFormModalProps) {
  const { setBudget, updateBudget } = useFinance();
  
  // Default values for the form
  const defaultValues: Partial<BudgetFormValues> = {
    category: budget?.category || undefined,
    limit: budget?.limit || undefined,
  };
  
  // Initialize form
  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues,
  });
  
  // Reset form when modal opens/closes or budget changes
  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
    }
  }, [open, budget, form]);
  
  // Handle form submission
  function onSubmit(values: BudgetFormValues) {
    if (budget) {
      // Edit mode - update existing budget
      updateBudget({
        ...budget,
        ...values,
      });
    } else {
      // Create mode - set new budget
      setBudget(values.category, values.limit);
    }
    
    // Close modal and reset form
    onClose();
  }
  
  // Check if we're in edit mode
  const isEditMode = !!budget;
  
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Budget" : "Create New Budget"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? "Update your spending limit for this category." 
              : "Set a spending limit for a category to track your expenses."}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expense Category</FormLabel>
                  <Select
                    disabled={isEditMode}
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
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
            
            <FormField
              control={form.control}
              name="limit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly Budget Limit</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="0.00"
                      type="number"
                      step="0.01"
                      {...field}
                    />
                  </FormControl>
                  {budget && (
                    <div className="text-xs text-gray-500 mt-1">
                      Current spending: {formatCurrency(budget.spent)}
                      {budget.limit > 0 && ` (${((budget.spent / budget.limit) * 100).toFixed(1)}% of budget)`}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {isEditMode ? "Save Changes" : "Create Budget"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}