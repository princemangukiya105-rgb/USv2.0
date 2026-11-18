/**
 * UrjaSetu 2.0 — Supabase Service Contract & Architecture Layer
 * 
 * IMPORTANT ARCHITECTURAL NOTICE:
 * Supabase is not connected yet. This module defines the strict TypeScript contracts,
 * data models, and service interfaces for future Supabase client integration.
 * 
 * In production:
 * - Client calls use `@supabase/supabase-js` configured with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 * - The SUPABASE_SERVICE_ROLE_KEY is strictly restricted to secure server-side routes (e.g. Next.js Route Handlers)
 *   and NEVER exposed in client-side bundles.
 * - Row Level Security (RLS) policies on PostgreSQL enforce role authorization at the database level.
 */

import {
  UserProfile,
  UserRole,
  Complaint,
  MaintenanceTeam,
  StaffMember,
  AuditLogEntry,
  OperationalSettings,
  PublicResolvedIssue,
} from "@/types/urjasetu";

export interface AuthServiceContract {
  signInWithPassword: (credentials: {
    email: string;
    password: string;
  }) => Promise<{ user: UserProfile | null; error: string | null }>;
  signOut: () => Promise<void>;
  getUserProfile: (userId: string) => Promise<UserProfile | null>;
  initiatePasswordReset: (
    email: string,
    requestedByRole: UserRole
  ) => Promise<{ success: boolean; message: string }>;
  updateUserPassword: (
    newPassword: string
  ) => Promise<{ success: boolean; message: string }>;
}

export interface ComplaintServiceContract {
  submitCitizenComplaint: (
    data: Omit<Complaint, "id" | "status" | "timeline" | "reportedAt">
  ) => Promise<{ complaintId: string; success: boolean }>;
  getComplaintById: (complaintId: string) => Promise<Complaint | null>;
  listComplaints: (filters?: {
    status?: string;
    ward?: string;
    teamId?: string;
    workerId?: string;
  }) => Promise<Complaint[]>;
  assignComplaint: (params: {
    complaintId: string;
    teamId: string;
    workerId?: string;
    adminActor: string;
    notes?: string;
  }) => Promise<boolean>;
  updateWorkProgress: (params: {
    complaintId: string;
    newStatus: string;
    workerName: string;
    notes: string;
    photoUrl?: string;
  }) => Promise<boolean>;
  getPublicTransparencyStats: () => Promise<{
    totalReceived: number;
    totalResolved: number;
    inProgress: number;
    activeTeamsCount: number;
    recentlyResolved: PublicResolvedIssue[];
  }>;
}

export interface TeamAndStaffServiceContract {
  listTeams: () => Promise<MaintenanceTeam[]>;
  createTeam: (team: Omit<MaintenanceTeam, "id">) => Promise<MaintenanceTeam>;
  updateTeam: (id: string, updates: Partial<MaintenanceTeam>) => Promise<boolean>;
  listStaff: (teamId?: string) => Promise<StaffMember[]>;
  createStaff: (staff: Omit<StaffMember, "id">) => Promise<StaffMember>;
  updateStaff: (id: string, updates: Partial<StaffMember>) => Promise<boolean>;
  transferStaff: (staffId: string, targetTeamId: string) => Promise<boolean>;
  toggleStaffStatus: (staffId: string, currentStatus: "Active" | "Deactivated") => Promise<boolean>;
}

export interface AuditLogServiceContract {
  logAction: (entry: Omit<AuditLogEntry, "id" | "timestamp">) => Promise<void>;
  listAuditLogs: (limit?: number) => Promise<AuditLogEntry[]>;
}

export interface SettingsServiceContract {
  getSettings: () => Promise<OperationalSettings>;
  updateSettings: (updates: Partial<OperationalSettings>, adminActor: string) => Promise<boolean>;
}
