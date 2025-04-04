import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
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
  const { setBudget, updateBudget, budgets } = useFinance();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isEditMode = !!budget;
  
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
  
  function onSubmit(values: BudgetFormValues) {
    if (isEditMode && budget) {
      updateBudget({
        ...budget,
        category: values.category,
        limit: values.limit,
      });
    } else {
      setBudget(values.category, values.limit);
    }
    
    onClose();
  }
  
  // Handle budget deletion
  const handleDelete = () => {
    if (budget) {
      // Since we don't have a direct deletebudget function in FinanceContext,
      // we'll create a "dummy" budget with 0 limit, which effectively removes it
      updateBudget({
        ...budget,
        limit: 0, // Setting limit to 0 effectively removes the budget
      });
      setShowDeleteConfirm(false);
      onClose();
    }
  };
  
  // Calculate current spending in this category
  const currentSpending = isEditMode && budget && 'spent' in budget
    ? (budget as any).spent || 0
    : 0;
  
  // Calculate the percentage of budget used
  const percentUsed = isEditMode && budget && budget.limit > 0
    ? Math.min(100, Math.round((currentSpending / budget.limit) * 100))
    : 0;
  
  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Budget" : "Create Budget"}</DialogTitle>
            <DialogDescription>
              Set spending limits for expense categories to help manage your finances.
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
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isEditMode} // Don't allow changing category in edit mode
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select expense category" />
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
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {isEditMode && currentSpending > 0 && (
                <div className="rounded-md bg-muted p-3">
                  <div className="text-sm">
                    Current spending: {formatCurrency(currentSpending)}
                    {budget && <> of {formatCurrency(budget.limit)} ({percentUsed}%)</>}
                  </div>
                </div>
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
                    {isEditMode ? "Save Changes" : "Create Budget"}
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
              This will remove the budget limit for this category. Any spending in this category will no longer be tracked against a budget.
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