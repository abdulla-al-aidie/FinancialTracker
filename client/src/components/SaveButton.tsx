import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useFinance } from "@/contexts/FinanceContext";
import { Save, Check, AlertCircle, Cloud } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getLastSaveTime, saveFromLocalStorage } from "@/utils/database";

export default function SaveButton() {
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState(true);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [hasMigrated, setHasMigrated] = useState(false);
  const { toast } = useToast();
  const finance = useFinance();
  
  // Set last saved time on initial render
  useEffect(() => {
    const fetchLastSaveTime = async () => {
      try {
        const savedTime = await getLastSaveTime();
        if (savedTime) {
          setLastSaved(savedTime);
          setAutoSaved(true);
        } else {
          // If no saved time exists in the database, check localStorage
          const localStorageSavedTime = localStorage.getItem("lastAutoSaveTime");
          if (localStorageSavedTime) {
            setLastSaved(localStorageSavedTime);
          }
        }
      } catch (error) {
        console.error("Error fetching last save time:", error);
      }
    };
    
    fetchLastSaveTime();
  }, []);
  
  // Update last saved time every 10 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const savedTime = await getLastSaveTime();
        if (savedTime) {
          setLastSaved(savedTime);
          setAutoSaved(true);
        }
      } catch (error) {
        console.error("Error fetching last save time:", error);
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);
  
  const saveDataToDb = async () => {
    setIsSaving(true);
    
    try {
      await saveFromLocalStorage();
      setHasMigrated(true);
      
      toast({
        title: "Save Complete",
        description: "Your data has been saved to Replit's database for improved persistence.",
        variant: "default"
      });
      
      // Refresh last saved time
      const savedTime = await getLastSaveTime();
      if (savedTime) {
        setLastSaved(savedTime);
        setAutoSaved(true);
      }
    } catch (error) {
      console.error("Error during save:", error);
      toast({
        title: "Save Failed",
        description: "There was an error saving your data. Your data is still safely stored in your browser.",
        variant: "destructive" 
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
            onClick={saveDataToDb}
            disabled={isSaving || hasMigrated}
          >
            {isSaving ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></span>
                Saving...
              </>
            ) : hasMigrated ? (
              <>
                <Cloud className="mr-2 h-4 w-4 text-green-500" />
                Saved {lastSaved ? getTimeAgo(lastSaved) : ""}
              </>
            ) : autoSaved ? (
              <>
                <Check className="mr-2 h-4 w-4 text-green-500" />
                Save
              </>
            ) : (
              <>
                <AlertCircle className="mr-2 h-4 w-4 text-amber-500" />
                Save
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="w-[250px] text-sm">
            {hasMigrated 
              ? "Your data is now safely stored in Replit's database. Changes are automatically saved."
              : "Click to save your data to Replit's database for improved reliability across sessions."
            }
            {lastSaved && ` Last saved: ${getTimeAgo(lastSaved)}`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}