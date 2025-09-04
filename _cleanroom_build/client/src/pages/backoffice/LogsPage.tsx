import { BackofficeLayout } from "@/components/backoffice/BackofficeLayout";
import { AdminLogs } from "@/components/backoffice/AdminLogs";

export default function LogsPage() {
  return (
    <BackofficeLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Admin Logs</h1>
          <p className="text-muted-foreground mt-2">
            View all administrative actions performed on the system
          </p>
        </div>
        <AdminLogs />
      </div>
    </BackofficeLayout>
  );
}