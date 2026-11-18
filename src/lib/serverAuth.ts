/**
 * UrjaSetu 2.0 — Server-Side Authentication & Authorization Helpers
 * 
 * SECURITY DIRECTIVE:
 * - This module MUST only execute on the server (Route Handlers, Server Actions).
 * - Cryptographically verifies Firebase ID tokens and custom claims using Firebase Admin SDK.
 * - Never trusts client-reported roles or unverified request bodies.
 * - Checks Firestore account status ('Active') before permitting any operation.
 */

import { adminAuth, adminDb, validateFirebaseAdminConfig } from "@/lib/firebaseAdmin";
import { UserRole } from "@/types/urjasetu";

export interface VerifiedSuperAdminUser {
  uid: string;
  email: string;
  role: "super_admin";
  staffId: string;
  fullName: string;
  status: "Active";
}

export interface VerifiedUser {
  uid: string;
  email: string;
  role: UserRole;
  staffId: string;
  fullName: string;
  status: "Active";
  teamId?: string;
  teamName?: string;
}

export type AuthVerificationResult =
  | { success: true; user: VerifiedSuperAdminUser }
  | { success: false; error: string; statusCode: number };

export type GenericAuthVerificationResult =
  | { success: true; user: VerifiedUser }
  | { success: false; error: string; statusCode: number };

/**
 * Extracts Bearer token string from HTTP request headers.
 */
export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7).trim();
}

/**
 * Cryptographically verifies that a Firebase ID token belongs to an active Super Admin.
 */
export async function verifySuperAdminToken(idToken: string): Promise<AuthVerificationResult> {
  const genericResult = await verifyUserToken(idToken);
  if (!genericResult.success) {
    return genericResult;
  }

  if (genericResult.user.role !== "super_admin") {
    return {
      success: false,
      error: "Access Denied: Account does not possess Super Administrator privileges.",
      statusCode: 403,
    };
  }

  return {
    success: true,
    user: genericResult.user as VerifiedSuperAdminUser,
  };
}

/**
 * Cryptographically verifies that an ID token belongs to any valid, active staff user.
 */
export async function verifyUserToken(idToken: string): Promise<GenericAuthVerificationResult> {
  const config = validateFirebaseAdminConfig();
  if (!config.isConfigured) {
    return {
      success: false,
      error: "Firebase Admin SDK is not configured on the server. Please check server environment variables.",
      statusCode: 503,
    };
  }

  if (!idToken || typeof idToken !== "string") {
    return {
      success: false,
      error: "Missing or invalid authentication token.",
      statusCode: 401,
    };
  }

  try {
    // 1. Cryptographically verify the ID token with Firebase Admin Auth
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    // 2. Extract authoritative custom claims
    const claimRole = (decodedToken.role as UserRole) || null;

    // 3. Verify user profile exists in Firestore and is Active
    const userDocRef = adminDb.collection("users").doc(decodedToken.uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return {
        success: false,
        error: "User profile record was not found in the database.",
        statusCode: 403,
      };
    }

    const userData = userDoc.data();
    const effectiveRole = (claimRole || userData?.role) as UserRole;

    if (!effectiveRole) {
      return {
        success: false,
        error: "Access Denied: User role is not defined or recognized.",
        statusCode: 403,
      };
    }

    if (userData?.status !== "Active") {
      return {
        success: false,
        error: `Account is ${userData?.status || "inactive"}. Access has been restricted.`,
        statusCode: 403,
      };
    }

    // Update lastLoginAt timestamp in Firestore (non-blocking)
    try {
      await userDocRef.update({
        lastLoginAt: new Date().toISOString(),
      });
    } catch {
      // Non-critical audit update failure
    }

    return {
      success: true,
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email || userData.email || "",
        role: effectiveRole,
        staffId: (decodedToken.staffId as string) || userData.staffId || "STF-000",
        fullName: userData.fullName || "UrjaSetu Staff",
        status: "Active",
        teamId: (decodedToken.teamId as string) || userData.teamId,
        teamName: (decodedToken.teamName as string) || userData.teamName,
      },
    };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === "auth/id-token-expired") {
      return {
        success: false,
        error: "Authentication token has expired. Please log in again.",
        statusCode: 401,
      };
    }
    if (err.code === "auth/id-token-revoked") {
      return {
        success: false,
        error: "Authentication token was revoked. Please log in again.",
        statusCode: 401,
      };
    }

    return {
      success: false,
      error: "Authentication verification failed: " + (err.message || "Invalid token."),
      statusCode: 401,
    };
  }
}

/**
 * Extracts bearer token and validates Super Admin authorization.
 */
export async function verifySuperAdminRequest(req: Request): Promise<AuthVerificationResult> {
  const token = extractBearerToken(req);
  if (!token) {
    return {
      success: false,
      error: "Missing Authorization header with Bearer token.",
      statusCode: 401,
    };
  }
  return verifySuperAdminToken(token);
}

/**
 * Extracts bearer token and validates Admin authorization (allows admin or super_admin).
 */
export async function verifyAdminRequest(req: Request): Promise<GenericAuthVerificationResult> {
  const token = extractBearerToken(req);
  if (!token) {
    return {
      success: false,
      error: "Missing Authorization header with Bearer token.",
      statusCode: 401,
    };
  }

  const result = await verifyUserToken(token);
  if (!result.success) return result;

  if (result.user.role !== "admin" && result.user.role !== "super_admin") {
    return {
      success: false,
      error: "Access Denied: Requires Administrator or Super Administrator authority.",
      statusCode: 403,
    };
  }

  return result;
}

/**
 * Extracts bearer token and validates Maintenance Team authorization.
 */
export async function verifyMaintenanceTeamRequest(req: Request): Promise<GenericAuthVerificationResult> {
  const token = extractBearerToken(req);
  if (!token) {
    return {
      success: false,
      error: "Missing Authorization header with Bearer token.",
      statusCode: 401,
    };
  }

  const result = await verifyUserToken(token);
  if (!result.success) return result;

  if (
    result.user.role !== "maintenance_team" &&
    result.user.role !== "admin" &&
    result.user.role !== "super_admin"
  ) {
    return {
      success: false,
      error: "Access Denied: Requires Maintenance Squad credentials.",
      statusCode: 403,
    };
  }

  return result;
}

/**
 * Extracts bearer token and validates Field Worker authorization.
 */
export async function verifyFieldWorkerRequest(req: Request): Promise<GenericAuthVerificationResult> {
  const token = extractBearerToken(req);
  if (!token) {
    return {
      success: false,
      error: "Missing Authorization header with Bearer token.",
      statusCode: 401,
    };
  }

  const result = await verifyUserToken(token);
  if (!result.success) return result;

  if (
    result.user.role !== "field_worker" &&
    result.user.role !== "admin" &&
    result.user.role !== "super_admin"
  ) {
    return {
      success: false,
      error: "Access Denied: Requires Field Worker credentials.",
      statusCode: 403,
    };
  }

  return result;
}

/**
 * Extracts bearer token and validates any authenticated staff member.
 */
export async function verifyStaffRequest(req: Request): Promise<GenericAuthVerificationResult> {
  const token = extractBearerToken(req);
  if (!token) {
    return {
      success: false,
      error: "Missing Authorization header with Bearer token.",
      statusCode: 401,
    };
  }
  return verifyUserToken(token);
}

/**
 * Alias for verifyStaffRequest: verifies any authenticated staff user.
 */
export async function verifyUserRequest(req: Request): Promise<GenericAuthVerificationResult> {
  return verifyStaffRequest(req);
}
