import { useState } from "react";
import { useLoan } from "@/contexts/LoanContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoanSummary from "@/components/LoanSummary";
import LoanSetup from "@/components/LoanSetup";
import PaymentTracker from "@/components/PaymentTracker";
import ProgressChart from "@/components/ProgressChart";
import MilestoneToast from "@/components/MilestoneToast";
import { ChartLine, ChartArea } from "lucide-react";

export default function Home() {
  const { loanDetails, milestoneNotification } = useLoan();
  const [activeTab, setActiveTab] = useState("setup");
  
  // If no loan details are set, show only setup tab
  const hasLoanDetails = loanDetails.principal > 0;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <ChartLine className="text-primary h-6 w-6 mr-2" />
              <h1 className="text-xl font-bold text-gray-800">LoanTracker</h1>
            </div>
            <div>
              <span className="text-sm text-gray-500">Your Student Loan Manager</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Show loan summary if loan details exist */}
        {hasLoanDetails && <LoanSummary />}

        {/* Main Content Tabs */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full border-b border-gray-200 bg-white">
              <TabsTrigger value="setup" className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                Loan Setup
              </TabsTrigger>
              <TabsTrigger 
                value="payments" 
                className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
                disabled={!hasLoanDetails}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
                Payments
              </TabsTrigger>
              <TabsTrigger 
                value="progress" 
                className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
                disabled={!hasLoanDetails}
              >
                <ChartArea className="h-4 w-4 mr-2" />
                Progress
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="setup" className="p-6">
              <LoanSetup onSave={() => setActiveTab("payments")} />
            </TabsContent>
            
            <TabsContent value="payments" className="p-6">
              <PaymentTracker />
            </TabsContent>
            
            <TabsContent value="progress" className="p-6">
              <ProgressChart />
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Welcome Message (when no loan) */}
        {!hasLoanDetails && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-primary mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome to LoanTracker</h2>
              <p className="text-gray-600 mb-6">Get started by setting up your student loan details.</p>
              <button 
                onClick={() => setActiveTab("setup")}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Setup Your Loan
              </button>
            </div>
          </div>
        )}
      </main>
      
      {/* Milestone Toast */}
      {milestoneNotification.show && <MilestoneToast />}
    </div>
  );
}
