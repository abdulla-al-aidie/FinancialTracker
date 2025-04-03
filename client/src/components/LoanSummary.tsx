import { useLoan } from "@/contexts/LoanContext";
import { formatCurrency } from "@/lib/calculations";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PartyPopper, DollarSign, CalendarDays } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function LoanSummary() {
  const { loanDetails, currentBalance, percentPaid, payoffDate } = useLoan();
  
  // Check if milestones are reached for display
  const hasReachedMilestone = percentPaid >= 25 || percentPaid >= 50 || percentPaid >= 75 || percentPaid === 100;
  
  return (
    <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
      <div className="px-4 py-5 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Remaining Balance */}
          <Card className="bg-gray-50 border border-gray-200">
            <CardContent className="p-4">
              <h3 className="text-sm font-medium text-gray-500">Remaining Balance</h3>
              <div className="mt-1">
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(currentBalance)}
                </p>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                <span>{percentPaid}%</span> paid off
                {hasReachedMilestone && (
                  <Badge variant="success" className="ml-2 bg-green-500">
                    <PartyPopper className="h-3 w-3 mr-1" /> Milestone reached!
                  </Badge>
                )}
              </p>
            </CardContent>
          </Card>
          
          {/* Monthly Payment */}
          <Card className="bg-gray-50 border border-gray-200">
            <CardContent className="p-4">
              <h3 className="text-sm font-medium text-gray-500">Monthly Payment</h3>
              <div className="mt-1">
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(loanDetails.monthlyPayment)}
                </p>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                at {loanDetails.interestRate}% interest rate
              </p>
            </CardContent>
          </Card>
          
          {/* Payoff Date */}
          <Card className="bg-gray-50 border border-gray-200">
            <CardContent className="p-4">
              <h3 className="text-sm font-medium text-gray-500">Estimated Payoff Date</h3>
              <div className="mt-1">
                <p className="text-2xl font-semibold text-gray-900">{payoffDate.date}</p>
              </div>
              <p className="mt-2 text-sm text-gray-500">{payoffDate.timeRemaining}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
