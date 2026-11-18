"use client";

import React, { useState } from "react";
import {
  Complaint,
  PriorityLevel,
  ComplaintStatus,
  MaintenanceTeam,
  StaffMember,
  UserProfile,
  AuditLogEntry,
  OperationalSettings,
  TeamStatus,
  StaffStatus,
  WebsiteContent,
  CategoryItem,
  SafetyRuleItem,
  AnnouncementItem,
} from "@/types/urjasetu";
import { WARDS_LIST } from "@/data/demoData";
import { ImageViewerModal, ImageViewerData } from "@/components/ImageViewerModal";
import { DEFAULT_HAZARD_FALLBACK_URL } from "@/utils/imageUtils";

export interface CollectionStatusReport {
  complaints: { count: number; exists: boolean };
  users: { count: number; exists: boolean; adminsCount?: number; superAdminsCount?: number; staffCount?: number };
  teams: { count: number; exists: boolean };
  auditLogs: { count: number; exists: boolean };
  categories: { count: number; exists: boolean };
  websiteContent: { exists: boolean };
  settings: { exists: boolean };
}

interface SuperAdminViewProps {
  complaints: Complaint[];
  teams: MaintenanceTeam[];
  staffMembers: StaffMember[];
  admins: UserProfile[];
  superAdmins: UserProfile[];
  auditLogs: AuditLogEntry[];
  settings: OperationalSettings;
  websiteContent: WebsiteContent;
  categories: CategoryItem[];
  collectionStatus?: CollectionStatusReport;
  dataSource?: "firestore" | "demo";
  onRefresh?: () => void;
  onUpdateComplaint: (
    complaintId: string,
    updates: Partial<Complaint>,
    timelineNote: string,
    actor: string
  ) => void;
  onCreateAdmin: (admin: UserProfile) => void;
  onUpdateAdmin: (adminId: string, updates: Partial<UserProfile>) => void;
  onDeleteAdmin?: (adminId: string) => void;
  onCreateSuperAdmin: (superAdmin: UserProfile) => void;
  onCreateTeam: (team: MaintenanceTeam) => void;
  onUpdateTeam: (teamId: string, updates: Partial<MaintenanceTeam>) => void;
  onDeleteTeam?: (teamId: string) => void;
  onCreateStaff: (staff: StaffMember) => void;
  onUpdateStaff: (staffId: string, updates: Partial<StaffMember>) => void;
  onDeleteStaff?: (staffId: string) => void;
  onUpdateSettings: (newSettings: Partial<OperationalSettings>) => void;
  onUpdateWebsiteContent?: (newContent: Partial<WebsiteContent>) => void;
  onAddCategory?: (category: CategoryItem) => void;
  onUpdateCategory?: (categoryId: string, updates: Partial<CategoryItem>) => void;
  onDeleteCategory?: (categoryId: string) => void;
  onAddAuditLog: (entry: Omit<AuditLogEntry, "id" | "timestamp">) => void;
  onExit?: () => void;
}

interface DeleteModalState {
  isOpen: boolean;
  type: "admin" | "staff" | "team" | "category" | "announcement" | "safety_rule";
  id: string;
  name: string;
  canDelete: boolean;
  reason?: string;
}

export const SuperAdminView: React.FC<SuperAdminViewProps> = ({
  complaints,
  teams,
  staffMembers,
  admins,
  superAdmins,
  auditLogs,
  settings,
  websiteContent,
  categories,
  collectionStatus,
  dataSource = "demo",
  onRefresh,
  onUpdateComplaint,
  onCreateAdmin,
  onUpdateAdmin,
  onDeleteAdmin,
  onCreateSuperAdmin,
  onCreateTeam,
  onUpdateTeam,
  onDeleteTeam,
  onCreateStaff,
  onUpdateStaff,
  onDeleteStaff,
  onUpdateSettings,
  onUpdateWebsiteContent,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onAddAuditLog,
  onExit,
}) => {
  // Navigation tabs (Simple English)
  const [activeTab, setActiveTab] = useState<
    "overview" | "admins" | "staff" | "complaints" | "website" | "audit" | "settings"
  >("overview");

  // Notification feedback
  const [actionAlert, setActionAlert] = useState<string | null>(null);
  const showAlert = (msg: string) => {
    setActionAlert(msg);
    setTimeout(() => setActionAlert(null), 4000);
  };

  // Safe delete modal
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    isOpen: false,
    type: "admin",
    id: "",
    name: "",
    canDelete: true,
  });

  // ---------------------------------------------------------
  // State for Admin Management
  // ---------------------------------------------------------
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [showAddSuperAdminModal, setShowAddSuperAdminModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<UserProfile | null>(null);

  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPhone, setNewAdminPhone] = useState("");
  const [newAdminArea, setNewAdminArea] = useState(WARDS_LIST[0]);
  const [newAdminDesignation, setNewAdminDesignation] = useState("Operations Dispatch Inspector");

  const [newSupAdminName, setNewSupAdminName] = useState("");
  const [newSupAdminEmail, setNewSupAdminEmail] = useState("");
  const [newSupAdminPhone, setNewSupAdminPhone] = useState("");

  // ---------------------------------------------------------
  // State for Staff & Team Management
  // ---------------------------------------------------------
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<MaintenanceTeam | null>(null);

  const [showCreateStaffModal, setShowCreateStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [viewingStaffDetails, setViewingStaffDetails] = useState<StaffMember | null>(null);
  const [transferTargetStaff, setTransferTargetStaff] = useState<StaffMember | null>(null);
  const [transferTeamId, setTransferTeamId] = useState("");

  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDesc, setNewTeamDesc] = useState("");
  const [newTeamArea, setNewTeamArea] = useState(WARDS_LIST[0]);
  const [newTeamStatus, setNewTeamStatus] = useState<TeamStatus>("Active");

  const [newStaffFullName, setNewStaffFullName] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffPhone, setNewStaffPhone] = useState("");
  const [newStaffDesignation, setNewStaffDesignation] = useState("Senior Lineman");
  const [newStaffTeamId, setNewStaffTeamId] = useState(teams[0]?.id || "");
  const [newStaffArea, setNewStaffArea] = useState(WARDS_LIST[0]);

  // Staff search & filters (No horizontal scrolling layout)
  const [staffSearch, setStaffSearch] = useState("");
  const [staffTeamFilter, setStaffTeamFilter] = useState("ALL");
  const [staffStatusFilter, setStaffStatusFilter] = useState("ALL");

  // ---------------------------------------------------------
  // State for Complaint Triage & Assignment
  // ---------------------------------------------------------
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    complaints[0] || null
  );
  const [viewerImage, setViewerImage] = useState<ImageViewerData | null>(null);
  const [complaintSearch, setComplaintSearch] = useState("");
  const [complaintStatusFilter, setComplaintStatusFilter] = useState("ALL");
  const [complaintWardFilter, setComplaintWardFilter] = useState("ALL");
  const [assignTeamName, setAssignTeamName] = useState(
    selectedComplaint?.assignedTeam || ""
  );
  const [assignWorkerName, setAssignWorkerName] = useState(
    selectedComplaint?.assignedWorker || ""
  );
  const [assignPriority, setAssignPriority] = useState<PriorityLevel>(
    selectedComplaint?.priority || "High"
  );
  const [assignStatus, setAssignStatus] = useState<ComplaintStatus>(
    selectedComplaint?.status || "Under Review"
  );
  const [triageNote, setTriageNote] = useState("");

  // ---------------------------------------------------------
  // State for Website Management
  // ---------------------------------------------------------
  const [websiteHeroTitle, setWebsiteHeroTitle] = useState(websiteContent.heroTitle);
  const [websiteHeroSubtitle, setWebsiteHeroSubtitle] = useState(websiteContent.heroSubtitle);
  const [websiteHeroBadge, setWebsiteHeroBadge] = useState(websiteContent.heroBadge);
  const [websiteHotline, setWebsiteHotline] = useState(websiteContent.emergencyHotline);
  const [websiteEmergencyNotice, setWebsiteEmergencyNotice] = useState(websiteContent.emergencyNotice);
  const [websiteReportBtn, setWebsiteReportBtn] = useState(websiteContent.reportButtonLabel);
  const [websiteTrackBtn, setWebsiteTrackBtn] = useState(websiteContent.trackButtonLabel);

  // Categories state
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");
  const [newCategorySeverity, setNewCategorySeverity] = useState<PriorityLevel>("High");

  // Announcements state
  const [showAddAnnouncementModal, setShowAddAnnouncementModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementItem | null>(null);
  const [newAnnouncementTitle, setNewAnnouncementTitle] = useState("");
  const [newAnnouncementContent, setNewAnnouncementContent] = useState("");

  // Safety rules state
  const [showAddSafetyRuleModal, setShowAddSafetyRuleModal] = useState(false);
  const [editingSafetyRule, setEditingSafetyRule] = useState<SafetyRuleItem | null>(null);
  const [newRuleTitle, setNewRuleTitle] = useState("");
  const [newRuleDetail, setNewRuleDetail] = useState("");
  const [newRuleSeverity, setNewRuleSeverity] = useState<"danger" | "warning" | "info">("danger");

  // ---------------------------------------------------------
  // State for Audit Logs & Settings
  // ---------------------------------------------------------
  const [auditFilterAction, setAuditFilterAction] = useState("ALL");
  const [auditSearch, setAuditSearch] = useState("");

  const [hotlineInput, setHotlineInput] = useState(settings.emergencyHotline);
  const [criticalSlaInput, setCriticalSlaInput] = useState(settings.criticalSlaHours);
  const [highSlaInput, setHighSlaInput] = useState(settings.highSlaHours);

  // Platform metrics
  const totalComplaints = complaints.length;
  const pendingComplaints = complaints.filter(
    (c) => c.status !== "Resolved" && c.status !== "Rejected"
  ).length;
  const newComplaints = complaints.filter((c) => c.status === "Submitted").length;
  const unassignedComplaints = complaints.filter(
    (c) => !c.assignedTeam && c.status !== "Resolved" && c.status !== "Rejected"
  ).length;
  const inProgressComplaints = complaints.filter(
    (c) =>
      c.status === "Work Started" ||
      c.status === "On the Way" ||
      c.status === "Work Completed"
  ).length;
  const resolvedComplaints = complaints.filter((c) => c.status === "Resolved").length;
  const delayedComplaints = complaints.filter((c) => c.isDelayed && c.status !== "Resolved").length;
  const activeTeamsCount = teams.filter((t) => t.status === "Active" || t.status === "On Duty").length;
  const activeStaffCount = staffMembers.filter((s) => s.status === "Active").length;
  const activeAdminsCount = admins.filter((a) => a.status === "Active").length;

  // ---------------------------------------------------------
  // Handlers for Admins
  // ---------------------------------------------------------
  const handleCreateAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminName.trim() || !newAdminEmail.trim()) {
      alert("Name and email are required.");
      return;
    }

    const nextId = `ADM-${String(admins.length + 1).padStart(3, "0")}`;
    const newAdmin: UserProfile = {
      id: `usr-adm-${Date.now()}`,
      staffId: nextId,
      fullName: newAdminName.trim(),
      email: newAdminEmail.trim(),
      phone: newAdminPhone.trim() || "98200 88000",
      role: "admin",
      area: newAdminArea,
      designation: newAdminDesignation,
      status: "Active",
      createdAt: new Date().toISOString().split("T")[0],
      lastLogin: "Never",
    };

    onCreateAdmin(newAdmin);
    onAddAuditLog({
      actorId: "usr-sup-001",
      actorName: "Dr. Aruna Swaminathan",
      actorRole: "super_admin",
      action: "CREATE_ADMIN",
      targetType: "user",
      targetId: nextId,
      details: `Created new Admin account for ${newAdmin.fullName} (${nextId}).`,
    });

    setShowAddAdminModal(false);
    setNewAdminName("");
    setNewAdminEmail("");
    setNewAdminPhone("");
    showAlert(`Admin account ${nextId} created successfully.`);
  };

  const handleUpdateAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    onUpdateAdmin(editingAdmin.id, editingAdmin);
    onAddAuditLog({
      actorId: "usr-sup-001",
      actorName: "Dr. Aruna Swaminathan",
      actorRole: "super_admin",
      action: "UPDATE_ADMIN",
      targetType: "user",
      targetId: editingAdmin.staffId || editingAdmin.id,
      details: `Updated Admin account details for ${editingAdmin.fullName}.`,
    });
    setEditingAdmin(null);
    showAlert(`Admin ${editingAdmin.fullName} updated successfully.`);
  };

  const handleToggleAdminStatus = (admin: UserProfile) => {
    const isCurrentlyActive = admin.status === "Active";
    const nextStatus: "Active" | "Disabled" = isCurrentlyActive ? "Disabled" : "Active";
    onUpdateAdmin(admin.id, { status: nextStatus });
    onAddAuditLog({
      actorId: "usr-sup-001",
      actorName: "Dr. Aruna Swaminathan",
      actorRole: "super_admin",
      action: isCurrentlyActive ? "DISABLE_ADMIN" : "ENABLE_ADMIN",
      targetType: "user",
      targetId: admin.staffId || admin.id,
      details: `Changed Admin status for ${admin.fullName} to ${nextStatus}.`,
    });
    showAlert(`Admin ${admin.fullName} is now ${nextStatus}.`);
  };

  const handleRequestDeleteAdmin = (admin: UserProfile) => {
    if (admins.length <= 1) {
      setDeleteModal({
        isOpen: true,
        type: "admin",
        id: admin.id,
        name: admin.fullName,
        canDelete: false,
        reason: "You cannot delete the only remaining Admin account. The system requires at least one active Admin.",
      });
      return;
    }
    setDeleteModal({
      isOpen: true,
      type: "admin",
      id: admin.id,
      name: `${admin.fullName} (${admin.staffId || "Admin"})`,
      canDelete: true,
    });
  };

  const handleCreateSuperAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupAdminName.trim() || !newSupAdminEmail.trim()) {
      alert("Name and email are required.");
      return;
    }

    const nextId = `SUP-${String(superAdmins.length + 1).padStart(3, "0")}`;
    const newSup: UserProfile = {
      id: `usr-sup-${Date.now()}`,
      staffId: nextId,
      fullName: newSupAdminName.trim(),
      email: newSupAdminEmail.trim(),
      phone: newSupAdminPhone.trim() || "98200 99000",
      role: "super_admin",
      designation: "Executive Platform Director",
      status: "Active",
      createdAt: new Date().toISOString().split("T")[0],
      lastLogin: "Never",
    };

    onCreateSuperAdmin(newSup);
    onAddAuditLog({
      actorId: "usr-sup-001",
      actorName: "Dr. Aruna Swaminathan",
      actorRole: "super_admin",
      action: "CREATE_SUPER_ADMIN",
      targetType: "user",
      targetId: nextId,
      details: `Authorized secondary Super Admin role for ${newSup.fullName}.`,
    });

    setShowAddSuperAdminModal(false);
    setNewSupAdminName("");
    setNewSupAdminEmail("");
    setNewSupAdminPhone("");
    showAlert(`Super Admin authority granted to ${newSup.fullName}.`);
  };

  const handleInitiatePasswordReset = (user: UserProfile) => {
    onAddAuditLog({
      actorId: "usr-sup-001",
      actorName: "Dr. Aruna Swaminathan",
      actorRole: "super_admin",
      action: "INITIATE_PASSWORD_RESET",
      targetType: "auth",
      targetId: user.staffId || user.id,
      details: `Initiated administrative password reset for ${user.fullName} (${user.email}).`,
    });
    showAlert(`Password reset request triggered for ${user.fullName} (${user.email}).`);
  };

  // ---------------------------------------------------------
  // Handlers for Teams
  // ---------------------------------------------------------
  const handleCreateTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) {
      alert("Team name is required.");
      return;
    }
    const teamId = `team-${Date.now()}`;
    const newTeam: MaintenanceTeam = {
      id: teamId,
      name: newTeamName.trim(),
      description: newTeamDesc.trim() || "Electrical emergency response and maintenance squad.",
      area: newTeamArea,
      status: newTeamStatus,
      leadTechnician: "Unassigned",
      activeTasks: 0,
    };
    onCreateTeam(newTeam);
    onAddAuditLog({
      actorId: "usr-sup-001",
      actorName: "Dr. Aruna Swaminathan",
      actorRole: "super_admin",
      action: "CREATE_TEAM",
      targetType: "team",
      targetId: teamId,
      details: `Created maintenance squad ${newTeam.name} for ${newTeam.area}.`,
    });
    setShowCreateTeamModal(false);
    setNewTeamName("");
    setNewTeamDesc("");
    showAlert(`Squad ${newTeam.name} created successfully.`);
  };

  const handleUpdateTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;
    onUpdateTeam(editingTeam.id, editingTeam);
    onAddAuditLog({
      actorId: "usr-sup-001",
      actorName: "Dr. Aruna Swaminathan",
      actorRole: "super_admin",
      action: "UPDATE_TEAM",
      targetType: "team",
      targetId: editingTeam.id,
      details: `Updated squad configuration for ${editingTeam.name}.`,
    });
    setEditingTeam(null);
    showAlert(`Squad ${editingTeam.name} updated successfully.`);
  };

  const handleRequestDeleteTeam = (team: MaintenanceTeam) => {
    const assignedStaff = staffMembers.filter((s) => s.teamId === team.id);
    const assignedTickets = complaints.filter(
      (c) => c.assignedTeamId === team.id && c.status !== "Resolved"
    );

    if (assignedStaff.length > 0 || assignedTickets.length > 0) {
      setDeleteModal({
        isOpen: true,
        type: "team",
        id: team.id,
        name: team.name,
        canDelete: false,
        reason: `Cannot delete squad "${team.name}" because it currently has ${assignedStaff.length} staff member(s) and ${assignedTickets.length} active ticket(s). Please transfer or reassign them first, or set squad status to Inactive.`,
      });
      return;
    }

    setDeleteModal({
      isOpen: true,
      type: "team",
      id: team.id,
      name: team.name,
      canDelete: true,
    });
  };

  // ---------------------------------------------------------
  // Handlers for Staff
  // ---------------------------------------------------------
  const handleCreateStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffFullName.trim() || !newStaffEmail.trim()) {
      alert("Full name and email are required.");
      return;
    }
    const matchedTeam = teams.find((t) => t.id === newStaffTeamId) || teams[0];
    const nextStaffId = `STF-${String(staffMembers.length + 1).padStart(3, "0")}`;
    const newStaff: StaffMember = {
      id: `usr-stf-${Date.now()}`,
      staffId: nextStaffId,
      fullName: newStaffFullName.trim(),
      email: newStaffEmail.trim(),
      phone: newStaffPhone.trim() || "98200 77000",
      designation: newStaffDesignation,
      teamId: matchedTeam?.id || "team-north-01",
      teamName: matchedTeam?.name || "North Rapid Response",
      area: newStaffArea,
      status: "Active",
      createdAt: new Date().toISOString().split("T")[0],
      activeWorkCount: 0,
    };
    onCreateStaff(newStaff);
    onAddAuditLog({
      actorId: "usr-sup-001",
      actorName: "Dr. Aruna Swaminathan",
      actorRole: "super_admin",
      action: "CREATE_STAFF",
      targetType: "user",
      targetId: nextStaffId,
      details: `Registered technician ${newStaff.fullName} (${nextStaffId}) to ${newStaff.teamName}.`,
    });
    setShowCreateStaffModal(false);
    setNewStaffFullName("");
    setNewStaffEmail("");
    setNewStaffPhone("");
    showAlert(`Staff member ${newStaff.fullName} (${nextStaffId}) created successfully.`);
  };

  const handleUpdateStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    onUpdateStaff(editingStaff.id, editingStaff);
    onAddAuditLog({
      actorId: "usr-sup-001",
      actorName: "Dr. Aruna Swaminathan",
      actorRole: "super_admin",
      action: "UPDATE_STAFF",
      targetType: "user",
      targetId: editingStaff.staffId,
      details: `Updated staff profile for ${editingStaff.fullName} (${editingStaff.staffId}).`,
    });
    setEditingStaff(null);
    showAlert(`Staff profile for ${editingStaff.fullName} updated.`);
  };

  const handleToggleStaffStatus = (staff: StaffMember) => {
    const isCurrentlyActive = staff.status === "Active";
    const nextStatus: StaffStatus = isCurrentlyActive ? "Disabled" : "Active";
    onUpdateStaff(staff.id, { status: nextStatus });
    onAddAuditLog({
      actorId: "usr-sup-001",
      actorName: "Dr. Aruna Swaminathan",
      actorRole: "super_admin",
      action: isCurrentlyActive ? "DISABLE_STAFF" : "ENABLE_STAFF",
      targetType: "user",
      targetId: staff.staffId,
      details: `Changed staff status for ${staff.fullName} to ${nextStatus}.`,
    });
    showAlert(`Staff member ${staff.fullName} is now ${nextStatus}.`);
  };

  const handleTransferStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferTargetStaff || !transferTeamId) return;
    const destTeam = teams.find((t) => t.id === transferTeamId);
    if (!destTeam) return;

    onUpdateStaff(transferTargetStaff.id, {
      teamId: destTeam.id,
      teamName: destTeam.name,
      area: destTeam.area,
    });

    onAddAuditLog({
      actorId: "usr-sup-001",
      actorName: "Dr. Aruna Swaminathan",
      actorRole: "super_admin",
      action: "TRANSFER_STAFF",
      targetType: "user",
      targetId: transferTargetStaff.staffId,
      details: `Transferred technician ${transferTargetStaff.fullName} from ${transferTargetStaff.teamName} to ${destTeam.name}.`,
    });

    const transferredName = transferTargetStaff.fullName;
    setTransferTargetStaff(null);
    showAlert(`Technician ${transferredName} transferred to ${destTeam.name}.`);
  };

  const handleRequestDeleteStaff = (staff: StaffMember) => {
    const activeTasks = complaints.filter(
      (c) => c.assignedWorkerId === staff.id && c.status !== "Resolved"
    );

    if (activeTasks.length > 0) {
      setDeleteModal({
        isOpen: true,
        type: "staff",
        id: staff.id,
        name: `${staff.fullName} (${staff.staffId})`,
        canDelete: false,
        reason: `Cannot permanently delete technician "${staff.fullName}" because they currently have ${activeTasks.length} active ticket(s) assigned. Please reassign the tickets or click "Disable" instead to keep historical records intact.`,
      });
      return;
    }

    setDeleteModal({
      isOpen: true,
      type: "staff",
      id: staff.id,
      name: `${staff.fullName} (${staff.staffId})`,
      canDelete: true,
    });
  };

  // ---------------------------------------------------------
  // Handlers for Website Content & Public Info
  // ---------------------------------------------------------
  const handleSaveWebsiteContent = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateWebsiteContent) {
      onUpdateWebsiteContent({
        heroTitle: websiteHeroTitle.trim(),
        heroSubtitle: websiteHeroSubtitle.trim(),
        heroBadge: websiteHeroBadge.trim(),
        emergencyHotline: websiteHotline.trim(),
        emergencyNotice: websiteEmergencyNotice.trim(),
        reportButtonLabel: websiteReportBtn.trim(),
        trackButtonLabel: websiteTrackBtn.trim(),
      });
    }

    onAddAuditLog({
      actorId: "usr-sup-001",
      actorName: "Dr. Aruna Swaminathan",
      actorRole: "super_admin",
      action: "UPDATE_WEBSITE_CONTENT",
      targetType: "content",
      targetId: "homepage",
      details: "Updated public website headings, descriptions, and hotline.",
    });

    showAlert("Website content saved and published successfully.");
  };

  // Categories Handlers
  const handleCreateCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      alert("Category name is required.");
      return;
    }
    const catId = `cat-${Date.now()}`;
    const newCat: CategoryItem = {
      id: catId,
      name: newCategoryName.trim(),
      description: newCategoryDesc.trim() || "Public electrical hazard category",
      severity: newCategorySeverity,
      isActive: true,
    };
    if (onAddCategory) onAddCategory(newCat);

    onAddAuditLog({
      actorId: "usr-sup-001",
      actorName: "Dr. Aruna Swaminathan",
      actorRole: "super_admin",
      action: "CREATE_CATEGORY",
      targetType: "category",
      targetId: catId,
      details: `Created new complaint category "${newCat.name}".`,
    });

    setShowAddCategoryModal(false);
    setNewCategoryName("");
    setNewCategoryDesc("");
    showAlert(`Category "${newCat.name}" added successfully.`);
  };

  const handleUpdateCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    if (onUpdateCategory) onUpdateCategory(editingCategory.id, editingCategory);

    onAddAuditLog({
      actorId: "usr-sup-001",
      actorName: "Dr. Aruna Swaminathan",
      actorRole: "super_admin",
      action: "UPDATE_CATEGORY",
      targetType: "category",
      targetId: editingCategory.id,
      details: `Updated category "${editingCategory.name}".`,
    });

    setEditingCategory(null);
    showAlert(`Category "${editingCategory.name}" updated successfully.`);
  };

  const handleRequestDeleteCategory = (category: CategoryItem) => {
    const linkedComplaints = complaints.filter(
      (c) => c.category === category.name
    );

    if (linkedComplaints.length > 0) {
      setDeleteModal({
        isOpen: true,
        type: "category",
        id: category.id,
        name: category.name,
        canDelete: false,
        reason: `Cannot permanently delete category "${category.name}" because ${linkedComplaints.length} historical complaint(s) depend on it. Please click "Disable" instead to prevent citizens from filing new complaints under this category while keeping past records intact.`,
      });
      return;
    }

    setDeleteModal({
      isOpen: true,
      type: "category",
      id: category.id,
      name: category.name,
      canDelete: true,
    });
  };

  // Announcements Handlers
  const handleCreateAnnouncementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncementTitle.trim() || !newAnnouncementContent.trim()) {
      alert("Title and content are required.");
      return;
    }
    const newAnc: AnnouncementItem = {
      id: `anc-${Date.now()}`,
      title: newAnnouncementTitle.trim(),
      content: newAnnouncementContent.trim(),
      date: "Today",
      active: true,
    };
    const updated = [newAnc, ...(websiteContent.publicAnnouncements || [])];
    if (onUpdateWebsiteContent) onUpdateWebsiteContent({ publicAnnouncements: updated });

    onAddAuditLog({
      actorId: "usr-sup-001",
      actorName: "Dr. Aruna Swaminathan",
      actorRole: "super_admin",
      action: "CREATE_ANNOUNCEMENT",
      targetType: "content",
      targetId: newAnc.id,
      details: `Published public announcement: "${newAnc.title}".`,
    });

    setShowAddAnnouncementModal(false);
    setNewAnnouncementTitle("");
    setNewAnnouncementContent("");
    showAlert("Public announcement published.");
  };

  const handleUpdateAnnouncementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnnouncement) return;
    const updated = websiteContent.publicAnnouncements.map((a) =>
      a.id === editingAnnouncement.id ? editingAnnouncement : a
    );
    if (onUpdateWebsiteContent) onUpdateWebsiteContent({ publicAnnouncements: updated });

    onAddAuditLog({
      actorId: "usr-sup-001",
      actorName: "Dr. Aruna Swaminathan",
      actorRole: "super_admin",
      action: "UPDATE_ANNOUNCEMENT",
      targetType: "content",
      targetId: editingAnnouncement.id,
      details: `Updated announcement: "${editingAnnouncement.title}".`,
    });

    setEditingAnnouncement(null);
    showAlert("Announcement updated.");
  };

  // Safety Rules Handlers
  const handleCreateSafetyRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleTitle.trim() || !newRuleDetail.trim()) {
      alert("Rule title and detail are required.");
      return;
    }
    const newRule: SafetyRuleItem = {
      id: `sr-${Date.now()}`,
      rule: newRuleTitle.trim(),
      detail: newRuleDetail.trim(),
      severity: newRuleSeverity,
    };
    const updated = [...(websiteContent.safetyRules || []), newRule];
    if (onUpdateWebsiteContent) onUpdateWebsiteContent({ safetyRules: updated });

    onAddAuditLog({
      actorId: "usr-sup-001",
      actorName: "Dr. Aruna Swaminathan",
      actorRole: "super_admin",
      action: "CREATE_SAFETY_RULE",
      targetType: "content",
      targetId: newRule.id,
      details: `Added public safety rule: "${newRule.rule}".`,
    });

    setShowAddSafetyRuleModal(false);
    setNewRuleTitle("");
    setNewRuleDetail("");
    showAlert("Safety guidance rule added.");
  };

  const handleUpdateSafetyRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSafetyRule) return;
    const updated = websiteContent.safetyRules.map((r) =>
      r.id === editingSafetyRule.id ? editingSafetyRule : r
    );
    if (onUpdateWebsiteContent) onUpdateWebsiteContent({ safetyRules: updated });

    onAddAuditLog({
      actorId: "usr-sup-001",
      actorName: "Dr. Aruna Swaminathan",
      actorRole: "super_admin",
      action: "UPDATE_SAFETY_RULE",
      targetType: "content",
      targetId: editingSafetyRule.id,
      details: `Updated safety rule: "${editingSafetyRule.rule}".`,
    });

    setEditingSafetyRule(null);
    showAlert("Safety rule updated.");
  };

  // Execute Confirmed Delete
  const handleConfirmDelete = () => {
    if (!deleteModal.canDelete) return;

    if (deleteModal.type === "admin" && onDeleteAdmin) {
      onDeleteAdmin(deleteModal.id);
      onAddAuditLog({
        actorId: "usr-sup-001",
        actorName: "Dr. Aruna Swaminathan",
        actorRole: "super_admin",
        action: "DELETE_ADMIN",
        targetType: "user",
        targetId: deleteModal.id,
        details: `Deleted Admin account "${deleteModal.name}".`,
      });
      showAlert(`Admin ${deleteModal.name} deleted.`);
    } else if (deleteModal.type === "staff" && onDeleteStaff) {
      onDeleteStaff(deleteModal.id);
      onAddAuditLog({
        actorId: "usr-sup-001",
        actorName: "Dr. Aruna Swaminathan",
        actorRole: "super_admin",
        action: "DELETE_STAFF",
        targetType: "user",
        targetId: deleteModal.id,
        details: `Deleted staff member "${deleteModal.name}".`,
      });
      showAlert(`Technician ${deleteModal.name} deleted.`);
    } else if (deleteModal.type === "team" && onDeleteTeam) {
      onDeleteTeam(deleteModal.id);
      onAddAuditLog({
        actorId: "usr-sup-001",
        actorName: "Dr. Aruna Swaminathan",
        actorRole: "super_admin",
        action: "DELETE_TEAM",
        targetType: "team",
        targetId: deleteModal.id,
        details: `Deleted maintenance squad "${deleteModal.name}".`,
      });
      showAlert(`Squad ${deleteModal.name} deleted.`);
    } else if (deleteModal.type === "category" && onDeleteCategory) {
      onDeleteCategory(deleteModal.id);
      onAddAuditLog({
        actorId: "usr-sup-001",
        actorName: "Dr. Aruna Swaminathan",
        actorRole: "super_admin",
        action: "DELETE_CATEGORY",
        targetType: "category",
        targetId: deleteModal.id,
        details: `Deleted complaint category "${deleteModal.name}".`,
      });
      showAlert(`Category "${deleteModal.name}" deleted.`);
    } else if (deleteModal.type === "announcement" && onUpdateWebsiteContent) {
      const updated = websiteContent.publicAnnouncements.filter((a) => a.id !== deleteModal.id);
      onUpdateWebsiteContent({ publicAnnouncements: updated });
      onAddAuditLog({
        actorId: "usr-sup-001",
        actorName: "Dr. Aruna Swaminathan",
        actorRole: "super_admin",
        action: "DELETE_ANNOUNCEMENT",
        targetType: "content",
        targetId: deleteModal.id,
        details: `Deleted public announcement "${deleteModal.name}".`,
      });
      showAlert("Announcement deleted.");
    } else if (deleteModal.type === "safety_rule" && onUpdateWebsiteContent) {
      const updated = websiteContent.safetyRules.filter((r) => r.id !== deleteModal.id);
      onUpdateWebsiteContent({ safetyRules: updated });
      onAddAuditLog({
        actorId: "usr-sup-001",
        actorName: "Dr. Aruna Swaminathan",
        actorRole: "super_admin",
        action: "DELETE_SAFETY_RULE",
        targetType: "content",
        targetId: deleteModal.id,
        details: `Deleted safety rule "${deleteModal.name}".`,
      });
      showAlert("Safety rule deleted.");
    }

    setDeleteModal({ isOpen: false, type: "admin", id: "", name: "", canDelete: true });
  };

  // ---------------------------------------------------------
  // Handlers for Complaints Master Assignment
  // ---------------------------------------------------------
  const handleSelectComplaint = (c: Complaint) => {
    setSelectedComplaint(c);
    setAssignTeamName(c.assignedTeam || "");
    setAssignWorkerName(c.assignedWorker || "");
    setAssignPriority(c.priority);
    setAssignStatus(c.status);
    setTriageNote("");
  };

  const handleSaveComplaintAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    const matchedTeam = teams.find((t) => t.name === assignTeamName);
    const matchedWorker = staffMembers.find((s) => s.fullName === assignWorkerName);

    const note =
      triageNote.trim() ||
      `Super Admin assigned ticket to ${assignTeamName || "Unassigned"} (${assignWorkerName || "Unit Lead"}). Priority: ${assignPriority}, Status: ${assignStatus}.`;

    onUpdateComplaint(
      selectedComplaint.id,
      {
        priority: assignPriority,
        status: assignStatus,
        assignedTeamId: matchedTeam?.id,
        assignedTeam: assignTeamName || undefined,
        assignedWorkerId: matchedWorker?.id,
        assignedWorker: assignWorkerName || undefined,
      },
      note,
      "Super Admin (Dr. Aruna Swaminathan)"
    );

    onAddAuditLog({
      actorId: "usr-sup-001",
      actorName: "Dr. Aruna Swaminathan",
      actorRole: "super_admin",
      action: "REASSIGN_TICKET",
      targetType: "complaint",
      targetId: selectedComplaint.id,
      details: `Assigned ticket ${selectedComplaint.id} to team ${assignTeamName} (Worker: ${assignWorkerName}).`,
    });

    setSelectedComplaint({
      ...selectedComplaint,
      priority: assignPriority,
      status: assignStatus,
      assignedTeamId: matchedTeam?.id,
      assignedTeam: assignTeamName || undefined,
      assignedWorkerId: matchedWorker?.id,
      assignedWorker: assignWorkerName || undefined,
    });

    showAlert(`Ticket ${selectedComplaint.id} assigned and saved.`);
  };

  // Filter complaints
  const filteredComplaints = complaints.filter((c) => {
    const term = complaintSearch.trim().toLowerCase();
    const matchSearch =
      !term ||
      c.id.toLowerCase().includes(term) ||
      c.category.toLowerCase().includes(term) ||
      c.location.toLowerCase().includes(term);
    const matchStatus = complaintStatusFilter === "ALL" ? true : c.status === complaintStatusFilter;
    const matchWard = complaintWardFilter === "ALL" ? true : c.ward === complaintWardFilter;
    return matchSearch && matchStatus && matchWard;
  });

  // Filter staff members (Responsive layout, no horizontal scroll)
  const filteredStaff = staffMembers.filter((sm) => {
    const term = staffSearch.trim().toLowerCase();
    const matchSearch =
      !term ||
      sm.fullName.toLowerCase().includes(term) ||
      sm.staffId.toLowerCase().includes(term) ||
      sm.designation.toLowerCase().includes(term) ||
      sm.email.toLowerCase().includes(term);
    const matchTeam = staffTeamFilter === "ALL" ? true : sm.teamId === staffTeamFilter;
    const matchStatus =
      staffStatusFilter === "ALL"
        ? true
        : staffStatusFilter === "Active"
        ? sm.status === "Active"
        : sm.status === "Disabled" || sm.status === "Deactivated";
    return matchSearch && matchTeam && matchStatus;
  });

  // Filter audit logs
  const filteredAuditLogs = auditLogs.filter((log) => {
    const term = auditSearch.trim().toLowerCase();
    const matchSearch =
      !term ||
      log.actorName.toLowerCase().includes(term) ||
      log.targetId.toLowerCase().includes(term) ||
      log.details.toLowerCase().includes(term);
    const matchAction = auditFilterAction === "ALL" ? true : log.action === auditFilterAction;
    return matchSearch && matchAction;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Action Notification Alert */}
      {actionAlert && (
        <div className="bg-[#087E8B] text-white px-4 py-3 rounded-xl shadow-md text-xs font-semibold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span>{actionAlert}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionAlert(null)}
            className="text-white/80 hover:text-white font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Console Bar (Simple English) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#EAF3F5] rounded-xl p-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-[#173F5F]">Super Admin Control Panel</h1>
            <span className="bg-[#173F5F] text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded">
              Master Authority
            </span>
          </div>
          <p className="text-xs text-[#263238]/70 mt-0.5">
            Logged in as Dr. Aruna Swaminathan (Executive Director) &bull; Full control over staff, content, and website.
          </p>
        </div>

        {onExit && (
          <button
            type="button"
            onClick={onExit}
            className="px-3.5 py-1.5 border border-[#EAF3F5] hover:bg-[#F7F7F2] text-[#173F5F] rounded-lg text-xs font-semibold self-start md:self-auto"
          >
            Lock &amp; Exit
          </button>
        )}
      </div>

      {/* Primary Navigation Tabs (7 Simple English Tabs) */}
      <div className="flex items-center justify-between border-b border-[#EAF3F5] pb-2 overflow-x-auto gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "overview"
                ? "bg-[#173F5F] text-white shadow-xs"
                : "text-[#263238]/70 hover:bg-[#EAF3F5] hover:text-[#173F5F]"
            }`}
          >
            Dashboard
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("admins")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "admins"
                ? "bg-[#173F5F] text-white shadow-xs"
                : "text-[#263238]/70 hover:bg-[#EAF3F5] hover:text-[#173F5F]"
            }`}
          >
            Manage Admins
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("staff")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "staff"
                ? "bg-[#173F5F] text-white shadow-xs"
                : "text-[#263238]/70 hover:bg-[#EAF3F5] hover:text-[#173F5F]"
            }`}
          >
            Manage Staff &amp; Teams
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("complaints")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "complaints"
                ? "bg-[#173F5F] text-white shadow-xs"
                : "text-[#263238]/70 hover:bg-[#EAF3F5] hover:text-[#173F5F]"
            }`}
          >
            Review Complaints
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("website")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "website"
                ? "bg-[#173F5F] text-white shadow-xs"
                : "text-[#263238]/70 hover:bg-[#EAF3F5] hover:text-[#173F5F]"
            }`}
          >
            Website Management
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "audit"
                ? "bg-[#173F5F] text-white shadow-xs"
                : "text-[#263238]/70 hover:bg-[#EAF3F5] hover:text-[#173F5F]"
            }`}
          >
            Audit Logs
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "settings"
                ? "bg-[#173F5F] text-white shadow-xs"
                : "text-[#263238]/70 hover:bg-[#EAF3F5] hover:text-[#173F5F]"
            }`}
          >
            Platform Settings
          </button>
        </div>

        <div className="text-[11px] text-[#263238]/60 bg-[#EAF3F5] px-2.5 py-1 rounded border border-[#087E8B]/20 whitespace-nowrap">
          Super Admin Privileges Active
        </div>
      </div>

      {/* =========================================================================
          TAB 1: DASHBOARD (Overview & Reports)
          ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-6 text-xs text-[#263238]">
          {/* Firestore Connection & Real-Time Sync Status */}
          <div className="bg-white border border-[#EAF3F5] rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${dataSource === "firestore" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}></span>
              <div>
                <span className="font-bold text-xs text-[#173F5F] block">
                  {dataSource === "firestore" ? "Cloud Firestore Live Database" : "Offline Demo Simulation Mode"}
                </span>
                <span className="text-[11px] text-[#263238]/60">
                  {dataSource === "firestore"
                    ? "Displaying cryptographically verified live database records. Zero mock data."
                    : "Demo data active. Connect live Firebase database to display production records."}
                </span>
              </div>
            </div>

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="px-3 py-1.5 bg-[#EAF3F5] hover:bg-[#d8eaf0] text-[#087E8B] rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto border border-[#087E8B]/20"
              >
                <span>↻</span>
                <span>Refresh Live Data</span>
              </button>
            )}
          </div>

          {/* Collection Status Transparency Notice if empty */}
          {dataSource === "firestore" && collectionStatus && (
            <div className="bg-[#F7F7F2] border border-[#EAF3F5] rounded-xl p-3.5 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] uppercase tracking-wider text-[#173F5F]">
                  Firestore Collection Audit
                </span>
                <span className="text-[10px] text-[#087E8B] font-mono font-semibold">
                  Native Firestore Asia-South1
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px]">
                <div className="bg-white p-2 rounded border border-[#EAF3F5]">
                  <span className="text-[#263238]/60 block text-[10px]">complaints</span>
                  <span className="font-bold font-mono text-[#173F5F]">{collectionStatus.complaints.count} docs</span>
                  <span className="text-[9px] block text-slate-500">{collectionStatus.complaints.count > 0 ? "✓ Populated" : "0 records (empty)"}</span>
                </div>
                <div className="bg-white p-2 rounded border border-[#EAF3F5]">
                  <span className="text-[#263238]/60 block text-[10px]">admins</span>
                  <span className="font-bold font-mono text-[#173F5F]">{admins.length} docs</span>
                  <span className="text-[9px] block text-slate-500">{admins.length > 0 ? "✓ Populated" : "0 records (empty)"}</span>
                </div>
                <div className="bg-white p-2 rounded border border-[#EAF3F5]">
                  <span className="text-[#263238]/60 block text-[10px]">staff</span>
                  <span className="font-bold font-mono text-[#173F5F]">{staffMembers.length} docs</span>
                  <span className="text-[9px] block text-slate-500">{staffMembers.length > 0 ? "✓ Populated" : "0 records (empty)"}</span>
                </div>
                <div className="bg-white p-2 rounded border border-[#EAF3F5]">
                  <span className="text-[#263238]/60 block text-[10px]">teams</span>
                  <span className="font-bold font-mono text-[#173F5F]">{teams.length} docs</span>
                  <span className="text-[9px] block text-slate-500">{teams.length > 0 ? "✓ Populated" : "0 records (empty)"}</span>
                </div>
                <div className="bg-white p-2 rounded border border-[#EAF3F5]">
                  <span className="text-[#263238]/60 block text-[10px]">auditLogs</span>
                  <span className="font-bold font-mono text-[#173F5F]">{auditLogs.length} docs</span>
                  <span className="text-[9px] block text-slate-500">{auditLogs.length > 0 ? "✓ Populated" : "0 records (empty)"}</span>
                </div>
                <div className="bg-white p-2 rounded border border-[#EAF3F5]">
                  <span className="text-[#263238]/60 block text-[10px]">categories</span>
                  <span className="font-bold font-mono text-[#173F5F]">{categories.length} docs</span>
                  <span className="text-[9px] block text-slate-500">{categories.length > 0 ? "✓ Populated" : "0 records (empty)"}</span>
                </div>
              </div>
            </div>
          )}

          {/* 6 Core Administrative Metrics (Instruction 3) */}
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#173F5F] mb-2.5">
              Core Administrative Metrics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
              {/* 1. Total Complaints */}
              <div className="bg-white border border-[#EAF3F5] rounded-xl p-4 shadow-xs">
                <span className="font-semibold text-[#263238]/70 block uppercase text-[10px]">
                  Total Complaints
                </span>
                <span className="text-2xl font-extrabold text-[#173F5F] font-mono mt-1 block">
                  {totalComplaints}
                </span>
                <span className="text-[10px] text-[#087E8B]">Registered in database</span>
              </div>

              {/* 2. Pending Complaints */}
              <div className="bg-white border border-[#EAF3F5] rounded-xl p-4 shadow-xs">
                <span className="font-semibold text-[#b25514] block uppercase text-[10px]">
                  Pending Complaints
                </span>
                <span className="text-2xl font-extrabold text-[#b25514] font-mono mt-1 block">
                  {pendingComplaints}
                </span>
                <span className="text-[10px] text-[#b25514]">Active lifecycle</span>
              </div>

              {/* 3. Resolved Complaints */}
              <div className="bg-white border border-[#EAF3F5] rounded-xl p-4 shadow-xs">
                <span className="font-semibold text-[#087E8B] block uppercase text-[10px]">
                  Resolved Complaints
                </span>
                <span className="text-2xl font-extrabold text-[#087E8B] font-mono mt-1 block">
                  {resolvedComplaints}
                </span>
                <span className="text-[10px] text-[#087E8B]">Verified &amp; closed</span>
              </div>

              {/* 4. Total Admins */}
              <div className="bg-white border border-[#EAF3F5] rounded-xl p-4 shadow-xs">
                <span className="font-semibold text-[#173F5F] block uppercase text-[10px]">
                  Total Admins
                </span>
                <span className="text-2xl font-extrabold text-[#173F5F] font-mono mt-1 block">
                  {admins.length}
                </span>
                <span className="text-[10px] text-[#263238]/60">{activeAdminsCount} active operational</span>
              </div>

              {/* 5. Total Staff */}
              <div className="bg-white border border-[#EAF3F5] rounded-xl p-4 shadow-xs">
                <span className="font-semibold text-[#173F5F] block uppercase text-[10px]">
                  Total Staff
                </span>
                <span className="text-2xl font-extrabold text-[#173F5F] font-mono mt-1 block">
                  {staffMembers.length}
                </span>
                <span className="text-[10px] text-[#263238]/60">{activeStaffCount} active technicians</span>
              </div>

              {/* 6. Total Maintenance Teams */}
              <div className="bg-white border border-[#EAF3F5] rounded-xl p-4 shadow-xs">
                <span className="font-semibold text-[#173F5F] block uppercase text-[10px]">
                  Maintenance Teams
                </span>
                <span className="text-2xl font-extrabold text-[#173F5F] font-mono mt-1 block">
                  {teams.length}
                </span>
                <span className="text-[10px] text-[#263238]/60">{activeTeamsCount} active squads</span>
              </div>
            </div>
          </div>

          {/* Secondary Triage Lifecycle Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F7F7F2] p-3 rounded-xl border border-[#EAF3F5]">
            <div>
              <span className="text-[10px] font-semibold text-[#263238]/60 uppercase block">Waiting Review</span>
              <span className="text-lg font-bold text-[#173F5F] font-mono">{newComplaints}</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-[#263238]/60 uppercase block">Unassigned</span>
              <span className="text-lg font-bold text-[#b25514] font-mono">{unassignedComplaints}</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-[#263238]/60 uppercase block">In Progress</span>
              <span className="text-lg font-bold text-[#087E8B] font-mono">{inProgressComplaints}</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-[#263238]/60 uppercase block">Delayed SLA</span>
              <span className="text-lg font-bold text-[#b25514] font-mono">{delayedComplaints}</span>
            </div>
          </div>

          {/* Recent Complaints & Recent Activity (Instruction 4) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Complaints from Firestore */}
            <div className="bg-white border border-[#EAF3F5] rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#EAF3F5] pb-2.5">
                <h3 className="font-bold text-sm text-[#173F5F] flex items-center gap-2">
                  <span>Recent Complaints</span>
                  <span className="bg-[#EAF3F5] text-[#173F5F] text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                    {complaints.length} Total
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab("complaints")}
                  className="text-xs font-semibold text-[#087E8B] hover:underline"
                >
                  View All &rarr;
                </button>
              </div>

              {complaints.length === 0 ? (
                <div className="py-8 text-center bg-[#F7F7F2] rounded-lg border border-dashed border-[#EAF3F5] space-y-1">
                  <span className="text-2xl block">📭</span>
                  <p className="font-semibold text-xs text-[#173F5F]">No complaints recorded in Firestore yet</p>
                  <p className="text-[11px] text-[#263238]/60">Citizen complaints filed through the portal will appear here in real time.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#F7F7F2] text-[#263238]/70 text-[10px] uppercase border-b border-[#EAF3F5]">
                      <tr>
                        <th className="py-2 px-2.5">Ticket ID</th>
                        <th className="py-2 px-2.5">Category</th>
                        <th className="py-2 px-2.5">Ward</th>
                        <th className="py-2 px-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAF3F5]">
                      {complaints.slice(0, 5).map((c) => (
                        <tr key={c.id} className="hover:bg-[#F7F7F2]/60">
                          <td className="py-2.5 px-2.5 font-mono font-bold text-[#173F5F]">{c.id}</td>
                          <td className="py-2.5 px-2.5 text-[#263238] font-medium truncate max-w-[150px]">{c.category}</td>
                          <td className="py-2.5 px-2.5 text-[#263238]/70">{c.ward}</td>
                          <td className="py-2.5 px-2.5">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              c.status === "Resolved"
                                ? "bg-emerald-50 text-[#087E8B]"
                                : c.status === "Rejected"
                                ? "bg-red-50 text-red-600"
                                : "bg-[#EAF3F5] text-[#173F5F]"
                            }`}>
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent Platform Activity from Firestore Audit Log */}
            <div className="bg-white border border-[#EAF3F5] rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#EAF3F5] pb-2.5">
                <h3 className="font-bold text-sm text-[#173F5F] flex items-center gap-2">
                  <span>Recent Platform Activity</span>
                  <span className="bg-[#EAF3F5] text-[#173F5F] text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                    {auditLogs.length} Events
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab("audit")}
                  className="text-xs font-semibold text-[#087E8B] hover:underline"
                >
                  Audit Log &rarr;
                </button>
              </div>

              {auditLogs.length === 0 ? (
                <div className="py-8 text-center bg-[#F7F7F2] rounded-lg border border-dashed border-[#EAF3F5] space-y-1">
                  <span className="text-2xl block">📋</span>
                  <p className="font-semibold text-xs text-[#173F5F]">No activity logs found in Firestore yet</p>
                  <p className="text-[11px] text-[#263238]/60">Administrative actions and system events will appear here.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {auditLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="p-2.5 rounded-lg bg-[#F7F7F2] border border-[#EAF3F5] text-[11px] space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#173F5F]">{log.action}</span>
                        <span className="text-[10px] text-[#263238]/60 font-mono">{log.timestamp}</span>
                      </div>
                      <p className="text-[#263238]/80 line-clamp-1">{log.details}</p>
                      <span className="text-[10px] text-[#087E8B] block font-medium">By {log.actorName} ({log.actorRole})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-[#EAF3F5] rounded-xl p-5 shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-[#173F5F]">
                Ward Coverage &amp; Complaint Density
              </h3>
              <div className="space-y-2.5">
                {WARDS_LIST.map((ward) => {
                  const wardCount = complaints.filter((c) => c.ward === ward).length;
                  const pct = totalComplaints ? Math.round((wardCount / totalComplaints) * 100) : 0;
                  return (
                    <div key={ward} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-[#263238]">{ward}</span>
                        <span className="font-mono text-[#173F5F] font-bold">
                          {wardCount} ticket{wardCount !== 1 ? "s" : ""} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#EAF3F5] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#087E8B] rounded-full"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border border-[#EAF3F5] rounded-xl p-5 shadow-xs space-y-3.5">
              <h3 className="font-bold text-sm text-[#173F5F]">
                Platform User Hierarchy
              </h3>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-lg bg-[#EAF3F5]/60 border border-[#087E8B]/20 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#173F5F] block">Super Administrators ({superAdmins.length})</span>
                    <span className="text-[11px] text-[#263238]/70">Full control over website content, Admins, staff, teams, and audit logs.</span>
                  </div>
                  <span className="bg-[#173F5F] text-white font-mono text-[10px] px-2 py-0.5 rounded font-bold">L1 Master</span>
                </div>

                <div className="p-3 rounded-lg bg-[#F7F7F2] border border-[#EAF3F5] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#263238] block">Operational Admins ({activeAdminsCount} Active)</span>
                    <span className="text-[11px] text-[#263238]/70">Staff roster control, team assignment, triage, and daily monitoring.</span>
                  </div>
                  <span className="bg-[#087E8B] text-white font-mono text-[10px] px-2 py-0.5 rounded font-bold">L2 Operations</span>
                </div>

                <div className="p-3 rounded-lg bg-[#F7F7F2] border border-[#EAF3F5] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#263238] block">Maintenance Teams ({activeTeamsCount} Active Squads)</span>
                    <span className="text-[11px] text-[#263238]/70">Squad-level work order coordination and technician dispatch.</span>
                  </div>
                  <span className="bg-[#263238] text-white font-mono text-[10px] px-2 py-0.5 rounded font-bold">L3 Squad</span>
                </div>

                <div className="p-3 rounded-lg bg-[#F7F7F2] border border-[#EAF3F5] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#263238] block">Field Workers ({activeStaffCount} Technicians)</span>
                    <span className="text-[11px] text-[#263238]/70">On-site execution, safety checklists, directions, and photo proof.</span>
                  </div>
                  <span className="bg-[#087E8B]/80 text-white font-mono text-[10px] px-2 py-0.5 rounded font-bold">L4 Field</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: MANAGE ADMINS (Add, Edit, Disable, Safe Delete)
          ========================================================================= */}
      {activeTab === "admins" && (
        <div className="space-y-6 text-xs text-[#263238]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAF3F5] pb-3">
            <div>
              <h2 className="text-base font-bold text-[#173F5F] flex items-center gap-2">
                <span>Manage Administrator Accounts</span>
                <span className="bg-[#EAF3F5] text-[#173F5F] font-mono px-2 py-0.5 rounded-full text-xs font-bold">
                  {admins.length} Admins &bull; {superAdmins.length} Super Admin
                </span>
              </h2>
              <p className="text-xs text-[#263238]/70">
                Super Admin can create, edit names, disable, enable, and safely delete Administrator accounts.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setShowAddAdminModal(true)}
                className="px-3.5 py-2 bg-[#087E8B] hover:bg-[#06636E] text-white font-bold rounded-lg transition-all shadow-xs flex items-center gap-1.5"
              >
                <span>+</span>
                <span>Add Admin Account</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddSuperAdminModal(true)}
                className="px-3.5 py-2 bg-[#173F5F] hover:bg-[#132a4a] text-white font-bold rounded-lg transition-all shadow-xs flex items-center gap-1.5 border border-[#F4A261]/40"
              >
                <span>★</span>
                <span>Authorize Super Admin</span>
              </button>
            </div>
          </div>

          {/* Super Admins Cards */}
          <div className="bg-[#F7F7F2] border border-[#EAF3F5] rounded-xl p-4 space-y-3">
            <span className="font-bold text-xs text-[#173F5F] uppercase tracking-wider block">
              Authorized Super Administrators ({superAdmins.length}):
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {superAdmins.map((sup) => (
                <div
                  key={sup.id}
                  className="bg-white border border-[#087E8B]/30 rounded-lg p-3.5 flex items-center justify-between shadow-2xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#263238]">{sup.fullName}</span>
                      <span className="bg-[#F4A261]/20 text-[#b25514] font-mono text-[10px] font-bold px-1.5 py-0.2 rounded border border-[#F4A261]/40">
                        {sup.staffId}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#087E8B] block">{sup.designation}</span>
                    <span className="text-[11px] text-[#263238]/60 font-mono block">
                      {sup.email} &bull; {sup.phone}
                    </span>
                  </div>
                  <span className="bg-emerald-50 text-[#087E8B] font-bold text-[10px] px-2 py-0.5 rounded border border-[#087E8B]/20">
                    Active Authority
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Admins Responsive Cards (No Horizontal Scrolling) */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#173F5F]">
              Operational Admins ({admins.length})
            </h3>
            {admins.length === 0 ? (
              <div className="bg-white border border-dashed border-[#EAF3F5] rounded-xl p-8 text-center text-[#263238]/60 space-y-1">
                <span className="text-2xl block">👥</span>
                <p className="font-semibold text-xs text-[#173F5F]">No operational administrator accounts found in Firestore.</p>
                <p className="text-[11px] text-[#263238]/50">Click &quot;+ Add Admin Account&quot; to provision the first operational admin.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {admins.map((adm) => {
                  const isDeactivated = adm.status === "Disabled" || adm.status === "Deactivated";
                  return (
                    <div
                      key={adm.id}
                      className={`bg-white border border-[#EAF3F5] rounded-xl p-4 shadow-xs transition-all hover:border-[#087E8B]/40 flex flex-col justify-between space-y-3 ${
                        isDeactivated ? "bg-slate-50 opacity-75" : ""
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#263238]">{adm.fullName}</span>
                            <span className="bg-[#EAF3F5] text-[#173F5F] font-mono text-[10px] font-bold px-1.5 py-0.2 rounded border border-[#087E8B]/20">
                              {adm.staffId}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              !isDeactivated
                                ? "bg-emerald-50 text-[#087E8B] border-[#087E8B]/30"
                                : "bg-slate-100 text-slate-600 border-slate-300"
                            }`}
                          >
                            {!isDeactivated ? "Active" : "Disabled"}
                          </span>
                        </div>
                        <div className="text-xs text-[#263238]/70 mt-1 space-y-0.5">
                          <p><strong className="text-[#263238]">Designation:</strong> {adm.designation}</p>
                          <p><strong className="text-[#263238]">Assigned Area:</strong> {adm.area || "Citywide Operations"}</p>
                          <p className="font-mono text-[11px] text-[#263238]/60">{adm.email} &bull; {adm.phone}</p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#EAF3F5] flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingAdmin({ ...adm })}
                          className="px-2.5 py-1 rounded-lg border border-[#EAF3F5] text-[#173F5F] hover:bg-[#EAF3F5] font-semibold text-xs"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInitiatePasswordReset(adm)}
                          className="px-2.5 py-1 rounded-lg border border-[#087E8B]/30 text-[#087E8B] hover:bg-[#EAF3F5] font-semibold text-xs"
                        >
                          Reset Password
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleAdminStatus(adm)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                            !isDeactivated
                              ? "border-[#F4A261]/40 text-[#b25514] hover:bg-[#F4A261]/15"
                              : "border-[#087E8B]/30 text-[#087E8B] hover:bg-emerald-50"
                          }`}
                        >
                          {!isDeactivated ? "Disable" : "Enable"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRequestDeleteAdmin(adm)}
                          className="px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: MANAGE STAFF & TEAMS (No Horizontal Scrolling)
          ========================================================================= */}
      {activeTab === "staff" && (
        <div className="space-y-6 text-xs text-[#263238]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAF3F5] pb-3">
            <div>
              <h2 className="text-base font-bold text-[#173F5F] flex items-center gap-2">
                <span>Manage Staff &amp; Maintenance Squads</span>
                <span className="bg-[#EAF3F5] text-[#173F5F] font-mono px-2 py-0.5 rounded-full text-xs font-bold">
                  {teams.length} Squads &bull; {staffMembers.length} Staff Members
                </span>
              </h2>
              <p className="text-xs text-[#263238]/70">
                Super Admin can create, edit, transfer, disable, and safely delete teams and staff members.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setShowCreateTeamModal(true)}
                className="px-3.5 py-2 bg-[#087E8B] hover:bg-[#06636E] text-white font-bold rounded-lg transition-all shadow-xs flex items-center gap-1.5"
              >
                <span>+</span>
                <span>Create Squad</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCreateStaffModal(true)}
                className="px-3.5 py-2 bg-[#173F5F] hover:bg-[#132a4a] text-white font-bold rounded-lg transition-all shadow-xs flex items-center gap-1.5"
              >
                <span>+</span>
                <span>Add Staff Member</span>
              </button>
            </div>
          </div>

          {/* Squads Grid */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#173F5F]">
              Maintenance Squads ({teams.length})
            </h3>
            {teams.length === 0 ? (
              <div className="bg-white border border-dashed border-[#EAF3F5] rounded-xl p-8 text-center space-y-2">
                <span className="text-2xl block">👥</span>
                <p className="text-xs font-semibold text-[#173F5F]">No Maintenance Squads Configured</p>
                <p className="text-[11px] text-[#263238]/60">
                  {dataSource === "firestore"
                    ? "No teams found in Firestore. Click '+ Create Squad' to register a squad."
                    : "No teams currently configured."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {teams.map((t) => {
                  const members = staffMembers.filter((s) => s.teamId === t.id);
                  const activeCount = members.filter((s) => s.status === "Active").length;
                  return (
                    <div
                      key={t.id}
                      className="bg-white border border-[#EAF3F5] rounded-xl p-4 shadow-xs flex flex-col justify-between space-y-3 hover:border-[#087E8B]/40 transition-all"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-[#263238]">{t.name}</span>
                          <span className="bg-emerald-50 text-[#087E8B] font-bold text-[10px] px-2 py-0.5 rounded border border-[#087E8B]/20">
                            {t.status}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#087E8B] font-semibold block">{t.area}</span>
                        <p className="text-[11px] text-[#263238]/70 line-clamp-2">{t.description}</p>
                        <div className="p-2 rounded bg-[#F7F7F2] border border-[#EAF3F5] text-[11px]">
                          <span className="text-[#263238]/60 block text-[10px]">Team Leader:</span>
                          <span className="font-bold text-[#173F5F]">{t.leadTechnician || "Unassigned"}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#EAF3F5] flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-[#263238]/70">{activeCount} Staff</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingTeam({ ...t })}
                            className="text-[#087E8B] font-bold hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRequestDeleteTeam(t)}
                            className="text-red-600 font-semibold hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Responsive Vertical Staff List (NO HORIZONTAL SCROLLING) */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-white border border-[#EAF3F5] rounded-xl shadow-xs">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search staff by name, staff ID, or designation..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 pl-8 pr-3 text-xs focus:bg-white focus:border-[#087E8B] focus:outline-none"
                />
                <span className="absolute left-2.5 top-2 text-[#263238]/40">🔍</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={staffTeamFilter}
                  onChange={(e) => setStaffTeamFilter(e.target.value)}
                  className="bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                >
                  <option value="ALL">All Teams</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <select
                  value={staffStatusFilter}
                  onChange={(e) => setStaffStatusFilter(e.target.value)}
                  className="bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                >
                  <option value="ALL">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Disabled">Disabled</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {filteredStaff.length === 0 ? (
                <div className="p-8 text-center bg-white border border-dashed border-[#EAF3F5] rounded-xl text-xs text-[#263238]/60 space-y-1">
                  <span className="text-2xl block">👷</span>
                  <p className="font-semibold text-xs text-[#173F5F]">
                    {staffMembers.length === 0
                      ? "No staff members registered in Firestore yet."
                      : "No staff members found matching your filter criteria."}
                  </p>
                  <p className="text-[11px] text-[#263238]/50">
                    {staffMembers.length === 0
                      ? "Use '+ Add Staff Member' to register personnel into the database."
                      : "Try adjusting your search query or team filter."}
                  </p>
                </div>
              ) : (
                filteredStaff.map((sm) => {
                  const isDeactivated = sm.status === "Disabled" || sm.status === "Deactivated";
                  const activeTasks = complaints.filter(
                    (c) => c.assignedWorkerId === sm.id && c.status !== "Resolved"
                  ).length;
                  return (
                    <div
                      key={sm.id}
                      className={`bg-white border border-[#EAF3F5] rounded-xl p-4 shadow-xs transition-all hover:border-[#087E8B]/40 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        isDeactivated ? "bg-slate-50 opacity-75" : ""
                      }`}
                    >
                      <div className="flex-1 space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-[#263238] truncate">{sm.fullName}</span>
                          <span className="bg-[#EAF3F5] text-[#173F5F] font-mono text-[11px] font-bold px-2 py-0.5 rounded border border-[#087E8B]/20">
                            {sm.staffId}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              !isDeactivated
                                ? "bg-emerald-50 text-[#087E8B] border-[#087E8B]/30"
                                : "bg-slate-100 text-slate-600 border-slate-300"
                            }`}
                          >
                            {!isDeactivated ? "Active" : "Disabled"}
                          </span>
                          {activeTasks > 0 && (
                            <span className="bg-[#F4A261]/20 text-[#b25514] font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-[#F4A261]/40">
                              {activeTasks} active task{activeTasks !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#263238]/75">
                          <div>
                            <span className="text-[#263238]/50 font-medium">Designation: </span>
                            <span className="font-semibold text-[#263238]">{sm.designation}</span>
                          </div>
                          <div>
                            <span className="text-[#263238]/50 font-medium">Squad: </span>
                            <span className="font-semibold text-[#087E8B]">{sm.teamName}</span>
                          </div>
                          <div>
                            <span className="text-[#263238]/50 font-medium">Area: </span>
                            <span>{sm.area}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-[#EAF3F5] shrink-0">
                        <button
                          type="button"
                          onClick={() => setViewingStaffDetails(sm)}
                          className="px-2.5 py-1.5 rounded-lg border border-[#EAF3F5] text-[#173F5F] hover:bg-[#EAF3F5] font-semibold text-xs"
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingStaff({ ...sm })}
                          className="px-2.5 py-1.5 rounded-lg border border-[#EAF3F5] text-[#173F5F] hover:bg-[#EAF3F5] font-semibold text-xs"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTransferTargetStaff(sm);
                            setTransferTeamId(sm.teamId);
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-[#087E8B]/30 text-[#087E8B] hover:bg-[#EAF3F5] font-semibold text-xs"
                        >
                          Transfer
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStaffStatus(sm)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${
                            !isDeactivated
                              ? "border-[#F4A261]/40 text-[#b25514] hover:bg-[#F4A261]/15"
                              : "border-[#087E8B]/30 text-[#087E8B] hover:bg-emerald-50"
                          }`}
                        >
                          {!isDeactivated ? "Disable" : "Enable"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRequestDeleteStaff(sm)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: REVIEW COMPLAINTS (Triage & Direct Assignment)
          ========================================================================= */}
      {activeTab === "complaints" && (
        <div className="space-y-6 text-xs text-[#263238]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAF3F5] pb-3">
            <div>
              <h2 className="text-base font-bold text-[#173F5F] flex items-center gap-2">
                <span>Review &amp; Assign Complaints</span>
                <span className="bg-[#EAF3F5] text-[#173F5F] font-mono px-2 py-0.5 rounded-full text-xs font-bold">
                  {complaints.length} Total Complaints
                </span>
              </h2>
              <p className="text-xs text-[#263238]/70">
                Directly reassign squads, assign technicians, or escalate ticket priorities.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Complaint Table */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Filter by ID, category, or location..."
                  value={complaintSearch}
                  onChange={(e) => setComplaintSearch(e.target.value)}
                  className="bg-white border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs flex-1 min-w-[180px] focus:border-[#087E8B]"
                />
                <select
                  value={complaintStatusFilter}
                  onChange={(e) => setComplaintStatusFilter(e.target.value)}
                  className="bg-white border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:border-[#087E8B]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Assigned">Assigned</option>
                  <option value="On the Way">On the Way</option>
                  <option value="Work Started">Work Started</option>
                  <option value="Work Completed">Work Completed</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Rejected">Rejected</option>
                </select>
                <select
                  value={complaintWardFilter}
                  onChange={(e) => setComplaintWardFilter(e.target.value)}
                  className="bg-white border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:border-[#087E8B]"
                >
                  <option value="ALL">All Wards</option>
                  {WARDS_LIST.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-white border border-[#EAF3F5] rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#F7F7F2] text-[#263238] uppercase text-[10px] font-semibold border-b border-[#EAF3F5]">
                      <tr>
                        <th className="py-2.5 px-3">Complaint ID</th>
                        <th className="py-2.5 px-3">Hazard Category</th>
                        <th className="py-2.5 px-3">Ward</th>
                        <th className="py-2.5 px-3">Priority</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAF3F5]">
                      {filteredComplaints.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-[#263238]/60">
                            <span className="text-xl block mb-1">📭</span>
                            <span className="font-semibold block text-xs text-[#173F5F]">
                              {complaints.length === 0
                                ? "No complaints recorded in Firestore yet."
                                : "No complaints match the selected filter criteria."}
                            </span>
                            <span className="text-[11px] text-[#263238]/50 block mt-0.5">
                              {complaints.length === 0
                                ? "Incoming citizen complaints will appear here automatically."
                                : "Try clearing filters or search terms."}
                            </span>
                          </td>
                        </tr>
                      ) : (
                        filteredComplaints.map((c) => {
                        const isSelected = selectedComplaint?.id === c.id;
                        return (
                          <tr
                            key={c.id}
                            onClick={() => handleSelectComplaint(c)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? "bg-[#EAF3F5]/80 font-semibold" : "hover:bg-[#F7F7F2]"
                            }`}
                          >
                            <td className="py-2.5 px-3 font-mono text-[#173F5F] font-bold">
                              {c.id}
                            </td>
                            <td className="py-2.5 px-3">{c.category}</td>
                            <td className="py-2.5 px-3">{c.ward}</td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  c.priority === "Critical"
                                    ? "bg-red-100 text-red-700"
                                    : c.priority === "High"
                                    ? "bg-[#F4A261]/25 text-[#b25514]"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {c.priority}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  c.status === "Resolved"
                                    ? "bg-emerald-50 text-[#087E8B]"
                                    : "bg-[#EAF3F5] text-[#173F5F]"
                                }`}
                              >
                                {c.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span className="text-[#087E8B] hover:underline">Select &rarr;</span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Col: Assignment Action Form */}
            <div className="bg-white border border-[#EAF3F5] rounded-xl p-5 shadow-xs space-y-4">
              {selectedComplaint ? (
                <form onSubmit={handleSaveComplaintAssignment} className="space-y-4">
                  <div className="border-b border-[#EAF3F5] pb-3">
                    <span className="text-[10px] font-bold uppercase text-[#087E8B] block">Selected Ticket</span>
                    <h3 className="font-extrabold text-sm text-[#173F5F] font-mono mt-0.5">
                      {selectedComplaint.id}
                    </h3>
                    <p className="text-xs text-[#263238] font-semibold mt-1">
                      {selectedComplaint.category}
                    </p>
                    <p className="text-[11px] text-[#263238]/70 mt-0.5">
                      {selectedComplaint.location} ({selectedComplaint.ward})
                    </p>

                    {/* Citizen Photo Evidence */}
                    {selectedComplaint.citizenPhotos && selectedComplaint.citizenPhotos.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-[#EAF3F5]">
                        <span className="text-[10px] font-bold text-[#263238]/70 block mb-1">
                          Citizen Photo Evidence ({selectedComplaint.citizenPhotos.length}):
                        </span>
                        <div className="flex gap-1.5 overflow-x-auto pb-1">
                          {selectedComplaint.citizenPhotos.map((photo, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() =>
                                setViewerImage({
                                  url: photo.url,
                                  title: `Citizen Evidence: ${photo.name} (${selectedComplaint.id})`,
                                  caption: `${selectedComplaint.category} • ${selectedComplaint.location}`,
                                })
                              }
                              className="group relative shrink-0 border border-[#EAF3F5] rounded bg-white p-1 hover:border-[#087E8B] transition-transform hover:scale-105 cursor-pointer focus:outline-none"
                              title={`Click to view ${photo.name}`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photo.url}
                                alt={photo.name}
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = DEFAULT_HAZARD_FALLBACK_URL;
                                }}
                                className="w-12 h-12 object-cover rounded"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Repair Completion Proof */}
                    {selectedComplaint.photoAfter && (
                      <div className="mt-2 pt-2 border-t border-[#087E8B]/20">
                        <button
                          type="button"
                          onClick={() =>
                            setViewerImage({
                              url: selectedComplaint.photoAfter!,
                              title: `Repair Completion Proof (${selectedComplaint.id})`,
                              caption: `Resolution proof for ${selectedComplaint.category}`,
                            })
                          }
                          className="inline-flex items-center gap-1 text-[10px] text-[#087E8B] font-bold bg-[#EAF3F5] px-2 py-0.5 rounded border border-[#087E8B]/30 hover:bg-[#087E8B] hover:text-white transition-colors"
                        >
                          <span>📸 View Repair Proof</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-[#173F5F] border-b border-[#EAF3F5] pb-1 mb-2">
                      Assignment Controls
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block font-bold text-xs text-[#263238] mb-1">Assign Squad</label>
                        <select
                          value={assignTeamName}
                          onChange={(e) => {
                            setAssignTeamName(e.target.value);
                            const t = teams.find((tm) => tm.name === e.target.value);
                            if (t && t.leadTechnician) setAssignWorkerName(t.leadTechnician);
                          }}
                          className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                        >
                          <option value="">Unassigned</option>
                          {teams.map((t) => (
                            <option key={t.id} value={t.name}>
                              {t.name} ({t.area})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-xs text-[#263238] mb-1">Assign Technician</label>
                        <select
                          value={assignWorkerName}
                          onChange={(e) => setAssignWorkerName(e.target.value)}
                          className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                        >
                          <option value="">Unassigned</option>
                          {staffMembers
                            .filter((s) => !assignTeamName || s.teamName === assignTeamName)
                            .map((s) => (
                              <option key={s.id} value={s.fullName}>
                                {s.fullName} ({s.designation})
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-xs text-[#263238] mb-1">Priority Level</label>
                        <select
                          value={assignPriority}
                          onChange={(e) => setAssignPriority(e.target.value as PriorityLevel)}
                          className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                        >
                          <option value="Critical">Critical</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-xs text-[#263238] mb-1">Complaint Status</label>
                        <select
                          value={assignStatus}
                          onChange={(e) => setAssignStatus(e.target.value as ComplaintStatus)}
                          className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                        >
                          <option value="Submitted">Submitted</option>
                          <option value="Under Review">Under Review</option>
                          <option value="Assigned">Assigned</option>
                          <option value="On the Way">On the Way</option>
                          <option value="Work Started">Work Started</option>
                          <option value="Work Completed">Work Completed</option>
                          <option value="Resolved">Resolved</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-xs text-[#263238] mb-1">Triage Note</label>
                        <textarea
                          rows={2}
                          value={triageNote}
                          onChange={(e) => setTriageNote(e.target.value)}
                          placeholder="Optional operational instructions..."
                          className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-[#087E8B] hover:bg-[#06636E] text-white font-bold rounded-lg shadow-xs transition-all"
                  >
                    Save &amp; Update Complaint
                  </button>
                </form>
              ) : (
                <div className="p-8 text-center text-[#263238]/60">Select a complaint to review and assign.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: WEBSITE MANAGEMENT (Complete Website & Content Management)
          ========================================================================= */}
      {activeTab === "website" && (
        <div className="space-y-6 text-xs text-[#263238]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAF3F5] pb-3">
            <div>
              <h2 className="text-base font-bold text-[#173F5F] flex items-center gap-2">
                <span>Website Content &amp; Public Information Management</span>
              </h2>
              <p className="text-xs text-[#263238]/70">
                Super Admin can edit homepage text, emergency hotlines, complaint categories, safety rules, and public announcements.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Public Content Form */}
            <div className="bg-white border border-[#EAF3F5] rounded-xl p-5 shadow-xs space-y-4">
              <div>
                <h3 className="font-extrabold text-sm text-[#173F5F] mb-1">Homepage Content &amp; Headlines</h3>
                <p className="text-[11px] text-[#263238]/70">
                  Update public-facing headings, descriptions, and hotline numbers.
                </p>
              </div>

              <form onSubmit={handleSaveWebsiteContent} className="space-y-3.5">
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#173F5F] border-b border-[#EAF3F5] pb-1">
                    Hero Section
                  </h4>
                </div>

                <div>
                  <label className="block font-bold text-xs text-[#263238] mb-1">
                    Hero Headline <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={websiteHeroTitle}
                    onChange={(e) => setWebsiteHeroTitle(e.target.value)}
                    className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-xs text-[#263238] mb-1">
                    Hero Subtitle / Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={websiteHeroSubtitle}
                    onChange={(e) => setWebsiteHeroSubtitle(e.target.value)}
                    className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-xs text-[#263238] mb-1">Platform Badge</label>
                  <input
                    type="text"
                    value={websiteHeroBadge}
                    onChange={(e) => setWebsiteHeroBadge(e.target.value)}
                    className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                  />
                </div>

                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#173F5F] border-b border-[#EAF3F5] pb-1 pt-2">
                    Emergency Hotline &amp; Public Guidance
                  </h4>
                </div>

                <div>
                  <label className="block font-bold text-xs text-[#263238] mb-1">Emergency 24/7 Hotline</label>
                  <input
                    type="text"
                    value={websiteHotline}
                    onChange={(e) => setWebsiteHotline(e.target.value)}
                    className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs font-mono focus:bg-white focus:border-[#087E8B]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-xs text-[#263238] mb-1">Emergency Warning Notice</label>
                  <input
                    type="text"
                    value={websiteEmergencyNotice}
                    onChange={(e) => setWebsiteEmergencyNotice(e.target.value)}
                    className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-xs text-[#263238] mb-1">Report Button Label</label>
                    <input
                      type="text"
                      value={websiteReportBtn}
                      onChange={(e) => setWebsiteReportBtn(e.target.value)}
                      className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-xs text-[#263238] mb-1">Track Button Label</label>
                    <input
                      type="text"
                      value={websiteTrackBtn}
                      onChange={(e) => setWebsiteTrackBtn(e.target.value)}
                      className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#087E8B] hover:bg-[#06636E] text-white font-bold rounded-lg shadow-xs transition-all"
                  >
                    Save Website Content
                  </button>
                </div>
              </form>
            </div>

            {/* 2. Complaint Categories Management */}
            <div className="bg-white border border-[#EAF3F5] rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-[#173F5F]">Complaint Categories</h3>
                  <p className="text-[11px] text-[#263238]/70">
                    Add new categories, edit descriptions, or disable categories.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(true)}
                  className="px-3 py-1.5 bg-[#087E8B] hover:bg-[#06636E] text-white font-bold rounded-lg text-xs"
                >
                  + Add Category
                </button>
              </div>

              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {categories.map((cat) => {
                  const linkedCount = complaints.filter((c) => c.category === cat.name).length;
                  return (
                    <div
                      key={cat.id}
                      className="p-3 bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg flex items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#263238]">{cat.name}</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                              cat.isActive
                                ? "bg-emerald-50 text-[#087E8B] border-[#087E8B]/30"
                                : "bg-slate-100 text-slate-600 border-slate-300"
                            }`}
                          >
                            {cat.isActive ? "Active" : "Disabled"}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#263238]/70 truncate">{cat.description}</p>
                        <span className="text-[10px] text-[#087E8B] font-semibold block">
                          Severity: {cat.severity} &bull; {linkedCount} complaint(s) linked
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingCategory({ ...cat })}
                          className="px-2 py-1 rounded border border-[#EAF3F5] text-[#173F5F] hover:bg-white text-xs font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (onUpdateCategory) {
                              onUpdateCategory(cat.id, { isActive: !cat.isActive });
                              showAlert(`Category "${cat.name}" is now ${!cat.isActive ? "Active" : "Disabled"}.`);
                            }
                          }}
                          className="px-2 py-1 rounded border border-[#EAF3F5] text-[#263238] hover:bg-white text-xs font-semibold"
                        >
                          {cat.isActive ? "Disable" : "Enable"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRequestDeleteCategory(cat)}
                          className="px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Announcements & Safety Guidance Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Announcements */}
            <div className="bg-white border border-[#EAF3F5] rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-[#173F5F]">Public Announcements</h3>
                  <p className="text-[11px] text-[#263238]/70">Citywide electrical maintenance notices</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddAnnouncementModal(true)}
                  className="px-3 py-1.5 bg-[#087E8B] hover:bg-[#06636E] text-white font-bold rounded-lg text-xs"
                >
                  + Add Notice
                </button>
              </div>

              <div className="space-y-2.5">
                {(websiteContent.publicAnnouncements || []).map((anc) => (
                  <div
                    key={anc.id}
                    className="p-3 bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#263238]">{anc.title}</span>
                        <span className="text-[10px] text-[#087E8B] font-mono">({anc.date})</span>
                      </div>
                      <p className="text-[11px] text-[#263238]/70 line-clamp-2">{anc.content}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingAnnouncement({ ...anc })}
                        className="px-2 py-1 rounded border border-[#EAF3F5] text-[#173F5F] hover:bg-white text-xs font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteModal({
                            isOpen: true,
                            type: "announcement",
                            id: anc.id,
                            name: anc.title,
                            canDelete: true,
                          })
                        }
                        className="px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Safety Rules */}
            <div className="bg-white border border-[#EAF3F5] rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-[#173F5F]">Safety Guidance Rules</h3>
                  <p className="text-[11px] text-[#263238]/70">Guidance displayed on citizen portal</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddSafetyRuleModal(true)}
                  className="px-3 py-1.5 bg-[#087E8B] hover:bg-[#06636E] text-white font-bold rounded-lg text-xs"
                >
                  + Add Rule
                </button>
              </div>

              <div className="space-y-2.5">
                {(websiteContent.safetyRules || []).map((rule) => (
                  <div
                    key={rule.id}
                    className="p-3 bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#263238]">{rule.rule}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-[#b25514] border border-amber-200 uppercase">
                          {rule.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#263238]/70 line-clamp-2">{rule.detail}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingSafetyRule({ ...rule })}
                        className="px-2 py-1 rounded border border-[#EAF3F5] text-[#173F5F] hover:bg-white text-xs font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteModal({
                            isOpen: true,
                            type: "safety_rule",
                            id: rule.id,
                            name: rule.rule,
                            canDelete: true,
                          })
                        }
                        className="px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 6: AUDIT LOGS (Security Ledger)
          ========================================================================= */}
      {activeTab === "audit" && (
        <div className="space-y-6 text-xs text-[#263238]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAF3F5] pb-3">
            <div>
              <h2 className="text-base font-bold text-[#173F5F] flex items-center gap-2">
                <span>Security Audit Trail</span>
                <span className="bg-[#EAF3F5] text-[#173F5F] font-mono px-2 py-0.5 rounded-full text-xs font-bold">
                  {auditLogs.length} Logged Actions
                </span>
              </h2>
              <p className="text-xs text-[#263238]/70">
                Immutable activity trail tracking staff assignments, account creations, and configuration changes.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search actor, target, or details..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="bg-white border border-[#EAF3F5] rounded-lg py-1.5 px-3 text-xs w-48 sm:w-60 focus:border-[#087E8B]"
              />
              <select
                value={auditFilterAction}
                onChange={(e) => setAuditFilterAction(e.target.value)}
                className="bg-white border border-[#EAF3F5] rounded-lg py-1.5 px-3 text-xs focus:border-[#087E8B]"
              >
                <option value="ALL">All Actions</option>
                <option value="CREATE_ADMIN">Create Admin</option>
                <option value="UPDATE_ADMIN">Update Admin</option>
                <option value="DELETE_ADMIN">Delete Admin</option>
                <option value="CREATE_STAFF">Create Staff</option>
                <option value="UPDATE_STAFF">Update Staff</option>
                <option value="DELETE_STAFF">Delete Staff</option>
                <option value="TRANSFER_STAFF">Transfer Staff</option>
                <option value="REASSIGN_TICKET">Reassign Ticket</option>
                <option value="UPDATE_WEBSITE_CONTENT">Website Content</option>
                <option value="CREATE_CATEGORY">Create Category</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-[#EAF3F5] rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F7F7F2] text-[#263238] uppercase text-[10px] font-semibold border-b border-[#EAF3F5]">
                  <tr>
                    <th className="py-2.5 px-3.5">Timestamp</th>
                    <th className="py-2.5 px-3">Actor</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Target</th>
                    <th className="py-2.5 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAF3F5]">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#263238]/60">
                        <span className="text-xl block mb-1">📋</span>
                        <span className="font-semibold block text-xs text-[#173F5F]">
                          {auditLogs.length === 0
                            ? "No audit records found in Firestore yet."
                            : "No activity logs match the selected filter criteria."}
                        </span>
                        <span className="text-[11px] text-[#263238]/50 block mt-0.5">
                          {auditLogs.length === 0
                            ? "Audit logs will be generated automatically as administrative actions occur."
                            : "Try clearing search or filter terms."}
                        </span>
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#F7F7F2] transition-colors">
                      <td className="py-2.5 px-3.5 whitespace-nowrap font-mono text-[#263238]/60 text-[11px]">
                        {log.timestamp}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-bold text-[#173F5F] block">{log.actorName}</span>
                        <span className="text-[10px] text-[#263238]/50 uppercase">{log.actorRole}</span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="bg-[#EAF3F5] text-[#173F5F] font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-[#087E8B]/20">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[#263238] text-[11px]">
                        {log.targetId}
                      </td>
                      <td className="py-2.5 px-3 text-[#263238]/80 text-[11px]">{log.details}</td>
                    </tr>
                  ))
                )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 7: PLATFORM SETTINGS (SLA, Hotlines & Compliance)
          ========================================================================= */}
      {activeTab === "settings" && (
        <div className="space-y-6 text-xs text-[#263238]">
          <div className="border-b border-[#EAF3F5] pb-3">
            <h2 className="text-base font-bold text-[#173F5F]">Platform Settings &amp; SLA Targets</h2>
            <p className="text-xs text-[#263238]/70">
              Configure system response times, hotline routing, and verification requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-[#EAF3F5] rounded-xl p-5 shadow-xs space-y-4">
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#173F5F] border-b border-[#EAF3F5] pb-1 mb-3">
                  SLA Response Windows
                </h4>
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">
                  Critical SLA Target (Hours)
                </label>
                <input
                  type="number"
                  value={criticalSlaInput}
                  onChange={(e) => setCriticalSlaInput(Number(e.target.value))}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                />
                <span className="text-[10px] text-[#263238]/60 mt-0.5 block">
                  Downed live wires, sparking transformers, leaning high-voltage poles.
                </span>
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">
                  High Priority SLA Target (Hours)
                </label>
                <input
                  type="number"
                  value={highSlaInput}
                  onChange={(e) => setHighSlaInput(Number(e.target.value))}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                />
                <span className="text-[10px] text-[#263238]/60 mt-0.5 block">
                  Feeder pillar open doors, cable insulation damage, main street blackouts.
                </span>
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">
                  24/7 Emergency Dispatch Helpline
                </label>
                <input
                  type="text"
                  value={hotlineInput}
                  onChange={(e) => setHotlineInput(e.target.value)}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs font-mono focus:bg-white focus:border-[#087E8B]"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  onUpdateSettings({
                    criticalSlaHours: criticalSlaInput,
                    highSlaHours: highSlaInput,
                    emergencyHotline: hotlineInput,
                  });
                  onAddAuditLog({
                    actorId: "usr-sup-001",
                    actorName: "Dr. Aruna Swaminathan",
                    actorRole: "super_admin",
                    action: "UPDATE_SETTINGS",
                    targetType: "system",
                    targetId: "global_settings",
                    details: `Updated SLA targets: Critical=${criticalSlaInput}h, High=${highSlaInput}h, Hotline=${hotlineInput}.`,
                  });
                  showAlert("Operational settings updated successfully.");
                }}
                className="px-4 py-2 bg-[#087E8B] hover:bg-[#06636E] text-white font-bold rounded-lg shadow-xs"
              >
                Save Settings
              </button>
            </div>

            <div className="bg-white border border-[#EAF3F5] rounded-xl p-5 shadow-xs space-y-4">
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#173F5F] border-b border-[#EAF3F5] pb-1 mb-3">
                  Safety &amp; Evidence Rules
                </h4>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-[#EAF3F5]/60 border border-[#087E8B]/20 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#173F5F] block">Photo Proof Required to Close Ticket</span>
                    <span className="text-[11px] text-[#263238]/70">Lineman must upload verified on-site completion photo.</span>
                  </div>
                  <span className="bg-[#087E8B] text-white font-mono text-[10px] px-2 py-0.5 rounded font-bold">Enforced</span>
                </div>

                <div className="p-3 rounded-lg bg-[#EAF3F5]/60 border border-[#087E8B]/20 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#173F5F] block">Current Location Detection</span>
                    <span className="text-[11px] text-[#263238]/70">Enables browser location detector for citizens.</span>
                  </div>
                  <span className="bg-[#087E8B] text-white font-mono text-[10px] px-2 py-0.5 rounded font-bold">Enabled</span>
                </div>

                <div className="p-3 rounded-lg bg-[#EAF3F5]/60 border border-[#087E8B]/20 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#173F5F] block">Citizen Login-Free Reporting</span>
                    <span className="text-[11px] text-[#263238]/70">Zero login friction for reporting public hazards.</span>
                  </div>
                  <span className="bg-emerald-600 text-white font-mono text-[10px] px-2 py-0.5 rounded font-bold">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ALL MODALS (With Bold Form Titles and Section Headings)
          ========================================================================= */}

      {/* 1. Add Admin Account Modal */}
      {showAddAdminModal && (
        <div className="fixed inset-0 z-50 bg-[#173F5F]/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAF3F5] rounded-xl shadow-2xl max-w-md w-full overflow-hidden text-xs text-[#263238]">
            <div className="bg-[#173F5F] text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-extrabold text-sm">Add New Administrator</h3>
              <button
                type="button"
                onClick={() => setShowAddAdminModal(false)}
                className="text-white/80 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAdminSubmit} className="p-5 space-y-4">
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#173F5F] border-b border-[#EAF3F5] pb-1">
                  Personal Information
                </h4>
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  placeholder="e.g. Ramesh Chandra"
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">
                  Official Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="e.g. ramesh.chandra@urjasetu.gov.in"
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">Mobile Number</label>
                <input
                  type="tel"
                  value={newAdminPhone}
                  onChange={(e) => setNewAdminPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                />
              </div>

              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#173F5F] border-b border-[#EAF3F5] pb-1 pt-1">
                  Work Information
                </h4>
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">Designation</label>
                <input
                  type="text"
                  value={newAdminDesignation}
                  onChange={(e) => setNewAdminDesignation(e.target.value)}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">Assigned Area</label>
                <input
                  type="text"
                  value={newAdminArea}
                  onChange={(e) => setNewAdminArea(e.target.value)}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#EAF3F5]">
                <button
                  type="button"
                  onClick={() => setShowAddAdminModal(false)}
                  className="px-4 py-2 border border-[#EAF3F5] rounded-lg font-semibold hover:bg-[#F7F7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#087E8B] hover:bg-[#06636E] text-white font-bold rounded-lg shadow-xs"
                >
                  Create Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit Admin Modal */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 bg-[#173F5F]/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAF3F5] rounded-xl shadow-2xl max-w-md w-full overflow-hidden text-xs text-[#263238]">
            <div className="bg-[#173F5F] text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-extrabold text-sm">Edit Admin: {editingAdmin.fullName}</h3>
              <button
                type="button"
                onClick={() => setEditingAdmin(null)}
                className="text-white/80 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateAdminSubmit} className="p-5 space-y-4">
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#173F5F] border-b border-[#EAF3F5] pb-1">
                  Personal Information
                </h4>
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingAdmin.fullName}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, fullName: e.target.value })}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">
                  Official Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={editingAdmin.email}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, email: e.target.value })}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">Mobile Number</label>
                <input
                  type="tel"
                  value={editingAdmin.phone || ""}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, phone: e.target.value })}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                />
              </div>

              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#173F5F] border-b border-[#EAF3F5] pb-1 pt-1">
                  Work Information
                </h4>
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">Designation</label>
                <input
                  type="text"
                  value={editingAdmin.designation || ""}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, designation: e.target.value })}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">Assigned Area</label>
                <input
                  type="text"
                  value={editingAdmin.area || ""}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, area: e.target.value })}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#EAF3F5]">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="px-4 py-2 border border-[#EAF3F5] rounded-lg font-semibold hover:bg-[#F7F7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#087E8B] hover:bg-[#06636E] text-white font-bold rounded-lg shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Authorize Super Admin Modal */}
      {showAddSuperAdminModal && (
        <div className="fixed inset-0 z-50 bg-[#173F5F]/60 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#F4A261]/60 rounded-xl shadow-2xl max-w-md w-full overflow-hidden text-xs text-[#263238]">
            <div className="bg-[#173F5F] text-white px-5 py-3.5 flex items-center justify-between border-b border-[#F4A261]/40">
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <span className="text-[#F4A261]">★</span>
                <span>Authorize Secondary Super Admin</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddSuperAdminModal(false)}
                className="text-white/80 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSuperAdminSubmit} className="p-5 space-y-4">
              <div className="p-3 bg-[#F4A261]/15 border border-[#F4A261]/40 rounded-lg text-[11px] text-[#263238]">
                <strong>Super Admin Privilege Notice:</strong> Only existing authorized Super Admins can grant this role. This user will have complete control over all accounts, website content, and settings.
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSupAdminName}
                  onChange={(e) => setNewSupAdminName(e.target.value)}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">
                  Official Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={newSupAdminEmail}
                  onChange={(e) => setNewSupAdminEmail(e.target.value)}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">Mobile Number</label>
                <input
                  type="tel"
                  value={newSupAdminPhone}
                  onChange={(e) => setNewSupAdminPhone(e.target.value)}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#EAF3F5]">
                <button
                  type="button"
                  onClick={() => setShowAddSuperAdminModal(false)}
                  className="px-4 py-2 border border-[#EAF3F5] rounded-lg font-semibold hover:bg-[#F7F7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#173F5F] hover:bg-[#132a4a] text-white font-bold rounded-lg shadow-xs border border-[#F4A261]/40"
                >
                  Grant Super Admin Authority
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Create Maintenance Squad Modal */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 z-50 bg-[#173F5F]/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAF3F5] rounded-xl shadow-2xl max-w-md w-full overflow-hidden text-xs text-[#263238]">
            <div className="bg-[#173F5F] text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-extrabold text-sm">Create Maintenance Squad</h3>
              <button
                type="button"
                onClick={() => setShowCreateTeamModal(false)}
                className="text-white/80 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTeamSubmit} className="p-5 space-y-4">
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#173F5F] border-b border-[#EAF3F5] pb-1">
                  Squad Information
                </h4>
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">
                  Squad Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. South High-Voltage Squad"
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">Assigned Ward</label>
                <select
                  value={newTeamArea}
                  onChange={(e) => setNewTeamArea(e.target.value)}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                >
                  {WARDS_LIST.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">Scope / Description</label>
                <textarea
                  rows={2}
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                  placeholder="e.g. Overhead line repairs and emergency hazard response."
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">Initial Status</label>
                <select
                  value={newTeamStatus}
                  onChange={(e) => setNewTeamStatus(e.target.value as TeamStatus)}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                >
                  <option value="Active">Active</option>
                  <option value="On Duty">On Duty</option>
                  <option value="Standby">Standby</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#EAF3F5]">
                <button
                  type="button"
                  onClick={() => setShowCreateTeamModal(false)}
                  className="px-4 py-2 border border-[#EAF3F5] rounded-lg font-semibold hover:bg-[#F7F7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#087E8B] hover:bg-[#06636E] text-white font-bold rounded-lg shadow-xs"
                >
                  Create Squad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Edit Maintenance Squad Modal */}
      {editingTeam && (
        <div className="fixed inset-0 z-50 bg-[#173F5F]/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAF3F5] rounded-xl shadow-2xl max-w-md w-full overflow-hidden text-xs text-[#263238]">
            <div className="bg-[#173F5F] text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-extrabold text-sm">Edit Squad: {editingTeam.name}</h3>
              <button
                type="button"
                onClick={() => setEditingTeam(null)}
                className="text-white/80 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateTeamSubmit} className="p-5 space-y-4">
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#173F5F] border-b border-[#EAF3F5] pb-1">
                  Squad Information
                </h4>
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">
                  Squad Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingTeam.name}
                  onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">Team Leader</label>
                <input
                  type="text"
                  value={editingTeam.leadTechnician || ""}
                  onChange={(e) => setEditingTeam({ ...editingTeam, leadTechnician: e.target.value })}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">Assigned Ward</label>
                <select
                  value={editingTeam.area}
                  onChange={(e) => setEditingTeam({ ...editingTeam, area: e.target.value })}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                >
                  {WARDS_LIST.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingTeam.description}
                  onChange={(e) => setEditingTeam({ ...editingTeam, description: e.target.value })}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">Squad Status</label>
                <select
                  value={editingTeam.status}
                  onChange={(e) => setEditingTeam({ ...editingTeam, status: e.target.value as TeamStatus })}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                >
                  <option value="Active">Active</option>
                  <option value="On Duty">On Duty</option>
                  <option value="Standby">Standby</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#EAF3F5]">
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  className="px-4 py-2 border border-[#EAF3F5] rounded-lg font-semibold hover:bg-[#F7F7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#087E8B] hover:bg-[#06636E] text-white font-bold rounded-lg shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Add Staff Member Modal */}
      {showCreateStaffModal && (
        <div className="fixed inset-0 z-50 bg-[#173F5F]/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAF3F5] rounded-xl shadow-2xl max-w-md w-full overflow-hidden text-xs text-[#263238]">
            <div className="bg-[#173F5F] text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-extrabold text-sm">Add New Staff Member</h3>
              <button
                type="button"
                onClick={() => setShowCreateStaffModal(false)}
                className="text-white/80 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStaffSubmit} className="p-5 space-y-4">
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#173F5F] border-b border-[#EAF3F5] pb-1">
                  Personal Information
                </h4>
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newStaffFullName}
                  onChange={(e) => setNewStaffFullName(e.target.value)}
                  placeholder="e.g. Arvind Kadam"
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  placeholder="e.g. arvind.kadam@urjasetu.gov.in"
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">Mobile Number</label>
                <input
                  type="tel"
                  value={newStaffPhone}
                  onChange={(e) => setNewStaffPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                />
              </div>

              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#173F5F] border-b border-[#EAF3F5] pb-1 pt-1">
                  Work Information
                </h4>
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">Designation</label>
                <input
                  type="text"
                  value={newStaffDesignation}
                  onChange={(e) => setNewStaffDesignation(e.target.value)}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">
                  Assign Squad <span className="text-red-500">*</span>
                </label>
                <select
                  value={newStaffTeamId}
                  onChange={(e) => {
                    setNewStaffTeamId(e.target.value);
                    const selTeam = teams.find((t) => t.id === e.target.value);
                    if (selTeam) setNewStaffArea(selTeam.area);
                  }}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.area})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#EAF3F5]">
                <button
                  type="button"
                  onClick={() => setShowCreateStaffModal(false)}
                  className="px-4 py-2 border border-[#EAF3F5] rounded-lg font-semibold hover:bg-[#F7F7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#087E8B] hover:bg-[#06636E] text-white font-bold rounded-lg shadow-xs"
                >
                  Add Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Edit Staff Member Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-[#173F5F]/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAF3F5] rounded-xl shadow-2xl max-w-md w-full overflow-hidden text-xs text-[#263238]">
            <div className="bg-[#173F5F] text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-extrabold text-sm">Edit Staff: {editingStaff.fullName}</h3>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="text-white/80 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateStaffSubmit} className="p-5 space-y-4">
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#173F5F] border-b border-[#EAF3F5] pb-1">
                  Personal Information
                </h4>
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingStaff.fullName}
                  onChange={(e) => setEditingStaff({ ...editingStaff, fullName: e.target.value })}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={editingStaff.email}
                  onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">Mobile Number</label>
                <input
                  type="tel"
                  value={editingStaff.phone}
                  onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                />
              </div>

              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#173F5F] border-b border-[#EAF3F5] pb-1 pt-1">
                  Work Information
                </h4>
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">Designation</label>
                <input
                  type="text"
                  value={editingStaff.designation}
                  onChange={(e) => setEditingStaff({ ...editingStaff, designation: e.target.value })}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">Assigned Ward</label>
                <input
                  type="text"
                  value={editingStaff.area}
                  onChange={(e) => setEditingStaff({ ...editingStaff, area: e.target.value })}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#EAF3F5]">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 border border-[#EAF3F5] rounded-lg font-semibold hover:bg-[#F7F7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#087E8B] hover:bg-[#06636E] text-white font-bold rounded-lg shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Transfer Staff Modal */}
      {transferTargetStaff && (
        <div className="fixed inset-0 z-50 bg-[#173F5F]/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAF3F5] rounded-xl shadow-2xl max-w-md w-full overflow-hidden text-xs text-[#263238]">
            <div className="bg-[#173F5F] text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-extrabold text-sm">Transfer Technician Squad</h3>
              <button
                type="button"
                onClick={() => setTransferTargetStaff(null)}
                className="text-white/80 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTransferStaffSubmit} className="p-5 space-y-4">
              <div className="p-3 bg-[#EAF3F5] rounded-lg border border-[#087E8B]/20">
                <span className="font-bold text-[#173F5F] block">{transferTargetStaff.fullName}</span>
                <span className="text-[11px] text-[#263238]/70 block">
                  Staff ID: {transferTargetStaff.staffId} &bull; Current Squad: {transferTargetStaff.teamName}
                </span>
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">
                  Select Target Squad <span className="text-red-500">*</span>
                </label>
                <select
                  value={transferTeamId}
                  onChange={(e) => setTransferTeamId(e.target.value)}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.area})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#EAF3F5]">
                <button
                  type="button"
                  onClick={() => setTransferTargetStaff(null)}
                  className="px-4 py-2 border border-[#EAF3F5] rounded-lg font-semibold hover:bg-[#F7F7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#087E8B] hover:bg-[#06636E] text-white font-bold rounded-lg shadow-xs"
                >
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. View Staff Details Modal */}
      {viewingStaffDetails && (
        <div className="fixed inset-0 z-50 bg-[#173F5F]/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAF3F5] rounded-xl shadow-2xl max-w-md w-full overflow-hidden text-xs text-[#263238]">
            <div className="bg-[#173F5F] text-white px-5 py-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#F4A261] font-mono font-bold uppercase">Staff Profile</span>
                <h3 className="font-extrabold text-sm">{viewingStaffDetails.fullName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingStaffDetails(null)}
                className="text-white/80 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#173F5F] border-b border-[#EAF3F5] pb-1">
                  Personal Information
                </h4>
                <div className="grid grid-cols-2 gap-3 mt-2 text-xs">
                  <div>
                    <span className="text-[#263238]/60 block text-[10px]">Staff Badge ID</span>
                    <span className="font-mono font-bold text-[#173F5F]">{viewingStaffDetails.staffId}</span>
                  </div>
                  <div>
                    <span className="text-[#263238]/60 block text-[10px]">Status</span>
                    <span className="font-bold text-[#087E8B]">{viewingStaffDetails.status}</span>
                  </div>
                  <div>
                    <span className="text-[#263238]/60 block text-[10px]">Email Address</span>
                    <span className="font-mono text-[#263238]">{viewingStaffDetails.email}</span>
                  </div>
                  <div>
                    <span className="text-[#263238]/60 block text-[10px]">Phone Number</span>
                    <span className="font-mono text-[#263238]">{viewingStaffDetails.phone}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#173F5F] border-b border-[#EAF3F5] pb-1">
                  Work Information
                </h4>
                <div className="grid grid-cols-2 gap-3 mt-2 text-xs">
                  <div>
                    <span className="text-[#263238]/60 block text-[10px]">Designation</span>
                    <span className="font-bold text-[#263238]">{viewingStaffDetails.designation}</span>
                  </div>
                  <div>
                    <span className="text-[#263238]/60 block text-[10px]">Assigned Squad</span>
                    <span className="font-bold text-[#087E8B]">{viewingStaffDetails.teamName}</span>
                  </div>
                  <div>
                    <span className="text-[#263238]/60 block text-[10px]">Work Ward</span>
                    <span className="text-[#263238]">{viewingStaffDetails.area}</span>
                  </div>
                  <div>
                    <span className="text-[#263238]/60 block text-[10px]">Account Created</span>
                    <span className="text-[#263238]">{viewingStaffDetails.createdAt}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end border-t border-[#EAF3F5]">
                <button
                  type="button"
                  onClick={() => setViewingStaffDetails(null)}
                  className="px-5 py-2 bg-[#173F5F] text-white font-bold rounded-lg shadow-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 10. Add Complaint Category Modal */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 bg-[#173F5F]/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAF3F5] rounded-xl shadow-2xl max-w-md w-full overflow-hidden text-xs text-[#263238]">
            <div className="bg-[#173F5F] text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-extrabold text-sm">Add Complaint Category</h3>
              <button
                type="button"
                onClick={() => setShowAddCategoryModal(false)}
                className="text-white/80 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCategorySubmit} className="p-5 space-y-4">
              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Underground Cable Fault"
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                  placeholder="Public explanation of this electrical hazard..."
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">Default Priority Level</label>
                <select
                  value={newCategorySeverity}
                  onChange={(e) => setNewCategorySeverity(e.target.value as PriorityLevel)}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#EAF3F5]">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-4 py-2 border border-[#EAF3F5] rounded-lg font-semibold hover:bg-[#F7F7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#087E8B] hover:bg-[#06636E] text-white font-bold rounded-lg shadow-xs"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 11. Edit Complaint Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 bg-[#173F5F]/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAF3F5] rounded-xl shadow-2xl max-w-md w-full overflow-hidden text-xs text-[#263238]">
            <div className="bg-[#173F5F] text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-extrabold text-sm">Edit Category: {editingCategory.name}</h3>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="text-white/80 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateCategorySubmit} className="p-5 space-y-4">
              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingCategory.description}
                  onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">Priority Level</label>
                <select
                  value={editingCategory.severity}
                  onChange={(e) => setEditingCategory({ ...editingCategory, severity: e.target.value as PriorityLevel })}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#EAF3F5]">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 border border-[#EAF3F5] rounded-lg font-semibold hover:bg-[#F7F7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#087E8B] hover:bg-[#06636E] text-white font-bold rounded-lg shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 12. Add Announcement Modal */}
      {showAddAnnouncementModal && (
        <div className="fixed inset-0 z-50 bg-[#173F5F]/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAF3F5] rounded-xl shadow-2xl max-w-md w-full overflow-hidden text-xs text-[#263238]">
            <div className="bg-[#173F5F] text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-extrabold text-sm">Add Public Announcement</h3>
              <button
                type="button"
                onClick={() => setShowAddAnnouncementModal(false)}
                className="text-white/80 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncementSubmit} className="p-5 space-y-4">
              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newAnnouncementTitle}
                  onChange={(e) => setNewAnnouncementTitle(e.target.value)}
                  placeholder="e.g. Ward 2 Transformer Upgrade Drive"
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">
                  Notice Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={newAnnouncementContent}
                  onChange={(e) => setNewAnnouncementContent(e.target.value)}
                  placeholder="Details for the public..."
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#EAF3F5]">
                <button
                  type="button"
                  onClick={() => setShowAddAnnouncementModal(false)}
                  className="px-4 py-2 border border-[#EAF3F5] rounded-lg font-semibold hover:bg-[#F7F7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#087E8B] hover:bg-[#06636E] text-white font-bold rounded-lg shadow-xs"
                >
                  Publish Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 13. Edit Announcement Modal */}
      {editingAnnouncement && (
        <div className="fixed inset-0 z-50 bg-[#173F5F]/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAF3F5] rounded-xl shadow-2xl max-w-md w-full overflow-hidden text-xs text-[#263238]">
            <div className="bg-[#173F5F] text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-extrabold text-sm">Edit Notice: {editingAnnouncement.title}</h3>
              <button
                type="button"
                onClick={() => setEditingAnnouncement(null)}
                className="text-white/80 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateAnnouncementSubmit} className="p-5 space-y-4">
              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingAnnouncement.title}
                  onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, title: e.target.value })}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">
                  Notice Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={editingAnnouncement.content}
                  onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, content: e.target.value })}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#EAF3F5]">
                <button
                  type="button"
                  onClick={() => setEditingAnnouncement(null)}
                  className="px-4 py-2 border border-[#EAF3F5] rounded-lg font-semibold hover:bg-[#F7F7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#087E8B] hover:bg-[#06636E] text-white font-bold rounded-lg shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 14. Add Safety Rule Modal */}
      {showAddSafetyRuleModal && (
        <div className="fixed inset-0 z-50 bg-[#173F5F]/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAF3F5] rounded-xl shadow-2xl max-w-md w-full overflow-hidden text-xs text-[#263238]">
            <div className="bg-[#173F5F] text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-extrabold text-sm">Add Safety Rule</h3>
              <button
                type="button"
                onClick={() => setShowAddSafetyRuleModal(false)}
                className="text-white/80 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSafetyRuleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">
                  Rule Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newRuleTitle}
                  onChange={(e) => setNewRuleTitle(e.target.value)}
                  placeholder="e.g. Do Not Approach Smoking Cables"
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">
                  Rule Details <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={newRuleDetail}
                  onChange={(e) => setNewRuleDetail(e.target.value)}
                  placeholder="Explanation of safety protocol..."
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">Severity Badge</label>
                <select
                  value={newRuleSeverity}
                  onChange={(e) => setNewRuleSeverity(e.target.value as "danger" | "warning" | "info")}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                >
                  <option value="danger">Danger (High Hazard)</option>
                  <option value="warning">Warning (Precaution)</option>
                  <option value="info">Info (Notice)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#EAF3F5]">
                <button
                  type="button"
                  onClick={() => setShowAddSafetyRuleModal(false)}
                  className="px-4 py-2 border border-[#EAF3F5] rounded-lg font-semibold hover:bg-[#F7F7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#087E8B] hover:bg-[#06636E] text-white font-bold rounded-lg shadow-xs"
                >
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 15. Edit Safety Rule Modal */}
      {editingSafetyRule && (
        <div className="fixed inset-0 z-50 bg-[#173F5F]/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAF3F5] rounded-xl shadow-2xl max-w-md w-full overflow-hidden text-xs text-[#263238]">
            <div className="bg-[#173F5F] text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-extrabold text-sm">Edit Safety Rule: {editingSafetyRule.rule}</h3>
              <button
                type="button"
                onClick={() => setEditingSafetyRule(null)}
                className="text-white/80 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateSafetyRuleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">
                  Rule Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingSafetyRule.rule}
                  onChange={(e) => setEditingSafetyRule({ ...editingSafetyRule, rule: e.target.value })}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">
                  Rule Details <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={editingSafetyRule.detail}
                  onChange={(e) => setEditingSafetyRule({ ...editingSafetyRule, detail: e.target.value })}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">Severity Badge</label>
                <select
                  value={editingSafetyRule.severity}
                  onChange={(e) => setEditingSafetyRule({ ...editingSafetyRule, severity: e.target.value as "danger" | "warning" | "info" })}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                >
                  <option value="danger">Danger (High Hazard)</option>
                  <option value="warning">Warning (Precaution)</option>
                  <option value="info">Info (Notice)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#EAF3F5]">
                <button
                  type="button"
                  onClick={() => setEditingSafetyRule(null)}
                  className="px-4 py-2 border border-[#EAF3F5] rounded-lg font-semibold hover:bg-[#F7F7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#087E8B] hover:bg-[#06636E] text-white font-bold rounded-lg shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 16. Safe Deletion Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-[#173F5F]/60 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-red-300 rounded-xl shadow-2xl max-w-md w-full overflow-hidden text-xs text-[#263238]">
            <div className="bg-red-600 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-extrabold text-sm">
                {deleteModal.canDelete ? "Confirm Deletion" : "Action Blocked: Record in Use"}
              </h3>
              <button
                type="button"
                onClick={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                className="text-white/80 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {deleteModal.canDelete ? (
                <>
                  <p className="text-xs text-[#263238]">
                    Are you sure you want to permanently delete <strong>{deleteModal.name}</strong>?
                  </p>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-[11px]">
                    <strong>Warning:</strong> This destructive action cannot be undone. An audit log entry will be created.
                  </div>
                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#EAF3F5]">
                    <button
                      type="button"
                      onClick={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                      className="px-4 py-2 border border-[#EAF3F5] rounded-lg font-semibold hover:bg-[#F7F7F2]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDelete}
                      className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-xs"
                    >
                      Yes, Delete Record
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-[#263238]">{deleteModal.reason}</p>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px]">
                    <strong>Best Practice:</strong> To preserve historical complaints, timestamps, and accountability, disable or archive the item instead of deleting it.
                  </div>
                  <div className="pt-2 flex items-center justify-end border-t border-[#EAF3F5]">
                    <button
                      type="button"
                      onClick={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                      className="px-5 py-2 bg-[#173F5F] hover:bg-[#132a4a] text-white font-bold rounded-lg shadow-xs"
                    >
                      Understood
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Image Viewer */}
      <ImageViewerModal
        isOpen={!!viewerImage}
        onClose={() => setViewerImage(null)}
        imageData={viewerImage}
      />
    </div>
  );
};
