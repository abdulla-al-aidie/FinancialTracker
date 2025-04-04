import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Trash2 } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { Debt } from "@/types/finance";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Slider } from "@/components/ui/slider";
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

const debtFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  balance: z.coerce.number().positive("Balance must be greater than 0"),
  originalPrincipal: z.coerce.number().positive("Original principal must be greater than 0"),
  interestRate: z.coerce.number().min(0, "Interest rate must be 0 or greater"),
  minimumPayment: z.coerce.number().min(0, "Minimum payment must be 0 or greater"),
  dueDate: z.date(),
  priority: z.number().min(0).max(10).optional(),
});

type DebtFormValues = z.infer<typeof debtFormSchema>;

interface DebtFormModalProps {
  open: boolean;
  onClose: () => void;
  debt?: Debt; // Optional for edit mode
}

export default function DebtFormModal({ open, onClose, debt }: DebtFormModalProps) {
  const { addDebt, updateDebt, deleteDebt } = useFinance();
  const isEditMode = !!debt;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // State for priority slider
  const [priority, setPriority] = useState<number>(5);

  // Set up form with default values
  const form = useForm<DebtFormValues>({
    resolver: zodResolver(debtFormSchema),
    defaultValues: {
      name: "",
      balance: 0,
      originalPrincipal: 0,
      interestRate: 0,
      minimumPayment: 0,
      dueDate: new Date(),
      priority: 5,
    }
  });
  
  // Set form values and priority when in edit mode or when debt changes
  useEffect(() => {
    if (debt && open) {
      form.reset({
        name: debt.name,
        balance: debt.balance,
        originalPrincipal: debt.originalPrincipal,
        interestRate: debt.interestRate,
        minimumPayment: debt.minimumPayment,
        dueDate: new Date(debt.dueDate),
        priority: debt.priority,
      });
      
      // Update priority slider
      if (debt.priority !== undefined) {
        setPriority(debt.priority);
      }
    }
  }, [form, debt, open]);
  
  function onSubmit(values: DebtFormValues) {
    // Create debt data with required fields
    const debtData = {
      name: values.name,
      balance: values.balance,
      interestRate: values.interestRate,
      minimumPayment: values.minimumPayment,
      dueDate: format(values.dueDate, "yyyy-MM-dd"),
      priority: priority,
      originalPrincipal: values.originalPrincipal,
      totalPaid: isEditMode && debt ? debt.totalPaid : 0,
      monthlyPayments: isEditMode && debt ? debt.monthlyPayments : {},
    };

    if (isEditMode && debt) {
      updateDebt({
        ...debt,
        ...debtData,
      });
    } else {
      addDebt(debtData);
    }
    
    onClose();
    form.reset();
  }
  
  // Handle debt deletion
  const handleDelete = () => {
    if (debt) {
      deleteDebt(debt.id);
      setShowDeleteConfirm(false);
      onClose();
    }
  };
  
  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Debt" : "Add Debt"}</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Name field */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Credit Card, Student Loan, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Balance field */}
              <FormField
                control={form.control}
                name="balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Balance</FormLabel>
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
              
              {/* Original Principal field */}
              <FormField
                control={form.control}
                name="originalPrincipal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Original Principal</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0.00"
                        {...field}
                        type="number"
                        step="0.01"
                      />
                    </FormControl>
                    <FormDescription>
                      The original amount of the debt (used for tracking progress)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Interest Rate field */}
              <FormField
                control={form.control}
                name="interestRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interest Rate (%)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0.0"
                        {...field}
                        type="number"
                        step="0.01"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Minimum Payment field */}
              <FormField
                control={form.control}
                name="minimumPayment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Monthly Payment</FormLabel>
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
              
              {/* Due Date field */}
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Payment Due Date</FormLabel>
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
              
              {/* Priority slider */}
              <FormItem>
                <FormLabel>Payment Priority</FormLabel>
                <FormControl>
                  <Slider
                    value={[priority]}
                    min={0}
                    max={10}
                    step={1}
                    onValueChange={(values) => setPriority(values[0])}
                    className="py-4"
                  />
                </FormControl>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Low</span>
                  <span>{priority}</span>
                  <span>High</span>
                </div>
                <FormDescription>
                  Higher priority debts will be prioritized in payment recommendations
                </FormDescription>
              </FormItem>
              
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
                    {isEditMode ? "Save Changes" : "Add Debt"}
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
              This will permanently delete this debt record and any associated payments. This action cannot be undone.
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