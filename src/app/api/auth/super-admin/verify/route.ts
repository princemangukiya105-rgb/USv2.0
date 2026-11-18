import { NextResponse } from "next/server";
import { verifySuperAdminRequest } from "@/lib/serverAuth";

/**
 * Super Admin Session Verification Endpoint
 * 
 * Verifies that the client possesses a cryptographically valid Firebase ID token
 * with the 'super_admin' custom claim, and that the account is Active in Firestore.
 */
export async function POST(req: Request) {
  const result = await verifySuperAdminRequest(req);

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error,
      },
      { status: result.statusCode }
    );
  }

  return NextResponse.json(
    {
      success: true,
      user: result.user,
      verifiedAt: new Date().toISOString(),
    },
    { status: 200 }
  );
}
