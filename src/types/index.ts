export type StudentSyncStatus = "PENDING" | "SYNCED" | "FAILED";

export type SyncEntityType =
  | "LOCATION"
  | "BATCH"
  | "STUDENT"
  | "CLASS_SESSION"
  | "PAYMENT";

export type SyncState = "PENDING" | "SYNCING" | "SYNCED" | "FAILED";

export type PaymentStatus = "UNPAID" | "PAID";

export interface Location {
  id: number;
  name: string;
  createdAt: string;
}

export interface Batch {
  id: number;
  locationId: number;
  name: string;
  defaultFee: number;
  sortOrder: number;
}

export interface Student {
  id: number;
  regNumber: number;
  fullName: string;
  phone: string | null;
  batchId: number;
  weeklyFee: number;
  isActive: boolean;
  syncStatus: StudentSyncStatus;
  createdAt: string;
}

export interface StudentDirectoryEntry extends Student {
  batchName: string;
  locationId: number;
  locationName: string;
  arrearsCount: number;
}

export interface ClassSession {
  id: number;
  batchId: number;
  sessionDate: string;
  monthKey: string;
}

export interface Payment {
  id: number;
  studentId: number;
  sessionId: number;
  status: PaymentStatus;
  amountPaid: number;
  paidAt: string | null;
}

export interface StudentPaymentHistoryEntry {
  sessionId: number;
  sessionDate: string;
  status: PaymentStatus;
  amountPaid: number;
  paidAt: string | null;
}

export interface DashboardMetrics {
  collected: number;
  activeStudents: number;
  pendingPayments: number;
  pendingAmount: number;
}

export interface PaymentExportRow {
  regNumber: number;
  fullName: string;
  phone: string | null;
  locationName: string;
  batchName: string;
  sessionDate: string;
  status: PaymentStatus;
  amountPaid: number;
  paidAt: string | null;
}

export interface SyncStatus {
  id: number;
  entityType: SyncEntityType;
  entityId: number;
  status: SyncState;
  lastSyncedAt: string | null;
  lastError: string | null;
  updatedAt: string;
}

export interface LocationRow {
  id: number;
  name: string;
  created_at: string;
}

export interface BatchRow {
  id: number;
  location_id: number;
  name: string;
  default_fee: number;
  sort_order: number;
}

export interface StudentRow {
  id: number;
  reg_number: number;
  full_name: string;
  phone: string | null;
  batch_id: number;
  weekly_fee: number;
  is_active: 0 | 1;
  sync_status: StudentSyncStatus;
  created_at: string;
}

export interface ClassSessionRow {
  id: number;
  batch_id: number;
  session_date: string;
  month_key: string;
}

export interface PaymentRow {
  id: number;
  student_id: number;
  session_id: number;
  status: PaymentStatus;
  amount_paid: number;
  paid_at: string | null;
}

export interface SyncStatusRow {
  id: number;
  entity_type: SyncEntityType;
  entity_id: number;
  status: SyncState;
  last_synced_at: string | null;
  last_error: string | null;
  updated_at: string;
}
