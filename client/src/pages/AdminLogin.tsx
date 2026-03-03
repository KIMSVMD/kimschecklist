import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { useAdminLogin, useAdminStatus } from "@/hooks/use-guides";
import { useToast } from "@/hooks/use-toast";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const { toast } = useToast();
  const loginMutation = useAdminLogin();
  const { data: adminStatus } = useAdminStatus();

  useEffect(() => {
    if (adminStatus?.isAdmin) {
      setLocation('/admin/guides');
    }
  }, [adminStatus?.isAdmin, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginMutation.mutateAsync(password);
      setLocation('/admin/guides');
    } catch (err: any) {
      toast({ title: "로그인 실패", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-primary/30">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-secondary">VMD 관리자</h1>
          <p className="text-muted-foreground text-lg">진열 가이드 관리 시스템</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              placeholder="관리자 비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-5 rounded-2xl border-2 border-border text-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all pr-14"
              data-testid="input-admin-password"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPw ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending || !password}
            className="w-full py-5 rounded-2xl bg-primary text-white font-black text-xl shadow-lg shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            data-testid="button-admin-login"
          >
            {loginMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "로그인"}
          </button>
        </form>

        <button
          onClick={() => setLocation('/')}
          className="w-full py-4 rounded-2xl bg-muted text-secondary font-bold text-lg active:scale-[0.98] transition-all"
        >
          돌아가기
        </button>
      </div>
    </div>
  );
}
