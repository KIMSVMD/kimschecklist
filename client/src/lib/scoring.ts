// ○ (excellent/ok) = 100%,  △ (average/partial) = 50%,  ✗ (poor/issue) = 0%

export function calcVMScore(
  items: Record<string, string>,
  photoUrl: string | null | undefined,
): number {
  const itemCount = Object.keys(items).length;
  const total = itemCount + 1; // +1 for photo slot
  if (total === 0) return 0;

  let score = 0;
  for (const status of Object.values(items)) {
    if (status === "excellent") score += 1;
    else if (status === "average") score += 0.5;
  }
  if (photoUrl) score += 1;

  return Math.round((score / total) * 100);
}

export function calcCleaningScore(
  items: Record<string, { status: string; photoUrl?: string | null; memo?: string | null }>,
): number {
  const values = Object.values(items);
  if (values.length === 0) return 0;

  let score = 0;
  for (const { status } of values) {
    if (status === "ok") score += 1;
    else if (status === "partial") score += 0.5;
  }
  return Math.round((score / values.length) * 100);
}

export function scoreColor(score: number): string {
  if (score >= 80) return "text-blue-600 bg-blue-50 border-blue-200";
  if (score >= 60) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-red-600 bg-red-50 border-red-200";
}

export function scoreLabel(score: number): string {
  if (score >= 90) return "우수";
  if (score >= 70) return "양호";
  if (score >= 50) return "보통";
  return "미흡";
}

export function getGrade(score: number | null): 'A' | 'B' | 'C' | null {
  if (score == null) return null;
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  return 'C';
}

export function gradeColor(grade: 'A' | 'B' | 'C' | null): string {
  if (grade === 'A') return 'text-blue-600 bg-blue-50 border-blue-200';
  if (grade === 'B') return 'text-amber-600 bg-amber-50 border-amber-200';
  if (grade === 'C') return 'text-red-600 bg-red-50 border-red-200';
  return 'text-muted-foreground bg-muted border-border';
}
