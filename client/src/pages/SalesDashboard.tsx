import { Layout } from "@/components/Layout";
import { BarChart3 } from "lucide-react";

// 매출 대시보드 — placeholder until the dashboard's contents are decided.
export default function SalesDashboard() {
  return (
    <Layout title="매출 대시보드" showBack={true}>
      <div className="flex flex-col items-center justify-center text-center py-24 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <BarChart3 className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-black text-secondary">매출 대시보드</h1>
        <p className="text-sm text-muted-foreground">준비 중입니다.</p>
      </div>
    </Layout>
  );
}
