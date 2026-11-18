import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { Complaint, IssueCategory, PriorityLevel } from "@/types/urjasetu";
import { WARDS_LIST } from "@/data/demoData";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      reportedBy,
      phone,
      category,
      description,
      ward,
      location,
      landmark,
      coordinates,
      photos,
    } = body;

    // 1. Rigorous Validation
    const trimmedReporter = typeof reportedBy === "string" ? reportedBy.trim() : "";
    if (!trimmedReporter) {
      return NextResponse.json(
        { success: false, error: "Citizen full name is required." },
        { status: 400 }
      );
    }

    const trimmedPhone = typeof phone === "string" ? phone.trim().replace(/\s+/g, "") : "";
    if (!trimmedPhone || trimmedPhone.length < 10) {
      return NextResponse.json(
        { success: false, error: "A valid contact phone number with at least 10 digits is required." },
        { status: 400 }
      );
    }

    const trimmedLocation = typeof location === "string" ? location.trim() : "";
    if (!trimmedLocation) {
      return NextResponse.json(
        { success: false, error: "Street address or landmark location is required." },
        { status: 400 }
      );
    }

    const trimmedDescription = typeof description === "string" ? description.trim() : "";
    if (!trimmedDescription) {
      return NextResponse.json(
        { success: false, error: "Please provide a description of the electrical hazard." },
        { status: 400 }
      );
    }

    const effectiveWard = WARDS_LIST.includes(ward) ? ward : WARDS_LIST[0];
    const effectiveCategory = (category as IssueCategory) || "Streetlight Not Working";

    // Criticality calculation
    const isCritical =
      effectiveCategory.includes("Sagging") ||
      effectiveCategory.includes("Pole") ||
      effectiveCategory.includes("Blackout") ||
      effectiveCategory.includes("Transformer") ||
      effectiveCategory.includes("Insulation");
    const priority: PriorityLevel = isCritical ? "Critical" : "Medium";

    // 2. Atomic Transaction to generate Complaint ID: URJ-YYYY-000001
    const now = new Date();
    const currentYear = now.getFullYear();
    const counterDocRef = adminDb.collection("counters").doc(`complaints_${currentYear}`);

    let assignedId = "";
    let complaintDocRef;

    await adminDb.runTransaction(async (transaction) => {
      const counterSnap = await transaction.get(counterDocRef);
      let nextNumber = 1;

      if (counterSnap.exists) {
        const data = counterSnap.data();
        nextNumber = (data?.currentNumber || 0) + 1;
      }

      assignedId = `URJ-${currentYear}-${String(nextNumber).padStart(6, "0")}`;
      complaintDocRef = adminDb.collection("complaints").doc(assignedId);

      transaction.set(
        counterDocRef,
        {
          year: currentYear,
          currentNumber: nextNumber,
          lastGeneratedAt: now.toISOString(),
        },
        { merge: true }
      );

      // Sanitize photos (store clean references or optimized data)
      const sanitizedPhotos: Array<{ id: string; name: string; url: string; uploadedAt: string }> = [];
      if (Array.isArray(photos)) {
        photos.slice(0, 3).forEach((p, idx) => {
          if (p && (p.url || p.dataUrl)) {
            sanitizedPhotos.push({
              id: `photo-${assignedId}-${idx + 1}`,
              name: p.name || `Citizen Upload ${idx + 1}`,
              url: p.url || p.dataUrl,
              uploadedAt: now.toISOString(),
            });
          }
        });
      }

      const initialTimeline = [
        {
          time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          stage: "Submitted",
          note: `Complaint recorded by citizen ${trimmedReporter}. Pending municipal verification.`,
          actor: "Citizen Web Portal",
          isInternal: false,
        },
      ];

      const newComplaintRecord: Complaint = {
        id: assignedId,
        category: effectiveCategory,
        description: trimmedDescription,
        ward: effectiveWard,
        location: trimmedLocation,
        landmark: typeof landmark === "string" ? landmark.trim() : "None specified",
        reportedBy: trimmedReporter,
        phone: trimmedPhone,
        priority,
        status: "Submitted",
        reportedAt: "Just now",
        isDelayed: false,
        timeline: initialTimeline,
        citizenPhotos: sanitizedPhotos.map((p) => ({
          name: p.name,
          size: 1024,
          url: p.url,
        })),
        photoBefore: sanitizedPhotos[0]?.url,
        coordinates: coordinates?.latitude && coordinates?.longitude ? {
          latitude: Number(coordinates.latitude),
          longitude: Number(coordinates.longitude),
          accuracy: coordinates.accuracy ? Math.round(coordinates.accuracy) : undefined,
        } : undefined,
      };

      transaction.set(complaintDocRef, {
        ...newComplaintRecord,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    });

    // 3. Write non-blocking audit log
    try {
      await adminDb.collection("auditLogs").add({
        actorId: "citizen-guest",
        actorName: trimmedReporter,
        actorRole: "citizen",
        action: "SUBMIT_COMPLAINT",
        targetType: "complaint",
        targetId: assignedId,
        details: `Citizen submitted complaint ${assignedId} for ${effectiveCategory} at ${trimmedLocation} (${effectiveWard}).`,
        timestamp: now.toISOString(),
      });
    } catch {
      // Non-critical audit failure
    }

    return NextResponse.json(
      {
        success: true,
        complaintId: assignedId,
        message: "Complaint registered successfully.",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("[UrjaSetu Complaint Submission Error]:", error);
    const msg = error instanceof Error ? error.message : "Failed to record complaint.";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
