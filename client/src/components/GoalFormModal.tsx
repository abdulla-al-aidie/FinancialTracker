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
import { GoalType, Goal } from "@/types/finance";
import { formatCurrency } from "@/lib/calculations";
import { format } from "date-fns";
import { CalendarIcon, Trash2 } from "lucide-react";
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
  associatedDebtId: z.number().optional(),
});

type GoalFormValues = z.infer<typeof goalFormSchema>;

interface GoalFormModalProps {
  open: boolean;
  onClose: () => void;
  goal?: Goal; // Optional for edit mode
}

export default function GoalFormModal({ open, onClose, goal }: GoalFormModalProps) {
  const { addGoal, updateGoal, deleteGoal, debts } = useFinance();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isEditMode = !!goal;
  
  // Form setup
  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      name: "",
      type: undefined,
      targetAmount: undefined,
      targetDate: undefined,
      description: "",
      associatedDebtId: undefined,
    }
  });
  
  // Watch for goal type changes to show/hide debt selection dropdown
  const watchGoalType = form.watch("type");
  
  // Set form values when in edit mode or when goal changes or clear them when modal is closed
  useEffect(() => {
    if (open) {
      if (goal) {
        // Populate form with goal data if in edit mode
        form.reset({
          name: goal.name,
          type: goal.type,
          targetAmount: goal.targetAmount,
          targetDate: goal.targetDate ? new Date(goal.targetDate) : new Date(),
          description: goal.description,
          associatedDebtId: goal.associatedDebtId,
        });
      } else {
        // Reset to empty form if not in edit mode
        form.reset({
          name: "",
          type: undefined,
          targetAmount: undefined,
          targetDate: new Date(),
          description: "",
          associatedDebtId: undefined,
        });
      }
    }
  }, [form, goal, open]);
  
  // When a debt is selected, update target amount to match debt balance
  useEffect(() => {
    const debtId = form.getValues("associatedDebtId");
    if (debtId !== undefined && watchGoalType === GoalType.DebtPayoff) {
      const selectedDebt = debts.find(debt => debt.id === debtId);
      if (selectedDebt) {
        form.setValue("targetAmount", selectedDebt.balance);
        if (!isEditMode) {
          form.setValue("name", `Pay off ${selectedDebt.name}`);
        }
      }
    }
  }, [form.getValues("associatedDebtId"), watchGoalType, debts, form, isEditMode]);

  function onSubmit(values: GoalFormValues) {
    const formattedDate = format(values.targetDate, "yyyy-MM-dd");
    
    if (isEditMode && goal) {
      updateGoal({
        ...goal,
        name: values.name,
        type: values.type,
        targetAmount: values.targetAmount,
        targetDate: formattedDate,
        description: values.description || "",
        associatedDebtId: values.type === GoalType.DebtPayoff ? values.associatedDebtId : undefined,
        monthlyProgress: goal.monthlyProgress || {}, // Preserve existing monthly progress
      });
    } else {
      addGoal({
        name: values.name,
        type: values.type,
        targetAmount: values.targetAmount,
        targetDate: formattedDate,
        description: values.description || "",
        priority: 5, // Default medium priority
        associatedDebtId: values.type === GoalType.DebtPayoff ? values.associatedDebtId : undefined,
        monthlyProgress: {},
      });
    }
    
    onClose();
  }
  
  // Handle goal deletion
  const handleDelete = () => {
    if (goal) {
      deleteGoal(goal.id);
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Goal" : "Create New Financial Goal"}</DialogTitle>
            <DialogDescription>
              Set a clear, achievable goal to improve your financial well-being.
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
                      <Input placeholder="e.g., Emergency Fund, New Car" {...field} />
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
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select goal type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(GoalType).map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
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
                name="targetAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Amount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
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
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Display the debt dropdown only if goal type is DebtPayoff and debts exist */}
              {watchGoalType === GoalType.DebtPayoff && debts.length > 0 && (
                <FormField
                  control={form.control}
                  name="associatedDebtId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Debt to Pay Off</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a debt" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {debts.map((debt) => (
                            <SelectItem key={debt.id} value={debt.id.toString()}>
                              {debt.name} - {formatCurrency(debt.balance)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add some notes about your goal"
                        className="resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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
                    {isEditMode ? "Save Changes" : "Create Goal"}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
          
          {isEditMode && goal && (
            <div className="border-t pt-3 mt-3">
              <div className="text-sm text-muted-foreground">
                {(() => {
                  // Calculate total progress from monthly data
                  const monthlyProgress = goal.monthlyProgress || {};
                  const totalProgress = Object.values(monthlyProgress).reduce(
                    (sum, amount) => sum + amount, 0
                  );
                  
                  if (totalProgress > 0) {
                    const progressPercent = Math.round(totalProgress / goal.targetAmount * 100);
                    return (
                      <>
                        Current progress: {formatCurrency(totalProgress)} of {formatCurrency(goal.targetAmount)}
                        ({progressPercent}%)
                      </>
                    );
                  }
                  return "No progress tracked yet";
                })()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this goal and all progress tracking for it. This action cannot be undone.
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