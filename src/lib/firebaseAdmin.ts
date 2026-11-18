/**
 * UrjaSetu 2.0 — Firebase Admin SDK Integration (Server-Side Only)
 * 
 * SECURITY DIRECTIVE:
 * - This module MUST execute exclusively in server environments (Next.js Route Handlers, Server Actions).
 * - NEVER import this file into Client Components ("use client").
 * - NEVER prefix Firebase Admin credentials with NEXT_PUBLIC_*.
 * - Private keys are handled securely and never exposed in client bundles or public endpoints.
 */

import { getApps, getApp, initializeApp, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage, Storage } from "firebase-admin/storage";

// 1. Enforce Server-Only Node.js Runtime Execution
if (typeof window !== "undefined") {
  throw new Error(
    "[UrjaSetu Security Violation] Firebase Admin SDK cannot be executed on the client side."
  );
}

if (process.env.NEXT_RUNTIME === "edge") {
  throw new Error(
    "[UrjaSetu Security Violation] Firebase Admin SDK cannot be executed in the Edge runtime. It must execute only in the Node.js server runtime."
  );
}

// 2. Private Key Sanitization (handles escaped newlines and wrapping quotes)
function formatPrivateKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  return key.replace(/^"|"$/g, "").replace(/\\n/g, "\n");
}

export interface FirebaseAdminValidation {
  isConfigured: boolean;
  missingVariables: string[];
  projectId?: string;
  clientEmailMasked?: string;
}

/**
 * Validates server-side Firebase Admin environment variables without leaking secrets.
 */
export function validateFirebaseAdminConfig(): FirebaseAdminValidation {
  const missing: string[] = [];

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId) missing.push("FIREBASE_PROJECT_ID");
  if (!clientEmail) missing.push("FIREBASE_CLIENT_EMAIL");
  if (!privateKey) missing.push("FIREBASE_PRIVATE_KEY");

  let maskedEmail: string | undefined = undefined;
  if (clientEmail && clientEmail.includes("@")) {
    const [localPart, domain] = clientEmail.split("@");
    maskedEmail = `${localPart.substring(0, 3)}***@${domain}`;
  }

  return {
    isConfigured: missing.length === 0,
    missingVariables: missing,
    projectId: projectId || undefined,
    clientEmailMasked: maskedEmail,
  };
}

// 3. Singleton Initialization
let adminAppInstance: App | null = null;

export function getFirebaseAdminApp(): App | null {
  if (adminAppInstance) return adminAppInstance;

  if (getApps().length > 0) {
    adminAppInstance = getApp();
    return adminAppInstance;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
  const formattedPrivateKey = formatPrivateKey(rawPrivateKey);

  if (!projectId || !clientEmail || !formattedPrivateKey) {
    return null;
  }

  try {
    adminAppInstance = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: formattedPrivateKey,
      }),
      storageBucket:
        process.env.FIREBASE_STORAGE_BUCKET ||
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
        `${projectId}.firebasestorage.app`,
    });
    return adminAppInstance;
  } catch (error) {
    console.error("[UrjaSetu Firebase Admin] Failed to initialize Firebase Admin SDK:", error);
    return null;
  }
}

// 4. Safe Getters for Modular Admin Instances
export function getAdminAuth(): Auth {
  const app = getFirebaseAdminApp();
  if (!app) {
    throw new Error(
      "[UrjaSetu Firebase Admin Error] Firebase Admin SDK is not initialized. Ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set in .env.local."
    );
  }
  return getAuth(app);
}

export function getAdminFirestore(): Firestore {
  const app = getFirebaseAdminApp();
  if (!app) {
    throw new Error(
      "[UrjaSetu Firebase Admin Error] Firebase Admin SDK is not initialized. Ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set in .env.local."
    );
  }
  return getFirestore(app);
}

export function getAdminStorage(): Storage {
  const app = getFirebaseAdminApp();
  if (!app) {
    throw new Error(
      "[UrjaSetu Firebase Admin Error] Firebase Admin SDK is not initialized. Ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set in .env.local."
    );
  }
  return getStorage(app);
}

// 5. Transparent Proxies for Direct Named Imports
// Prevents Next.js static build crashes while providing standard `adminDb.collection(...)` ergonomics
export const adminAuth = new Proxy({} as Auth, {
  get(_target, prop: keyof Auth) {
    const authInstance = getAdminAuth();
    const value = authInstance[prop];
    return typeof value === "function" ? value.bind(authInstance) : value;
  },
});

export const adminDb = new Proxy({} as Firestore, {
  get(_target, prop: keyof Firestore) {
    const dbInstance = getAdminFirestore();
    const value = dbInstance[prop];
    return typeof value === "function" ? value.bind(dbInstance) : value;
  },
});

export const adminStorage = new Proxy({} as Storage, {
  get(_target, prop: keyof Storage) {
    const storageInstance = getAdminStorage();
    const value = storageInstance[prop];
    return typeof value === "function" ? value.bind(storageInstance) : value;
  },
});

export default getFirebaseAdminApp;
