"use client";

import React, { useState } from "react";
import {
  Complaint,
  PriorityLevel,
  ComplaintStatus,
  MaintenanceTeam,
  StaffMember,
  TeamStatus,
  StaffStatus,
} from "@/types/urjasetu";
import { WARDS_LIST } from "@/data/demoData";
import { ImageViewerModal, ImageViewerData } from "@/components/ImageViewerModal";
import { DEFAULT_HAZARD_FALLBACK_URL } from "@/utils/imageUtils";

interface AdminViewProps {
  complaints: Complaint[];
  teams: MaintenanceTeam[];
  staffMembers: StaffMember[];
  onUpdateComplaint: (
    complaintId: string,
    updates: Partial<Complaint>,
    timelineNote: string,
    actor: string
  ) => void;
  onCreateTeam: (team: MaintenanceTeam) => void;
  onUpdateTeam: (teamId: string, updates: Partial<MaintenanceTeam>) => void;
  onCreateStaff: (staff: StaffMember) => void;
  onUpdateStaff: (staffId: string, updates: Partial<StaffMember>) => void;
  onExit?: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  complaints,
  teams,
  staffMembers,
  onUpdateComplaint,
  onCreateTeam,
  onUpdateTeam,
  onCreateStaff,
  onUpdateStaff,
  onExit,
}) => {
  // Navigation tab: "ledger" (Complaints & Triage) vs "teams" (Team & Staff Management)
  const [activeTab, setActiveTab] = useState<"ledger" | "teams">("ledger");

  // Selection & filter states for Ledger Tab
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    complaints[0] || null
  );
  const [viewerImage, setViewerImage] = useState<ImageViewerData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterWard, setFilterWard] = useState<string>("ALL");
  const [filterTeam, setFilterTeam] = useState<string>("ALL");

  // Form edit states for selected complaint in Ledger
  const [editPriority, setEditPriority] = useState<PriorityLevel>(
    selectedComplaint?.priority || "High"
  );
  const [editStatus, setEditStatus] = useState<ComplaintStatus>(
    selectedComplaint?.status || "Under Review"
  );
  const [assignedTeamName, setAssignedTeamName] = useState<string>(
    selectedComplaint?.assignedTeam || ""
  );
  const [assignedWorkerName, setAssignedWorkerName] = useState<string>(
    selectedComplaint?.assignedWorker || ""
  );
  const [adminNote, setAdminNote] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Rejection Workflow State (Priority 3)
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");
  const [rejectionError, setRejectionError] = useState("");

  // States for Team Management Tab
  const [staffFilterTeam, setStaffFilterTeam] = useState<string>("ALL");
  const [staffFilterStatus, setStaffFilterStatus] = useState<string>("ALL");
  const [staffSearchTerm, setStaffSearchTerm] = useState("");

  // Modals state in Team Management
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<MaintenanceTeam | null>(null);

  const [showCreateStaffModal, setShowCreateStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [viewingStaffDetails, setViewingStaffDetails] = useState<StaffMember | null>(null);

  // Quick Transfer Staff Modal
  const [transferStaffTarget, setTransferStaffTarget] = useState<StaffMember | null>(null);
  const [transferTargetTeamId, setTransferTargetTeamId] = useState<string>("");

  // Create Team Form inputs
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDesc, setNewTeamDesc] = useState("");
  const [newTeamArea, setNewTeamArea] = useState(WARDS_LIST[0]);
  const [newTeamStatus, setNewTeamStatus] = useState<TeamStatus>("Active");

  // Create Staff Form inputs
  const [newStaffFullName, setNewStaffFullName] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffPhone, setNewStaffPhone] = useState("");
  const [newStaffDesignation, setNewStaffDesignation] = useState("Field Electrician");
  const [newStaffTeamId, setNewStaffTeamId] = useState(teams[0]?.id || "");
  const [newStaffArea, setNewStaffArea] = useState(WARDS_LIST[0]);
  const [newStaffStatus, setNewStaffStatus] = useState<StaffStatus>("Active");

  // Operational metrics
  const totalOpen = complaints.filter((c) => c.status !== "Resolved" && c.status !== "Rejected").length;
  const criticalCount = complaints.filter(
    (c) => c.priority === "Critical" && c.status !== "Resolved" && c.status !== "Rejected"
  ).length;
  const awaitingApprovalCount = complaints.filter((c) => c.status === "Work Completed").length;
  const resolvedCount = complaints.filter((c) => c.status === "Resolved").length;
  const activeStaffCount = staffMembers.filter((s) => s.status === "Active").length;

  // When a complaint is clicked in the ledger
  const handleSelectComplaint = (c: Complaint) => {
    setSelectedComplaint(c);
    setEditPriority(c.priority);
    setEditStatus(c.status);
    setAssignedTeamName(c.assignedTeam || "");
    setAssignedWorkerName(c.assignedWorker || "");
    setAdminNote("");
    setSaveSuccess(false);
  };

  // Priority 2: Admin Approve Work & Resolve
  const handleApproveResolution = (complaintId: string) => {
    onUpdateComplaint(
      complaintId,
      {
        status: "Resolved",
      },
      "Admin reviewed repair completion photo proof and verified on-site fix. Approved resolution.",
      "Admin Desk (Officer R. Mathur)"
    );

    if (selectedComplaint && selectedComplaint.id === complaintId) {
      setSelectedComplaint({
        ...selectedComplaint,
        status: "Resolved",
      });
      setEditStatus("Resolved");
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Priority 3: Admin Reject Action
  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    if (!rejectionReasonInput.trim()) {
      setRejectionError("Please provide a specific reason for rejecting this complaint.");
      return;
    }

    onUpdateComplaint(
      selectedComplaint.id,
      {
        status: "Rejected",
        rejectionReason: rejectionReasonInput.trim(),
      },
      `Complaint rejected by Admin: ${rejectionReasonInput.trim()}`,
      "Admin Desk (Officer R. Mathur)"
    );

    setSelectedComplaint({
      ...selectedComplaint,
      status: "Rejected",
      rejectionReason: rejectionReasonInput.trim(),
    });
    setEditStatus("Rejected");
    setShowRejectionModal(false);
    setRejectionReasonInput("");
    setRejectionError("");
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Find active team members for the currently selected assigned team in dispatch
  const currentTeamObj = teams.find((t) => t.name === assignedTeamName);
  const currentTeamMembers = staffMembers.filter(
    (s) =>
      s.status === "Active" &&
      (currentTeamObj ? s.teamId === currentTeamObj.id : s.teamName === assignedTeamName)
  );

  // Save Assignment / Triage
  const handleSaveAdminAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    const chosenTeam = teams.find((t) => t.name === assignedTeamName);
    const chosenWorker = staffMembers.find((s) => s.fullName === assignedWorkerName);

    const note =
      adminNote.trim() ||
      `Admin desk verified complaint, set status to "${editStatus}" and assigned to "${assignedTeamName || "Unassigned"}" (Technician: ${assignedWorkerName || "Unspecified"}).`;

    onUpdateComplaint(
      selectedComplaint.id,
      {
        priority: editPriority,
        status: editStatus,
        assignedTeamId: chosenTeam?.id,
        assignedTeam: assignedTeamName || undefined,
        assignedWorkerId: chosenWorker?.id,
        assignedWorker: assignedWorkerName || undefined,
      },
      note,
      "Admin Desk (Officer R. Mathur)"
    );

    setSelectedComplaint({
      ...selectedComplaint,
      priority: editPriority,
      status: editStatus,
      assignedTeamId: chosenTeam?.id,
      assignedTeam: assignedTeamName || undefined,
      assignedWorkerId: chosenWorker?.id,
      assignedWorker: assignedWorkerName || undefined,
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Create Team submit
  const handleCreateTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) {
      alert("Please enter a team name.");
      return;
    }

    const newTeam: MaintenanceTeam = {
      id: `TEAM-${Date.now().toString(36).toUpperCase()}`,
      name: newTeamName.trim(),
      description: newTeamDesc.trim() || "Area streetlight and distribution maintenance squad.",
      area: newTeamArea.trim(),
      status: newTeamStatus,
      activeTasks: 0,
    };

    onCreateTeam(newTeam);
    setShowCreateTeamModal(false);
    setNewTeamName("");
    setNewTeamDesc("");
  };

  // Edit Team submit
  const handleEditTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;

    onUpdateTeam(editingTeam.id, {
      name: editingTeam.name,
      description: editingTeam.description,
      area: editingTeam.area,
      status: editingTeam.status,
    });

    setEditingTeam(null);
  };

  // Create Staff submit
  const handleCreateStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffFullName.trim()) {
      alert("Please provide the full name of the staff member.");
      return;
    }

    const assignedTeam = teams.find((t) => t.id === newStaffTeamId);
    const nextStaffNum = staffMembers.length + 1;
    const generatedBadge = `STF-${String(nextStaffNum).padStart(3, "0")}`;

    const newStaff: StaffMember = {
      id: `stf-${Date.now().toString(36)}`,
      staffId: generatedBadge,
      fullName: newStaffFullName.trim(),
      email: newStaffEmail.trim() || `${newStaffFullName.toLowerCase().replace(/\s+/g, ".")}@urjasetu.gov.in`,
      phone: newStaffPhone.trim() || "98201 00000",
      designation: newStaffDesignation,
      teamId: newStaffTeamId,
      teamName: assignedTeam ? assignedTeam.name : "Unassigned",
      area: newStaffArea,
      status: newStaffStatus,
      createdAt: new Date().toISOString().split("T")[0],
    };

    onCreateStaff(newStaff);
    setShowCreateStaffModal(false);
    setNewStaffFullName("");
    setNewStaffEmail("");
    setNewStaffPhone("");
  };

  // Edit Staff submit
  const handleEditStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    const matchedTeam = teams.find((t) => t.id === editingStaff.teamId);

    onUpdateStaff(editingStaff.id, {
      fullName: editingStaff.fullName,
      email: editingStaff.email,
      phone: editingStaff.phone,
      designation: editingStaff.designation,
      teamId: editingStaff.teamId,
      teamName: matchedTeam ? matchedTeam.name : editingStaff.teamName,
      area: editingStaff.area,
      status: editingStaff.status,
    });

    setEditingStaff(null);
  };

  // Quick Transfer Staff submit
  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferStaffTarget || !transferTargetTeamId) return;

    const targetTeam = teams.find((t) => t.id === transferTargetTeamId);
    if (!targetTeam) return;

    onUpdateStaff(transferStaffTarget.id, {
      teamId: targetTeam.id,
      teamName: targetTeam.name,
      area: targetTeam.area,
    });

    setTransferStaffTarget(null);
  };

  // Toggle Staff status (Active <-> Deactivated) without deleting historical records
  const handleToggleStaffStatus = (staff: StaffMember) => {
    const nextStatus: StaffStatus = staff.status === "Active" ? "Deactivated" : "Active";
    onUpdateStaff(staff.id, { status: nextStatus });
  };

  // Filter complaints
  const filteredComplaints = complaints.filter((c) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      c.id.toLowerCase().includes(term) ||
      c.location.toLowerCase().includes(term) ||
      c.category.toLowerCase().includes(term) ||
      c.phone.includes(term) ||
      (c.assignedWorker && c.assignedWorker.toLowerCase().includes(term));

    const matchesStatus = filterStatus === "ALL" ? true : c.status === filterStatus;
    const matchesWard = filterWard === "ALL" ? true : c.ward === filterWard;
    const matchesTeam =
      filterTeam === "ALL"
        ? true
        : filterTeam === "UNASSIGNED"
        ? !c.assignedTeam
        : c.assignedTeam === filterTeam;

    return matchesSearch && matchesStatus && matchesWard && matchesTeam;
  });

  // Filter staff roster
  const filteredStaffMembers = staffMembers.filter((s) => {
    const term = staffSearchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      s.fullName.toLowerCase().includes(term) ||
      s.staffId.toLowerCase().includes(term) ||
      s.designation.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term);

    const matchesTeam = staffFilterTeam === "ALL" ? true : s.teamId === staffFilterTeam;
    const matchesStatus = staffFilterStatus === "ALL" ? true : s.status === staffFilterStatus;

    return matchesSearch && matchesTeam && matchesStatus;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Admin Desk Header (Deep Blue: #173F5F) */}
      <div className="bg-[#173F5F] text-[#F7F7F2] rounded-xl p-5 sm:p-6 border border-[#087E8B]/30 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-[#087E8B] text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
            <svg
              className="w-5 h-5 text-[#F4A261]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                Municipal Administration Desk
              </h1>
              <span className="bg-[#263238]/70 text-[#EAF3F5] text-[10px] font-mono px-2 py-0.5 rounded border border-[#087E8B]/40 uppercase font-semibold">
                Central Operations
              </span>
            </div>
            <p className="text-xs text-[#EAF3F5]/80 mt-0.5">
              Triage citizen complaints, coordinate specialized maintenance teams, and manage field staff allocations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-center">
          <div className="hidden sm:flex items-center gap-2 text-xs bg-[#263238]/60 border border-[#087E8B]/30 px-3 py-1.5 rounded-lg text-[#EAF3F5]">
            <span className="w-2 h-2 rounded-full bg-[#087E8B] animate-pulse"></span>
            <span className="font-medium">Duty Officer:</span>
            <span className="text-white font-semibold">Engr. R. Mathur</span>
          </div>

          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white hover:bg-[#EAF3F5] text-[#173F5F] transition-all hover-lift shadow-2xs flex items-center gap-1.5"
            >
              <span>&larr;</span>
              <span>Back</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin Section Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAF3F5] pb-2">
        <div className="flex items-center gap-2">
          {/* Tab 1: Complaints & Triage Ledger */}
          <button
            type="button"
            onClick={() => setActiveTab("ledger")}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "ledger"
                ? "bg-[#173F5F] text-white shadow-xs"
                : "bg-white text-[#263238] border border-[#EAF3F5] hover:bg-[#EAF3F5]"
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span>Review Complaints</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === "ledger"
                  ? "bg-[#087E8B] text-white"
                  : "bg-[#EAF3F5] text-[#173F5F]"
              }`}
            >
              {complaints.length}
            </span>
          </button>

          {/* Tab 2: Manage Staff & Teams */}
          <button
            type="button"
            onClick={() => setActiveTab("teams")}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "teams"
                ? "bg-[#173F5F] text-white shadow-xs"
                : "bg-white text-[#263238] border border-[#EAF3F5] hover:bg-[#EAF3F5]"
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>Manage Staff &amp; Teams</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === "teams"
                  ? "bg-[#087E8B] text-white"
                  : "bg-[#EAF3F5] text-[#173F5F]"
              }`}
            >
              {teams.length} Squads &bull; {activeStaffCount} Active
            </span>
          </button>
        </div>

        {/* Database Status Alert */}
        <div className="text-[11px] text-[#263238]/60 bg-[#EAF3F5]/80 border border-[#087E8B]/20 px-3 py-1 rounded-md">
          <span className="font-semibold text-[#173F5F]">Database Connection:</span> Cloud Firestore Operational Ledger (Asia-South1)
        </div>
      </div>

      {/* =========================================================================
          TAB 1: COMPLAINTS & TRIAGE LEDGER
          ========================================================================= */}
      {activeTab === "ledger" && (
        <div className="space-y-6">
          {/* 4 Restrained Dashboard KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Active Complaints */}
            <div className="bg-white border border-[#EAF3F5] rounded-xl p-4 shadow-xs hover-lift transition-all">
              <div className="flex items-center justify-between text-[#263238]/70 mb-1.5">
                <span className="font-semibold uppercase tracking-wider text-[11px]">
                  Active Queue
                </span>
                <div className="w-7 h-7 rounded-lg bg-[#EAF3F5] text-[#173F5F] flex items-center justify-center font-bold">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#173F5F] font-mono">
                {totalOpen}
              </div>
              <span className="text-[11px] text-[#087E8B] font-medium mt-1 block">
                Across {teams.length} maintenance units
              </span>
            </div>

            {/* Critical Hazards (Warm Orange: #F4A261) */}
            <div className="bg-white border border-[#F4A261]/40 rounded-xl p-4 shadow-xs hover-lift transition-all">
              <div className="flex items-center justify-between text-[#b25514] mb-1.5">
                <span className="font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <span>Critical Hazards</span>
                  <span className="w-2 h-2 rounded-full bg-[#F4A261] animate-pulse"></span>
                </span>
                <div className="w-7 h-7 rounded-lg bg-[#F4A261]/20 text-[#b25514] flex items-center justify-center font-bold">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#b25514] font-mono">
                {criticalCount}
              </div>
              <span className="text-[11px] text-[#b25514] font-medium mt-1 block">
                Emergency SLA &lt; 2 hrs
              </span>
            </div>

            {/* Pending Team Assign or Awaiting Sign-off */}
            <div className="bg-white border border-[#EAF3F5] rounded-xl p-4 shadow-xs hover-lift transition-all">
              <div className="flex items-center justify-between text-[#263238]/70 mb-1.5">
                <span className="font-semibold uppercase tracking-wider text-[11px]">
                  Awaiting Sign-Off
                </span>
                <div className="w-7 h-7 rounded-lg bg-[#EAF3F5] text-[#087E8B] flex items-center justify-center font-bold">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#087E8B] font-mono">
                {awaitingApprovalCount}
              </div>
              <span className="text-[11px] text-[#263238]/70 font-medium mt-1 block">
                Work completed by crew
              </span>
            </div>

            {/* Resolved & Verified */}
            <div className="bg-white border border-[#087E8B]/30 rounded-xl p-4 shadow-xs hover-lift transition-all">
              <div className="flex items-center justify-between text-[#087E8B] mb-1.5">
                <span className="font-semibold uppercase tracking-wider text-[11px]">
                  Resolved &amp; Closed
                </span>
                <div className="w-7 h-7 rounded-lg bg-[#EAF3F5] text-[#087E8B] flex items-center justify-center font-bold">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#087E8B] font-mono">
                {resolvedCount}
              </div>
              <span className="text-[11px] text-[#087E8B] font-medium mt-1 block">
                100% photo verified on site
              </span>
            </div>
          </div>

          {/* Main Two-Column Control Room Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Search, Filters & Ledger Table */}
            <div className="lg:col-span-2 space-y-4">
              {/* Filter Bar */}
              <div className="bg-white border border-[#EAF3F5] rounded-xl p-3.5 flex flex-wrap items-center gap-3 text-xs shadow-xs">
                {/* Search */}
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by ID, location, category, or lineman..."
                    className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs text-[#263238] placeholder:text-[#263238]/50 focus:bg-white focus:border-[#087E8B]"
                  />
                </div>

                {/* Status Filter */}
                <div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-white border border-[#EAF3F5] rounded-lg py-2 px-2.5 text-xs text-[#263238]"
                  >
                    <option value="ALL">All Statuses ({complaints.length})</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Assigned">Assigned</option>
                    <option value="On the Way">On the Way</option>
                    <option value="Work Started">Work Started</option>
                    <option value="Work Completed">Work Completed ({awaitingApprovalCount} Need Review)</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                {/* Ward Filter */}
                <div>
                  <select
                    value={filterWard}
                    onChange={(e) => setFilterWard(e.target.value)}
                    className="bg-white border border-[#EAF3F5] rounded-lg py-2 px-2.5 text-xs text-[#263238]"
                  >
                    <option value="ALL">All Wards</option>
                    {WARDS_LIST.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Team Filter */}
                <div>
                  <select
                    value={filterTeam}
                    onChange={(e) => setFilterTeam(e.target.value)}
                    className="bg-white border border-[#EAF3F5] rounded-lg py-2 px-2.5 text-xs text-[#263238]"
                  >
                    <option value="ALL">All Teams</option>
                    <option value="UNASSIGNED">Unassigned Only</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Complaints Ledger Table */}
              <div className="bg-white border border-[#EAF3F5] rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#173F5F] text-white uppercase text-[11px] font-semibold tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Complaint ID</th>
                        <th className="py-3 px-3">Issue Category</th>
                        <th className="py-3 px-3">Ward</th>
                        <th className="py-3 px-3">Priority</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Assigned Squad &amp; Staff</th>
                        <th className="py-3 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAF3F5]">
                      {filteredComplaints.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-[#263238]/60 text-xs">
                            No complaints found matching active criteria.
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
                                isSelected
                                  ? "bg-[#EAF3F5] border-l-4 border-l-[#087E8B]"
                                  : "hover:bg-[#F7F7F2]"
                              }`}
                            >
                              {/* ID */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className="font-mono font-bold text-[#173F5F] block">
                                  {c.id}
                                </span>
                                <span className="text-[11px] text-[#263238]/60 font-mono">
                                  {c.reportedAt}
                                </span>
                              </td>

                              {/* Category & Location */}
                              <td className="py-3.5 px-3">
                                <span className="font-semibold text-[#263238] block">
                                  {c.category}
                                </span>
                                <span className="text-[11px] text-[#263238]/60 line-clamp-1">
                                  {c.location}
                                </span>
                              </td>

                              {/* Ward */}
                              <td className="py-3.5 px-3 whitespace-nowrap text-[#263238]">
                                {c.ward.split("(")[0]}
                              </td>

                              {/* Priority */}
                              <td className="py-3.5 px-3 whitespace-nowrap">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-block ${
                                    c.priority === "Critical"
                                      ? "bg-[#F4A261]/25 text-[#b25514] border-[#F4A261]/50"
                                      : c.priority === "High"
                                      ? "bg-[#F4A261]/15 text-[#b25514] border-[#F4A261]/30"
                                      : "bg-[#EAF3F5] text-[#173F5F] border-[#087E8B]/20"
                                  }`}
                                >
                                  {c.priority}
                                </span>
                              </td>

                              {/* Status */}
                              <td className="py-3.5 px-3 whitespace-nowrap">
                                <span
                                  className={`text-[11px] font-semibold px-2 py-0.5 rounded border inline-block ${
                                    c.status === "Resolved"
                                      ? "bg-[#EAF3F5] text-[#087E8B] border-[#087E8B]/40 font-bold"
                                      : c.status === "Work Completed"
                                      ? "bg-[#EAF3F5] text-[#173F5F] border-[#087E8B] font-bold"
                                      : c.status === "Rejected"
                                      ? "bg-[#F4A261]/25 text-[#b25514] border-[#F4A261]/50 font-bold"
                                      : c.status === "Work Started" || c.status === "On the Way"
                                      ? "bg-[#F4A261]/15 text-[#b25514] border-[#F4A261]/30"
                                      : c.status === "Assigned" || c.status === "Under Review"
                                      ? "bg-[#EAF3F5] text-[#173F5F] border-[#087E8B]/30"
                                      : "bg-[#F7F7F2] text-[#263238]/70 border-[#EAF3F5]"
                                  }`}
                                >
                                  {c.status}
                                </span>
                              </td>

                              {/* Assigned Unit & Staff */}
                              <td className="py-3.5 px-3 whitespace-nowrap">
                                {c.assignedTeam ? (
                                  <div>
                                    <span className="text-[#087E8B] font-bold text-xs block">
                                      {c.assignedTeam}
                                    </span>
                                    <span className="text-[11px] text-[#263238]/70 block">
                                      {c.assignedWorker || "Lead / Unspecified staff"}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[#b25514] font-bold text-[11px] bg-[#F4A261]/15 px-2 py-0.5 rounded border border-[#F4A261]/30">
                                    Unassigned
                                  </span>
                                )}
                              </td>

                              {/* Action */}
                              <td className="py-3.5 px-3 text-right whitespace-nowrap">
                                <span className="text-[#087E8B] font-bold hover:underline">
                                  Triage &rarr;
                                </span>
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

            {/* Right Col: Admin Review & Team Assignment Console (PART C) */}
            <div className="bg-white border border-[#EAF3F5] rounded-xl p-5 shadow-xs text-xs space-y-4">
              <div className="border-b border-[#EAF3F5] pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-[#263238]">
                    Complaint Triage &amp; Assignment
                  </h3>
                  <p className="text-[11px] text-[#263238]/60">
                    Verify hazard severity, select maintenance team and assign lineman.
                  </p>
                </div>
                {saveSuccess && (
                  <span className="text-[#087E8B] bg-[#EAF3F5] border border-[#087E8B]/30 px-2 py-0.5 rounded font-bold text-[11px]">
                    ✓ Dispatched &amp; Saved!
                  </span>
                )}
              </div>

              {selectedComplaint ? (
                <form onSubmit={handleSaveAdminAction} className="space-y-4">
                  {/* Selected Dossier Header */}
                  <div className="bg-[#F7F7F2] p-4 rounded-xl border border-[#EAF3F5] space-y-2.5">
                    <div className="flex justify-between items-center border-b border-[#EAF3F5] pb-2">
                      <span className="text-[#263238]/60 font-mono text-[11px]">
                        ID: {selectedComplaint.id}
                      </span>
                      <span className="font-bold text-[#173F5F] font-mono text-[11px]">
                        {selectedComplaint.reportedAt}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#263238]/60 block text-[11px]">Issue Category:</span>
                      <span className="font-bold text-[#263238] text-sm">
                        {selectedComplaint.category}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#263238]/60 block text-[11px]">Location &amp; Ward:</span>
                      <span className="text-[#263238] font-medium">
                        {selectedComplaint.location} &bull; {selectedComplaint.ward}
                      </span>
                      <span className="block text-[#263238]/60 text-[11px] mt-0.5">
                        Landmark: {selectedComplaint.landmark}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#263238]/60 block text-[11px]">Current Assignment:</span>
                      {selectedComplaint.assignedTeam ? (
                        <div className="bg-white p-2 rounded-lg border border-[#087E8B]/30 mt-0.5 text-[11px]">
                          <span className="font-bold text-[#087E8B] block">
                            Team: {selectedComplaint.assignedTeam}
                          </span>
                          <span className="text-[#263238] block">
                            Lineman: {selectedComplaint.assignedWorker || "Lead / Unassigned"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[#b25514] font-semibold block text-[11px] mt-0.5">
                          Unassigned &mdash; select a unit below to dispatch.
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-[#263238]/60 block text-[11px]">Citizen Description:</span>
                      <p className="text-[#263238] bg-white p-2 rounded border border-[#EAF3F5] mt-0.5">
                        {selectedComplaint.description}
                      </p>
                    </div>

                    {/* Citizen Photo Evidence */}
                    {selectedComplaint.citizenPhotos && selectedComplaint.citizenPhotos.length > 0 && (
                      <div className="pt-2 border-t border-[#EAF3F5]">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[#263238]/70 font-semibold block text-[11px]">
                            Citizen Photo Evidence ({selectedComplaint.citizenPhotos.length}):
                          </span>
                          <span className="text-[10px] text-[#087E8B] font-medium">Click to enlarge</span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {selectedComplaint.citizenPhotos.map((photo, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() =>
                                setViewerImage({
                                  url: photo.url,
                                  title: `Citizen Evidence: ${photo.name}`,
                                  caption: `${selectedComplaint.id} • ${selectedComplaint.category} • ${selectedComplaint.location}`,
                                })
                              }
                              className="group relative shrink-0 border border-[#EAF3F5] rounded bg-white p-1 hover:border-[#087E8B] transition-transform hover:scale-105 cursor-pointer text-left focus:outline-none"
                              title={`Click to view ${photo.name}`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photo.url}
                                alt={photo.name}
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = DEFAULT_HAZARD_FALLBACK_URL;
                                }}
                                className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded"
                              />
                              <div className="absolute inset-1 bg-[#173F5F]/40 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center text-white text-xs font-bold">
                                🔍
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Field Worker Completion Proof (Priority 2) */}
                    {selectedComplaint.photoAfter && (
                      <div className="pt-2 border-t border-[#087E8B]/30 bg-[#EAF3F5]/60 p-2.5 rounded-lg space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[#087E8B] font-bold block text-[11px] flex items-center gap-1.5">
                            <span>📸 Field Repair Completion Proof:</span>
                            <span className="text-[10px] bg-[#087E8B] text-white px-1.5 py-0.2 rounded">Site Proof</span>
                          </span>
                          <span className="text-[10px] text-[#087E8B] font-medium">Click to enlarge</span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setViewerImage({
                              url: selectedComplaint.photoAfter!,
                              title: `Repair Completion Proof (${selectedComplaint.id})`,
                              caption: `Submitted by field lineman for ${selectedComplaint.category} at ${selectedComplaint.location}`,
                            })
                          }
                          className="group relative w-full border border-[#087E8B]/30 rounded-lg p-1.5 bg-white hover:border-[#087E8B] transition-all cursor-pointer text-left block focus:outline-none"
                          title="Click to view full completion photo"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={selectedComplaint.photoAfter}
                            alt="Repair Completion Proof"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = DEFAULT_HAZARD_FALLBACK_URL;
                            }}
                            className="w-full h-32 object-cover rounded group-hover:opacity-95"
                          />
                          <div className="absolute inset-2 bg-[#173F5F]/40 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center text-white text-xs font-bold gap-1.5">
                            <span>🔍 Click to View Full Size</span>
                          </div>
                        </button>
                        {selectedComplaint.resolutionNotes && (
                          <div className="p-2 bg-white rounded border border-[#087E8B]/20 text-[11px] text-[#173F5F]">
                            <strong>Lineman Notes:</strong> {selectedComplaint.resolutionNotes}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Priority 2: Work Completed Approval Callout */}
                    {selectedComplaint.status === "Work Completed" && (
                      <div className="p-3 bg-[#EAF3F5] border-2 border-[#087E8B] rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-[#087E8B] uppercase tracking-wider flex items-center gap-1.5">
                            <span>✓ Work Completed by Field Crew</span>
                          </span>
                          <span className="text-[10px] bg-[#087E8B] text-white px-2 py-0.5 rounded font-bold">
                            Action Needed
                          </span>
                        </div>
                        <p className="text-[11px] text-[#263238]">
                          Lineman finished physical repairs and uploaded completion proof. Review evidence above and approve resolution to publish publicly to citizen tracking.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleApproveResolution(selectedComplaint.id)}
                          className="w-full py-2 bg-[#087E8B] hover:bg-[#06636E] text-white font-bold rounded-lg transition-all hover-lift shadow-xs flex items-center justify-center gap-2 text-xs"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>Approve Work &amp; Mark Resolved</span>
                        </button>
                      </div>
                    )}

                    {/* Priority 3: Rejection Notice if rejected */}
                    {selectedComplaint.status === "Rejected" && (
                      <div className="p-3 bg-[#F4A261]/20 border border-[#F4A261] rounded-xl text-xs text-[#b25514] space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span>❌ Complaint Rejected by Administration</span>
                        </div>
                        <p><strong>Reason:</strong> {selectedComplaint.rejectionReason || "Out of municipal scope."}</p>
                      </div>
                    )}
                  </div>

                  {/* Priority Selector */}
                  <div>
                    <label className="block font-semibold text-[#263238] mb-1">
                      Severity Priority:
                    </label>
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value as PriorityLevel)}
                      className="w-full bg-white border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs text-[#263238] focus:border-[#087E8B]"
                    >
                      <option value="Critical">Critical (Immediate danger, sparking wires, fallen poles)</option>
                      <option value="High">High (Major road or commercial market unlit)</option>
                      <option value="Medium">Medium (Single residential fixture unlit)</option>
                      <option value="Low">Low (Minor flickering or non-hazardous issue)</option>
                    </select>
                  </div>

                  {/* Status Selector */}
                  <div>
                    <label className="block font-semibold text-[#263238] mb-1">
                      Update Ticket Status:
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as ComplaintStatus)}
                      className="w-full bg-white border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs text-[#263238] focus:border-[#087E8B]"
                    >
                      <option value="Submitted">Submitted (Awaiting Triage)</option>
                      <option value="Under Review">Under Review (Verified by Admin)</option>
                      <option value="Assigned">Assigned (Dispatched to Squad)</option>
                      <option value="On the Way">On the Way (Lineman En Route)</option>
                      <option value="Work Started">Work Started (On Site Repairing)</option>
                      <option value="Work Completed">Work Completed (Awaiting Admin Sign-off)</option>
                      <option value="Resolved">Resolved &amp; Tested</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  {/* PART C: Team Selection */}
                  <div>
                    <label className="block font-semibold text-[#263238] mb-1">
                      1. Select Maintenance Team:
                    </label>
                    <select
                      value={assignedTeamName}
                      onChange={(e) => {
                        const newName = e.target.value;
                        setAssignedTeamName(newName);
                        // When team changes, pre-select lead or first active member
                        const matched = teams.find((t) => t.name === newName);
                        if (matched) {
                          const members = staffMembers.filter(
                            (s) => s.teamId === matched.id && s.status === "Active"
                          );
                          setAssignedWorkerName(members[0]?.fullName || matched.leadTechnician?.split("(")[0].trim() || "");
                        } else {
                          setAssignedWorkerName("");
                        }
                      }}
                      className="w-full bg-white border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs text-[#263238] focus:border-[#087E8B]"
                    >
                      <option value="">-- Choose Specialized Unit --</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name} &bull; {t.area} ({t.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* PART C: Individual Staff Member Selection (Dynamic from Team Members) */}
                  <div>
                    <label className="block font-semibold text-[#263238] mb-1">
                      2. Assign Individual Staff Member:
                    </label>
                    <select
                      value={assignedWorkerName}
                      onChange={(e) => setAssignedWorkerName(e.target.value)}
                      disabled={!assignedTeamName}
                      className="w-full bg-white border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs text-[#263238] focus:border-[#087E8B] disabled:bg-[#F7F7F2] disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {assignedTeamName ? "-- Choose Team Lineman / Staff --" : "-- Select Team First --"}
                      </option>
                      {currentTeamMembers.map((sm) => (
                        <option key={sm.id} value={sm.fullName}>
                          {sm.fullName} ({sm.designation} &bull; {sm.staffId})
                        </option>
                      ))}
                      {currentTeamObj?.leadTechnician && (
                        <option value={currentTeamObj.leadTechnician.split("(")[0].trim()}>
                          {currentTeamObj.leadTechnician} (Unit Lead)
                        </option>
                      )}
                    </select>
                    {assignedTeamName && currentTeamMembers.length === 0 && (
                      <span className="text-[10px] text-[#b25514] mt-1 block">
                        No individual active members currently assigned to this team. You can add one in Team Management.
                      </span>
                    )}
                  </div>

                  {/* Admin Note */}
                  <div>
                    <label className="block font-semibold text-[#263238] mb-1">
                      Official Dispatch Note:
                    </label>
                    <textarea
                      rows={2}
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="e.g. Cordon sidewalk, boom truck dispatched, repair work order issued..."
                      className="w-full bg-white border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs text-[#263238] focus:border-[#087E8B]"
                    ></textarea>
                  </div>

                  {/* Submit Button & Reject Action */}
                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                    <button
                      type="submit"
                      className="w-full sm:flex-1 py-2.5 bg-[#087E8B] hover:bg-[#06636E] text-white font-bold rounded-lg transition-all hover-lift shadow-xs flex items-center justify-center gap-2 text-xs"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Confirm Assignment &amp; Save</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectionReasonInput("");
                        setRejectionError("");
                        setShowRejectionModal(true);
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-[#F4A261]/15 text-[#b25514] font-bold rounded-lg border border-[#F4A261]/50 transition-all hover-lift text-xs shrink-0"
                      title="Reject this complaint with a specific reason"
                    >
                      Reject Complaint
                    </button>
                  </div>
                </form>
              ) : (
                <div className="py-12 text-center text-[#263238]/60">
                  Select a complaint from the table to triage.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: TEAM & STAFF MANAGEMENT (PART B)
          ========================================================================= */}
      {activeTab === "teams" && (
        <div className="space-y-8">
          {/* Subsection 1: Maintenance Teams */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAF3F5] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#173F5F] flex items-center gap-2">
                  <span>1. Maintenance Teams &amp; Squads</span>
                  <span className="bg-[#EAF3F5] text-[#173F5F] text-xs font-mono px-2 py-0.5 rounded-full border border-[#087E8B]/20">
                    {teams.length} Registered Units
                  </span>
                </h2>
                <p className="text-xs text-[#263238]/70">
                  Manage geographical zones, status, and assigned personnel across municipal wards.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateTeamModal(true)}
                className="px-4 py-2 bg-[#087E8B] hover:bg-[#06636E] text-white text-xs font-bold rounded-lg transition-all hover-lift shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
              >
                <span>+</span>
                <span>Create New Team</span>
              </button>
            </div>

            {/* Teams Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {teams.map((t) => {
                const members = staffMembers.filter((s) => s.teamId === t.id);
                const activeCount = members.filter((s) => s.status === "Active").length;
                const assignedJobCount = complaints.filter(
                  (c) => (c.assignedTeamId === t.id || c.assignedTeam === t.name) && c.status !== "Resolved"
                ).length;

                return (
                  <div
                    key={t.id}
                    className="bg-white border border-[#EAF3F5] rounded-xl p-5 shadow-xs flex flex-col justify-between hover-lift transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                            t.status === "Active" || t.status === "On Duty"
                              ? "bg-emerald-50 text-[#087E8B] border-[#087E8B]/30"
                              : t.status === "Standby"
                              ? "bg-[#EAF3F5] text-[#173F5F] border-[#087E8B]/20"
                              : "bg-[#F7F7F2] text-[#263238]/60 border-[#EAF3F5]"
                          }`}
                        >
                          {t.status}
                        </span>
                        <span className="font-mono text-[11px] font-bold text-[#173F5F] bg-[#EAF3F5] px-2 py-0.5 rounded">
                          {assignedJobCount} Active Task{assignedJobCount !== 1 ? "s" : ""}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-bold text-sm text-[#263238]">{t.name}</h3>
                        <span className="text-[11px] font-medium text-[#087E8B] block mt-0.5">
                          {t.area}
                        </span>
                      </div>

                      <p className="text-xs text-[#263238]/75 leading-relaxed line-clamp-2">
                        {t.description}
                      </p>

                      {/* Members count & preview */}
                      <div className="pt-2 border-t border-[#EAF3F5]">
                        <span className="text-[11px] font-semibold text-[#263238]/70 block mb-1">
                          Squad Members ({activeCount} Active):
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {members.slice(0, 3).map((m) => (
                            <span
                              key={m.id}
                              className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                m.status === "Active"
                                  ? "bg-[#EAF3F5] text-[#173F5F] border-[#087E8B]/20"
                                  : "bg-[#F7F7F2] text-[#263238]/40 border-slate-200 line-through"
                              }`}
                            >
                              {m.fullName.split(" ")[0]} ({m.staffId})
                            </span>
                          ))}
                          {members.length > 3 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              +{members.length - 3} more
                            </span>
                          )}
                          {members.length === 0 && (
                            <span className="text-[10px] text-slate-400 italic">No members yet</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 mt-3 border-t border-[#EAF3F5] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingTeam({ ...t })}
                        className="px-3 py-1.5 rounded-lg border border-[#087E8B]/30 hover:bg-[#EAF3F5] text-[#173F5F] text-xs font-semibold transition-colors"
                      >
                        Edit Team
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setStaffFilterTeam(t.id);
                        }}
                        className="text-xs font-bold text-[#087E8B] hover:underline"
                      >
                        View Roster &rarr;
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Subsection 2: Staff Roster & Technician Management */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAF3F5] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#173F5F] flex items-center gap-2">
                  <span>2. Staff &amp; Linemen Directory</span>
                  <span className="bg-[#EAF3F5] text-[#173F5F] text-xs font-mono px-2 py-0.5 rounded-full border border-[#087E8B]/20">
                    {staffMembers.length} Members ({activeStaffCount} Active)
                  </span>
                </h2>
                <p className="text-xs text-[#263238]/70">
                  Assign technicians to teams, transfer between squads, and toggle account status.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateStaffModal(true)}
                className="px-4 py-2 bg-[#087E8B] hover:bg-[#06636E] text-white text-xs font-bold rounded-lg transition-all hover-lift shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
              >
                <span>+</span>
                <span>Add New Staff Member</span>
              </button>
            </div>

            {/* Staff Filters */}
            <div className="bg-white border border-[#EAF3F5] rounded-xl p-3.5 flex flex-wrap items-center gap-3 text-xs shadow-xs">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={staffSearchTerm}
                  onChange={(e) => setStaffSearchTerm(e.target.value)}
                  placeholder="Search staff by name, badge ID (e.g. STF-001), designation..."
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs text-[#263238] focus:bg-white focus:border-[#087E8B]"
                />
              </div>

              <div>
                <select
                  value={staffFilterTeam}
                  onChange={(e) => setStaffFilterTeam(e.target.value)}
                  className="bg-white border border-[#EAF3F5] rounded-lg py-2 px-2.5 text-xs text-[#263238]"
                >
                  <option value="ALL">All Squads ({staffMembers.length})</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={staffFilterStatus}
                  onChange={(e) => setStaffFilterStatus(e.target.value)}
                  className="bg-white border border-[#EAF3F5] rounded-lg py-2 px-2.5 text-xs text-[#263238]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Active">Active Only</option>
                  <option value="Deactivated">Deactivated Only</option>
                </select>
              </div>
            </div>

            {/* Responsive Vertical Staff List (NO HORIZONTAL SCROLLING) */}
            <div className="space-y-3">
              {filteredStaffMembers.length === 0 ? (
                <div className="p-8 text-center bg-white border border-[#EAF3F5] rounded-xl text-xs text-[#263238]/60">
                  No staff members found matching criteria.
                </div>
              ) : (
                filteredStaffMembers.map((sm) => {
                  const isDeactivated = sm.status === "Deactivated" || sm.status === "Disabled";
                  const activeTasks = complaints.filter(
                    (c) => c.assignedWorkerId === sm.id && c.status !== "Resolved"
                  ).length;
                  return (
                    <div
                      key={sm.id}
                      className={`bg-white border border-[#EAF3F5] rounded-xl p-4 shadow-xs transition-all hover:border-[#087E8B]/40 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        isDeactivated ? "opacity-60 bg-slate-50" : ""
                      }`}
                    >
                      {/* Left: Info */}
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
                            <span className="text-[#263238]/50 font-medium">Assigned Squad: </span>
                            <span className="font-semibold text-[#087E8B]">{sm.teamName}</span>
                          </div>
                          <div>
                            <span className="text-[#263238]/50 font-medium">Area: </span>
                            <span>{sm.area}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
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
                            setTransferStaffTarget(sm);
                            setTransferTargetTeamId(sm.teamId);
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-[#087E8B]/30 text-[#087E8B] hover:bg-[#EAF3F5] font-semibold text-xs"
                        >
                          Transfer
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            alert(`Password reset link generated for staff member ${sm.fullName} (${sm.email}) via Firebase Authentication.`);
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-[#087E8B]/30 text-[#087E8B] hover:bg-[#EAF3F5] font-semibold text-xs"
                        >
                          Reset Password
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
          MODALS FOR TEAM MANAGEMENT
          ========================================================================= */}

      {/* 1. Create New Team Modal */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 z-50 bg-[#173F5F]/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAF3F5] rounded-xl shadow-2xl max-w-md w-full overflow-hidden text-xs text-[#263238]">
            <div className="bg-[#173F5F] text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-extrabold text-sm">Create New Maintenance Squad</h3>
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
                  placeholder="e.g. Electrical Squad Delta"
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 focus:bg-white focus:border-[#087E8B]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">Squad Description</label>
                <textarea
                  rows={2}
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                  placeholder="Purpose, responsibilities, or specialized equipment..."
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 focus:bg-white focus:border-[#087E8B]"
                ></textarea>
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">Assigned Ward</label>
                <select
                  value={newTeamArea}
                  onChange={(e) => setNewTeamArea(e.target.value)}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 focus:bg-white focus:border-[#087E8B]"
                >
                  {WARDS_LIST.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                  <option value="Citywide 24/7 (All Wards)">Citywide 24/7 (All Wards)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">Initial Status</label>
                <select
                  value={newTeamStatus}
                  onChange={(e) => setNewTeamStatus(e.target.value as TeamStatus)}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 focus:bg-white focus:border-[#087E8B]"
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
                  Save New Squad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit Team Modal */}
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

            <form onSubmit={handleEditTeamSubmit} className="p-5 space-y-4">
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
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 focus:bg-white focus:border-[#087E8B]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingTeam.description}
                  onChange={(e) =>
                    setEditingTeam({ ...editingTeam, description: e.target.value })
                  }
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 focus:bg-white focus:border-[#087E8B]"
                ></textarea>
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">Assigned Ward</label>
                <input
                  type="text"
                  value={editingTeam.area}
                  onChange={(e) => setEditingTeam({ ...editingTeam, area: e.target.value })}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 focus:bg-white focus:border-[#087E8B]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">Squad Status</label>
                <select
                  value={editingTeam.status}
                  onChange={(e) =>
                    setEditingTeam({ ...editingTeam, status: e.target.value as TeamStatus })
                  }
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 focus:bg-white focus:border-[#087E8B]"
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

      {/* 3. Add New Staff Member Modal */}
      {showCreateStaffModal && (
        <div className="fixed inset-0 z-50 bg-[#173F5F]/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAF3F5] rounded-xl shadow-2xl max-w-lg w-full overflow-hidden text-xs text-[#263238]">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-xs text-[#263238] mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newStaffFullName}
                    onChange={(e) => setNewStaffFullName(e.target.value)}
                    placeholder="e.g. Ramesh Chandra"
                    className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-xs text-[#263238] mb-1">Designation</label>
                  <select
                    value={newStaffDesignation}
                    onChange={(e) => setNewStaffDesignation(e.target.value)}
                    className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                  >
                    <option value="Senior Lineman">Senior Lineman</option>
                    <option value="Field Electrician">Field Electrician</option>
                    <option value="Underground Cable Specialist">Underground Cable Specialist</option>
                    <option value="Feeder Pillar Technician">Feeder Pillar Technician</option>
                    <option value="High-Voltage Bucket Truck Operator">High-Voltage Bucket Truck Operator</option>
                    <option value="Apprentice Lineman">Apprentice Lineman</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-xs text-[#263238] mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    placeholder="official.email@urjasetu.gov.in"
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
              </div>

              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#173F5F] border-b border-[#EAF3F5] pb-1 pt-1">
                  Work Information
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-xs text-[#263238] mb-1">
                    Assign Squad <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newStaffTeamId}
                    onChange={(e) => setNewStaffTeamId(e.target.value)}
                    className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                    required
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-xs text-[#263238] mb-1">Operating Ward</label>
                  <select
                    value={newStaffArea}
                    onChange={(e) => setNewStaffArea(e.target.value)}
                    className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                  >
                    {WARDS_LIST.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                    <option value="Citywide Emergency">Citywide Emergency</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">Account Status</label>
                <select
                  value={newStaffStatus}
                  onChange={(e) => setNewStaffStatus(e.target.value as StaffStatus)}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                >
                  <option value="Active">Active</option>
                  <option value="Deactivated">Disabled</option>
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
                  Save Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Edit Staff Member Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-[#173F5F]/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAF3F5] rounded-xl shadow-2xl max-w-lg w-full overflow-hidden text-xs text-[#263238]">
            <div className="bg-[#173F5F] text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-extrabold text-sm">
                Edit Staff: {editingStaff.fullName} ({editingStaff.staffId})
              </h3>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="text-white/80 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditStaffSubmit} className="p-5 space-y-4">
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#173F5F] border-b border-[#EAF3F5] pb-1">
                  Personal Information
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <label className="block font-bold text-xs text-[#263238] mb-1">Designation</label>
                  <input
                    type="text"
                    value={editingStaff.designation}
                    onChange={(e) =>
                      setEditingStaff({ ...editingStaff, designation: e.target.value })
                    }
                    className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-xs text-[#263238] mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={editingStaff.email}
                    onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                    className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
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
              </div>

              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#173F5F] border-b border-[#EAF3F5] pb-1 pt-1">
                  Work Information
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-xs text-[#263238] mb-1">
                    Assign Squad (Transfer) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editingStaff.teamId}
                    onChange={(e) => {
                      const t = teams.find((item) => item.id === e.target.value);
                      setEditingStaff({
                        ...editingStaff,
                        teamId: e.target.value,
                        teamName: t ? t.name : editingStaff.teamName,
                      });
                    }}
                    className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-xs text-[#263238] mb-1">Operating Ward</label>
                  <input
                    type="text"
                    value={editingStaff.area}
                    onChange={(e) => setEditingStaff({ ...editingStaff, area: e.target.value })}
                    className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">Account Status</label>
                <select
                  value={editingStaff.status}
                  onChange={(e) =>
                    setEditingStaff({ ...editingStaff, status: e.target.value as StaffStatus })
                  }
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                >
                  <option value="Active">Active</option>
                  <option value="Deactivated">Disabled (Historical records preserved)</option>
                </select>
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

      {/* 5. Quick Transfer Staff Modal */}
      {transferStaffTarget && (
        <div className="fixed inset-0 z-50 bg-[#173F5F]/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAF3F5] rounded-xl shadow-2xl max-w-sm w-full overflow-hidden text-xs text-[#263238]">
            <div className="bg-[#173F5F] text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-bold text-sm">Transfer Team Member</h3>
              <button
                type="button"
                onClick={() => setTransferStaffTarget(null)}
                className="text-white/80 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="p-5 space-y-4">
              <div className="bg-[#F7F7F2] p-3 rounded-lg border border-[#EAF3F5]">
                <span className="text-[11px] text-[#263238]/60 block">Staff Member:</span>
                <span className="font-bold text-sm text-[#263238] block">
                  {transferStaffTarget.fullName} ({transferStaffTarget.staffId})
                </span>
                <span className="text-[11px] text-[#087E8B] font-semibold block mt-0.5">
                  Current Squad: {transferStaffTarget.teamName}
                </span>
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  Select New Destination Squad:
                </label>
                <select
                  value={transferTargetTeamId}
                  onChange={(e) => setTransferTargetTeamId(e.target.value)}
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 focus:bg-white focus:border-[#087E8B]"
                  required
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.area})
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-[10px] text-[#263238]/60 leading-relaxed">
                Transferring will update the staff member&apos;s team association. All previously resolved and active work orders maintain audit fidelity.
              </p>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#EAF3F5]">
                <button
                  type="button"
                  onClick={() => setTransferStaffTarget(null)}
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

      {/* 5. View Staff Details Modal */}
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
                    <span className="text-[#263238]/60 block text-[10px]">Operating Ward</span>
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

      {/* Rejection Modal (Priority 3) */}
      {showRejectionModal && selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-[#173F5F]/60 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-[#EAF3F5] rounded-xl shadow-2xl max-w-md w-full overflow-hidden transition-all">
            <div className="bg-[#173F5F] text-white px-5 py-3.5 flex items-center justify-between border-b border-[#087E8B]/20">
              <h3 className="font-extrabold text-sm text-white">Reject Complaint {selectedComplaint.id}</h3>
              <button
                type="button"
                onClick={() => setShowRejectionModal(false)}
                className="w-7 h-7 rounded-lg bg-[#263238]/60 hover:bg-[#263238] text-white flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleRejectSubmit} className="p-5 space-y-4 text-xs text-[#263238]">
              <div>
                <h4 className="font-extrabold text-xs text-[#173F5F] uppercase tracking-wider mb-1">
                  Rejection Justification
                </h4>
                <p className="text-[11px] text-[#263238]/70 mb-3">
                  A rejection reason is mandatory. This explanation will be displayed publicly in citizen tracking and permanently logged in the audit ledger.
                </p>
                <label className="block font-bold text-xs text-[#263238] mb-1">
                  Reason for Rejection <span className="text-[#b25514]">*</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectionReasonInput}
                  onChange={(e) => {
                    setRejectionReasonInput(e.target.value);
                    setRejectionError("");
                  }}
                  placeholder="e.g. Private residential wiring inside apartment premises — outside municipal streetlight jurisdiction. Citizen advised to contact licensed electrician."
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg p-2.5 text-xs text-[#263238] focus:bg-white focus:border-[#087E8B]"
                  required
                ></textarea>
                {rejectionError && (
                  <p className="text-[11px] text-[#b25514] font-semibold mt-1">{rejectionError}</p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#EAF3F5]">
                <button
                  type="button"
                  onClick={() => setShowRejectionModal(false)}
                  className="px-4 py-2 border border-[#EAF3F5] rounded-lg text-[#263238]/80 hover:bg-[#F7F7F2] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#b25514] hover:bg-[#91420d] text-white font-bold rounded-lg shadow-xs"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reusable Image Lightbox */}
      <ImageViewerModal
        isOpen={!!viewerImage}
        onClose={() => setViewerImage(null)}
        imageData={viewerImage}
      />
    </div>
  );
};
