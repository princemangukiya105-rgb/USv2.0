import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAdminRequest } from "@/lib/serverAuth";
import { MaintenanceTeam } from "@/types/urjasetu";

export async function POST(req: Request) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.statusCode }
    );
  }

  const caller = authResult.user;

  try {
    const body = await req.json();
    const { name, area, contactNumber, leadTechnician, description } = body;

    const trimmedName = typeof name === "string" ? name.trim() : "";
    if (!trimmedName) {
      return NextResponse.json(
        { success: false, error: "Squad / Team name is required." },
        { status: 400 }
      );
    }

    const teamId = `team-${Date.now()}`;
    const now = new Date();

    const newTeam: MaintenanceTeam = {
      id: teamId,
      name: trimmedName,
      area: area || "North Zone",
      phone: contactNumber || "022-2266-7000",
      leadTechnician: leadTechnician || "Unassigned",
      activeTasks: 0,
      status: "Active",
      description: description || "Municipal rapid response squad.",
    };

    await adminDb.collection("teams").doc(teamId).set({
      ...newTeam,
      createdAt: now.toISOString(),
      createdBy: caller.email,
    });

    try {
      await adminDb.collection("auditLogs").add({
        actorId: caller.uid,
        actorName: caller.fullName,
        actorRole: caller.role,
        action: "CREATE_TEAM",
        targetType: "team",
        targetId: teamId,
        details: `${caller.fullName} registered new maintenance squad "${trimmedName}".`,
        timestamp: now.toISOString(),
      });
    } catch {
      // Non-critical audit failure
    }

    return NextResponse.json(
      { success: true, message: "Maintenance squad created successfully.", team: newTeam },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("[UrjaSetu Create Team Error]:", error);
    const msg = error instanceof Error ? error.message : "Failed to create team.";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.statusCode }
    );
  }

  const caller = authResult.user;

  try {
    const body = await req.json();
    const { teamId, updates } = body;

    if (!teamId || typeof teamId !== "string") {
      return NextResponse.json(
        { success: false, error: "Team ID is required." },
        { status: 400 }
      );
    }

    const teamDocRef = adminDb.collection("teams").doc(teamId);
    const teamDoc = await teamDocRef.get();

    if (!teamDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Maintenance squad not found." },
        { status: 404 }
      );
    }

    const now = new Date();
    await teamDocRef.update({
      ...updates,
      updatedAt: now.toISOString(),
    });

    try {
      await adminDb.collection("auditLogs").add({
        actorId: caller.uid,
        actorName: caller.fullName,
        actorRole: caller.role,
        action: "UPDATE_TEAM",
        targetType: "team",
        targetId: teamId,
        details: `${caller.fullName} updated details for team ${teamDoc.data()?.name || teamId}.`,
        timestamp: now.toISOString(),
      });
    } catch {
      // Non-critical audit failure
    }

    return NextResponse.json(
      { success: true, message: "Team updated successfully." },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[UrjaSetu Update Team Error]:", error);
    const msg = error instanceof Error ? error.message : "Failed to update team.";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
