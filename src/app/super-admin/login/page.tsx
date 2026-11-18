"use client";

import React, { useState, useEffect, useCallback } from "react";
import { SuperAdminView, CollectionStatusReport } from "@/components/SuperAdminView";
import { useUrjaSetuData } from "@/services/dataService";
import { auth } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  Complaint,
  MaintenanceTeam,
  StaffMember,
  UserProfile,
  AuditLogEntry,
  OperationalSettings,
  WebsiteContent,
  CategoryItem,
} from "@/types/urjasetu";

interface DashboardPayload {
  counts: {
    totalComplaints: number;
    pendingComplaints: number;
    resolvedComplaints: number;
    delayedComplaints: number;
    unassignedComplaints: number;
    inProgressComplaints: number;
    newWaitingComplaints: number;
    totalAdmins: number;
    activeAdmins: number;
    totalStaff: number;
    activeStaff: number;
    totalTeams: number;
    activeTeams: number;
    totalSuperAdmins: number;
  };
  recentComplaints: Complaint[];
  recentActivity: AuditLogEntry[];
  complaints: Complaint[];
  admins: UserProfile[];
  superAdmins: UserProfile[];
  staffMembers: StaffMember[];
  teams: MaintenanceTeam[];
  auditLogs: AuditLogEntry[];
  categories: CategoryItem[];
  websiteContent: WebsiteContent;
  settings: OperationalSettings;
  collectionStatus: CollectionStatusReport;
  source: string;
}

export default function SuperAdminLoginPage() {
  const {
    complaints: demoComplaints,
    teams: demoTeams,
    staffMembers: demoStaffMembers,
    admins: demoAdmins,
    superAdmins: demoSuperAdmins,
    auditLogs: demoAuditLogs,
    settings: demoSettings,
    websiteContent: demoWebsiteContent,
    categories: demoCategories,
    dataService,
  } = useUrjaSetuData();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [verifiedSuperAdmin, setVerifiedSuperAdmin] = useState<{
    uid: string;
    email: string;
    fullName?: string;
    staffId?: string;
  } | null>(null);

  // Live Firestore Dashboard state
  const [dashboardData, setDashboardData] = useState<DashboardPayload | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Form states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch live dashboard metrics from Firestore using Firebase Admin SDK endpoint
  const fetchDashboardData = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setIsLoadingDashboard(false);
      return;
    }

    setIsLoadingDashboard(true);
    setDashboardError(null);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/super-admin/dashboard", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load dashboard from Firestore.");
      }

      setDashboardData(data);
      setIsLoadingDashboard(false);
    } catch (err: unknown) {
      console.error("[UrjaSetu Dashboard Fetch Error]:", err);
      const msg = err instanceof Error ? err.message : "Failed to load dashboard from Firestore.";
      setDashboardError(msg);
      setIsLoadingDashboard(false);
    }
  }, []);

  // Check existing authenticated Firebase session on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // 1. Refresh ID token to pick up latest claims
          const idTokenResult = await firebaseUser.getIdTokenResult();
          if (idTokenResult.claims.role === "super_admin") {
            // 2. Cryptographically verify with server and confirm Active account status
            const idToken = await firebaseUser.getIdToken();
            const res = await fetch("/api/auth/super-admin/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${idToken}`,
              },
            });
            const data = await res.json();
            if (res.ok && data.success) {
              setVerifiedSuperAdmin(data.user);
              setIsLoggedIn(true);
              // Fetch live Firestore records
              fetchDashboardData();
            } else {
              await signOut(auth);
              setVerifiedSuperAdmin(null);
              setIsLoggedIn(false);
            }
          } else {
            await signOut(auth);
            setVerifiedSuperAdmin(null);
            setIsLoggedIn(false);
          }
        } catch {
          setVerifiedSuperAdmin(null);
          setIsLoggedIn(false);
        }
      }
    });

    return () => unsubscribe();
  }, [fetchDashboardData]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch {
      // Ignore silent sign-out errors
    }
    setVerifiedSuperAdmin(null);
    setDashboardData(null);
    setIsLoggedIn(false);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const emailTrimmed = username.trim();
    if (!emailTrimmed) {
      setErrorMessage("Please enter above details.");
      return;
    }

    if (!password.trim()) {
      setErrorMessage("Please enter your account password.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Authenticate with Firebase Email/Password
      const userCredential = await signInWithEmailAndPassword(auth, emailTrimmed, password);
      const user = userCredential.user;

      // 2. Force token refresh to ensure custom claims are latest
      const idTokenResult = await user.getIdTokenResult(true);

      // 3. Client-side role validation
      if (idTokenResult.claims.role !== "super_admin") {
        await signOut(auth);
        setIsSubmitting(false);
        setErrorMessage("Access Denied: This account does not possess Super Administrator privileges.");
        return;
      }

      // 4. Server-Side Verification via Firebase Admin SDK
      const idToken = await user.getIdToken();
      const response = await fetch("/api/auth/super-admin/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        await signOut(auth);
        setIsSubmitting(false);
        setErrorMessage(
          data.error || "Server authorization failed. Super Administrator session rejected."
        );
        return;
      }

      // 5. Success: store verified profile and redirect into dashboard
      setVerifiedSuperAdmin(data.user);
      setIsLoggedIn(true);
      setIsSubmitting(false);

      // 6. Fetch live Firestore dashboard collections
      fetchDashboardData();
    } catch (err: unknown) {
      console.error("[UrjaSetu Super Admin Login Error]:", err);
      const firebaseError = err as { code?: string; message?: string };
      let friendlyError = "Authentication failed. Please check your credentials.";

      switch (firebaseError.code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
          friendlyError = "Invalid email or password. Please verify your credentials and try again.";
          break;
        case "auth/invalid-email":
          friendlyError = "Please enter a valid email address.";
          break;
        case "auth/user-disabled":
          friendlyError = "This Super Administrator account has been disabled. Please contact municipal IT.";
          break;
        case "auth/too-many-requests":
          friendlyError = "Access temporarily locked due to multiple failed login attempts. Please try again later.";
          break;
        case "auth/network-request-failed":
          friendlyError = "Network connection failed. Please check your internet connectivity.";
          break;
        default:
          if (firebaseError.message) {
            friendlyError = firebaseError.message;
          }
          break;
      }

      setErrorMessage(friendlyError);
      setIsSubmitting(false);
    }
  };

  const handleAdminUpdateComplaint = async (
    complaintId: string,
    updates: Partial<Complaint>,
    timelineNote: string,
    actor: string
  ) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const idToken = await user.getIdToken();
        await fetch("/api/complaints/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            complaintId,
            status: updates.status,
            priority: updates.priority,
            assignedTeamId: updates.assignedTeamId,
            assignedTeam: updates.assignedTeam,
            assignedWorkerId: updates.assignedWorkerId,
            assignedWorker: updates.assignedWorker,
            rejectionReason: updates.rejectionReason,
            resolutionNotes: updates.resolutionNotes,
            photoAfter: updates.photoAfter,
            timelineNote,
          }),
        });
        fetchDashboardData();
      } catch (err) {
        console.error("Failed to update complaint in Firestore:", err);
      }
    }

    dataService.updateComplaint(
      complaintId,
      updates,
      {
        time: "Just now",
        stage: updates.status || "Updated",
        note: timelineNote,
        actor: actor || verifiedSuperAdmin?.fullName || "Super Administrator",
      }
    );
  };

  const handleCreateAdmin = async (newAdmin: UserProfile) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const idToken = await user.getIdToken();
        await fetch("/api/super-admin/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            email: newAdmin.email,
            password: "InitialPassword@2026",
            fullName: newAdmin.fullName,
            role: "admin",
            phone: newAdmin.phone,
            staffId: newAdmin.staffId,
            designation: newAdmin.designation,
          }),
        });
        fetchDashboardData();
      } catch (err) {
        console.error("Failed to create admin in Firestore:", err);
      }
    }
    dataService.createAdmin(newAdmin);
  };

  const handleUpdateAdmin = async (adminId: string, updates: Partial<UserProfile>) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const idToken = await user.getIdToken();
        await fetch("/api/super-admin/users", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            userId: adminId,
            ...updates,
          }),
        });
        fetchDashboardData();
      } catch (err) {
        console.error("Failed to update admin in Firestore:", err);
      }
    }
    dataService.updateAdmin(adminId, updates);
  };

  const handleCreateSuperAdmin = async (newSupAdmin: UserProfile) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const idToken = await user.getIdToken();
        await fetch("/api/super-admin/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            email: newSupAdmin.email,
            password: "InitialPassword@2026",
            fullName: newSupAdmin.fullName,
            role: "super_admin",
            phone: newSupAdmin.phone,
            staffId: newSupAdmin.staffId,
          }),
        });
        fetchDashboardData();
      } catch (err) {
        console.error("Failed to provision super admin in Firestore:", err);
      }
    }
    dataService.createSuperAdmin(newSupAdmin);
  };

  const handleCreateTeam = async (newTeam: MaintenanceTeam) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const idToken = await user.getIdToken();
        await fetch("/api/super-admin/teams", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(newTeam),
        });
        fetchDashboardData();
      } catch (err) {
        console.error("Failed to create team in Firestore:", err);
      }
    }
    dataService.createTeam(newTeam);
  };

  const handleUpdateTeam = async (teamId: string, updates: Partial<MaintenanceTeam>) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const idToken = await user.getIdToken();
        await fetch("/api/super-admin/teams", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ teamId, updates }),
        });
        fetchDashboardData();
      } catch (err) {
        console.error("Failed to update team in Firestore:", err);
      }
    }
    dataService.updateTeam(teamId, updates);
  };

  const handleCreateStaff = async (newStaff: StaffMember) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const idToken = await user.getIdToken();
        await fetch("/api/super-admin/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            email: newStaff.email,
            password: "InitialPassword@2026",
            fullName: newStaff.fullName,
            role: "field_worker",
            phone: newStaff.phone,
            staffId: newStaff.staffId,
            designation: newStaff.designation,
            teamId: newStaff.teamId,
            teamName: newStaff.teamName,
            area: newStaff.area,
          }),
        });
        fetchDashboardData();
      } catch (err) {
        console.error("Failed to create staff in Firestore:", err);
      }
    }
    dataService.createStaff(newStaff);
  };

  const handleUpdateStaff = async (staffId: string, updates: Partial<StaffMember>) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const idToken = await user.getIdToken();
        await fetch("/api/super-admin/users", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            userId: staffId,
            ...updates,
          }),
        });
        fetchDashboardData();
      } catch (err) {
        console.error("Failed to update staff in Firestore:", err);
      }
    }
    dataService.updateStaff(staffId, updates);
  };

  const handleUpdateSettings = async (newSettings: Partial<OperationalSettings>) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const idToken = await user.getIdToken();
        await fetch("/api/super-admin/content", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            type: "settings",
            data: newSettings,
          }),
        });
        fetchDashboardData();
      } catch (err) {
        console.error("Failed to update settings in Firestore:", err);
      }
    }
    dataService.updateSettings(newSettings);
  };

  const handleDeleteAdmin = (adminId: string) => {
    dataService.deleteAdmin(adminId);
  };

  const handleDeleteStaff = (staffId: string) => {
    dataService.deleteStaff(staffId);
  };

  const handleDeleteTeam = (teamId: string) => {
    dataService.deleteTeam(teamId);
  };

  const handleUpdateWebsiteContent = async (updates: Partial<WebsiteContent>) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const idToken = await user.getIdToken();
        await fetch("/api/super-admin/content", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            type: "websiteContent",
            data: updates,
          }),
        });
        fetchDashboardData();
      } catch (err) {
        console.error("Failed to update website content in Firestore:", err);
      }
    }
    dataService.updateWebsiteContent(updates);
  };

  const handleAddCategory = async (cat: CategoryItem) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const idToken = await user.getIdToken();
        await fetch("/api/super-admin/content", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            type: "category",
            data: cat,
          }),
        });
        fetchDashboardData();
      } catch (err) {
        console.error("Failed to add category in Firestore:", err);
      }
    }
    dataService.createCategory(cat);
  };

  const handleUpdateCategory = (catId: string, updates: Partial<CategoryItem>) => {
    dataService.updateCategory(catId, updates);
  };

  const handleDeleteCategory = (catId: string) => {
    dataService.deleteCategory(catId);
  };

  const handleAddAuditLog = (entry: Omit<AuditLogEntry, "id" | "timestamp">) => {
    dataService.addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: "Just now",
      ...entry,
    });
  };

  if (isLoggedIn) {
    if (isLoadingDashboard) {
      return (
        <div className="min-h-screen bg-[#F7F7F2] flex items-center justify-center p-6">
          <div className="bg-white border border-[#EAF3F5] rounded-xl p-8 max-w-md w-full text-center space-y-4 shadow-xs">
            <div className="animate-spin h-9 w-9 text-[#087E8B] border-4 border-[#087E8B] border-t-transparent rounded-full mx-auto" />
            <div className="space-y-1">
              <h3 className="font-bold text-[#173F5F] text-sm">Loading Live Firestore Dashboard</h3>
              <p className="text-xs text-[#263238]/60">Querying collections via Firebase Admin SDK...</p>
            </div>
            <div className="text-[11px] text-[#263238]/60 font-mono bg-[#EAF3F5]/60 py-1 px-3 rounded">
              Verified: {verifiedSuperAdmin?.email || "Super Admin"}
            </div>
          </div>
        </div>
      );
    }

    if (dashboardError) {
      return (
        <div className="min-h-screen bg-[#F7F7F2] flex items-center justify-center p-6">
          <div className="bg-white border border-red-200 rounded-xl p-8 max-w-md w-full text-center space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-xl">
              ⚠️
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-red-700 text-sm">Dashboard Connection Error</h3>
              <p className="text-xs text-[#263238]/70 bg-red-50 p-3 rounded border border-red-100 text-left">
                {dashboardError}
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={fetchDashboardData}
                className="flex-1 py-2 bg-[#087E8B] hover:bg-[#06636E] text-white text-xs font-bold rounded-lg transition-all"
              >
                Retry Connection
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2 bg-[#EAF3F5] hover:bg-[#d8eaf0] text-[#173F5F] text-xs font-semibold rounded-lg transition-all"
              >
                Lock &amp; Exit
              </button>
            </div>
          </div>
        </div>
      );
    }

    const activeComplaints = dashboardData ? dashboardData.complaints : demoComplaints;
    const activeTeams = dashboardData ? dashboardData.teams : demoTeams;
    const activeStaffMembers = dashboardData ? dashboardData.staffMembers : demoStaffMembers;
    const activeAdmins = dashboardData ? dashboardData.admins : demoAdmins;
    const activeSuperAdmins = dashboardData ? dashboardData.superAdmins : demoSuperAdmins;
    const activeAuditLogs = dashboardData ? dashboardData.auditLogs : demoAuditLogs;
    const activeSettings = dashboardData ? dashboardData.settings : demoSettings;
    const activeWebsiteContent = dashboardData ? dashboardData.websiteContent : demoWebsiteContent;
    const activeCategories = dashboardData ? dashboardData.categories : demoCategories;
    const currentDataSource: "firestore" | "demo" = dashboardData ? "firestore" : "demo";

    return (
      <div className="min-h-screen bg-[#F7F7F2] text-[#263238] flex flex-col">
        <header className="bg-[#173F5F] text-[#F7F7F2] border-b border-[#087E8B]/20 py-3.5 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="font-extrabold text-xl tracking-tight text-white">
                Urja<span className="text-[#087E8B]">Setu</span>
              </span>
              <span className="text-xs text-[#F4A261] font-mono hidden sm:inline">
                &bull; Super Administrator Control
              </span>
              {verifiedSuperAdmin && (
                <span className="text-[11px] bg-[#263238] text-[#EAF3F5] px-2 py-0.5 rounded border border-[#087E8B]/30 hidden md:inline">
                  {verifiedSuperAdmin.email} ({verifiedSuperAdmin.staffId || "SUP-001"})
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3.5 py-1.5 text-xs font-semibold bg-white text-[#173F5F] hover:bg-[#EAF3F5] rounded-lg transition-all shadow-2xs"
            >
              Lock &amp; Exit Console
            </button>
          </div>
        </header>

        <main className="flex-1 w-full">
          <SuperAdminView
            complaints={activeComplaints}
            teams={activeTeams}
            staffMembers={activeStaffMembers}
            admins={activeAdmins}
            superAdmins={activeSuperAdmins}
            auditLogs={activeAuditLogs}
            settings={activeSettings}
            websiteContent={activeWebsiteContent}
            categories={activeCategories}
            collectionStatus={dashboardData?.collectionStatus}
            dataSource={currentDataSource}
            onRefresh={fetchDashboardData}
            onUpdateComplaint={handleAdminUpdateComplaint}
            onCreateAdmin={handleCreateAdmin}
            onUpdateAdmin={handleUpdateAdmin}
            onDeleteAdmin={handleDeleteAdmin}
            onCreateSuperAdmin={handleCreateSuperAdmin}
            onCreateTeam={handleCreateTeam}
            onUpdateTeam={handleUpdateTeam}
            onDeleteTeam={handleDeleteTeam}
            onCreateStaff={handleCreateStaff}
            onUpdateStaff={handleUpdateStaff}
            onDeleteStaff={handleDeleteStaff}
            onUpdateSettings={handleUpdateSettings}
            onUpdateWebsiteContent={handleUpdateWebsiteContent}
            onAddCategory={handleAddCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            onAddAuditLog={handleAddAuditLog}
            onExit={handleLogout}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F2] text-[#263238] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-[#EAF3F5] rounded-xl shadow-lg overflow-hidden transition-all">
        {/* Header (Deep Blue: #173F5F) */}
        <div className="bg-[#173F5F] text-[#F7F7F2] p-6 text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-[#087E8B] text-white mx-auto flex items-center justify-center shadow-xs ring-2 ring-[#F4A261]/40">
            <svg
              className="w-6 h-6 text-[#F4A261]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <h1 className="text-xl font-extrabold text-white">Super Admin Portal</h1>
            <span className="bg-[#F4A261]/20 text-[#F4A261] text-[10px] font-mono px-1.5 py-0.2 rounded border border-[#F4A261]/40 font-bold uppercase">
              Root Authority
            </span>
          </div>
          <p className="text-xs text-[#EAF3F5]/80">
            Executive Municipal Oversight &bull; Restricted Direct Access
          </p>
        </div>

        {/* Login Form Body */}
        <form onSubmit={handleLoginSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-[#263238] mb-1">
              Super Admin Username / Official Director Email
            </label>
            <input
              type="text"
              value={username}
              disabled={isSubmitting}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. director.swaminathan@urjasetu.gov.in"
              className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2.5 px-3 text-xs text-[#263238] focus:bg-white focus:border-[#087E8B] disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#263238] mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                disabled={isSubmitting}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter executive master password"
                className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2.5 px-3 pr-16 text-xs text-[#263238] focus:bg-white focus:border-[#087E8B] disabled:opacity-60"
              />
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[#087E8B] hover:underline disabled:opacity-50"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-[#F4A261]/20 border border-[#F4A261] text-[#b25514] rounded-lg text-xs leading-relaxed">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-[#087E8B] hover:bg-[#06636E] text-white font-bold rounded-lg transition-all hover-lift shadow-xs flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Authenticating Super Admin...</span>
              </span>
            ) : (
              <span>Authenticate Super Admin &rarr;</span>
            )}
          </button>

          {/* Development Inspection Mode */}
          <div className="pt-4 border-t border-[#EAF3F5] text-center space-y-2">
            <span className="text-[11px] text-[#263238]/60 block">
              Development Preview (Database Connection Stage):
            </span>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsLoggedIn(true)}
              className="w-full py-2 bg-[#173F5F] hover:bg-[#132a4a] text-white font-semibold rounded-lg text-xs transition-all hover-lift border border-[#F4A261]/40 disabled:opacity-60"
            >
              Open Super Admin Executive Console &rarr;
            </button>
            <p className="text-[10px] text-[#263238]/50 italic">
              Note: Firebase Authentication custom claims and Firebase Admin SDK server authorization verify tokens in production.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
