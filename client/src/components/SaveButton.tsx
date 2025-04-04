import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useFinance } from "@/contexts/FinanceContext";
import { Save, Check, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function SaveButton() {
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState(true);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const { toast } = useToast();
  const finance = useFinance();
  
  // Set last saved time on initial render
  useEffect(() => {
    const savedTime = localStorage.getItem("lastAutoSaveTime");
    if (savedTime) {
      setLastSaved(savedTime);
    }
  }, []);
  
  // Update last saved time every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const savedTime = localStorage.getItem("lastAutoSaveTime");
      if (savedTime) {
        setLastSaved(savedTime);
        setAutoSaved(true);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  const saveDataToDatabase = async () => {
    setIsSaving(true);
    
    try {
      toast({
        title: "Auto-Save Enabled",
        description: "Your data is automatically saved to your browser's local storage. No need to manually save!",
        variant: "default"
      });
      
      // Store current timestamp as last save time
      const now = new Date().toISOString();
      localStorage.setItem("lastAutoSaveTime", now);
      setLastSaved(now);
      setAutoSaved(true);
    } catch (error) {
      console.error("Error with auto-save notification:", error);
      toast({
        title: "Important Note",
        description: "All changes are automatically saved to browser storage. Database saving is not currently available.",
        variant: "default"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const getTimeAgo = (savedTime: string) => {
    try {
      const saved = new Date(savedTime);
      const now = new Date();
      const diffMs = now.getTime() - saved.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      
      if (diffSec < 5) return "just now";
      if (diffSec < 60) return `${diffSec} seconds ago`;
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)} minutes ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
      return `${Math.floor(diffSec / 86400)} days ago`;
    } catch (e) {
      return "unknown time";
    }
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            className="w-full"
            variant={autoSaved ? "outline" : "default"}
            onClick={saveDataToDatabase}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></span>
                Checking...
              </>
            ) : autoSaved ? (
              <>
                <Check className="mr-2 h-4 w-4 text-green-500" />
                Auto-Saved {lastSaved ? getTimeAgo(lastSaved) : ""}
              </>
            ) : (
              <>
                <AlertCircle className="mr-2 h-4 w-4 text-amber-500" />
                Auto-Save Status
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="w-[220px] text-sm">
            All changes are automatically saved to your browser's local storage. 
            {lastSaved && ` Last saved: ${getTimeAgo(lastSaved)}`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}