"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MaintenanceView } from "@/components/MaintenanceView";
import { FieldWorkerView } from "@/components/FieldWorkerView";
import { useUrjaSetuData } from "@/services/dataService";
import { Complaint, ComplaintStatus, MaintenanceTeam, StaffMember } from "@/types/urjasetu";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

interface StaffDashboardPayload {
  role: string;
  user: {
    uid: string;
    email: string;
    fullName: string;
    staffId: string;
    teamId?: string;
    teamName?: string;
  };
  complaints: Complaint[];
  teams: MaintenanceTeam[];
  staffMembers: StaffMember[];
}

export default function StaffLoginPage() {
  const {
    complaints: demoComplaints,
    teams: demoTeams,
    staffMembers: demoStaffMembers,
    dataService,
  } = useUrjaSetuData();

  const [activeStaffView, setActiveStaffView] = useState<"login" | "maintenance" | "worker">("login");
  const [verifiedStaff, setVerifiedStaff] = useState<{
    uid: string;
    email: string;
    fullName?: string;
    staffId?: string;
    role?: string;
    teamId?: string;
    teamName?: string;
  } | null>(null);

  // Live Firestore Data state
  const [dashboardData, setDashboardData] = useState<StaffDashboardPayload | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Form states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch live scoped staff records from Cloud Firestore
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
      const res = await fetch("/api/staff/dashboard", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load staff workspace data from Firestore.");
      }

      setDashboardData(data);
      // Auto-route based on authoritative role if on login screen
      if (data.role === "field_worker") {
        setActiveStaffView("worker");
      } else {
        setActiveStaffView("maintenance");
      }
      setIsLoadingDashboard(false);
    } catch (err: unknown) {
      console.error("[UrjaSetu Staff Dashboard Fetch Error]:", err);
      const msg = err instanceof Error ? err.message : "Failed to load workspace data.";
      setDashboardError(msg);
      setIsLoadingDashboard(false);
    }
  }, []);

  // Listen to Firebase Auth state on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          const res = await fetch("/api/auth/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setVerifiedStaff(data.user);
            fetchDashboardData();
          } else {
            await signOut(auth);
            setVerifiedStaff(null);
            setActiveStaffView("login");
          }
        } catch {
          setVerifiedStaff(null);
          setActiveStaffView("login");
        }
      }
    });

    return () => unsubscribe();
  }, [fetchDashboardData]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch {
      // Ignore silent errors
    }
    setVerifiedStaff(null);
    setDashboardData(null);
    setActiveStaffView("login");
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const emailTrimmed = username.trim();
    if (!emailTrimmed) {
      setErrorMessage("Please enter your registered staff email address.");
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

      // 2. Force token refresh to pick up latest custom claims
      const idTokenResult = await user.getIdTokenResult(true);
      const role = idTokenResult.claims.role;

      if (
        role !== "maintenance_team" &&
        role !== "field_worker" &&
        role !== "admin" &&
        role !== "super_admin"
      ) {
        await signOut(auth);
        setIsSubmitting(false);
        setErrorMessage("Access Denied: Account is not authorized for staff operations.");
        return;
      }

      // 3. Cryptographically verify with server and confirm Active account status
      const idToken = await user.getIdToken();
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        await signOut(auth);
        setIsSubmitting(false);
        setErrorMessage(data.error || "Server authentication failed. Staff session rejected.");
        return;
      }

      // 4. Success: store verified profile and query live scoped Firestore collections
      setVerifiedStaff(data.user);
      setIsSubmitting(false);
      fetchDashboardData();
    } catch (err: unknown) {
      console.error("[UrjaSetu Staff Login Error]:", err);
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
          friendlyError = "This staff account has been deactivated. Please contact your squad administrator.";
          break;
        case "auth/too-many-requests":
          friendlyError = "Access temporarily locked due to multiple failed login attempts. Please try again later.";
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

  const handleAssignWorker = async (complaintId: string, workerName: string) => {
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
            status: "Assigned",
            assignedWorker: workerName,
            timelineNote: `Assigned field technician ${workerName} for on-site inspection.`,
          }),
        });
        fetchDashboardData();
      } catch (err) {
        console.error("Failed to assign worker in Firestore:", err);
      }
    }

    dataService.updateComplaint(
      complaintId,
      {
        assignedWorker: workerName,
        status: "Assigned",
      },
      {
        time: "Just now",
        stage: "Worker Dispatched",
        note: `Assigned field lineman ${workerName} for on-site inspection.`,
        actor: "Maintenance Team Desk",
      }
    );
  };

  const handleSendInstruction = async (complaintId: string, instruction: string) => {
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
            timelineNote: instruction,
            isInternal: true, // Priority 4: hidden from citizen tracking!
          }),
        });
        fetchDashboardData();
      } catch (err) {
        console.error("Failed to send instruction in Firestore:", err);
      }
    }

    dataService.updateComplaint(
      complaintId,
      {},
      {
        time: "Just now",
        stage: "Work Instruction",
        note: instruction,
        actor: "Maintenance Squad Lead",
        isInternal: true,
      }
    );
  };

  const handleWorkerProgress = async (
    complaintId: string,
    newStatus: ComplaintStatus,
    completionNote: string,
    photoProofUrl?: string
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
            status: newStatus,
            resolutionNotes:
              newStatus === "Work Completed" || newStatus === "Resolved"
                ? completionNote
                : undefined,
            photoAfter: photoProofUrl,
            timelineNote: completionNote || `Status updated to ${newStatus}.`,
          }),
        });
        fetchDashboardData();
      } catch (err) {
        console.error("Failed to update status in Firestore:", err);
      }
    }

    const existing = (dashboardData ? dashboardData.complaints : demoComplaints).find(
      (c) => c.id === complaintId
    );
    dataService.updateComplaint(
      complaintId,
      {
        status: newStatus,
        resolutionNotes:
          newStatus === "Work Completed" || newStatus === "Resolved"
            ? completionNote
            : existing?.resolutionNotes,
        photoAfter: photoProofUrl || existing?.photoAfter,
      },
      {
        time: "Just now",
        stage: newStatus,
        note: completionNote,
        actor: existing?.assignedWorker || verifiedStaff?.fullName || "Field Lineman",
      }
    );
  };

  const activeComplaints = dashboardData ? dashboardData.complaints : demoComplaints;
  const activeTeams = dashboardData ? dashboardData.teams : demoTeams;
  const activeStaffMembers = dashboardData ? dashboardData.staffMembers : demoStaffMembers;

  if (isLoadingDashboard) {
    return (
      <div className="min-h-screen bg-[#F7F7F2] flex items-center justify-center p-6">
        <div className="bg-white border border-[#EAF3F5] rounded-xl p-8 max-w-md w-full text-center space-y-4 shadow-xs">
          <div className="animate-spin h-9 w-9 text-[#087E8B] border-4 border-[#087E8B] border-t-transparent rounded-full mx-auto" />
          <div className="space-y-1">
            <h3 className="font-bold text-[#173F5F] text-sm">Loading Staff Workspace</h3>
            <p className="text-xs text-[#263238]/60">Retrieving assigned tickets from Cloud Firestore...</p>
          </div>
          <div className="text-[11px] text-[#263238]/60 font-mono bg-[#EAF3F5]/60 py-1 px-3 rounded">
            Authenticated: {verifiedStaff?.email || "Staff Member"}
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
            <h3 className="font-bold text-red-700 text-sm">Staff Workspace Error</h3>
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

  if (activeStaffView === "maintenance") {
    return (
      <div className="min-h-screen bg-[#F7F7F2] text-[#263238] flex flex-col">
        <header className="bg-[#173F5F] text-[#F7F7F2] border-b border-[#087E8B]/20 py-3.5 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="font-extrabold text-xl tracking-tight text-white">
                Urja<span className="text-[#087E8B]">Setu</span>
              </span>
              <span className="text-xs text-[#EAF3F5]/80 font-mono hidden sm:inline">
                &bull; Maintenance Team Command Desk
              </span>
              {verifiedStaff && (
                <span className="text-[11px] bg-[#263238] text-[#EAF3F5] px-2 py-0.5 rounded border border-[#087E8B]/30 hidden md:inline">
                  {verifiedStaff.fullName} ({verifiedStaff.teamName || "Squad Desk"})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {dashboardData && (
                <button
                  type="button"
                  onClick={fetchDashboardData}
                  className="px-2.5 py-1.5 text-xs font-medium bg-[#087E8B] hover:bg-[#06636E] text-white rounded-lg transition-all"
                  title="Refresh live Firestore data"
                >
                  ↻ Refresh
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveStaffView("worker")}
                className="px-3 py-1.5 text-xs font-semibold bg-[#087E8B] text-white hover:bg-[#06636E] rounded-lg transition-all shadow-2xs"
              >
                Switch to Field Lineman View
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="px-3.5 py-1.5 text-xs font-semibold bg-white text-[#173F5F] hover:bg-[#EAF3F5] rounded-lg transition-all shadow-2xs"
              >
                Sign Out / Lock
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 w-full">
          <MaintenanceView
            teams={activeTeams}
            complaints={activeComplaints}
            staffMembers={activeStaffMembers}
            onAssignWorker={handleAssignWorker}
            onSendInstruction={handleSendInstruction}
            onExit={handleLogout}
          />
        </main>
      </div>
    );
  }

  if (activeStaffView === "worker") {
    return (
      <div className="min-h-screen bg-[#F7F7F2] text-[#263238] flex flex-col">
        <header className="bg-[#173F5F] text-[#F7F7F2] border-b border-[#087E8B]/20 py-3.5 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="font-extrabold text-xl tracking-tight text-white">
                Urja<span className="text-[#087E8B]">Setu</span>
              </span>
              <span className="text-xs text-[#EAF3F5]/80 font-mono hidden sm:inline">
                &bull; Field Lineman Mobile Workspace
              </span>
              {verifiedStaff && (
                <span className="text-[11px] bg-[#263238] text-[#EAF3F5] px-2 py-0.5 rounded border border-[#087E8B]/30 hidden md:inline">
                  {verifiedStaff.fullName} ({verifiedStaff.staffId})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {dashboardData && (
                <button
                  type="button"
                  onClick={fetchDashboardData}
                  className="px-2.5 py-1.5 text-xs font-medium bg-[#087E8B] hover:bg-[#06636E] text-white rounded-lg transition-all"
                  title="Refresh live Firestore data"
                >
                  ↻ Refresh
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveStaffView("maintenance")}
                className="px-3 py-1.5 text-xs font-semibold bg-[#087E8B] text-white hover:bg-[#06636E] rounded-lg transition-all shadow-2xs"
              >
                Switch to Maintenance Desk
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="px-3.5 py-1.5 text-xs font-semibold bg-white text-[#173F5F] hover:bg-[#EAF3F5] rounded-lg transition-all shadow-2xs"
              >
                Sign Out / Lock
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 w-full">
          <FieldWorkerView
            complaints={activeComplaints}
            staffMembers={activeStaffMembers}
            onUpdateStatus={handleWorkerProgress}
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
          <div className="w-12 h-12 rounded-xl bg-[#087E8B] text-white mx-auto flex items-center justify-center shadow-xs">
            <svg
              className="w-6 h-6 text-[#F4A261]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </div>
          <h1 className="text-xl font-extrabold text-white">Staff &amp; Squad Workspace</h1>
          <p className="text-xs text-[#EAF3F5]/80">
            Maintenance Squad Leads &bull; Field Linemen &bull; Technical Crew
          </p>
        </div>

        {/* Login Form Body */}
        <form onSubmit={handleLoginSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-[#263238] mb-1">
              Official Staff Email Address
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. technician@urjasetu.gov.in"
              className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2.5 px-3 text-xs text-[#263238] focus:bg-white focus:border-[#087E8B]"
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
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter account password"
                className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2.5 px-3 pr-16 text-xs text-[#263238] focus:bg-white focus:border-[#087E8B]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[#087E8B] hover:underline"
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
            className="w-full py-2.5 bg-[#087E8B] hover:bg-[#06636E] text-white font-bold rounded-lg transition-all hover-lift shadow-xs flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span>Verifying Staff Credentials...</span>
            ) : (
              <span>Enter Staff Workspace &rarr;</span>
            )}
          </button>

          {/* Offline / Developer Inspection Mode */}
          <div className="pt-4 border-t border-[#EAF3F5] text-center space-y-2">
            <span className="text-[11px] text-[#263238]/60 block">
              Development Preview (Offline Inspection Mode):
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveStaffView("maintenance")}
                className="py-2 bg-[#173F5F] hover:bg-[#132a4a] text-white font-semibold rounded-lg text-xs transition-all hover-lift"
              >
                Squad Desk (Preview)
              </button>
              <button
                type="button"
                onClick={() => setActiveStaffView("worker")}
                className="py-2 bg-[#087E8B] hover:bg-[#06636E] text-white font-semibold rounded-lg text-xs transition-all hover-lift"
              >
                Lineman App (Preview)
              </button>
            </div>
            <p className="text-[10px] text-[#263238]/50 italic">
              Firebase Authentication and Cloud Firestore rule policies govern permanent sessions.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
