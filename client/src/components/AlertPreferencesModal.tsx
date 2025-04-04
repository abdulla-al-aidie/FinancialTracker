import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useFinance } from "@/contexts/FinanceContext";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/calculations";

// UI Components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Bell } from "lucide-react";

// Schema for form validation
const alertPreferencesSchema = z.object({
  budgetWarningThreshold: z.number().min(1).max(100),
  lowBalanceThreshold: z.number().min(0),
  upcomingPaymentDays: z.number().min(1).max(30),
  instantAlerts: z.boolean(),
});

type AlertPreferencesFormValues = z.infer<typeof alertPreferencesSchema>;

interface AlertPreferencesModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AlertPreferencesModal({ open, onClose }: AlertPreferencesModalProps) {
  const { userProfile, updateUserProfile } = useFinance();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Initialize the form with safe defaults if properties are missing
  const form = useForm<AlertPreferencesFormValues>({
    resolver: zodResolver(alertPreferencesSchema),
    defaultValues: {
      budgetWarningThreshold: userProfile.alertPreferences?.budgetWarningThreshold ?? 80,
      lowBalanceThreshold: userProfile.alertPreferences?.lowBalanceThreshold ?? 100,
      upcomingPaymentDays: userProfile.alertPreferences?.upcomingPaymentDays ?? 3,
      instantAlerts: userProfile.alertPreferences?.instantAlerts ?? true,
    },
  });

  // Handle form submission
  function onSubmit(values: AlertPreferencesFormValues) {
    setIsSaving(true);

    try {
      // Update user profile with alert preferences
      const updatedProfile = {
        ...userProfile,
        alertPreferences: {
          budgetWarningThreshold: values.budgetWarningThreshold,
          lowBalanceThreshold: values.lowBalanceThreshold,
          upcomingPaymentDays: values.upcomingPaymentDays,
          instantAlerts: values.instantAlerts,
        },
      };

      // Save updates
      updateUserProfile(updatedProfile);

      // Show success message
      toast({
        title: "Alert preferences updated",
        description: "Your alert settings have been saved.",
      });

      // Close the modal
      onClose();
    } catch (error) {
      toast({
        title: "Failed to update alert preferences",
        description: "There was an error saving your settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <span>Alert Preferences</span>
          </DialogTitle>
          <DialogDescription>
            Customize when and how you receive notifications about your finances
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="budgetWarningThreshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget Warning Threshold ({field.value}%)</FormLabel>
                  <FormControl>
                    <Slider
                      value={[field.value]}
                      min={50}
                      max={100}
                      step={5}
                      onValueChange={(vals) => field.onChange(vals[0])}
                    />
                  </FormControl>
                  <FormDescription>
                    Alert when your spending reaches this percentage of budget
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lowBalanceThreshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Low Balance Threshold ({formatCurrency(field.value)})</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={10}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Alert when account balance falls below this amount
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="upcomingPaymentDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Reminder Days ({field.value} days)</FormLabel>
                  <FormControl>
                    <Slider
                      value={[field.value]}
                      min={1}
                      max={14}
                      step={1}
                      onValueChange={(vals) => field.onChange(vals[0])}
                    />
                  </FormControl>
                  <FormDescription>
                    Remind about debt payments this many days before due date
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="instantAlerts"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Instant Alerts</FormLabel>
                    <FormDescription>
                      Show alerts immediately when they're triggered
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="rounded-md bg-gray-50 p-4 text-sm text-gray-500">
              <p>
                These settings affect both in-app alerts and email notifications
                (if email notifications are enabled)
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}