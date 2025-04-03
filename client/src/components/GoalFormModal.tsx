import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useFinance } from "@/contexts/FinanceContext";
import { GoalType, Goal } from "@/types/finance";
import { formatCurrency } from "@/lib/calculations";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Form schema for goal validation
const goalFormSchema = z.object({
  name: z.string().min(1, "Goal name is required"),
  type: z.nativeEnum(GoalType, {
    required_error: "Please select a goal type",
  }),
  targetAmount: z.coerce.number().min(1, "Target amount must be at least 1"),
  targetDate: z.date({
    required_error: "Target date is required",
  }),
  description: z.string().optional(),
});

type GoalFormValues = z.infer<typeof goalFormSchema>;

interface GoalFormModalProps {
  open: boolean;
  onClose: () => void;
  goal?: Goal; // Optional for edit mode
}

export default function GoalFormModal({ open, onClose, goal }: GoalFormModalProps) {
  const { addGoal, updateGoal } = useFinance();
  
  // Default values for the form
  const defaultValues: Partial<GoalFormValues> = {
    name: goal?.name || "",
    type: goal?.type || undefined,
    targetAmount: goal?.targetAmount || undefined,
    targetDate: goal?.targetDate ? new Date(goal.targetDate) : undefined,
    description: goal?.description || "",
  };
  
  // Initialize form
  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues,
  });
  
  // Reset form when modal opens/closes or goal changes
  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
    }
  }, [open, goal, form]);
  
  // Handle form submission
  function onSubmit(values: GoalFormValues) {
    const formattedValues = {
      ...values,
      targetDate: values.targetDate.toISOString().split('T')[0], // Format date as YYYY-MM-DD
    };
    
    if (goal) {
      // Edit mode - update existing goal
      updateGoal({
        ...goal,
        ...formattedValues,
      });
    } else {
      // Create mode - add new goal
      addGoal({
        name: formattedValues.name,
        type: formattedValues.type,
        targetAmount: formattedValues.targetAmount,
        targetDate: formattedValues.targetDate,
        description: formattedValues.description || "",
      });
    }
    
    // Close modal and reset form
    onClose();
  }
  
  // Check if we're in edit mode
  const isEditMode = !!goal;
  
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Financial Goal" : "Create New Financial Goal"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? "Update your financial goal details." 
              : "Set clear financial goals to track your progress over time."}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Emergency Fund" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select goal type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={GoalType.Saving}>Saving Goal</SelectItem>
                      <SelectItem value={GoalType.DebtPayoff}>Debt Payoff</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="targetAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Amount</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0.00"
                        type="number"
                        step="0.01"
                        {...field}
                      />
                    </FormControl>
                    {goal && (
                      <div className="text-xs text-gray-500 mt-1">
                        Current progress: {formatCurrency(goal.currentAmount)}
                        {goal.targetAmount > 0 && ` (${((goal.currentAmount / goal.targetAmount) * 100).toFixed(1)}%)`}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="targetDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Target Date</FormLabel>
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
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add additional details about your goal..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {isEditMode ? "Save Changes" : "Create Goal"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}