import { create } from "zustand";

import {
    listBatchesWithCounts,
    listAllBatches,
    listLocations,
    listPayments,
    listSessions,
    listStudentArrears,
    listStudentDirectory,
    listStudents,
} from "../db/queries";
import type {
    ClassSession,
    Location,
    Payment,
    PaymentStatus,
    Student,
    StudentDirectoryEntry,
} from "../types";

interface ClassStore {
  locations: Location[];
  batches: Awaited<ReturnType<typeof listBatchesWithCounts>>;
  allBatches: Awaited<ReturnType<typeof listAllBatches>>;
  students: Student[];
  directoryStudents: StudentDirectoryEntry[];
  sessions: ClassSession[];
  payments: Payment[];
  arrearsByStudentId: Record<number, number>;
  activeLocationId: number | null;
  activeBatchId: number | null;
  searchQuery: string;
  isLoading: boolean;
  dataVersion: number;
  loadInitialData: () => Promise<void>;
  selectLocation: (locationId: number) => Promise<void>;
  selectBatch: (batchId: number) => Promise<void>;
  setSearchQuery: (query: string) => void;
  reloadDirectory: () => Promise<void>;
  applyOptimisticPayment: (
    studentId: number,
    sessionId: number,
    status: PaymentStatus,
    amountPaid: number,
  ) => void;
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export const useClassStore = create<ClassStore>((set, get) => ({
  locations: [],
  batches: [],
  allBatches: [],
  students: [],
  directoryStudents: [],
  sessions: [],
  payments: [],
  arrearsByStudentId: {},
  activeLocationId: null,
  activeBatchId: null,
  searchQuery: "",
  isLoading: false,
  dataVersion: 0,

  loadInitialData: async () => {
    set({ isLoading: true });
    try {
      const [locations, directoryStudents, allBatches] = await Promise.all([
        listLocations(),
        listStudentDirectory(true),
        listAllBatches(),
      ]);
      const locationStillExists = locations.some(
        (location) => location.id === get().activeLocationId,
      );
      const activeLocationId = locationStillExists
        ? get().activeLocationId
        : (locations[0]?.id ?? null);
      const batches = activeLocationId
        ? await listBatchesWithCounts(activeLocationId)
        : [];
      const activeBatchId = batches.some(
        (batch) => batch.id === get().activeBatchId,
      )
        ? get().activeBatchId
        : (batches[0]?.id ?? null);
      let students: Student[] = [];
      let sessions: ClassSession[] = [];
      let arrearsByStudentId: Record<number, number> = {};
      if (activeBatchId) {
        [students, sessions, arrearsByStudentId] = await Promise.all([
          listStudents(activeBatchId),
          listSessions(activeBatchId, currentMonthKey()),
          listStudentArrears(activeBatchId),
        ]);
      }
      const payments = await listPayments(
        sessions.map((session) => session.id),
      );

      set({
        locations,
        directoryStudents,
        allBatches,
        activeLocationId,
        batches,
        activeBatchId,
        students,
        sessions,
        payments,
        arrearsByStudentId,
        dataVersion: get().dataVersion + 1,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  selectLocation: async (locationId) => {
    const batches = await listBatchesWithCounts(locationId);
    const activeBatchId = batches[0]?.id ?? null;
    let students: Student[] = [];
    let sessions: ClassSession[] = [];
    let arrearsByStudentId: Record<number, number> = {};
    if (activeBatchId) {
      [students, sessions, arrearsByStudentId] = await Promise.all([
        listStudents(activeBatchId),
        listSessions(activeBatchId, currentMonthKey()),
        listStudentArrears(activeBatchId),
      ]);
    }
    const payments = await listPayments(sessions.map((session) => session.id));

    set({
      activeLocationId: locationId,
      batches,
      activeBatchId,
      students,
      sessions,
      payments,
      arrearsByStudentId,
      dataVersion: get().dataVersion + 1,
    });
  },

  selectBatch: async (batchId) => {
    const [students, sessions, arrearsByStudentId] = await Promise.all([
      listStudents(batchId),
      listSessions(batchId, currentMonthKey()),
      listStudentArrears(batchId),
    ]);
    const payments = await listPayments(sessions.map((session) => session.id));

    set({
      activeBatchId: batchId,
      students,
      sessions,
      payments,
      arrearsByStudentId,
      dataVersion: get().dataVersion + 1,
    });
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  reloadDirectory: async () => {
    const [directoryStudents, locations, allBatches] = await Promise.all([
      listStudentDirectory(true),
      listLocations(),
      listAllBatches(),
    ]);
    const activeLocationId = get().activeLocationId;
    const batches = activeLocationId
      ? await listBatchesWithCounts(activeLocationId)
      : [];

    set({
      directoryStudents,
      locations,
      allBatches,
      batches,
      dataVersion: get().dataVersion + 1,
    });
  },

  applyOptimisticPayment: (studentId, sessionId, status, amountPaid) => {
    const existing = get().payments.find(
      (payment) =>
        payment.studentId === studentId && payment.sessionId === sessionId,
    );
    const payment: Payment = {
      id: existing?.id ?? -Date.now(),
      studentId,
      sessionId,
      status,
      amountPaid,
      paidAt: status === "PAID" ? new Date().toISOString() : null,
    };
    const arrearsByStudentId = { ...get().arrearsByStudentId };
    const currentArrears = arrearsByStudentId[studentId] ?? 0;
    const directoryStudents = get().directoryStudents.map((student) => {
      if (student.id !== studentId) return student;
      if (status === "PAID" && existing?.status !== "PAID") {
        return { ...student, arrearsCount: Math.max(0, student.arrearsCount - 1) };
      }
      if (status === "UNPAID" && existing?.status === "PAID") {
        return { ...student, arrearsCount: student.arrearsCount + 1 };
      }
      return student;
    });

    if (status === "PAID" && existing?.status !== "PAID") {
      arrearsByStudentId[studentId] = Math.max(0, currentArrears - 1);
    } else if (status === "UNPAID" && existing?.status === "PAID") {
      arrearsByStudentId[studentId] = currentArrears + 1;
    }

    set({
      payments: [
        ...get().payments.filter((item) => item.id !== existing?.id),
        payment,
      ],
      arrearsByStudentId,
      directoryStudents,
      dataVersion: get().dataVersion + 1,
    });
  },
}));
