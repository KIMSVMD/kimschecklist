import { useState } from "react";
import { MapPin } from "lucide-react";
import { useVerifyBranchCode } from "@/hooks/use-branch-code";

export function BranchCodeGate({
  branch,
  onVerified,
  onCancel,
}: {
  branch: string;
  onVerified: () => void;
  onCancel: () => void;
}) {
  const [digits, setDigits] = useState("");
  const [error, setError] = useState(false);
  const verifyMutation = useVerifyBranchCode();

  const handleDigit = (d: string) => {
    if (digits.length >= 4 || verifyMutation.isPending) return;
    const next = digits + d;
    setDigits(next);
    setError(false);
    if (next.length === 4) {
      verifyMutation.mutate(
        { branch, code: next },
        {
          onSuccess: valid => {
            if (valid) {
              onVerified();
            } else {
              setError(true);
              setTimeout(() => setDigits(""), 400);
            }
          },
          onError: () => {
            setError(true);
            setTimeout(() => setDigits(""), 400);
          },
        }
      );
    }
  };

  const handleBackspace = () => setDigits(d => d.slice(0, -1));

  return (
    <div className="flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-xs bg-white rounded-3xl border border-border shadow-lg p-6 space-y-5">
        <div className="text-center space-y-1.5">
          <h2 className="text-lg font-black text-secondary">지점 코드 확인</h2>
          <p className="text-sm text-muted-foreground">점검을 시작하려면 코드를 입력하세요</p>
        </div>

        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-50 text-primary text-sm font-bold">
            <MapPin className="w-3.5 h-3.5" /> {branch}점
          </span>
        </div>

        <div className="flex justify-center gap-3">
          {[0, 1, 2, 3].map(i => (
            <span
              key={i}
              className={`w-3 h-3 rounded-full border-2 transition-colors ${
                i < digits.length
                  ? error
                    ? "bg-red-400 border-red-400"
                    : "bg-primary border-primary"
                  : "border-border"
              }`}
            />
          ))}
        </div>
        {error && (
          <p className="text-center text-xs font-bold text-primary -mt-2">코드가 올바르지 않습니다</p>
        )}

        <div className="grid grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => handleDigit(n)}
              disabled={verifyMutation.isPending}
              className="h-16 rounded-2xl bg-muted text-2xl font-bold text-secondary active:scale-95 transition-all disabled:opacity-50"
              data-testid={`btn-code-${n}`}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={onCancel}
            className="h-16 rounded-2xl bg-muted text-sm font-bold text-muted-foreground active:scale-95 transition-all"
            data-testid="btn-code-cancel"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => handleDigit("0")}
            disabled={verifyMutation.isPending}
            className="h-16 rounded-2xl bg-muted text-2xl font-bold text-secondary active:scale-95 transition-all disabled:opacity-50"
            data-testid="btn-code-0"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-16 rounded-2xl bg-red-50 text-primary text-xl font-bold flex items-center justify-center active:scale-95 transition-all"
            data-testid="btn-code-backspace"
          >
            ⌫
          </button>
        </div>
      </div>
    </div>
  );
}
