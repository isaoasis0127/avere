export function formatYen(n: number): string {
  return '¥' + Math.round(n || 0).toLocaleString('ja-JP');
}

export function formatDateTime(ms: number): string {
  if (!ms) return '—';
  const d = new Date(ms);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function formatDate(ms: number): string {
  return ms ? formatDateTime(ms).slice(0, 10) : '—';
}

/** 一覧カード用: 「イギリス ・ 1839年」 */
export function originLabel(country: string, year: string): string {
  return [country, year].filter(Boolean).join(' ・ ');
}

/** 「PCGS PF62」のように鑑定会社とグレードをまとめる */
export function gradeLabel(company: string, grade: string): string {
  return [company, grade].filter(Boolean).join(' ');
}
