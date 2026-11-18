import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifySuperAdminRequest } from "@/lib/serverAuth";

export async function POST(req: Request) {
  const authResult = await verifySuperAdminRequest(req);
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.statusCode }
    );
  }

  const superAdmin = authResult.user;

  try {
    const body = await req.json();
    const { type, data } = body;

    const now = new Date();

    if (type === "websiteContent") {
      await adminDb.collection("websiteContent").doc("homepage").set(
        {
          ...data,
          updatedAt: now.toISOString(),
          updatedBy: superAdmin.email,
        },
        { merge: true }
      );
    } else if (type === "settings") {
      await adminDb.collection("settings").doc("operational").set(
        {
          ...data,
          updatedAt: now.toISOString(),
          updatedBy: superAdmin.email,
        },
        { merge: true }
      );
    } else if (type === "category") {
      const catId = data.id || `cat-${Date.now()}`;
      await adminDb.collection("categories").doc(catId).set({
        ...data,
        id: catId,
        updatedAt: now.toISOString(),
      });
    }

    try {
      await adminDb.collection("auditLogs").add({
        actorId: superAdmin.uid,
        actorName: superAdmin.fullName,
        actorRole: "super_admin",
        action: `UPDATE_${String(type).toUpperCase()}`,
        targetType: "configuration",
        targetId: type,
        details: `${superAdmin.fullName} updated platform ${type} configuration.`,
        timestamp: now.toISOString(),
      });
    } catch {
      // Non-critical audit failure
    }

    return NextResponse.json(
      { success: true, message: `Platform ${type} updated successfully in Firestore.` },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[UrjaSetu Content Update Error]:", error);
    const msg = error instanceof Error ? error.message : "Failed to update content.";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
