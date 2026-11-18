export type UserRole =
  | "super_admin"
  | "admin"
  | "maintenance_team"
  | "field_worker"
  | "citizen";

export type IssueCategory =
  | "Streetlight Not Working"
  | "Flickering / Dim Light"
  | "Damaged / Leaning Pole"
  | "Exposed or Sagging Wire"
  | "Feeder Pillar / Junction Box Issue"
  | "Total Area Blackout"
  | "Transformer Sparking / Overheating"
  | "Cable Insulation Damage";

export type PriorityLevel = "Critical" | "High" | "Medium" | "Low";

export type ComplaintStatus =
  | "Submitted"
  | "Under Review"
  | "Assigned"
  | "On the Way"
  | "Work Started"
  | "Work Completed"
  | "Resolved"
  | "Rejected";

export const COMPLAINT_STATUS_LIST: ComplaintStatus[] = [
  "Submitted",
  "Under Review",
  "Assigned",
  "On the Way",
  "Work Started",
  "Work Completed",
  "Resolved",
  "Rejected",
];

export type WorkerTaskStatus =
  | "Assigned"
  | "On the Way"
  | "Work Started"
  | "Work Completed";

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number; // in meters
  detectedAt?: string;
  addressSnapshot?: string;
}

export interface TimelineEntry {
  time: string;
  stage: string;
  note: string;
  actor: string;
  isInternal?: boolean;
}

export interface AssignmentHistoryEntry {
  assignedAt: string;
  assignedBy: string;
  teamId?: string;
  teamName: string;
  workerId?: string;
  workerName?: string;
  notes?: string;
}

export interface Complaint {
  id: string;
  category: IssueCategory;
  ward: string;
  location: string;
  landmark: string;
  coordinates?: GeoCoordinates;
  priority: PriorityLevel;
  status: ComplaintStatus;
  reportedAt: string;
  reportedBy: string;
  phone: string;
  description: string;
  assignedTeamId?: string;
  assignedTeam?: string;
  assignedWorkerId?: string;
  assignedWorker?: string;
  workerCurrentLocation?: GeoCoordinates; // voluntary location sharing by technician
  isDelayed?: boolean;
  photoBefore?: string;
  photoAfter?: string;
  citizenPhotos?: Array<{ name: string; size: number; url: string }>;
  resolutionNotes?: string;
  rejectionReason?: string;
  timeline: TimelineEntry[];
  assignmentHistory?: AssignmentHistoryEntry[];
}

export type StakeholderRole = UserRole;

export type TeamStatus = "Active" | "On Duty" | "Standby" | "Inactive";
export type StaffStatus = "Active" | "Deactivated" | "Disabled";

export interface CategoryItem {
  id: string;
  name: string;
  description: string;
  severity: PriorityLevel;
  isActive: boolean;
}

export interface SafetyRuleItem {
  id: string;
  rule: string;
  detail: string;
  severity: "danger" | "warning" | "info";
}

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  date: string;
  active: boolean;
}

export interface PublicHomepageStats {
  totalReceived: number;
  totalResolved: number;
  inProgress: number;
  activeTeamsCount: number;
}

export interface WebsiteContent {
  heroTitle: string;
  heroSubtitle: string;
  heroBadge: string;
  reportButtonLabel: string;
  trackButtonLabel: string;
  emergencyNotice: string;
  emergencyHotline: string;
  processSectionTitle: string;
  processSectionSubtitle: string;
  statsSectionTitle: string;
  statsSectionSubtitle: string;
  safetySectionTitle: string;
  safetySectionSubtitle: string;
  safetyRules: SafetyRuleItem[];
  publicAnnouncements: AnnouncementItem[];
}

export interface MaintenanceTeam {
  id: string;
  name: string;
  description: string;
  area: string;
  status: TeamStatus;
  leaderId?: string;
  leadTechnician?: string;
  phone?: string;
  activeTasks?: number;
}

export interface StaffMember {
  id: string;
  staffId: string; // Official badge ID (e.g. STF-001)
  fullName: string;
  email: string;
  phone: string;
  designation: string;
  teamId: string; // Foreign key referencing MaintenanceTeam.id
  teamName: string;
  area: string;
  status: StaffStatus;
  createdAt: string;
  activeWorkCount?: number;
}

export interface UserProfile {
  id: string; // uuid
  email: string;
  fullName: string;
  role: UserRole;
  staffId?: string; // e.g. "SUP-001", "ADM-001", "STF-001"
  phone?: string;
  teamId?: string;
  teamName?: string;
  area?: string;
  designation?: string;
  status: "Active" | "Deactivated" | "Disabled";
  createdAt: string;
  lastLogin?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  targetType: "user" | "team" | "complaint" | "system" | "auth" | "content" | "category";
  targetId: string;
  details: string;
  ipAddress?: string;
}

export interface OperationalSettings {
  emergencyHotline: string;
  criticalSlaHours: number;
  highSlaHours: number;
  mediumSlaHours: number;
  requireCompletionPhotoProof: boolean;
  enableGpsDetection: boolean;
}

export interface PublicResolvedIssue {
  id: string;
  category: IssueCategory;
  ward: string;
  resolvedAt: string;
  durationFormatted: string;
  resolutionSummary: string;
  photoBefore?: string;
  photoAfter?: string;
}

/**
 * Future Supabase Database Schema Models
 * These relational interfaces correspond to PostgreSQL tables and RLS policies planned for production Supabase migrations:
 * - Table `public.profiles`
 * - Table `public.teams`
 * - Table `public.complaints`
 * - Table `public.complaint_assignments`
 * - Table `public.audit_logs`
 * - Table `public.operational_settings`
 */
export interface DatabaseProfileRow {
  id: string; // references auth.users.id
  email: string;
  full_name: string;
  role: UserRole;
  staff_id: string;
  phone: string;
  team_id: string | null;
  area: string | null;
  designation: string | null;
  status: "Active" | "Deactivated";
  created_at: string;
  updated_at: string;
}

export interface DatabaseTeamRow {
  id: string; // UUID primary key
  name: string;
  description: string;
  area: string;
  leader_id: string | null;
  status: TeamStatus;
  created_at: string;
  updated_at: string;
}

export interface DatabaseComplaintRow {
  id: string; // URJ-2026-XXXXXX unique key
  category: IssueCategory;
  ward: string;
  location: string;
  landmark: string;
  latitude: number | null;
  longitude: number | null;
  accuracy_meters: number | null;
  priority: PriorityLevel;
  status: ComplaintStatus;
  reported_at: string;
  reported_by: string;
  phone: string;
  description: string;
  assigned_team_id: string | null;
  assigned_staff_id: string | null;
  is_delayed: boolean;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseAuditLogRow {
  id: string; // UUID
  created_at: string;
  actor_id: string;
  actor_role: UserRole;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
}
