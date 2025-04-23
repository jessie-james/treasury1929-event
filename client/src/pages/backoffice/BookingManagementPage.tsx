import { BackofficeLayout } from "@/components/backoffice/BackofficeLayout";
import { BookingManagement } from "@/components/backoffice/BookingManagement";

export default function BookingManagementPage() {
  return (
    <BackofficeLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Booking Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage customer bookings, process refunds, and update seat assignments.
          </p>
        </div>
        
        <BookingManagement />
      </div>
    </BackofficeLayout>
  );
}