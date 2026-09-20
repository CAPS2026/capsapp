// Client-safe types and helpers for leave requests, shown on the staff
// app's Roster tab. Independent of the dog app's code, like the rest of
// src/lib/shift*.
//
// All caretakers are casual, so there is one kind of leave and no "type".
// Nothing here ever carries a reason: on the roster everyone only sees
// that someone is on leave.

import { parseYmd, type Part } from "@/lib/shift";

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
  approved: "Leave approved",
  declined: "Declined",
  cancelled: "Cancelled",
};

export type LeaveRequestRow = {
  id: string;
  personId: string;
  personName: string;
  startDate: string;
  endDate: string;
  scope: LeaveScope;
  /** The reason. Only ever shown to admins and in the email, never on the shared tablet. */
  note: string | null;
  status: LeaveStatus;
  /** Shayna's optional message back. */
  decisionNote: string | null;
  createdAt: string;
  decidedAt: string | null;
};

/** Approved leave as shown on the roster: who and when, nothing else. */
export type RosterLeave = {
  id: string;
  personId: string;
  name: string;
  startDate: string;
  endDate: string;
  scope: LeaveScope;
};

/** "Mon 5 Oct" for one day, "Mon 5 Oct to Fri 9 Oct" for a run. */
export function formatLeaveDates(start: string, end: string): string {
  const fmt = (s: string) =>
    parseYmd(s).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
  return start === end ? fmt(start) : `${fmt(start)} to ${fmt(end)}`;
}

/** Is this person away on `date`, for any part of the day? */
export function leaveCoversDate(l: { startDate: string; endDate: string }, date: string): boolean {
  return l.startDate <= date && date <= l.endDate;
}

/** Is this person away for that specific session (morning or afternoon)? */
export function leaveCoversSession(l: { startDate: string; endDate: string; scope: LeaveScope }, date: string, part: Part): boolean {
  return leaveCoversDate(l, date) && (l.scope === "all" || l.scope === part);
}

/** A short note for the roster: "all day", "mornings only", "afternoons only". */
export function scopeShort(scope: LeaveScope): string {
  return scope === "all" ? "all day" : scope === "morning" ? "mornings only" : "afternoons only";
}
