import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyStaffRequest } from "@/lib/serverAuth";
import { Complaint, ComplaintStatus, PriorityLevel, TimelineEntry } from "@/types/urjasetu";

export async function POST(req: Request) {
  // 1. Authoritative Token Verification
  const authResult = await verifyStaffRequest(req);
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.statusCode }
    );
  }

  const user = authResult.user;

  try {
    const body = await req.json();
    const {
      complaintId,
      status: nextStatus,
      priority: nextPriority,
      assignedTeamId,
      assignedTeam,
      assignedWorkerId,
      assignedWorker,
      timelineNote,
      rejectionReason,
      resolutionNotes,
      photoAfter,
      isInternal = false,
    } = body;

    if (!complaintId || typeof complaintId !== "string") {
      return NextResponse.json(
        { success: false, error: "Complaint ID is required." },
        { status: 400 }
      );
    }

    const complaintDocRef = adminDb.collection("complaints").doc(complaintId);
    const complaintSnap = await complaintDocRef.get();

    if (!complaintSnap.exists) {
      return NextResponse.json(
        { success: false, error: `Complaint "${complaintId}" does not exist in Firestore.` },
        { status: 404 }
      );
    }

    const complaint = complaintSnap.data() as Complaint;
    const currentStatus = complaint.status;

    // 2. Strict Role-Based Transition Enforcement
    if (user.role === "field_worker") {
      // Field Worker must not access complaints assigned to someone else
      const isAssignedToMe =
        complaint.assignedWorkerId === user.uid ||
        complaint.assignedWorkerId === user.staffId ||
        (complaint.assignedWorker && complaint.assignedWorker.includes(user.fullName));

      if (!isAssignedToMe) {
        return NextResponse.json(
          { success: false, error: "Access Denied: You may only update complaints assigned to your badge." },
          { status: 403 }
        );
      }

      // Rule: Field workers cannot resolve complaints directly!
      if (nextStatus === "Resolved") {
        return NextResponse.json(
          { success: false, error: "Policy Restriction: Field workers cannot directly mark complaints as Resolved. Only Admins can sign off resolution." },
          { status: 403 }
        );
      }

      // Allowed transitions for field workers:
      // Assigned -> On the Way
      // On the Way -> Work Started
      // Work Started -> Work Completed
      const validWorkerTransitions: Record<string, string[]> = {
        Assigned: ["On the Way", "Work Started"],
        "On the Way": ["Work Started"],
        "Work Started": ["Work Completed"],
        "Work Completed": ["Work Completed"], // adding notes or extra completion photo
      };

      if (nextStatus && nextStatus !== currentStatus) {
        const allowed = validWorkerTransitions[currentStatus] || [];
        if (!allowed.includes(nextStatus)) {
          return NextResponse.json(
            { success: false, error: `Invalid status transition: "${currentStatus}" cannot be moved to "${nextStatus}" by field worker.` },
            { status: 400 }
          );
        }
      }
    }

    if (user.role === "maintenance_team") {
      // Maintenance Team must not update another squad's complaints
      const isAssignedToTeam =
        complaint.assignedTeamId === user.teamId ||
        complaint.assignedTeam === user.teamName;

      if (!isAssignedToTeam) {
        return NextResponse.json(
          { success: false, error: "Access Denied: You may only coordinate complaints assigned to your squad." },
          { status: 403 }
        );
      }

      if (nextStatus === "Resolved") {
        return NextResponse.json(
          { success: false, error: "Policy Restriction: Maintenance squads cannot directly mark complaints as Resolved. Requires Admin sign-off." },
          { status: 403 }
        );
      }
    }

    // Reject transition requires mandatory rejectionReason
    if (nextStatus === "Rejected") {
      if (user.role !== "admin" && user.role !== "super_admin") {
        return NextResponse.json(
          { success: false, error: "Access Denied: Only Admins can reject a complaint." },
          { status: 403 }
        );
      }
      if (!rejectionReason || typeof rejectionReason !== "string" || !rejectionReason.trim()) {
        return NextResponse.json(
          { success: false, error: "A mandatory rejection reason is required to reject a complaint." },
          { status: 400 }
        );
      }
    }

    // 3. Prepare Updates
    const now = new Date();
    const updatePayload: Partial<Complaint> & { updatedAt: string } = {
      updatedAt: now.toISOString(),
    };

    if (nextStatus) updatePayload.status = nextStatus as ComplaintStatus;
    if (nextPriority) updatePayload.priority = nextPriority as PriorityLevel;
    if (assignedTeamId) updatePayload.assignedTeamId = assignedTeamId;
    if (assignedTeam) updatePayload.assignedTeam = assignedTeam;
    if (assignedWorkerId) updatePayload.assignedWorkerId = assignedWorkerId;
    if (assignedWorker) updatePayload.assignedWorker = assignedWorker;
    if (rejectionReason) updatePayload.rejectionReason = rejectionReason.trim();
    if (resolutionNotes) updatePayload.resolutionNotes = resolutionNotes.trim();
    if (photoAfter) updatePayload.photoAfter = photoAfter;

    // Timeline entry
    const existingTimeline: TimelineEntry[] = Array.isArray(complaint.timeline)
      ? complaint.timeline
      : [];

    const defaultNote =
      nextStatus === "Under Review"
        ? "Complaint moved to municipal triage review."
        : nextStatus === "Assigned"
        ? `Assigned to team ${assignedTeam || complaint.assignedTeam || "Squad"}${assignedWorker ? ` (Worker: ${assignedWorker})` : ""}.`
        : nextStatus === "On the Way"
        ? "Field crew dispatched and on the way to location."
        : nextStatus === "Work Started"
        ? "Field technician has arrived on site. Repairs underway."
        : nextStatus === "Work Completed"
        ? "Physical field repairs completed. Awaiting final administrative inspection."
        : nextStatus === "Resolved"
        ? "Complaint verified, tested and officially resolved."
        : nextStatus === "Rejected"
        ? `Complaint rejected: ${rejectionReason}`
        : timelineNote || "Complaint details updated.";

    const newTimelineItem: TimelineEntry = {
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      stage: nextStatus || "Updated",
      note: timelineNote || defaultNote,
      actor: `${user.fullName} (${user.role})`,
      isInternal: Boolean(isInternal),
    };

    const updatedTimeline = [...existingTimeline, newTimelineItem];
    updatePayload.timeline = updatedTimeline;

    // 4. Save to Firestore
    await complaintDocRef.update(updatePayload);

    // 5. Audit Log for administrative and assignment changes
    try {
      await adminDb.collection("auditLogs").add({
        actorId: user.uid,
        actorName: user.fullName,
        actorRole: user.role,
        action: nextStatus ? `UPDATE_STATUS_${nextStatus.toUpperCase().replace(/\s+/g, "_")}` : "UPDATE_COMPLAINT",
        targetType: "complaint",
        targetId: complaintId,
        details: `${user.fullName} updated ticket ${complaintId}: ${timelineNote || defaultNote}`,
        timestamp: now.toISOString(),
      });
    } catch {
      // Non-critical audit failure
    }

    return NextResponse.json(
      {
        success: true,
        message: "Complaint updated successfully.",
        complaint: {
          ...complaint,
          ...updatePayload,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[UrjaSetu Update Complaint Error]:", error);
    const msg = error instanceof Error ? error.message : "Failed to update complaint.";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
