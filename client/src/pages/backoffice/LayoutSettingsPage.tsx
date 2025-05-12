import { BackofficeLayout } from "@/components/backoffice/BackofficeLayout";
import LayoutSettings from "@/pages/admin/LayoutSettings";

export default function LayoutSettingsPage() {
  return (
    <BackofficeLayout>
      <LayoutSettings />
    </BackofficeLayout>
  );
}