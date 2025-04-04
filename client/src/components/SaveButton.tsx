import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useFinance } from "@/contexts/FinanceContext";
import { Save } from "lucide-react";

export default function SaveButton() {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const finance = useFinance();
  
  const saveDataToDatabase = async () => {
    setIsSaving(true);
    
    try {
      // Get all data from context
      const {
        userProfile,
        months, 
        activeMonth,
        incomes,
        expenses,
        budgets,
        goals,
        debts,
        recommendations,
        alerts,
        scenarios
      } = finance;
      
      // Create request payload
      const payload = {
        userProfile,
        months,
        activeMonth,
        incomes, // Current month's incomes
        expenses, // Current month's expenses
        budgets, // Current month's budgets
        goals, // Current month's goals
        debts, // Current month's debts
        recommendations,
        alerts,
        scenarios
      };
      
      // Send to the server to save to database
      const response = await fetch('/api/save-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save data');
      }
      
      toast({
        title: "Data Saved",
        description: "Your financial data has been successfully saved to the database.",
        variant: "default"
      });
    } catch (error) {
      console.error("Error saving data:", error);
      toast({
        title: "Error Saving Data",
        description: "There was a problem saving your data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <Button 
      className="w-full"
      variant="default" 
      onClick={saveDataToDatabase}
      disabled={isSaving}
    >
      {isSaving ? (
        <>
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
          Saving...
        </>
      ) : (
        <>
          <Save className="mr-2 h-4 w-4" />
          Save Data
        </>
      )}
    </Button>
  );
}