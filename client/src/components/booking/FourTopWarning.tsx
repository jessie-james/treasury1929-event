import { AlertTriangle, Users, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FourTopWarningProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  tableCapacity: number;
  guestCount: number;
}

export function FourTopWarning({ 
  isOpen, 
  onClose, 
  onContinue, 
  tableCapacity, 
  guestCount 
}: FourTopWarningProps) {
  const extraSeats = tableCapacity - guestCount;
  const pricePerSeat = 19.99;
  const additionalCost = extraSeats * pricePerSeat;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Table Size Notice
          </DialogTitle>
          <DialogDescription>
            You're booking a {tableCapacity}-seat table for {guestCount} guests.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> You'll be charged for all {tableCapacity} seats at this table, 
              even though you only have {guestCount} guests.
            </AlertDescription>
          </Alert>

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>{guestCount} guests × ${pricePerSeat}</span>
              <span>${(guestCount * pricePerSeat).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{extraSeats} additional seats × ${pricePerSeat}</span>
              <span>${additionalCost.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between font-medium">
                <span>Total for {tableCapacity} seats</span>
                <span>${(tableCapacity * pricePerSeat).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>
              💡 <strong>Tip:</strong> Consider inviting {extraSeats} more guest{extraSeats > 1 ? 's' : ''} 
              to make the most of your table booking, or look for a smaller table if available.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Choose Different Table
          </Button>
          <Button onClick={onContinue}>
            Continue with {tableCapacity}-Seat Table
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}