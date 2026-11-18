"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminView } from "@/components/AdminView";
import { useUrjaSetuData } from "@/services/dataService";
import { Complaint, MaintenanceTeam, StaffMember } from "@/types/urjasetu";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

interface AdminDashboardPayload {
  complaints: Complaint[];
  teams: MaintenanceTeam[];
  staffMembers: StaffMember[];
  metrics: {
    totalComplaints: number;
    pendingComplaints: number;
    resolvedComplaints: number;
    underReviewComplaints: number;
    assignedComplaints: number;
    inProgressComplaints: number;
    workCompletedComplaints: number;
    totalTeams: number;
    totalStaff: number;
  };
}

export default function AdminLoginPage() {
  const {
    complaints: demoComplaints,
    teams: demoTeams,
    staffMembers: demoStaffMembers,
    dataService,
  } = useUrjaSetuData();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [verifiedAdmin, setVerifiedAdmin] = useState<{
    uid: string;
    email: string;
    fullName?: string;
    staffId?: string;
    role?: string;
  } | null>(null);

  // Live Firestore Dashboard State
  const [dashboardData, setDashboardData] = useState<AdminDashboardPayload | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Form states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch live dashboard metrics from Firestore using Admin endpoint
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
      const res = await fetch("/api/admin/dashboard", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load admin dashboard from Firestore.");
      }

      setDashboardData(data);
      setIsLoadingDashboard(false);
    } catch (err: unknown) {
      console.error("[UrjaSetu Admin Dashboard Fetch Error]:", err);
      const msg = err instanceof Error ? err.message : "Failed to load dashboard from Firestore.";
      setDashboardError(msg);
      setIsLoadingDashboard(false);
    }
  }, []);

  // Listen to Firebase Auth state on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const idTokenResult = await firebaseUser.getIdTokenResult();
          const role = idTokenResult.claims.role;
          if (role === "admin" || role === "super_admin") {
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
              setVerifiedAdmin(data.user);
              setIsLoggedIn(true);
              fetchDashboardData();
            } else {
              await signOut(auth);
              setVerifiedAdmin(null);
              setIsLoggedIn(false);
            }
          }
        } catch {
          setVerifiedAdmin(null);
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
      // Ignore silent errors
    }
    setVerifiedAdmin(null);
    setDashboardData(null);
    setIsLoggedIn(false);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const emailTrimmed = username.trim();
    if (!emailTrimmed) {
      setErrorMessage("Please enter your registered administrator username or official email.");
      return;
    }

    if (!password.trim()) {
      setErrorMessage("Please enter your administrator account password.");
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

      if (role !== "admin" && role !== "super_admin") {
        await signOut(auth);
        setIsSubmitting(false);
        setErrorMessage("Access Denied: This account does not possess Administrator privileges.");
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
        setErrorMessage(data.error || "Server authentication failed. Administrator session rejected.");
        return;
      }

      // 4. Success: store profile, enter dashboard and query live Firestore collections
      setVerifiedAdmin(data.user);
      setIsLoggedIn(true);
      setIsSubmitting(false);
      fetchDashboardData();
    } catch (err: unknown) {
      console.error("[UrjaSetu Admin Login Error]:", err);
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
          friendlyError = "This Administrator account has been disabled. Please contact municipal IT.";
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

  const handleAdminUpdate = async (
    complaintId: string,
    updates: Partial<Complaint>,
    timelineNote: string,
    actor: string
  ) => {
    // 1. If live Firebase session active, persist to Firestore
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
        // Refresh live dashboard
        fetchDashboardData();
      } catch (err) {
        console.error("Failed to update complaint in Firestore:", err);
      }
    }

    // 2. Also update local data service for immediate reactivity
    dataService.updateComplaint(complaintId, updates, {
      time: "Just now",
      stage: updates.status || "Updated",
      note: timelineNote,
      actor: actor || verifiedAdmin?.fullName || "Administrator",
    });
  };

  const handleCreateTeam = (newTeam: MaintenanceTeam) => {
    dataService.createTeam(newTeam);
  };

  const handleUpdateTeam = (teamId: string, updates: Partial<MaintenanceTeam>) => {
    dataService.updateTeam(teamId, updates);
  };

  const handleCreateStaff = (newStaff: StaffMember) => {
    dataService.createStaff(newStaff);
  };

  const handleUpdateStaff = (staffId: string, updates: Partial<StaffMember>) => {
    dataService.updateStaff(staffId, updates);
  };

  if (isLoggedIn) {
    if (isLoadingDashboard) {
      return (
        <div className="min-h-screen bg-[#F7F7F2] flex items-center justify-center p-6">
          <div className="bg-white border border-[#EAF3F5] rounded-xl p-8 max-w-md w-full text-center space-y-4 shadow-xs">
            <div className="animate-spin h-9 w-9 text-[#087E8B] border-4 border-[#087E8B] border-t-transparent rounded-full mx-auto" />
            <div className="space-y-1">
              <h3 className="font-bold text-[#173F5F] text-sm">Loading Live Admin Dashboard</h3>
              <p className="text-xs text-[#263238]/60">Querying Firestore operational collections...</p>
            </div>
            <div className="text-[11px] text-[#263238]/60 font-mono bg-[#EAF3F5]/60 py-1 px-3 rounded">
              Authenticated: {verifiedAdmin?.email || "Administrator"}
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

    return (
      <div className="min-h-screen bg-[#F7F7F2] text-[#263238] flex flex-col">
        {/* Top Navbar */}
        <header className="bg-[#173F5F] text-[#F7F7F2] border-b border-[#087E8B]/20 py-3.5 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="font-extrabold text-xl tracking-tight text-white">
                Urja<span className="text-[#087E8B]">Setu</span>
              </span>
              <span className="text-xs text-[#EAF3F5]/80 font-mono hidden sm:inline">
                &bull; Municipal Administration Headquarters
              </span>
              {verifiedAdmin && (
                <span className="text-[11px] bg-[#263238] text-[#EAF3F5] px-2 py-0.5 rounded border border-[#087E8B]/30 hidden md:inline">
                  {verifiedAdmin.email} ({verifiedAdmin.staffId || "ADM-001"})
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
                onClick={handleLogout}
                className="px-3.5 py-1.5 text-xs font-semibold bg-white text-[#173F5F] hover:bg-[#EAF3F5] rounded-lg transition-all shadow-2xs"
              >
                Sign Out / Lock Console
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 w-full">
          <AdminView
            complaints={activeComplaints}
            teams={activeTeams}
            staffMembers={activeStaffMembers}
            onUpdateComplaint={handleAdminUpdate}
            onCreateTeam={handleCreateTeam}
            onUpdateTeam={handleUpdateTeam}
            onCreateStaff={handleCreateStaff}
            onUpdateStaff={handleUpdateStaff}
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
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <h1 className="text-xl font-extrabold text-white">Administrator Portal</h1>
          <p className="text-xs text-[#EAF3F5]/80">
            Municipal Operations Desk &bull; Official Staff Access
          </p>
        </div>

        {/* Login Form Body */}
        <form onSubmit={handleLoginSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-[#263238] mb-1">
              Admin Username / Official Gov Email
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin@urjasetu.gov.in"
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
              <span>Verifying Credentials...</span>
            ) : (
              <span>Authenticate Administrator &rarr;</span>
            )}
          </button>

          {/* Offline / Developer Inspection Mode */}
          <div className="pt-4 border-t border-[#EAF3F5] text-center space-y-2">
            <span className="text-[11px] text-[#263238]/60 block">
              Development Preview (Offline Inspection Mode):
            </span>
            <button
              type="button"
              onClick={() => setIsLoggedIn(true)}
              className="w-full py-2 bg-[#173F5F] hover:bg-[#132a4a] text-white font-semibold rounded-lg text-xs transition-all hover-lift"
            >
              Open Admin Dashboard &amp; Team Management (Preview) &rarr;
            </button>
            <p className="text-[10px] text-[#263238]/50 italic">
              Firebase Authentication and Cloud Firestore rule policies govern permanent sessions.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
