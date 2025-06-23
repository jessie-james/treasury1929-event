import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FourTopWarningProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  guestCount: number;
  tableCapacity: number;
}

export function FourTopWarning({ 
  isOpen, 
  onClose, 
  onContinue, 
  guestCount, 
  tableCapacity 
}: FourTopWarningProps) {
  if (guestCount !== 2 || tableCapacity !== 4) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            4-Top Table Selection
          </DialogTitle>
          <DialogDescription>
            You're selecting a 4-seat table for 2 guests
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Notice:</strong> You've selected a 4-seat table for 2 guests. 
              This means 2 seats will remain empty, but you'll still have the full table for your group.
            </AlertDescription>
          </Alert>
          
          <div className="text-sm text-muted-foreground">
            <p><strong>What this means:</strong></p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>You'll have the entire 4-seat table</li>
              <li>2 seats will remain empty for spacing</li>
              <li>No other guests will be seated at your table</li>
              <li>You'll pay for the number of guests, not seats</li>
            </ul>
          </div>
          
          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Alternative:</strong> Consider looking for a 2-seat table for a more intimate experience, 
              or continue with this 4-seat table if you prefer the extra space.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={onClose}>
            Choose Different Table
          </Button>
          <Button onClick={onContinue}>
            Continue with 4-Seat Table
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}