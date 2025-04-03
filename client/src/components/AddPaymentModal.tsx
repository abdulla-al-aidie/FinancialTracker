import { useEffect } from "react";
import { useLoan } from "@/contexts/LoanContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Payment } from "@/types/loan";
import { Save, X, DollarSign, Calendar } from "lucide-react";

// Form validation schema
const paymentFormSchema = z.object({
  amount: z.coerce.number()
    .positive("Payment amount must be greater than zero")
    .min(1, "Payment amount must be at least $1"),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Please enter a valid date",
  }),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

interface AddPaymentModalProps {
  open: boolean;
  onClose: () => void;
  payment: Payment | null;
}

export default function AddPaymentModal({ open, onClose, payment }: AddPaymentModalProps) {
  const { addPayment, updatePayment } = useLoan();
  const isEditing = payment !== null;
  
  // Initialize form with today's date or the payment date if editing
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: payment?.amount || "",
      date: payment?.date || new Date().toISOString().split("T")[0],
    },
  });

  // Update form values when payment changes
  useEffect(() => {
    if (open) {
      form.reset({
        amount: payment?.amount || "",
        date: payment?.date || new Date().toISOString().split("T")[0],
      });
    }
  }, [payment, open, form]);

  function onSubmit(values: PaymentFormValues) {
    if (isEditing && payment) {
      updatePayment({
        id: payment.id,
        amount: parseFloat(values.amount.toString()),
        date: values.date,
      });
    } else {
      addPayment({
        amount: parseFloat(values.amount.toString()),
        date: values.date,
      });
    }
    
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Payment" : "Add New Payment"}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
                      <Input
                        placeholder="0.00"
                        type="number"
                        step="0.01"
                        min="1"
                        className="pl-10"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Date</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
                      <Input
                        type="date"
                        className="pl-10"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="mt-6 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3">
              <Button 
                type="submit"
                className="flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button 
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex items-center"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
