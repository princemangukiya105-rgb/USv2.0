import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAdminRequest } from "@/lib/serverAuth";
import { Complaint, MaintenanceTeam, StaffMember } from "@/types/urjasetu";

export async function GET(req: Request) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.statusCode }
    );
  }

  try {
    // 1. Fetch complaints, teams, and staff collections from Firestore
    const [complaintsSnap, teamsSnap, usersSnap] = await Promise.all([
      adminDb.collection("complaints").get(),
      adminDb.collection("teams").get(),
      adminDb.collection("users").get(),
    ]);

    const complaints: Complaint[] = [];
    complaintsSnap.forEach((doc) => {
      const data = doc.data();
      complaints.push({
        id: data.id || doc.id,
        category: data.category || "General Electrical",
        description: data.description || "",
        ward: data.ward || "Ward 1 - Colaba",
        location: data.location || "",
        landmark: data.landmark || "Nearby landmark noted",
        reportedBy: data.reportedBy || "Citizen",
        phone: data.phone || "",
        priority: data.priority || "Medium",
        status: data.status || "Submitted",
        reportedAt: data.reportedAt || "Recently",
        assignedTeamId: data.assignedTeamId,
        assignedTeam: data.assignedTeam,
        assignedWorkerId: data.assignedWorkerId,
        assignedWorker: data.assignedWorker,
        isDelayed: Boolean(data.isDelayed),
        timeline: Array.isArray(data.timeline) ? data.timeline : [],
        citizenPhotos: Array.isArray(data.citizenPhotos) ? data.citizenPhotos : [],
        photoBefore: data.photoBefore,
        photoAfter: data.photoAfter,
        resolutionNotes: data.resolutionNotes,
        rejectionReason: data.rejectionReason,
        coordinates: data.coordinates,
      });
    });

    const teams: MaintenanceTeam[] = [];
    teamsSnap.forEach((doc) => {
      const data = doc.data();
      teams.push({
        id: data.id || doc.id,
        name: data.name || "Squad",
        area: data.area || "Zone",
        phone: data.phone || "022-2266-7000",
        leadTechnician: data.leadTechnician,
        activeTasks: data.activeTasks || 0,
        status: data.status || "Active",
        description: data.description || "",
      });
    });

    const staffMembers: StaffMember[] = [];
    usersSnap.forEach((doc) => {
      const data = doc.data();
      // Exclude super admins and regular citizens from operational staff roster
      if (data.role === "field_worker" || data.role === "maintenance_team" || data.role === "admin") {
        staffMembers.push({
          id: doc.id,
          staffId: data.staffId || `STF-${doc.id.substring(0, 4)}`,
          fullName: data.fullName || "Staff Member",
          email: data.email || "",
          phone: data.phone || "",
          designation: data.designation || (data.role === "field_worker" ? "Senior Lineman" : "Squad Coordinator"),
          teamId: data.teamId || teams[0]?.id || "team-default",
          teamName: data.teamName || teams[0]?.name || "Unassigned",
          area: data.area || "Municipal Area",
          status: data.status === "Active" ? "Active" : "Disabled",
          createdAt: data.createdAt || new Date().toISOString().split("T")[0],
          activeWorkCount: data.activeWorkCount || 0,
        });
      }
    });

    // 2. Compute live operational metrics
    const totalComplaints = complaints.length;
    const pendingComplaints = complaints.filter(
      (c) => c.status !== "Resolved" && c.status !== "Rejected"
    ).length;
    const resolvedComplaints = complaints.filter((c) => c.status === "Resolved").length;
    const underReviewComplaints = complaints.filter((c) => c.status === "Under Review" || c.status === "Submitted").length;
    const assignedComplaints = complaints.filter((c) => c.status === "Assigned").length;
    const inProgressComplaints = complaints.filter((c) => c.status === "Work Started" || c.status === "On the Way").length;
    const workCompletedComplaints = complaints.filter((c) => c.status === "Work Completed").length;

    return NextResponse.json(
      {
        success: true,
        complaints,
        teams,
        staffMembers,
        metrics: {
          totalComplaints,
          pendingComplaints,
          resolvedComplaints,
          underReviewComplaints,
          assignedComplaints,
          inProgressComplaints,
          workCompletedComplaints,
          totalTeams: teams.length,
          totalStaff: staffMembers.length,
        },
        collectionStatus: {
          complaintsCount: complaints.length,
          teamsCount: teams.length,
          staffCount: staffMembers.length,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[UrjaSetu Admin Dashboard Error]:", error);
    const msg = error instanceof Error ? error.message : "Failed to load admin dashboard data.";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
