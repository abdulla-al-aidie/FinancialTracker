import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useFinance } from "@/contexts/FinanceContext";
import { Save, Check, AlertCircle, Cloud, Shield } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  getLastSaveTime, 
  saveFromLocalStorage,
  createEmergencyBackup
} from "@/utils/database";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  
  // Emergency backup handler
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  
  const handleEmergencyBackup = async () => {
    setIsCreatingBackup(true);
    
    try {
      const success = await createEmergencyBackup();
      
      if (success) {
        toast({
          title: "Emergency Backup Created",
          description: "A complete backup of all your financial data has been saved to Replit's database.",
          variant: "default"
        });
      } else {
        throw new Error("Backup failed");
      }
    } catch (error) {
      console.error("Error creating emergency backup:", error);
      toast({
        title: "Backup Failed",
        description: "There was an error creating your emergency backup. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  className="w-full flex justify-between"
                  variant={autoSaved ? "outline" : "default"}
                  disabled={isSaving || isCreatingBackup}
                >
                  <div className="flex items-center">
                    {isSaving || isCreatingBackup ? (
                      <>
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></span>
                        {isSaving ? "Saving..." : "Creating Backup..."}
                      </>
                    ) : hasMigrated ? (
                      <>
                        <Cloud className="mr-2 h-4 w-4 text-green-500" />
                        Saved {lastSaved ? getTimeAgo(lastSaved) : ""}
                      </>
                    ) : autoSaved ? (
                      <>
                        <Check className="mr-2 h-4 w-4 text-green-500" />
                        Save Data
                      </>
                    ) : (
                      <>
                        <AlertCircle className="mr-2 h-4 w-4 text-amber-500" />
                        Save Data
                      </>
                    )}
                  </div>
                  <span className="ml-2">▼</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={saveDataToDb} disabled={isSaving || isCreatingBackup}>
                  <Cloud className="mr-2 h-4 w-4" />
                  Standard Save
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleEmergencyBackup} disabled={isSaving || isCreatingBackup}>
                  <Shield className="mr-2 h-4 w-4" />
                  Emergency Backup
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipTrigger>
          <TooltipContent>
            <p className="w-[250px] text-sm">
              {hasMigrated 
                ? "Your data is stored in Replit's database. Use backup options for additional protection."
                : "Save your data to prevent loss. Regular saves store your data by category, emergency backups create a complete snapshot."
              }
              {lastSaved && ` Last saved: ${getTimeAgo(lastSaved)}`}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}