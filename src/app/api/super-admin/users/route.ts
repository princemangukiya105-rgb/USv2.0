import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { verifySuperAdminRequest } from "@/lib/serverAuth";
import { UserRole } from "@/types/urjasetu";

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
    const {
      email,
      password,
      fullName,
      role,
      designation,
      phone,
      staffId,
      teamId,
      teamName,
      area,
    } = body;

    const emailTrimmed = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!emailTrimmed || !emailTrimmed.includes("@")) {
      return NextResponse.json(
        { success: false, error: "A valid email address is required." },
        { status: 400 }
      );
    }

    const trimmedPassword = typeof password === "string" ? password.trim() : "";
    if (!trimmedPassword || trimmedPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "Initial account password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const trimmedName = typeof fullName === "string" ? fullName.trim() : "";
    if (!trimmedName) {
      return NextResponse.json(
        { success: false, error: "Full legal name is required." },
        { status: 400 }
      );
    }

    const assignedRole = (role as UserRole) || "admin";

    // Only an authorized Super Admin can create another Super Admin
    if (assignedRole === "super_admin" && superAdmin.role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: "Access Denied: Only Super Administrators can provision Super Administrator credentials." },
        { status: 403 }
      );
    }

    // 1. Create User in Firebase Authentication
    let userRecord;
    try {
      userRecord = await adminAuth.createUser({
        email: emailTrimmed,
        password: trimmedPassword,
        displayName: trimmedName,
        disabled: false,
      });
    } catch (authErr: unknown) {
      const err = authErr as { code?: string; message?: string };
      if (err.code === "auth/email-already-exists") {
        return NextResponse.json(
          { success: false, error: "An account with this email address already exists." },
          { status: 409 }
        );
      }
      throw authErr;
    }

    const uid = userRecord.uid;
    const finalStaffId = staffId || (assignedRole === "admin" ? `ADM-${uid.substring(0, 4)}` : `STF-${uid.substring(0, 4)}`);

    // 2. Set Authoritative Custom Claims
    await adminAuth.setCustomUserClaims(uid, {
      role: assignedRole,
      staffId: finalStaffId,
      teamId: teamId || null,
      teamName: teamName || null,
    });

    // 3. Write User Profile to Firestore
    const now = new Date();
    const userProfile = {
      uid,
      id: uid,
      email: emailTrimmed,
      fullName: trimmedName,
      role: assignedRole,
      staffId: finalStaffId,
      designation: designation || (assignedRole === "admin" ? "Municipal Operations Administrator" : "Technical Staff"),
      phone: phone ? String(phone).trim() : "",
      teamId: teamId || null,
      teamName: teamName || null,
      area: area || "Municipal Jurisdiction",
      status: "Active",
      createdAt: now.toISOString().split("T")[0],
      createdAtTimestamp: now.toISOString(),
      createdBy: superAdmin.email,
    };

    await adminDb.collection("users").doc(uid).set(userProfile);

    // 4. Record Audit Log
    try {
      await adminDb.collection("auditLogs").add({
        actorId: superAdmin.uid,
        actorName: superAdmin.fullName,
        actorRole: "super_admin",
        action: `CREATE_${assignedRole.toUpperCase()}`,
        targetType: "user",
        targetId: finalStaffId,
        details: `${superAdmin.fullName} provisioned new ${assignedRole} account for ${trimmedName} (${emailTrimmed}).`,
        timestamp: now.toISOString(),
      });
    } catch {
      // Non-critical audit failure
    }

    return NextResponse.json(
      {
        success: true,
        message: `${assignedRole} account provisioned successfully.`,
        user: userProfile,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("[UrjaSetu Create User Error]:", error);
    const msg = error instanceof Error ? error.message : "Failed to provision user.";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
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
    const {
      userId,
      status: nextStatus,
      teamId,
      teamName,
      fullName,
      phone,
      designation,
      area,
    } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { success: false, error: "User ID is required." },
        { status: 400 }
      );
    }

    const userDocRef = adminDb.collection("users").doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: "User profile not found." },
        { status: 404 }
      );
    }

    const existingData = userDoc.data();
    const now = new Date();
    const updatePayload: Record<string, unknown> = {
      updatedAt: now.toISOString(),
    };

    if (nextStatus) {
      updatePayload.status = nextStatus;
      // Also enable/disable in Firebase Auth
      try {
        await adminAuth.updateUser(userId, {
          disabled: nextStatus === "Disabled",
        });
      } catch (authErr) {
        console.warn("[Super Admin User Auth Update Warning]:", authErr);
      }
    }

    if (fullName) updatePayload.fullName = fullName.trim();
    if (phone !== undefined) updatePayload.phone = String(phone).trim();
    if (designation) updatePayload.designation = designation.trim();
    if (area) updatePayload.area = area.trim();

    // Transfer team
    if (teamId !== undefined) {
      updatePayload.teamId = teamId;
      updatePayload.teamName = teamName || "";
      try {
        await adminAuth.setCustomUserClaims(userId, {
          role: existingData?.role,
          staffId: existingData?.staffId,
          teamId,
          teamName: teamName || "",
        });
      } catch (claimsErr) {
        console.warn("[Super Admin Claims Update Warning]:", claimsErr);
      }
    }

    await userDocRef.update(updatePayload);

    // Audit Log
    try {
      await adminDb.collection("auditLogs").add({
        actorId: superAdmin.uid,
        actorName: superAdmin.fullName,
        actorRole: "super_admin",
        action: nextStatus ? `SET_STATUS_${nextStatus.toUpperCase()}` : "UPDATE_USER_PROFILE",
        targetType: "user",
        targetId: existingData?.staffId || userId,
        details: `${superAdmin.fullName} updated profile for ${existingData?.fullName || userId}.`,
        timestamp: now.toISOString(),
      });
    } catch {
      // Non-critical audit failure
    }

    return NextResponse.json(
      {
        success: true,
        message: "User profile updated successfully.",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[UrjaSetu Update User Error]:", error);
    const msg = error instanceof Error ? error.message : "Failed to update user.";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
