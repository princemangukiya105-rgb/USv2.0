import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { verifyAdminRequest } from "@/lib/serverAuth";

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
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "A valid account email address is required." },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Generate secure Firebase password reset link
    const resetLink = await adminAuth.generatePasswordResetLink(trimmedEmail);

    // Audit Log
    try {
      await adminDb.collection("auditLogs").add({
        actorId: caller.uid,
        actorName: caller.fullName,
        actorRole: caller.role,
        action: "GENERATE_PASSWORD_RESET_LINK",
        targetType: "user",
        targetId: trimmedEmail,
        details: `${caller.fullName} generated a secure password reset link for ${trimmedEmail}.`,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Non-critical audit failure
    }

    return NextResponse.json(
      {
        success: true,
        message: `Password reset link generated for ${trimmedEmail}.`,
        resetLink,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[UrjaSetu Password Reset Error]:", error);
    const msg = error instanceof Error ? error.message : "Failed to generate password reset link.";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
