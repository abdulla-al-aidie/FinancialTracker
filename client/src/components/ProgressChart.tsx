import { useEffect, useRef } from "react";
import { useLoan } from "@/contexts/LoanContext";
import { formatCurrency } from "@/lib/calculations";
import { calculateBalanceHistory } from "@/lib/calculations";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Check, Clock } from "lucide-react";

export default function ProgressChart() {
  const { loanDetails, payments, currentBalance, percentPaid } = useLoan();
  
  // Calculate balance history for chart
  const balanceHistory = calculateBalanceHistory(loanDetails, payments);
  
  // Format data for Recharts
  const chartData = balanceHistory.dates.map((date, index) => ({
    name: date,
    balance: balanceHistory.balances[index],
  }));

  // Milestones to track (25%, 50%, 75%, 100%)
  const milestones = [25, 50, 75, 100];

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 mb-4">Loan Progress</h2>
      
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm font-medium text-gray-700">{percentPaid}%</span>
        </div>
        <Progress value={percentPaid} className="h-2.5" />
        
        <div className="flex justify-between mt-2">
          <div className="text-xs text-gray-500">Initial: {formatCurrency(loanDetails.principal)}</div>
          <div className="text-xs text-gray-500">Current: {formatCurrency(currentBalance)}</div>
          <div className="text-xs text-gray-500">Goal: {formatCurrency(0)}</div>
        </div>
      </div>
      
      {/* Milestone Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {milestones.map((milestone) => (
          <Card 
            key={milestone}
            className={`border ${percentPaid >= milestone ? 'bg-primary-50 border-primary-200' : 'bg-gray-50 border-gray-200'}`}
          >
            <CardContent className="p-3">
              <div className="flex items-center">
                <span 
                  className={`flex items-center justify-center w-8 h-8 rounded-full mr-2 ${
                    percentPaid >= milestone ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {percentPaid >= milestone ? <Check className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                </span>
                <div>
                  <h3 
                    className={`text-sm font-medium ${
                      percentPaid >= milestone ? 'text-primary-800' : 'text-gray-500'
                    }`}
                  >
                    {milestone}% Paid
                  </h3>
                  <p 
                    className={`text-xs ${
                      percentPaid >= milestone ? 'text-primary-600' : 'text-gray-400'
                    }`}
                  >
                    {percentPaid >= milestone ? 'Completed!' : 'Not reached'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Balance Chart */}
      <Card className="border border-gray-200">
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Balance History</h3>
          {payments.length === 0 ? (
            <div className="flex items-center justify-center h-64 bg-gray-50 rounded-md">
              <p className="text-gray-500 text-sm">Make payments to see your balance history chart</p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis 
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Balance']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    activeDot={{ r: 8 }}
                    isAnimationActive={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
