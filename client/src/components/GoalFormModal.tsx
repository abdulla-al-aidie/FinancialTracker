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
});

type GoalFormValues = z.infer<typeof goalFormSchema>;

interface GoalFormModalProps {
  open: boolean;
  onClose: () => void;
  goal?: Goal; // Optional for edit mode
}

export default function GoalFormModal({ open, onClose, goal }: GoalFormModalProps) {
  const { addGoal, updateGoal, deleteGoal } = useFinance();
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
    }
  });
  
  // Set form values when in edit mode or when goal changes
  useEffect(() => {
    if (goal && open) {
      form.reset({
        name: goal.name,
        type: goal.type,
        targetAmount: goal.targetAmount,
        targetDate: goal.targetDate ? new Date(goal.targetDate) : new Date(),
        description: goal.description,
      });
    }
  }, [form, goal, open]);

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
      });
    } else {
      addGoal({
        name: values.name,
        type: values.type,
        targetAmount: values.targetAmount,
        targetDate: formattedDate,
        description: values.description || "",
        priority: 5, // Default medium priority
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
          
          {isEditMode && goal?.currentAmount > 0 && (
            <div className="border-t pt-3 mt-3">
              <div className="text-sm text-muted-foreground">
                Current progress: {formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)}
                ({Math.round(goal.currentAmount / goal.targetAmount * 100)}%)
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