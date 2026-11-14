import type {
    Batch,
    BatchRow,
    ClassSession,
    ClassSessionRow,
    DashboardMetrics,
    Location,
    LocationRow,
    Payment,
    PaymentExportRow,
    PaymentRow,
    Student,
    StudentDirectoryEntry,
    StudentPaymentHistoryEntry,
    StudentRow,
} from "../types";
import { SEED_BATCHES } from "./schema";
import { getDatabase } from "./client";

export interface NewStudent {
  fullName: string;
  phone?: string | null;
  batchId: number;
  weeklyFee: number;
}

export interface BatchWithCount extends Batch {
  studentCount: number;
}

export interface BatchWithLocation extends Batch {
  locationName: string;
}

export interface UpdateStudentInput {
  fullName: string;
  phone: string | null;
  batchId: number;
  weeklyFee: number;
  isActive: boolean;
}

export interface LocationSummary extends Location {
  batchCount: number;
  studentCount: number;
}

export interface BatchIncomeSummary {
  batchId: number;
  batchName: string;
  locationName: string;
  amount: number;
}

export type IncomePeriod = "week" | "month" | "year";

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function mapStudent(row: StudentRow): Student {
  return {
    id: row.id,
    regNumber: row.reg_number,
    fullName: row.full_name,
    phone: row.phone,
    batchId: row.batch_id,
    weeklyFee: row.weekly_fee,
    isActive: row.is_active === 1,
    syncStatus: row.sync_status,
    createdAt: row.created_at,
  };
}

function mapSession(row: ClassSessionRow): ClassSession {
  return {
    id: row.id,
    batchId: row.batch_id,
    sessionDate: row.session_date,
    monthKey: row.month_key,
  };
}

function mapPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    studentId: row.student_id,
    sessionId: row.session_id,
    status: row.status,
    amountPaid: row.amount_paid,
    paidAt: row.paid_at,
  };
}

export async function listLocations(): Promise<Location[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<LocationRow>(
    "SELECT id, name, created_at FROM locations ORDER BY name",
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  }));
}

export async function listLocationSummaries(): Promise<LocationSummary[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<
    LocationRow & { batch_count: number; student_count: number }
  >(
    `SELECT l.id, l.name, l.created_at,
       COUNT(DISTINCT b.id) AS batch_count,
       COUNT(DISTINCT CASE WHEN s.is_active = 1 THEN s.id END) AS student_count
     FROM locations l
     LEFT JOIN batches b ON b.location_id = l.id
     LEFT JOIN students s ON s.batch_id = b.id
     GROUP BY l.id
     ORDER BY l.name`,
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    batchCount: row.batch_count,
    studentCount: row.student_count,
  }));
}

export async function getAppSetting(key: string): Promise<string | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_settings WHERE key = ?",
    key,
  );

  return row?.value ?? null;
}

export async function setAppSetting(key: string, value: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
    key,
    value,
  );
}

export async function listStudents(
  batchId: number,
  includeInactive = false,
): Promise<Student[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<StudentRow>(
    `SELECT id, reg_number, full_name, phone, batch_id, weekly_fee, is_active, sync_status, created_at
     FROM students
     WHERE batch_id = ?${includeInactive ? "" : " AND is_active = 1"}
     ORDER BY reg_number`,
    batchId,
  );

  return rows.map(mapStudent);
}

export async function listStudentArrears(
  batchId: number,
): Promise<Record<number, number>> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    student_id: number;
    overdue_count: number;
  }>(
    `SELECT s.id AS student_id, COUNT(*) AS overdue_count
     FROM students s
     JOIN class_sessions cs ON cs.batch_id = s.batch_id AND cs.session_date <= ?
     LEFT JOIN payments p ON p.session_id = cs.id AND p.student_id = s.id
     WHERE s.batch_id = ? AND s.is_active = 1
       AND (p.id IS NULL OR p.status = 'UNPAID')
     GROUP BY s.id`,
    localDateKey(),
    batchId,
  );

  return Object.fromEntries(
    rows.map((row) => [row.student_id, row.overdue_count]),
  );
}

export async function getStudentById(id: number): Promise<Student | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<StudentRow>(
    `SELECT id, reg_number, full_name, phone, batch_id, weekly_fee, is_active, sync_status, created_at
     FROM students WHERE id = ?`,
    id,
  );

  return row ? mapStudent(row) : null;
}

export async function getNextRegistrationNumber(): Promise<number> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ next_reg_number: number }>(
    `SELECT MAX(
       COALESCE((SELECT seq FROM sqlite_sequence WHERE name = 'students'), 0),
       COALESCE(MAX(reg_number), 0)
     ) + 1 AS next_reg_number
     FROM students`,
  );

  return row?.next_reg_number ?? 1;
}

export async function createStudent(input: NewStudent): Promise<Student> {
  const database = await getDatabase();
  let studentId = 0;

  await database.withTransactionAsync(async () => {
    const registration = await database.getFirstAsync<{
      next_reg_number: number;
    }>(
      `SELECT MAX(
         COALESCE((SELECT seq FROM sqlite_sequence WHERE name = 'students'), 0),
         COALESCE(MAX(reg_number), 0)
       ) + 1 AS next_reg_number
       FROM students`,
    );

    if (!registration) {
      throw new Error("Could not generate a registration number.");
    }

    const result = await database.runAsync(
      `INSERT INTO students (reg_number, full_name, phone, batch_id, weekly_fee)
       VALUES (?, ?, ?, ?, ?)`,
      registration.next_reg_number,
      input.fullName.trim(),
      input.phone?.trim() || null,
      input.batchId,
      input.weeklyFee,
    );

    studentId = result.lastInsertRowId;
  });

  const student = await getStudentById(studentId);
  if (!student) {
    throw new Error("Student was created but could not be loaded.");
  }

  return student;
}

export async function listSessions(
  batchId: number,
  monthKey: string,
): Promise<ClassSession[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<ClassSessionRow>(
    `SELECT id, batch_id, session_date, month_key
     FROM class_sessions
     WHERE batch_id = ? AND month_key = ?
     ORDER BY session_date DESC`,
    batchId,
    monthKey,
  );

  return rows.map(mapSession);
}

export async function createSession(
  batchId: number,
  sessionDate: string,
): Promise<ClassSession> {
  const database = await getDatabase();
  const monthKey = sessionDate.slice(0, 7);

  await database.runAsync(
    `INSERT INTO class_sessions (batch_id, session_date, month_key)
     VALUES (?, ?, ?)
     ON CONFLICT (batch_id, session_date) DO NOTHING`,
    batchId,
    sessionDate,
    monthKey,
  );

  const row = await database.getFirstAsync<ClassSessionRow>(
    `SELECT id, batch_id, session_date, month_key
     FROM class_sessions WHERE batch_id = ? AND session_date = ?`,
    batchId,
    sessionDate,
  );

  if (!row) {
    throw new Error("Class session could not be loaded after creation.");
  }

  return mapSession(row);
}

export async function listPayments(sessionIds: number[]): Promise<Payment[]> {
  if (sessionIds.length === 0) {
    return [];
  }

  const database = await getDatabase();
  const placeholders = sessionIds.map(() => "?").join(", ");
  const rows = await database.getAllAsync<PaymentRow>(
    `SELECT id, student_id, session_id, status, amount_paid, paid_at
     FROM payments WHERE session_id IN (${placeholders})`,
    sessionIds,
  );

  return rows.map(mapPayment);
}

export async function recordPaymentAmount(
  studentId: number,
  sessionId: number,
  amountPaid: number,
  weeklyFee: number,
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO payments (student_id, session_id, status, amount_paid, paid_at)
     VALUES (?, ?, CASE WHEN ? >= ? THEN 'PAID' ELSE 'UNPAID' END, ?, CURRENT_TIMESTAMP)
     ON CONFLICT (student_id, session_id) DO UPDATE SET
       status = CASE WHEN excluded.amount_paid >= ? THEN 'PAID' ELSE 'UNPAID' END,
       amount_paid = excluded.amount_paid, paid_at = CURRENT_TIMESTAMP`,
    studentId,
    sessionId,
    amountPaid,
    weeklyFee,
    amountPaid,
    weeklyFee,
  );
}

export async function revertPayment(
  studentId: number,
  sessionId: number,
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO payments (student_id, session_id, status, amount_paid, paid_at)
     VALUES (?, ?, 'UNPAID', 0, NULL)
     ON CONFLICT (student_id, session_id) DO UPDATE SET
       status = 'UNPAID', amount_paid = 0, paid_at = NULL`,
    studentId,
    sessionId,
  );
}

export async function listBatchesWithCounts(
  locationId: number,
): Promise<BatchWithCount[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<BatchRow & { student_count: number }>(
    `SELECT b.id, b.location_id, b.name, b.default_fee, b.sort_order,
       COUNT(s.id) AS student_count
     FROM batches b
     LEFT JOIN students s ON s.batch_id = b.id AND s.is_active = 1
     WHERE b.location_id = ?
     GROUP BY b.id
     ORDER BY b.sort_order, b.id`,
    locationId,
  );

  return rows.map((row) => ({
    id: row.id,
    locationId: row.location_id,
    name: row.name,
    defaultFee: row.default_fee,
    sortOrder: row.sort_order,
    studentCount: row.student_count,
  }));
}

export async function listStudentDirectory(
  includeInactive = false,
): Promise<StudentDirectoryEntry[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<
    StudentRow & {
      batch_name: string;
      location_id: number;
      location_name: string;
      arrears_count: number;
    }
  >(
    `SELECT s.id, s.reg_number, s.full_name, s.phone, s.batch_id, s.weekly_fee,
       s.is_active, s.sync_status, s.created_at,
       b.name AS batch_name, l.id AS location_id, l.name AS location_name,
       CASE WHEN s.is_active = 1 THEN (
         SELECT COUNT(*)
         FROM class_sessions cs
         LEFT JOIN payments p ON p.session_id = cs.id AND p.student_id = s.id
         WHERE cs.batch_id = s.batch_id AND cs.session_date <= ?
           AND (p.id IS NULL OR p.status = 'UNPAID')
       ) ELSE 0 END AS arrears_count
     FROM students s
     JOIN batches b ON b.id = s.batch_id
     JOIN locations l ON l.id = b.location_id
     ${includeInactive ? "" : "WHERE s.is_active = 1"}
     ORDER BY l.name, b.sort_order, s.reg_number`,
    localDateKey(),
  );

  return rows.map((row) => ({
    ...mapStudent(row),
    batchName: row.batch_name,
    locationId: row.location_id,
    locationName: row.location_name,
    arrearsCount: row.arrears_count,
  }));
}

export async function getStudentPaymentHistory(
  studentId: number,
): Promise<StudentPaymentHistoryEntry[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    session_id: number;
    session_date: string;
    status: "UNPAID" | "PAID" | null;
    amount_paid: number | null;
    paid_at: string | null;
  }>(
    `SELECT cs.id AS session_id, cs.session_date,
       p.status, p.amount_paid, p.paid_at
     FROM students s
     JOIN class_sessions cs ON cs.batch_id = s.batch_id
     LEFT JOIN payments p ON p.session_id = cs.id AND p.student_id = s.id
     WHERE s.id = ?
     ORDER BY cs.session_date DESC`,
    studentId,
  );

  return rows.map((row) => ({
    sessionId: row.session_id,
    sessionDate: row.session_date,
    status: row.status ?? "UNPAID",
    amountPaid: row.amount_paid ?? 0,
    paidAt: row.paid_at,
  }));
}

export async function updateStudent(
  id: number,
  input: UpdateStudentInput,
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE students SET full_name = ?, phone = ?, batch_id = ?, weekly_fee = ?,
       is_active = ?, sync_status = 'PENDING'
     WHERE id = ?`,
    input.fullName.trim(),
    input.phone?.trim() || null,
    input.batchId,
    input.weeklyFee,
    input.isActive ? 1 : 0,
    id,
  );
}

function periodStartDate(period: IncomePeriod, date = new Date()): string {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (period === "week") {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  } else if (period === "month") {
    start.setDate(1);
  } else {
    start.setMonth(0, 1);
  }
  return localDateKey(start);
}

export async function getDashboardMetrics(
  locationId: number | null = null,
  period: IncomePeriod = "month",
): Promise<DashboardMetrics> {
  const database = await getDatabase();
  const today = localDateKey();
  const startDate = periodStartDate(period);
  const locationFilter = locationId === null ? "" : " AND b.location_id = ?";
  const locationValue = locationId === null ? [] : [locationId];
  const row = await database.getFirstAsync<{
    collected: number;
    active_students: number;
    pending_payments: number;
    pending_amount: number;
  }>(
    `SELECT
      (SELECT COALESCE(SUM(p.amount_paid), 0)
       FROM payments p
       JOIN class_sessions cs ON cs.id = p.session_id
       JOIN batches b ON b.id = cs.batch_id
       WHERE p.amount_paid > 0
         AND date(p.paid_at, 'localtime') BETWEEN ? AND ?${locationFilter}) AS collected,
      (SELECT COUNT(*) FROM students s
       JOIN batches b ON b.id = s.batch_id
       WHERE s.is_active = 1${locationFilter}) AS active_students,
      (SELECT COUNT(*)
       FROM class_sessions cs
       JOIN batches b ON b.id = cs.batch_id
       JOIN students s ON s.batch_id = cs.batch_id AND s.is_active = 1
       LEFT JOIN payments p ON p.session_id = cs.id AND p.student_id = s.id
       WHERE cs.session_date <= ? AND (p.id IS NULL OR p.status = 'UNPAID')${locationFilter}) AS pending_payments,
      (SELECT COALESCE(SUM(MAX(s.weekly_fee - COALESCE(p.amount_paid, 0), 0)), 0)
       FROM class_sessions cs
       JOIN batches b ON b.id = cs.batch_id
       JOIN students s ON s.batch_id = cs.batch_id AND s.is_active = 1
       LEFT JOIN payments p ON p.session_id = cs.id AND p.student_id = s.id
       WHERE cs.session_date <= ? AND (p.id IS NULL OR p.status = 'UNPAID')${locationFilter}) AS pending_amount`,
    startDate,
    today,
    ...locationValue,
    ...locationValue,
    today,
    ...locationValue,
    today,
    ...locationValue,
  );

  return {
    collected: row?.collected ?? 0,
    activeStudents: row?.active_students ?? 0,
    pendingPayments: row?.pending_payments ?? 0,
    pendingAmount: row?.pending_amount ?? 0,
  };
}

export async function getBatchIncomeSummary(
  locationId: number | null = null,
  period: IncomePeriod = "month",
): Promise<BatchIncomeSummary[]> {
  const database = await getDatabase();
  const locationFilter = locationId === null ? "" : " AND l.id = ?";
  const params: (string | number)[] = [periodStartDate(period), localDateKey()];
  if (locationId !== null) params.push(locationId);
  const rows = await database.getAllAsync<{
    batch_id: number;
    batch_name: string;
    location_name: string;
    amount: number;
  }>(
    `SELECT b.id AS batch_id, b.name AS batch_name, l.name AS location_name,
       COALESCE(SUM(p.amount_paid), 0) AS amount
     FROM batches b
     JOIN locations l ON l.id = b.location_id
     LEFT JOIN class_sessions cs ON cs.batch_id = b.id
     LEFT JOIN payments p ON p.session_id = cs.id AND p.amount_paid > 0
       AND date(p.paid_at, 'localtime') BETWEEN ? AND ?
     WHERE 1 = 1${locationFilter}
     GROUP BY b.id
     ORDER BY amount DESC, b.sort_order, b.name`,
    ...params,
  );

  return rows.map((row) => ({
    batchId: row.batch_id,
    batchName: row.batch_name,
    locationName: row.location_name,
    amount: row.amount,
  }));
}

export async function addLocation(
  name: string,
  defaultFees: readonly number[],
): Promise<void> {
  if (!name.trim() || defaultFees.length !== SEED_BATCHES.length || defaultFees.some((fee) => !Number.isFinite(fee) || fee < 0)) {
    throw new Error("Enter a location name and a valid starting fee for every grade.");
  }

  const database = await getDatabase();
  await database.withTransactionAsync(async () => {
    const result = await database.runAsync(
      "INSERT INTO locations (name) VALUES (?)",
      name.trim(),
    );
    for (const [index, batchName] of SEED_BATCHES.entries()) {
      await database.runAsync(
        "INSERT INTO batches (location_id, name, default_fee, sort_order) VALUES (?, ?, ?, ?)",
        result.lastInsertRowId,
        batchName,
        defaultFees[index],
        index + 1,
      );
    }
  });
}

export async function renameLocation(id: number, name: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    "UPDATE locations SET name = ? WHERE id = ?",
    name.trim(),
    id,
  );
}

export async function createBatch(
  locationId: number,
  name: string,
  defaultFee: number,
): Promise<void> {
  const database = await getDatabase();
  const position = await database.getFirstAsync<{ next_order: number }>(
    "SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM batches WHERE location_id = ?",
    locationId,
  );

  await database.runAsync(
    "INSERT INTO batches (location_id, name, default_fee, sort_order) VALUES (?, ?, ?, ?)",
    locationId,
    name.trim(),
    defaultFee,
    position?.next_order ?? 1,
  );
}

export async function deleteBatch(batchId: number): Promise<void> {
  const database = await getDatabase();

  await database.withTransactionAsync(async () => {
    const batch = await database.getFirstAsync<{ id: number }>(
      "SELECT id FROM batches WHERE id = ?",
      batchId,
    );
    if (!batch) {
      throw new Error("This class no longer exists.");
    }

    await database.runAsync(
      `DELETE FROM sync_status
       WHERE entity_type = 'PAYMENT'
         AND entity_id IN (
           SELECT p.id FROM payments p
           JOIN class_sessions cs ON cs.id = p.session_id
           WHERE cs.batch_id = ?
         )`,
      batchId,
    );
    await database.runAsync(
      `DELETE FROM sync_status
       WHERE entity_type = 'CLASS_SESSION'
         AND entity_id IN (SELECT id FROM class_sessions WHERE batch_id = ?)`,
      batchId,
    );
    await database.runAsync(
      "DELETE FROM sync_status WHERE entity_type = 'STUDENT' AND entity_id IN (SELECT id FROM students WHERE batch_id = ?)",
      batchId,
    );
    await database.runAsync(
      "DELETE FROM sync_status WHERE entity_type = 'BATCH' AND entity_id = ?",
      batchId,
    );
    await database.runAsync("DELETE FROM students WHERE batch_id = ?", batchId);

    const result = await database.runAsync(
      "DELETE FROM batches WHERE id = ?",
      batchId,
    );
    if (result.changes !== 1) {
      throw new Error("This class could not be deleted.");
    }
  });
}

export async function updateBatchDefaultFee(
  batchId: number,
  defaultFee: number,
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    "UPDATE batches SET default_fee = ? WHERE id = ?",
    defaultFee,
    batchId,
  );
}

export async function getPaymentExportRows(): Promise<PaymentExportRow[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    reg_number: number;
    full_name: string;
    phone: string | null;
    location_name: string;
    batch_name: string;
    session_date: string;
    status: "UNPAID" | "PAID" | null;
    amount_paid: number | null;
    paid_at: string | null;
  }>(
    `SELECT s.reg_number, s.full_name, s.phone,
       l.name AS location_name, b.name AS batch_name, cs.session_date,
       p.status, p.amount_paid, p.paid_at
     FROM class_sessions cs
     JOIN batches b ON b.id = cs.batch_id
     JOIN locations l ON l.id = b.location_id
     JOIN students s ON s.batch_id = b.id
     LEFT JOIN payments p ON p.student_id = s.id AND p.session_id = cs.id
     ORDER BY cs.session_date DESC, l.name, b.sort_order, s.reg_number`,
  );

  return rows.map((row) => ({
    regNumber: row.reg_number,
    fullName: row.full_name,
    phone: row.phone,
    locationName: row.location_name,
    batchName: row.batch_name,
    sessionDate: row.session_date,
    status: row.status ?? "UNPAID",
    amountPaid: row.amount_paid ?? 0,
    paidAt: row.paid_at,
  }));
}

export async function listAllBatches(): Promise<BatchWithLocation[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<BatchRow & { location_name: string }>(
    `SELECT b.id, b.location_id, b.name, b.default_fee, b.sort_order,
       l.name AS location_name
     FROM batches b
     JOIN locations l ON l.id = b.location_id
     ORDER BY l.name, b.sort_order, b.id`,
  );

  return rows.map((row) => ({
    id: row.id,
    locationId: row.location_id,
    name: row.name,
    defaultFee: row.default_fee,
    sortOrder: row.sort_order,
    locationName: row.location_name,
  }));
}
