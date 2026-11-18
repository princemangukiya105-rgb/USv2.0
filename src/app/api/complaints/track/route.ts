import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { Complaint } from "@/types/urjasetu";

export async function GET(req: NextRequest) {
  try {
    const rawId = req.nextUrl.searchParams.get("id");

    if (!rawId || typeof rawId !== "string") {
      return NextResponse.json(
        { success: false, error: "Complaint Reference ID is required (e.g. URJ-2026-000001)." },
        { status: 400 }
      );
    }

    const complaintId = rawId.trim().toUpperCase();

    // 1. Direct document lookup by ID
    const docRef = adminDb.collection("complaints").doc(complaintId);
    let docSnap = await docRef.get();

    // Fallback query by 'id' field if document key differed
    if (!docSnap.exists) {
      const querySnap = await adminDb
        .collection("complaints")
        .where("id", "==", complaintId)
        .limit(1)
        .get();
      if (!querySnap.empty) {
        docSnap = querySnap.docs[0];
      }
    }

    if (!docSnap.exists) {
      return NextResponse.json(
        {
          success: false,
          error: `No complaint found matching reference ID "${complaintId}". Please verify your ticket number.`,
        },
        { status: 404 }
      );
    }

    const data = docSnap.data() as Partial<Complaint>;

    // 2. PRIVACY & SECURITY DIRECTIVE:
    // Filter out internal timeline notes, internal staff directives, and private staff credentials.
    const publicTimeline = Array.isArray(data.timeline)
      ? data.timeline
          .filter((t) => !t.isInternal)
          .map((t) => ({
            time: t.time,
            stage: t.stage,
            note: t.note,
            actor:
              t.actor === "Citizen Web Portal" || t.actor === "Citizen Portal"
                ? "Citizen"
                : "Municipal Operations",
            isInternal: false,
          }))
      : [];

    const sanitizedComplaint: Partial<Complaint> = {
      id: data.id || docSnap.id,
      category: data.category,
      description: data.description,
      ward: data.ward,
      location: data.location,
      landmark: data.landmark || "Nearby landmark noted",
      status: data.status || "Submitted",
      priority: data.priority,
      reportedAt: data.reportedAt || "Recently",
      isDelayed: Boolean(data.isDelayed),
      timeline: publicTimeline,
      citizenPhotos: data.citizenPhotos || [],
      photoBefore: data.photoBefore,
      photoAfter: data.photoAfter,
      resolutionNotes: data.resolutionNotes,
      rejectionReason: data.rejectionReason,
      coordinates: data.coordinates,
      reportedBy: data.reportedBy ? `${data.reportedBy.charAt(0)}***` : "Citizen",
    };

    return NextResponse.json(
      {
        success: true,
        complaint: sanitizedComplaint,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if ((error as { digest?: string })?.digest?.startsWith("NEXT_")) {
      throw error;
    }
    console.error("[UrjaSetu Citizen Track Error]:", error);
    const msg = error instanceof Error ? error.message : "Failed to track complaint.";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
