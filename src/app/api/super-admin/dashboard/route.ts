import { NextResponse } from "next/server";
import { verifySuperAdminRequest } from "@/lib/serverAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import {
  Complaint,
  UserProfile,
  MaintenanceTeam,
  StaffMember,
  AuditLogEntry,
  CategoryItem,
  WebsiteContent,
  OperationalSettings,
} from "@/types/urjasetu";
import {
  DEFAULT_WEBSITE_CONTENT,
  DEFAULT_OPERATIONAL_SETTINGS,
} from "@/data/demoData";

/**
 * Super Admin Protected Dashboard Endpoint (Server-Side via Firebase Admin SDK)
 * 
 * SECURITY:
 * - Requires Authorization: Bearer <idToken>
 * - Cryptographically verifies token signature & 'super_admin' claim
 * - Confirms Active account status in Firestore /users/{uid}
 * - Returns REAL Firestore data for complaints, users, teams, auditLogs
 * - If a collection or document is empty or missing, returns 0 / empty array and reports it
 */
export async function GET(req: Request) {
  // 1. Authenticate Super Admin via Firebase Admin SDK
  const authResult = await verifySuperAdminRequest(req);
  if (!authResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: authResult.error,
      },
      { status: authResult.statusCode }
    );
  }

  try {
    // 2. Query Firestore collections in parallel using Firebase Admin SDK
    const [
      complaintsSnap,
      usersSnap,
      teamsSnap,
      auditLogsSnap,
      categoriesSnap,
      websiteDoc,
      settingsDoc,
    ] = await Promise.all([
      adminDb.collection("complaints").get().catch(() => null),
      adminDb.collection("users").get().catch(() => null),
      adminDb.collection("teams").get().catch(() => null),
      adminDb
        .collection("auditLogs")
        .orderBy("timestamp", "desc")
        .limit(25)
        .get()
        .catch(() =>
          // Fallback if timestamp index is still propagating
          adminDb.collection("auditLogs").limit(25).get().catch(() => null)
        ),
      adminDb.collection("categories").get().catch(() => null),
      adminDb.collection("websiteContent").doc("main").get().catch(() => null),
      adminDb.collection("settings").doc("operational").get().catch(() => null),
    ]);

    // 3. Process Complaints
    const complaints: Complaint[] = [];
    if (complaintsSnap && !complaintsSnap.empty) {
      complaintsSnap.forEach((doc) => {
        const d = doc.data();
        let reportedAtStr = "Recently";
        if (d.reportedAt) {
          reportedAtStr = d.reportedAt;
        } else if (d.createdAt?.toDate) {
          reportedAtStr = d.createdAt.toDate().toISOString();
        } else if (typeof d.createdAt === "string") {
          reportedAtStr = d.createdAt;
        }

        complaints.push({
          id: doc.id || d.id,
          category: d.category || "Electrical Issue",
          ward: d.ward || "Ward 1",
          location: d.location || "",
          landmark: d.landmark || "",
          coordinates: d.coordinates,
          priority: d.priority || "Medium",
          status: d.status || "Submitted",
          reportedAt: reportedAtStr,
          reportedBy: d.reportedBy || "Citizen",
          phone: d.phone || "",
          description: d.description || "",
          assignedTeamId: d.assignedTeamId,
          assignedTeam: d.assignedTeam,
          assignedWorkerId: d.assignedWorkerId,
          assignedWorker: d.assignedWorker,
          isDelayed: Boolean(d.isDelayed),
          photoBefore: d.photoBefore,
          photoAfter: d.photoAfter,
          citizenPhotos: Array.isArray(d.citizenPhotos) ? d.citizenPhotos : [],
          resolutionNotes: d.resolutionNotes,
          rejectionReason: d.rejectionReason,
          timeline: Array.isArray(d.timeline) ? d.timeline : [],
          assignmentHistory: Array.isArray(d.assignmentHistory) ? d.assignmentHistory : [],
        });
      });
    }

    // 4. Process Users by Role (super_admin, admin, maintenance_team, field_worker)
    const admins: UserProfile[] = [];
    const superAdmins: UserProfile[] = [];
    const staffMembers: StaffMember[] = [];

    if (usersSnap && !usersSnap.empty) {
      usersSnap.forEach((doc) => {
        const d = doc.data();
        const role = d.role;
        const createdAtFormatted = d.createdAt?.toDate
          ? d.createdAt.toDate().toISOString().split("T")[0]
          : typeof d.createdAt === "string"
          ? d.createdAt.split("T")[0]
          : "2026-01-01";

        const lastLoginFormatted = d.lastLoginAt?.toDate
          ? d.lastLoginAt.toDate().toLocaleString()
          : d.lastLogin || "Never";

        if (role === "admin") {
          admins.push({
            id: doc.id,
            email: d.email || "",
            fullName: d.fullName || "Admin",
            role: "admin",
            staffId: d.staffId || `ADM-${doc.id.substring(0, 4)}`,
            phone: d.phone || "",
            area: d.area || "Citywide",
            designation: d.designation || "Operations Admin",
            status: d.status || "Active",
            createdAt: createdAtFormatted,
            lastLogin: lastLoginFormatted,
          });
        } else if (role === "super_admin") {
          superAdmins.push({
            id: doc.id,
            email: d.email || "",
            fullName: d.fullName || "Super Administrator",
            role: "super_admin",
            staffId: d.staffId || "SUP-001",
            phone: d.phone || "",
            area: d.area || "Central Municipal Control Room",
            designation: d.designation || "Chief Municipal Energy Director",
            status: d.status || "Active",
            createdAt: createdAtFormatted,
            lastLogin: lastLoginFormatted,
          });
        } else if (role === "field_worker" || role === "maintenance_team") {
          staffMembers.push({
            id: doc.id,
            staffId: d.staffId || `STF-${doc.id.substring(0, 4)}`,
            fullName: d.fullName || "Field Technician",
            email: d.email || "",
            phone: d.phone || "",
            designation: d.designation || (role === "maintenance_team" ? "Squad Leader" : "Lineman"),
            teamId: d.teamId || "",
            teamName: d.teamName || "Unassigned",
            area: d.area || "Zone",
            status: d.status || "Active",
            createdAt: createdAtFormatted,
            activeWorkCount: Number(d.activeWorkCount) || 0,
          });
        }
      });
    }

    // 5. Process Maintenance Teams
    const teams: MaintenanceTeam[] = [];
    if (teamsSnap && !teamsSnap.empty) {
      teamsSnap.forEach((doc) => {
        const d = doc.data();
        teams.push({
          id: doc.id,
          name: d.name || "Electrical Team",
          description: d.description || "",
          area: d.area || "Municipal Area",
          status: d.status || "Active",
          leaderId: d.leaderId,
          leadTechnician: d.leadTechnician,
          phone: d.phone,
        });
      });
    }

    // 6. Process Audit Logs
    const auditLogs: AuditLogEntry[] = [];
    if (auditLogsSnap && !auditLogsSnap.empty) {
      auditLogsSnap.forEach((doc) => {
        const d = doc.data();
        let timestampStr = "Recently";
        if (d.timestamp?.toDate) {
          timestampStr = d.timestamp.toDate().toLocaleString();
        } else if (d.timestampIso) {
          timestampStr = new Date(d.timestampIso).toLocaleString();
        } else if (typeof d.timestamp === "string") {
          timestampStr = d.timestamp;
        }

        auditLogs.push({
          id: doc.id,
          timestamp: timestampStr,
          actorId: d.actorId || "system",
          actorName: d.actorName || "UrjaSetu System",
          actorRole: d.actorRole || "super_admin",
          action: d.action || "PLATFORM_EVENT",
          targetType: d.targetType || "system",
          targetId: d.targetId || "",
          details: d.details || "",
          ipAddress: d.ipAddress,
        });
      });
    }

    // 7. Process Categories
    const categories: CategoryItem[] = [];
    if (categoriesSnap && !categoriesSnap.empty) {
      categoriesSnap.forEach((doc) => {
        const d = doc.data();
        categories.push({
          id: doc.id,
          name: d.name || doc.id,
          description: d.description || "",
          severity: d.severity || "Medium",
          isActive: d.isActive !== false,
        });
      });
    }

    // 8. Process Website Content & Settings
    const websiteContent: WebsiteContent =
      websiteDoc && websiteDoc.exists
        ? ({ ...DEFAULT_WEBSITE_CONTENT, ...websiteDoc.data() } as WebsiteContent)
        : DEFAULT_WEBSITE_CONTENT;

    const settings: OperationalSettings =
      settingsDoc && settingsDoc.exists
        ? ({ ...DEFAULT_OPERATIONAL_SETTINGS, ...settingsDoc.data() } as OperationalSettings)
        : DEFAULT_OPERATIONAL_SETTINGS;

    // 9. Compute Real Dashboard Metric Counts
    const totalComplaints = complaints.length;
    const pendingComplaints = complaints.filter(
      (c) => c.status !== "Resolved" && c.status !== "Rejected"
    ).length;
    const resolvedComplaints = complaints.filter((c) => c.status === "Resolved").length;
    const delayedComplaints = complaints.filter(
      (c) => c.isDelayed && c.status !== "Resolved"
    ).length;
    const unassignedComplaints = complaints.filter(
      (c) => !c.assignedTeam && c.status !== "Resolved" && c.status !== "Rejected"
    ).length;
    const inProgressComplaints = complaints.filter(
      (c) =>
        c.status === "Work Started" ||
        c.status === "On the Way" ||
        c.status === "Work Completed"
    ).length;
    const newWaitingComplaints = complaints.filter((c) => c.status === "Submitted").length;

    const totalAdmins = admins.length;
    const activeAdmins = admins.filter((a) => a.status === "Active").length;
    const totalStaff = staffMembers.length;
    const activeStaff = staffMembers.filter((s) => s.status === "Active").length;
    const totalTeams = teams.length;
    const activeTeams = teams.filter((t) => t.status === "Active" || t.status === "On Duty").length;

    // 10. Document Collection Status (reporting empty/missing collections transparently)
    const collectionStatus = {
      complaints: {
        count: complaints.length,
        exists: complaintsSnap !== null && !complaintsSnap.empty,
      },
      users: {
        count: (usersSnap?.size || 0),
        exists: usersSnap !== null && !usersSnap.empty,
        adminsCount: admins.length,
        superAdminsCount: superAdmins.length,
        staffCount: staffMembers.length,
      },
      teams: {
        count: teams.length,
        exists: teamsSnap !== null && !teamsSnap.empty,
      },
      auditLogs: {
        count: auditLogs.length,
        exists: auditLogsSnap !== null && !auditLogsSnap.empty,
      },
      categories: {
        count: categories.length,
        exists: categoriesSnap !== null && !categoriesSnap.empty,
      },
      websiteContent: {
        exists: websiteDoc !== null && websiteDoc.exists,
      },
      settings: {
        exists: settingsDoc !== null && settingsDoc.exists,
      },
    };

    return NextResponse.json(
      {
        success: true,
        source: "Firestore (Native Production Mode)",
        fetchedAt: new Date().toISOString(),
        counts: {
          totalComplaints,
          pendingComplaints,
          resolvedComplaints,
          delayedComplaints,
          unassignedComplaints,
          inProgressComplaints,
          newWaitingComplaints,
          totalAdmins,
          activeAdmins,
          totalStaff,
          activeStaff,
          totalTeams,
          activeTeams,
          totalSuperAdmins: superAdmins.length,
        },
        recentComplaints: complaints.slice(0, 10),
        recentActivity: auditLogs.slice(0, 10),
        complaints,
        admins,
        superAdmins,
        staffMembers,
        teams,
        auditLogs,
        categories,
        websiteContent,
        settings,
        collectionStatus,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("[UrjaSetu Dashboard Query Error]:", err);
    const message = err instanceof Error ? err.message : "Failed to query Firestore.";
    return NextResponse.json(
      {
        success: false,
        error: `Firestore Query Error: ${message}`,
      },
      { status: 500 }
    );
  }
}
