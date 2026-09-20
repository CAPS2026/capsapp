// Client-safe types and labels for leave requests (the staff app's Leave
// tab). Independent of the dog app's code, like the rest of src/lib/shift*.

import { parseYmd } from "@/lib/shift";

export type LeaveType = "annual" | "personal" | "unpaid";
export const LEAVE_TYPES: LeaveType[] = ["annual", "personal", "unpaid"];
export const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  annual: "Annual leave",
  personal: "Personal leave (sick or carer's)",
  unpaid: "Unpaid leave",
};

export type LeaveScope = "all" | "morning" | "afternoon";
export const LEAVE_SCOPES: LeaveScope[] = ["all", "morning", "afternoon"];
export const LEAVE_SCOPE_LABEL: Record<LeaveScope, string> = {
  all: "All day",
  morning: "Morning shifts only",
  afternoon: "Afternoon shifts only",
};

export type LeaveStatus = "pending" | "approved" | "declined" | "cancelled";
export const LEAVE_STATUS_LABEL: Record<LeaveStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  declined: "Declined",
  cancelled: "Cancelled",
};

export type LeaveRequestRow = {
  id: string;
  personId: string;
  personName: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  scope: LeaveScope;
  /** The reason. Only ever shown to admins and in the email, never on the shared tablet. */
  note: string | null;
  status: LeaveStatus;
  decisionNote: string | null;
  createdAt: string;
  decidedAt: string | null;
};

/** "Mon 5 Oct" for one day, "Mon 5 Oct to Fri 9 Oct" for a run. */
export function formatLeaveDates(start: string, end: string): string {
  const fmt = (s: string) =>
    parseYmd(s).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
  return start === end ? fmt(start) : `${fmt(start)} to ${fmt(end)}`;
}
