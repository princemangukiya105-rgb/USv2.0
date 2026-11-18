import { NextResponse } from "next/server";
import {
  validateFirebaseAdminConfig,
  getFirebaseAdminApp,
  getAdminFirestore,
  getAdminAuth,
} from "@/lib/firebaseAdmin";

export async function GET() {
  const startTime = Date.now();
  const validation = validateFirebaseAdminConfig();

  // If server-side credentials are not yet configured in .env.local
  if (!validation.isConfigured) {
    return NextResponse.json(
      {
        status: "pending_configuration",
        service: "UrjaSetu Firebase Admin SDK",
        configured: false,
        missingVariables: validation.missingVariables,
        projectId: validation.projectId || null,
        message:
          "Firebase Admin SDK credentials (FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) are not yet configured in .env.local. Add them to enable server-side Firebase operations.",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  }

  // Attempt to initialize and verify Firestore connectivity & Auth service
  try {
    const adminApp = getFirebaseAdminApp();
    if (!adminApp) {
      return NextResponse.json(
        {
          status: "error",
          service: "UrjaSetu Firebase Admin SDK",
          configured: true,
          error: "Failed to initialize Firebase Admin app instance.",
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    // Verify Firebase Admin Auth instance initialization
    const adminAuthInstance = getAdminAuth();
    const authReady = Boolean(
      adminAuthInstance && typeof adminAuthInstance.verifyIdToken === "function"
    );

    const db = getAdminFirestore();

    // Verify Firestore connectivity by pinging the counters collection reference
    // Does not expose or return database records
    const checkStart = Date.now();
    const counterDoc = await db.collection("counters").doc("complaints").get();
    const latencyMs = Date.now() - checkStart;

    return NextResponse.json(
      {
        status: "healthy",
        service: "UrjaSetu Firebase Admin SDK",
        configured: true,
        projectId: validation.projectId,
        clientEmailMasked: validation.clientEmailMasked,
        runtime: "nodejs",
        firestore: {
          connected: true,
          latencyMs,
          counterInitialized: counterDoc.exists,
        },
        auth: {
          ready: authReady,
          provider: "Firebase Admin Auth",
        },
        roundTripMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[UrjaSetu Firebase Health Error]:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error connecting to Firebase Admin.";

    return NextResponse.json(
      {
        status: "unreachable",
        service: "UrjaSetu Firebase Admin SDK",
        configured: true,
        projectId: validation.projectId,
        error: "Unable to establish connection to Cloud Firestore.",
        detail: errorMessage.includes("certificate")
          ? "Service account private key certificate is invalid or malformed."
          : errorMessage.includes("deadline") || errorMessage.includes("timeout")
          ? "Connection to Cloud Firestore timed out."
          : "Firebase service connection failed. Please verify credentials.",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
