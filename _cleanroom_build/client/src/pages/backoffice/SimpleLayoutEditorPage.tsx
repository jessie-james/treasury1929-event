import SimpleLayoutEditor from "@/pages/admin/SimpleLayoutEditor";
import { BackofficeLayout } from "@/components/backoffice/BackofficeLayout";

export default function SimpleLayoutEditorPage() {
  return (
    <BackofficeLayout>
      <SimpleLayoutEditor />
    </BackofficeLayout>
  );
}