import { Platform } from "react-native";

import type { PaymentExportRow } from "../types";
import { formatRegistrationNumber } from "./formatters";

function escapeCsv(value: string | number | null): string {
  const rawText = value === null ? "" : String(value);
  const text = /^[=+\-@]/.test(rawText) ? `'${rawText}` : rawText;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildPaymentsCsv(exportRows: PaymentExportRow[]): string {
  const csvRows = [
    [
      "registration_number",
      "student_name",
      "phone",
      "location",
      "batch",
      "session_date",
      "status",
      "amount_paid",
      "paid_at",
    ],
    ...exportRows.map((row) => [
      formatRegistrationNumber(row.regNumber),
      row.fullName,
      row.phone,
      row.locationName,
      row.batchName,
      row.sessionDate,
      row.status,
      row.amountPaid,
      row.paidAt,
    ]),
  ];

  return csvRows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
}

export async function sharePaymentsCsv(csv: string): Promise<void> {
  const filename = `classvault-payments-${new Date().toISOString().slice(0, 10)}.csv`;

  if (Platform.OS === "web") {
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
    return;
  }

  const [{ File, Paths }, Sharing] = await Promise.all([
    import("expo-file-system"),
    import("expo-sharing"),
  ]);
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  await file.write(`\uFEFF${csv}`);

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("File sharing is not available on this device.");
  }

  await Sharing.shareAsync(file.uri, {
    dialogTitle: "Export ClassVault payments",
    mimeType: "text/csv",
  });
}

export async function shareDatabaseBackup(): Promise<void> {
  if (Platform.OS === "web") {
    throw new Error("Database backup is available in the mobile app.");
  }

  const [{ File, Paths }, Sharing, { getDatabase }] = await Promise.all([
    import("expo-file-system"),
    import("expo-sharing"),
    import("../db/client"),
  ]);
  const database = await getDatabase();
  const bytes = await database.serializeAsync();
  const file = new File(
    Paths.cache,
    `classvault-backup-${new Date().toISOString().slice(0, 10)}.db`,
  );
  file.create({ overwrite: true });
  await file.write(bytes);

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("File sharing is not available on this device.");
  }

  await Sharing.shareAsync(file.uri, {
    dialogTitle: "Back up ClassVault database",
    mimeType: "application/vnd.sqlite3",
  });
}
