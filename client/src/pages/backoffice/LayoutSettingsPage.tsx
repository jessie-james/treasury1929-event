import LayoutSettings from "@/pages/admin/LayoutSettings";
import { BackofficeLayout } from "@/components/backoffice/BackofficeLayout";

export default function LayoutSettingsPage() {
  return (
    <BackofficeLayout>
      <LayoutSettings />
    </BackofficeLayout>
  );
}