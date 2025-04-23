import { BackofficeLayout } from "@/components/backoffice/BackofficeLayout";
import { AdminLogs } from "@/components/backoffice/AdminLogs";

export default function LogsPage() {
  return (
    <BackofficeLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Logs</h1>
          <p className="text-muted-foreground">
            Track and monitor all administrative actions in the system
          </p>
        </div>
        <AdminLogs />
      </div>
    </BackofficeLayout>
  );
}