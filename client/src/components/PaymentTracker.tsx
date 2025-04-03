import { useState } from "react";
import { useLoan } from "@/contexts/LoanContext";
import { formatCurrency, formatDate } from "@/lib/calculations";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Settings2, Trash } from "lucide-react";
import AddPaymentModal from "./AddPaymentModal";
import { Payment } from "@/types/loan";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function PaymentTracker() {
  const { payments, deletePayment } = useLoan();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<number | null>(null);
  
  // Sort payments by date (newest first)
  const sortedPayments = [...payments].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  const handleAddPayment = () => {
    setEditingPayment(null);
    setIsModalOpen(true);
  };
  
  const handleEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setIsModalOpen(true);
  };
  
  const handleDeleteClick = (id: number) => {
    setPaymentToDelete(id);
    setDeleteConfirmOpen(true);
  };
  
  const confirmDelete = () => {
    if (paymentToDelete !== null) {
      deletePayment(paymentToDelete);
      setPaymentToDelete(null);
    }
    setDeleteConfirmOpen(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-900">Your Payments</h2>
        <Button onClick={handleAddPayment} className="flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          Add Payment
        </Button>
      </div>
      
      {/* Payments Table */}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-gray-500 py-6">
                  No payments recorded yet. Add your first payment to start tracking!
                </TableCell>
              </TableRow>
            ) : (
              sortedPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{formatDate(payment.date)}</TableCell>
                  <TableCell>{formatCurrency(payment.amount)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleEditPayment(payment)}
                      className="text-primary hover:text-primary/80 h-8"
                    >
                      <Settings2 className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDeleteClick(payment.id)}
                      className="text-red-500 hover:text-red-700 h-8"
                    >
                      <Trash className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Add/Edit Payment Modal */}
      <AddPaymentModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        payment={editingPayment}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This payment will be permanently deleted
              and removed from your loan payment history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
