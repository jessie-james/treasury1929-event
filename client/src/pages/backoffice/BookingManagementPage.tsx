import { BackofficeLayout } from "@/components/backoffice/BackofficeLayout";
import { BookingManagement } from "@/components/backoffice/BookingManagement";
import { ManualBookingForm } from "@/components/backoffice/ManualBookingForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function BookingManagementPage() {
  const [, setLocation] = useLocation();
  
  return (
    <BackofficeLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button variant="ghost" size="sm" onClick={() => setLocation('/backoffice')}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <h1 className="text-4xl font-bold">Booking Management</h1>
            </div>
            <p className="text-muted-foreground mt-2">
              Manage customer bookings, process refunds, and update seat assignments.
            </p>
          </div>
          <ManualBookingForm />
        </div>
        
        <BookingManagement />
      </div>
    </BackofficeLayout>
  );
}