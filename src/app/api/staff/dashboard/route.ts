import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyStaffRequest } from "@/lib/serverAuth";
import { Complaint, MaintenanceTeam, StaffMember } from "@/types/urjasetu";

export async function GET(req: Request) {
  const authResult = await verifyStaffRequest(req);
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.statusCode }
    );
  }

  const user = authResult.user;

  try {
    // 1. Fetch complaints, teams, and users from Firestore
    const [complaintsSnap, teamsSnap, usersSnap] = await Promise.all([
      adminDb.collection("complaints").get(),
      adminDb.collection("teams").get(),
      adminDb.collection("users").get(),
    ]);

    const allComplaints: Complaint[] = [];
    complaintsSnap.forEach((doc) => {
      const data = doc.data();
      allComplaints.push({
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

    const allTeams: MaintenanceTeam[] = [];
    teamsSnap.forEach((doc) => {
      const data = doc.data();
      allTeams.push({
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

    const allStaff: StaffMember[] = [];
    usersSnap.forEach((doc) => {
      const data = doc.data();
      if (data.role === "field_worker" || data.role === "maintenance_team") {
        allStaff.push({
          id: doc.id,
          staffId: data.staffId || `STF-${doc.id.substring(0, 4)}`,
          fullName: data.fullName || "Staff Member",
          email: data.email || "",
          phone: data.phone || "",
          designation: data.designation || (data.role === "field_worker" ? "Senior Lineman" : "Squad Leader"),
          teamId: data.teamId || allTeams[0]?.id || "team-default",
          teamName: data.teamName || allTeams[0]?.name || "Unassigned",
          area: data.area || "Zone",
          status: data.status === "Active" ? "Active" : "Disabled",
          createdAt: data.createdAt || new Date().toISOString().split("T")[0],
          activeWorkCount: data.activeWorkCount || 0,
        });
      }
    });

    // 2. Strict Scoping per Role
    if (user.role === "maintenance_team") {
      // Scoped strictly to the caller's squad
      const myTeam = allTeams.find((t) => t.id === user.teamId || t.name === user.teamName) || allTeams[0];
      const scopedComplaints = allComplaints.filter(
        (c) => c.assignedTeamId === myTeam?.id || c.assignedTeam === myTeam?.name
      );
      const scopedStaff = allStaff.filter((s) => s.teamId === myTeam?.id);

      return NextResponse.json(
        {
          success: true,
          role: "maintenance_team",
          user,
          teams: myTeam ? [myTeam] : allTeams,
          complaints: scopedComplaints,
          staffMembers: scopedStaff,
        },
        { status: 200 }
      );
    }

    if (user.role === "field_worker") {
      // Scoped strictly to complaints assigned to this worker
      const scopedComplaints = allComplaints.filter((c) => {
        const idMatch = c.assignedWorkerId === user.uid || c.assignedWorkerId === user.staffId;
        const nameMatch = c.assignedWorker && c.assignedWorker.includes(user.fullName);
        return idMatch || nameMatch;
      });

      const currentStaffRecord = allStaff.find(
        (s) => s.id === user.uid || s.staffId === user.staffId || s.fullName === user.fullName
      ) || {
        id: user.uid,
        staffId: user.staffId,
        fullName: user.fullName,
        email: user.email,
        phone: "",
        designation: "Senior Lineman",
        teamId: user.teamId || "team-default",
        teamName: user.teamName || "Maintenance Squad",
        area: "Zone",
        status: "Active",
        createdAt: new Date().toISOString().split("T")[0],
        activeWorkCount: scopedComplaints.length,
      };

      return NextResponse.json(
        {
          success: true,
          role: "field_worker",
          user,
          complaints: scopedComplaints,
          staffMembers: [currentStaffRecord],
          teams: allTeams,
        },
        { status: 200 }
      );
    }

    // Admins / Super Admins accessing staff portal
    return NextResponse.json(
      {
        success: true,
        role: user.role,
        user,
        complaints: allComplaints,
        teams: allTeams,
        staffMembers: allStaff,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[UrjaSetu Staff Dashboard Error]:", error);
    const msg = error instanceof Error ? error.message : "Failed to load staff workspace data.";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
