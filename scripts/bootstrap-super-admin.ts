/**
 * UrjaSetu 2.0 — Secure Initial Super Admin Bootstrap Utility
 * 
 * EXECUTION:
 *   npm run bootstrap:super-admin
 * 
 * SECURITY DIRECTIVES:
 * 1. LOCAL EXECUTION ONLY:
 *    - Never run or expose this logic through any public HTTP route or client bundle.
 * 2. ZERO PLAIN-TEXT PASSWORDS:
 *    - Uses Firebase Auth to generate a single-use password reset link displayed
 *      strictly in the local terminal.
 * 3. STRICT ABORT GUARDS:
 *    - Aborts if another Super Admin already exists in Firestore.
 *    - Aborts if the target email belongs to an existing non-Super-Admin account.
 *    - Safe and idempotent against accidental repeated executions.
 * 4. CREDENTIAL PRIVACY:
 *    - Reads exclusively from local .env.local. Never prints secrets or keys.
 */

import { loadEnvConfig } from "@next/env";
import { initializeApp, getApps, getApp, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore, FieldValue } from "firebase-admin/firestore";

// ----------------------------------------------------------------------------
// 1. Environment Variables Loader using @next/env
// ----------------------------------------------------------------------------
loadEnvConfig(process.cwd());

// ----------------------------------------------------------------------------
// 2. Firebase Admin SDK Initializer
// ----------------------------------------------------------------------------
function initAdmin(): { auth: Auth; db: Firestore } {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.error("\n❌ [UrjaSetu Bootstrap Error] Missing Firebase Admin credentials in .env.local.");
    console.error("Required variables:");
    if (!projectId) console.error("  - FIREBASE_PROJECT_ID (or NEXT_PUBLIC_FIREBASE_PROJECT_ID)");
    if (!clientEmail) console.error("  - FIREBASE_CLIENT_EMAIL");
    if (!privateKey) console.error("  - FIREBASE_PRIVATE_KEY");
    console.error("\nPlease add your service account credentials to .env.local and retry.\n");
    process.exit(1);
  }

  // Sanitize private key: handle escaped newlines and outer quotes
  privateKey = privateKey.replace(/^"|"$/g, "").replace(/\\n/g, "\n");

  let app: App;
  if (getApps().length > 0) {
    app = getApp();
  } else {
    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  return {
    auth: getAuth(app),
    db: getFirestore(app),
  };
}

// ----------------------------------------------------------------------------
// 3. Main Bootstrap Procedure
// ----------------------------------------------------------------------------
async function main(): Promise<void> {
  console.log("\n========================================================================");
  console.log("  UrjaSetu 2.0 — Secure Super Admin Account Provisioning");
  console.log("========================================================================\n");

  const { auth, db } = initAdmin();

  // Read and validate the three target Super Admin parameters from .env.local
  const targetEmail = (process.env.INITIAL_SUPER_ADMIN_EMAIL || "").trim().toLowerCase();
  const targetName = (process.env.INITIAL_SUPER_ADMIN_NAME || "").trim();
  const targetStaffId = (process.env.INITIAL_SUPER_ADMIN_STAFF_ID || "").trim();

  const missingVariables: string[] = [];
  if (!targetEmail) missingVariables.push("INITIAL_SUPER_ADMIN_EMAIL");
  if (!targetName) missingVariables.push("INITIAL_SUPER_ADMIN_NAME");
  if (!targetStaffId) missingVariables.push("INITIAL_SUPER_ADMIN_STAFF_ID");

  if (missingVariables.length > 0) {
    console.error("❌ [UrjaSetu Bootstrap Error] Missing required Super Admin variables in .env.local:");
    missingVariables.forEach((v) => console.error(`  - ${v}`));
    console.error("\nPlease configure these variables in .env.local and retry.\n");
    process.exit(1);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(targetEmail)) {
    console.error(`❌ [UrjaSetu Bootstrap Error] Invalid email format: "${targetEmail}"`);
    process.exit(1);
  }

  console.log("🔍 Checking existing platform administrators in Firestore...");

  // --------------------------------------------------------------------------
  // SECURITY CHECK 1: Ensure NO DIFFERENT Super Admin exists in Firestore
  // --------------------------------------------------------------------------
  const existingSuperAdmins = await db
    .collection("users")
    .where("role", "==", "super_admin")
    .get();

  if (!existingSuperAdmins.empty) {
    const foreignAdmin = existingSuperAdmins.docs.find(
      (doc) => (doc.data().email || "").toLowerCase() !== targetEmail
    );

    if (foreignAdmin) {
      console.error("\n❌ [UrjaSetu Security Guard Abort]");
      console.error("A Super Admin account already exists in this Firestore database:");
      console.error(`  - Existing Super Admin: ${foreignAdmin.data().email} (UID: ${foreignAdmin.id})`);
      console.error(`  - Requested Account:    ${targetEmail}`);
      console.error("\nFor safety, UrjaSetu prevents multiple Super Admin provisioning scripts from running.");
      console.error("If you need to change the Super Admin, update the existing account directly or review Firestore.\n");
      process.exit(1);
    }
  }

  // --------------------------------------------------------------------------
  // SECURITY CHECK 2: Inspect Target User in Firebase Authentication
  // --------------------------------------------------------------------------
  let userRecord;
  let isNewAuthUser = false;

  try {
    userRecord = await auth.getUserByEmail(targetEmail);
    console.log(`ℹ️  Found existing Firebase Auth user for ${targetEmail} (UID: ${userRecord.uid}).`);

    // Verify existing user does not hold a conflicting non-Super-Admin role
    const existingClaims = userRecord.customClaims || {};
    if (existingClaims.role && existingClaims.role !== "super_admin") {
      console.error(`\n❌ [UrjaSetu Security Guard Abort]`);
      console.error(`User ${targetEmail} exists with role "${existingClaims.role}".`);
      console.error("Script will not overwrite or alter an existing non-Super-Admin staff account.\n");
      process.exit(1);
    }
  } catch (err: unknown) {
    const firebaseError = err as { code?: string };
    if (firebaseError.code === "auth/user-not-found") {
      console.log(`➕ Creating new Firebase Authentication account for ${targetEmail}...`);
      userRecord = await auth.createUser({
        email: targetEmail,
        displayName: targetName,
        emailVerified: true,
        disabled: false,
      });
      isNewAuthUser = true;
      console.log(`✓ Firebase Auth account created (UID: ${userRecord.uid}).`);
    } else {
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // SECURITY CHECK 3: Check Existing Firestore Profile for Role Conflicts
  // --------------------------------------------------------------------------
  const userDocRef = db.collection("users").doc(userRecord.uid);
  const userDoc = await userDocRef.get();

  if (userDoc.exists) {
    const existingData = userDoc.data();
    if (existingData?.role && existingData.role !== "super_admin") {
      console.error(`\n❌ [UrjaSetu Security Guard Abort]`);
      console.error(`Firestore profile for UID ${userRecord.uid} has role "${existingData.role}".`);
      console.error("Will not overwrite an existing non-Super-Admin profile.\n");
      process.exit(1);
    }
  }

  // --------------------------------------------------------------------------
  // STEP 4: Set Super Admin Custom Claims
  // --------------------------------------------------------------------------
  console.log("🔐 Setting Super Admin custom claims...");
  await auth.setCustomUserClaims(userRecord.uid, {
    role: "super_admin",
    staffId: targetStaffId,
  });
  console.log(`✓ Custom claims set: { role: 'super_admin', staffId: '${targetStaffId}' }`);

  // --------------------------------------------------------------------------
  // STEP 5: Create or Update Firestore Profile
  // --------------------------------------------------------------------------
  console.log("📄 Synchronizing users/{uid} Firestore document...");
  const nowIso = new Date().toISOString();

  const userProfile = {
    uid: userRecord.uid,
    email: targetEmail,
    fullName: targetName,
    role: "super_admin",
    staffId: targetStaffId,
    phone: userDoc.exists ? userDoc.data()?.phone || "" : "",
    teamId: null,
    teamName: null,
    area: "Central Municipal Control Room",
    designation: "Chief Municipal Energy Director",
    status: "Active",
    createdAt: userDoc.exists && userDoc.data()?.createdAt ? userDoc.data()?.createdAt : FieldValue.serverTimestamp(),
    createdAtIso: userDoc.exists && userDoc.data()?.createdAtIso ? userDoc.data()?.createdAtIso : nowIso,
    updatedAt: FieldValue.serverTimestamp(),
    lastLoginAt: userDoc.exists ? userDoc.data()?.lastLoginAt || null : null,
  };

  await userDocRef.set(userProfile, { merge: true });
  console.log(`✓ Firestore profile active at /users/${userRecord.uid}`);

  // --------------------------------------------------------------------------
  // STEP 6: Write Immutable Platform Audit Log
  // --------------------------------------------------------------------------
  try {
    await db.collection("auditLogs").add({
      id: `log-bootstrap-${Date.now()}`,
      timestamp: FieldValue.serverTimestamp(),
      timestampIso: nowIso,
      actorId: userRecord.uid,
      actorName: targetName,
      actorRole: "super_admin",
      action: isNewAuthUser ? "Super Admin Account Created" : "Super Admin Claims Verified",
      targetType: "user",
      targetId: userRecord.uid,
      details: `Super Admin provisioned: ${targetEmail} (${targetStaffId}) via local bootstrap script.`,
    });
    console.log("✓ Audit log record created.");
  } catch (auditErr) {
    console.warn("⚠️  Could not write audit log (non-critical):", auditErr);
  }

  // --------------------------------------------------------------------------
  // STEP 7: Generate Secure Single-Use Password Reset Link
  // --------------------------------------------------------------------------
  console.log("🔑 Generating secure single-use password setup link...");
  const resetLink = await auth.generatePasswordResetLink(targetEmail);

  console.log("\n========================================================================");
  console.log("  🎉 SUPER ADMIN PROVISIONING COMPLETE");
  console.log("========================================================================");
  console.log(`  UID:       ${userRecord.uid}`);
  console.log(`  Email:     ${targetEmail}`);
  console.log(`  Name:      ${targetName}`);
  console.log(`  Staff ID:  ${targetStaffId}`);
  console.log(`  Role:      super_admin`);
  console.log(`  Status:    Active`);
  console.log("------------------------------------------------------------------------");
  console.log("  ACTION REQUIRED — Set Your Password:");
  console.log("  Open the secure link below in your browser to set your account password:\n");
  console.log(`  ${resetLink}\n`);
  console.log("  SECURITY NOTICE:");
  console.log("  - This password setup link is valid for 1 hour.");
  console.log("  - It was generated securely via Firebase Admin SDK.");
  console.log("  - It has NOT been saved to logs, database records, or public endpoints.");
  console.log("========================================================================\n");
}

main().catch((err) => {
  console.error("\n❌ [UrjaSetu Bootstrap Exception]:", err);
  process.exit(1);
});
