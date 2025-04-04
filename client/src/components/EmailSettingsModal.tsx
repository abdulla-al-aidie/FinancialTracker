import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useFinance } from "@/contexts/FinanceContext";
import { useToast } from "@/hooks/use-toast";

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
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Mail } from "lucide-react";

// Schema for form validation
const emailSettingsSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  notificationsEnabled: z.boolean(),
  budgetAlerts: z.boolean(),
  paymentReminders: z.boolean(),
  goalProgress: z.boolean(),
  monthlyReports: z.boolean(),
});

type EmailSettingsFormValues = z.infer<typeof emailSettingsSchema>;

interface EmailSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function EmailSettingsModal({ open, onClose }: EmailSettingsModalProps) {
  const { userProfile, updateUserProfile } = useFinance();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Initialize the form
  const form = useForm<EmailSettingsFormValues>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: {
      email: userProfile.email || "",
      notificationsEnabled: userProfile.notificationsEnabled,
      budgetAlerts: userProfile.emailNotifications.budgetAlerts,
      paymentReminders: userProfile.emailNotifications.paymentReminders,
      goalProgress: userProfile.emailNotifications.goalProgress,
      monthlyReports: userProfile.emailNotifications.monthlyReports,
    },
  });

  // Handle form submission
  function onSubmit(values: EmailSettingsFormValues) {
    setIsSaving(true);

    try {
      // Update user profile with email settings
      const updatedProfile = {
        ...userProfile,
        email: values.email,
        notificationsEnabled: values.notificationsEnabled,
        emailNotifications: {
          budgetAlerts: values.budgetAlerts,
          paymentReminders: values.paymentReminders,
          goalProgress: values.goalProgress,
          monthlyReports: values.monthlyReports,
        },
      };

      // Save updates
      updateUserProfile(updatedProfile);

      // Show success message
      toast({
        title: "Email settings updated",
        description: "Your notification preferences have been saved.",
      });

      // Close the modal
      onClose();
    } catch (error) {
      toast({
        title: "Failed to update email settings",
        description: "There was an error saving your preferences. Please try again.",
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
            <Mail className="h-5 w-5" />
            <span>Email Notification Settings</span>
          </DialogTitle>
          <DialogDescription>
            Configure which notifications you'd like to receive via email
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="your.email@example.com" />
                  </FormControl>
                  <FormDescription>
                    We'll use this email to send you financial notifications
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notificationsEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Enable Email Notifications</FormLabel>
                    <FormDescription>
                      Master control for all email notifications
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

            <Separator className="my-4" />

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Notification Types</h3>

              <FormField
                control={form.control}
                name="budgetAlerts"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Budget Alerts</FormLabel>
                      <FormDescription>
                        Notify when you approach or exceed budget limits
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!form.watch("notificationsEnabled")}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentReminders"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Payment Reminders</FormLabel>
                      <FormDescription>
                        Remind you about upcoming debt payments
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!form.watch("notificationsEnabled")}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="goalProgress"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Goal Progress Updates</FormLabel>
                      <FormDescription>
                        Receive updates on your financial goals progress
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!form.watch("notificationsEnabled")}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="monthlyReports"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Monthly Financial Reports</FormLabel>
                      <FormDescription>
                        Receive monthly summary of your financial activity
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!form.watch("notificationsEnabled")}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
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