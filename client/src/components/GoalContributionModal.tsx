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
import { Goal } from "@/types/finance";
import { formatCurrency } from "@/lib/calculations";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Form schema for goal contribution validation
const goalContributionFormSchema = z.object({
  goalId: z.number({
    required_error: "Please select a goal",
  }),
  amount: z.coerce.number().min(0.01, "Amount must be at least 0.01"),
  date: z.date({
    required_error: "Date is required",
  }),
  notes: z.string().optional(),
});

type GoalContributionFormValues = z.infer<typeof goalContributionFormSchema>;

interface GoalContributionModalProps {
  open: boolean;
  onClose: () => void;
}

export default function GoalContributionModal({ open, onClose }: GoalContributionModalProps) {
  const { goals, addGoalContribution } = useFinance();
  const filteredGoals = goals.filter(goal => !goal.completed);
  
  // Form setup
  const form = useForm<GoalContributionFormValues>({
    resolver: zodResolver(goalContributionFormSchema),
    defaultValues: {
      goalId: undefined,
      amount: undefined,
      date: new Date(),
      notes: "",
    }
  });
  
  // Clear form when modal is closed
  useEffect(() => {
    if (open) {
      form.reset({
        goalId: undefined,
        amount: undefined,
        date: new Date(),
        notes: "",
      });
    }
  }, [form, open]);

  function onSubmit(values: GoalContributionFormValues) {
    const selectedGoal = goals.find(goal => goal.id === values.goalId);
    
    if (selectedGoal) {
      addGoalContribution({
        goalId: values.goalId,
        amount: values.amount,
        date: format(values.date, "yyyy-MM-dd"),
        notes: values.notes || "",
      });
    }
    
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Contribution to Goal</DialogTitle>
          <DialogDescription>
            Record a contribution toward one of your savings goals.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="goalId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Goal</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a goal" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredGoals.length > 0 ? (
                        filteredGoals.map((goal) => (
                          <SelectItem key={goal.id} value={goal.id.toString()}>
                            {goal.name} - Target: {formatCurrency(goal.targetAmount)}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-goals" disabled>
                          No active goals found. Create a goal first.
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contribution Amount</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add any notes about this contribution"
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
                Add Contribution
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}