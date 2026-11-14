export function formatRegistrationNumber(regNumber: number): string {
  return `SCI${String(regNumber).padStart(3, "0")}`;
}

export function formatCurrency(amount: number): string {
  return `Rs. ${new Intl.NumberFormat("en-LK", { maximumFractionDigits: 2 }).format(amount)}`;
}

export function formatShortDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}
