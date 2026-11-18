/**
 * UrjaSetu 2.0 — Firebase Client Configuration & Initialization
 * 
 * ARCHITECTURAL NOTICE:
 * This module initializes and exports the client-side Firebase modular SDK instances:
 * - Firebase App (`app`)
 * - Firebase Authentication (`auth`)
 * - Cloud Firestore (`db`)
 * - Firebase Storage (`storage`)
 * 
 * HOT-RELOAD SAFE:
 * Uses getApps() / getApp() singleton pattern to prevent duplicate initialization
 * errors during Next.js Fast Refresh and server/client environment transitions.
 * 
 * SECURITY:
 * Client-side initialization uses public project identifiers configured in .env.local.
 * NO Firebase Admin SDK private keys or service account credentials should ever be
 * imported or exposed in this module.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

// 1. Map environment variables with explicit typing
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

const firebaseConfig: FirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// 2. Safe Environment-Variable Validation
const REQUIRED_CONFIG_KEYS: Array<{ key: keyof FirebaseConfig; envVar: string }> = [
  { key: "apiKey", envVar: "NEXT_PUBLIC_FIREBASE_API_KEY" },
  { key: "authDomain", envVar: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" },
  { key: "projectId", envVar: "NEXT_PUBLIC_FIREBASE_PROJECT_ID" },
  { key: "storageBucket", envVar: "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET" },
  { key: "messagingSenderId", envVar: "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" },
  { key: "appId", envVar: "NEXT_PUBLIC_FIREBASE_APP_ID" },
];

function validateFirebaseConfig(config: FirebaseConfig): { isValid: boolean; missingVars: string[] } {
  const missingVars = REQUIRED_CONFIG_KEYS
    .filter(({ key }) => !config[key] || config[key].trim() === "")
    .map(({ envVar }) => envVar);

  return {
    isValid: missingVars.length === 0,
    missingVars,
  };
}

const validation = validateFirebaseConfig(firebaseConfig);

if (!validation.isValid) {
  const errorMessage = `[UrjaSetu Firebase Config Warning] Missing required environment variable(s):\n  - ${validation.missingVars.join(
    "\n  - "
  )}\nPlease configure them in your .env.local file.`;

  // Always log clear warning in console
  console.warn(errorMessage);
}

// 3. Initialize Firebase using getApps() singleton pattern
// Prevents duplicate app initialization during Next.js Hot Module Replacement (HMR)
const app: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// 4. Initialize Modular Firebase Services
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

// 5. Named & Default Exports
export { app, auth, db, storage, firebaseConfig, validateFirebaseConfig };
export default app;
