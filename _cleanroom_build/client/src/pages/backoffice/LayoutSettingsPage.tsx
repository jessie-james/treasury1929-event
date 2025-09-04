import LayoutSettings from "@/pages/admin/LayoutSettingsNew";
import { BackofficeLayout } from "@/components/backoffice/BackofficeLayout";

export default function LayoutSettingsPage() {
  return (
    <BackofficeLayout>
      <LayoutSettings />
    </BackofficeLayout>
  );
}