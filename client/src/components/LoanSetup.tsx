import { useState, useEffect } from "react";
import { useLoan } from "@/contexts/LoanContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DollarSign, Percent, Save } from "lucide-react";

// Form validation schema
const loanFormSchema = z.object({
  principal: z.coerce.number()
    .positive("Loan amount must be greater than zero")
    .min(1, "Loan amount must be at least $1"),
  interestRate: z.coerce.number()
    .min(0, "Interest rate cannot be negative")
    .max(30, "Interest rate must be 30% or less"),
  monthlyPayment: z.coerce.number()
    .positive("Monthly payment must be greater than zero")
    .min(1, "Monthly payment must be at least $1"),
});

type LoanFormValues = z.infer<typeof loanFormSchema>;

export default function LoanSetup({ onSave }: { onSave?: () => void }) {
  const { loanDetails, saveLoanDetails } = useLoan();
  
  // Initialize form with existing loan details if any
  const form = useForm<LoanFormValues>({
    resolver: zodResolver(loanFormSchema),
    defaultValues: {
      principal: loanDetails.principal || "",
      interestRate: loanDetails.interestRate || "",
      monthlyPayment: loanDetails.monthlyPayment || "",
    },
  });

  // Update form values when loanDetails changes
  useEffect(() => {
    form.reset({
      principal: loanDetails.principal || "",
      interestRate: loanDetails.interestRate || "",
      monthlyPayment: loanDetails.monthlyPayment || "",
    });
  }, [loanDetails, form]);

  // Handle form submission
  function onSubmit(values: LoanFormValues) {
    saveLoanDetails({
      principal: parseFloat(values.principal.toString()),
      interestRate: parseFloat(values.interestRate.toString()),
      monthlyPayment: parseFloat(values.monthlyPayment.toString()),
    });
    
    if (onSave) {
      onSave();
    }
  }

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 mb-4">Setup Your Loan</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="principal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Loan Amount</FormLabel>
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
                <FormDescription>
                  Enter the total amount of your student loan
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="interestRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Annual Interest Rate (%)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Percent className="absolute right-3 top-2.5 h-5 w-5 text-gray-500" />
                    <Input
                      placeholder="0.00"
                      type="number"
                      step="0.01"
                      min="0"
                      max="30"
                      className="pr-10"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  Enter your loan's annual interest rate
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="monthlyPayment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monthly Payment</FormLabel>
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
                <FormDescription>
                  Enter your standard monthly payment amount
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex justify-end pt-4">
            <Button type="submit" className="flex items-center">
              <Save className="h-4 w-4 mr-2" />
              Save Loan Details
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
