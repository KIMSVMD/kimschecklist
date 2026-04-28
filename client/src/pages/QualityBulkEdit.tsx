import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { QualityBulkChecklist } from "./QualityBulkChecklist";
import { Loader2 } from "lucide-react";

export default function QualityBulkEdit() {
  const params = useParams<{ id: string }>();
  const editId = Number(params.id);

  const { data: checklist, isLoading } = useQuery({
    queryKey: ['/api/checklists', editId],
    queryFn: async () => {
      const res = await fetch(`/api/checklists/${editId}`, { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: editId > 0,
  });

  const now = new Date();
  const branch = checklist?.branch ?? '';
  const selYear = checklist?.year ?? now.getFullYear();
  const selMonth = checklist?.month ?? (now.getMonth() + 1);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <QualityBulkChecklist
        branch={branch}
        selYear={selYear}
        selMonth={selMonth}
        editId={editId}
      />
    </Layout>
  );
}
