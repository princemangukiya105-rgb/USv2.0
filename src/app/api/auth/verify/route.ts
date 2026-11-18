import { NextResponse } from "next/server";
import { verifyUserRequest } from "@/lib/serverAuth";

export async function POST(req: Request) {
  const authResult = await verifyUserRequest(req);

  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.statusCode }
    );
  }

  return NextResponse.json(
    {
      success: true,
      user: authResult.user,
    },
    { status: 200 }
  );
}
