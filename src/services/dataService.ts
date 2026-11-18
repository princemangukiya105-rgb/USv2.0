"use client";

/**
 * ============================================================================
 * UrjaSetu 2.0 — Centralized Frontend Demo Data Service
 * ============================================================================
 * 
 * ARCHITECTURAL NOTICE:
 * This is a temporary client-side demo adapter designed to synchronize data
 * across multiple open browser tabs (Citizen Portal, Admin Portal, Staff Portals)
 * using browser localStorage and the BroadcastChannel API.
 * 
 * This service models the exact service contract required for future Supabase
 * integration (see src/services/supabaseService.ts), ensuring that replacing
 * this adapter with the real Supabase PostgreSQL client will require NO major
 * rewrites of portal UI components.
 * ============================================================================
 */

import {
  Complaint,
  MaintenanceTeam,
  StaffMember,
  UserProfile,
  WebsiteContent,
  CategoryItem,
  AuditLogEntry,
  OperationalSettings,
  TimelineEntry,
} from "@/types/urjasetu";
import {
  DEMO_COMPLAINTS,
  DEMO_MAINTENANCE_TEAMS,
  DEMO_STAFF_MEMBERS,
  DEMO_ADMINS,
  DEMO_SUPER_ADMINS,
  DEFAULT_WEBSITE_CONTENT,
  DEFAULT_CATEGORIES,
  DEMO_AUDIT_LOGS,
  DEFAULT_OPERATIONAL_SETTINGS,
} from "@/data/demoData";
import { getHazardFallbackSvg } from "@/utils/imageUtils";
import { useSyncExternalStore } from "react";

// Storage Keys
const STORAGE_KEYS = {
  COMPLAINTS: "urjasetu_demo_complaints_v2",
  TEAMS: "urjasetu_demo_teams_v2",
  STAFF: "urjasetu_demo_staff_v2",
  ADMINS: "urjasetu_demo_admins_v2",
  SUPER_ADMINS: "urjasetu_demo_super_admins_v2",
  WEBSITE: "urjasetu_demo_website_v2",
  CATEGORIES: "urjasetu_demo_categories_v2",
  AUDIT: "urjasetu_demo_audit_v2",
  SETTINGS: "urjasetu_demo_settings_v2",
};

const SYNC_CHANNEL_NAME = "urjasetu_data_sync_channel";

// Safe JSON parser
function safeParse<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[UrjaSetu DataService] Failed to read "${key}" from localStorage:`, err);
    return fallback;
  }
}

// Safe JSON writer with quota recovery
function safeWrite<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`[UrjaSetu DataService] Failed to write "${key}" to localStorage:`, err);
    // If complaints hit localStorage quota limit, prune older complaints to fit
    if (key === STORAGE_KEYS.COMPLAINTS && Array.isArray(data)) {
      try {
        const pruned = data.slice(0, 15);
        window.localStorage.setItem(key, JSON.stringify(pruned));
        console.warn("[UrjaSetu DataService] Pruned older complaints to fit localStorage quota.");
      } catch (e2) {
        console.error("[UrjaSetu DataService] Critical localStorage write failure:", e2);
      }
    }
  }
}

// Broadcast channel singleton
let syncChannel: BroadcastChannel | null = null;
function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (!syncChannel && "BroadcastChannel" in window) {
    try {
      syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
    } catch {
      syncChannel = null;
    }
  }
  return syncChannel;
}

// Internal event listeners for same-tab reactive updates
type Listener = () => void;
const listeners = new Set<Listener>();
let storeVersion = 0;

function notifyAll(entity: string): void {
  storeVersion++;
  // 1. Notify listeners in same tab
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error("[UrjaSetu DataService] Listener notification error:", e);
    }
  });

  // 2. Broadcast to other open browser tabs
  const channel = getBroadcastChannel();
  if (channel) {
    try {
      channel.postMessage({ type: "DATA_CHANGED", entity, version: storeVersion, timestamp: Date.now() });
    } catch (e) {
      console.warn("[UrjaSetu DataService] BroadcastChannel postMessage error:", e);
    }
  }
}

function subscribeToStore(callback: () => void): () => void {
  initializeDemoData();
  listeners.add(callback);

  const channel = getBroadcastChannel();
  const handleBroadcast = (evt: MessageEvent) => {
    if (evt.data && evt.data.type === "DATA_CHANGED") {
      storeVersion++;
      callback();
    }
  };
  if (channel) {
    channel.addEventListener("message", handleBroadcast);
  }

  const handleStorage = (evt: StorageEvent) => {
    if (evt.key && Object.values(STORAGE_KEYS).includes(evt.key)) {
      storeVersion++;
      callback();
    }
  };
  window.addEventListener("storage", handleStorage);

  return () => {
    listeners.delete(callback);
    if (channel) {
      channel.removeEventListener("message", handleBroadcast);
    }
    window.removeEventListener("storage", handleStorage);
  };
}

// Initialize default seed data if missing
export function initializeDemoData(): void {
  if (typeof window === "undefined") return;
  if (!window.localStorage.getItem(STORAGE_KEYS.COMPLAINTS)) {
    safeWrite(STORAGE_KEYS.COMPLAINTS, DEMO_COMPLAINTS);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.TEAMS)) {
    safeWrite(STORAGE_KEYS.TEAMS, DEMO_MAINTENANCE_TEAMS);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.STAFF)) {
    safeWrite(STORAGE_KEYS.STAFF, DEMO_STAFF_MEMBERS);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.ADMINS)) {
    safeWrite(STORAGE_KEYS.ADMINS, DEMO_ADMINS);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.SUPER_ADMINS)) {
    safeWrite(STORAGE_KEYS.SUPER_ADMINS, DEMO_SUPER_ADMINS);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.WEBSITE)) {
    safeWrite(STORAGE_KEYS.WEBSITE, DEFAULT_WEBSITE_CONTENT);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
    safeWrite(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.AUDIT)) {
    safeWrite(STORAGE_KEYS.AUDIT, DEMO_AUDIT_LOGS);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
    safeWrite(STORAGE_KEYS.SETTINGS, DEFAULT_OPERATIONAL_SETTINGS);
  }
}

/**
 * Master Data Service Client
 */
export const dataService = {
  // --------------------------------------------------------------------------
  // COMPLAINTS
  // --------------------------------------------------------------------------
  getComplaints(): Complaint[] {
    const rawList = safeParse<Complaint[]>(STORAGE_KEYS.COMPLAINTS, DEMO_COMPLAINTS);
    // Sanitize any dead blob: URLs left in localStorage from earlier tests
    let storageNeedsResave = false;
    const sanitized = rawList.map((c) => {
      let changed = false;
      let sanitizedPhotos = c.citizenPhotos;
      if (sanitizedPhotos && sanitizedPhotos.some((p) => p.url?.startsWith("blob:"))) {
        changed = true;
        sanitizedPhotos = sanitizedPhotos.map((p) =>
          p.url?.startsWith("blob:")
            ? { ...p, url: getHazardFallbackSvg(p.name || c.category) }
            : p
        );
      }
      let sanitizedPhotoAfter = c.photoAfter;
      if (sanitizedPhotoAfter && sanitizedPhotoAfter.startsWith("blob:")) {
        changed = true;
        sanitizedPhotoAfter = getHazardFallbackSvg("Repair Completion Proof");
      }
      if (changed) {
        storageNeedsResave = true;
        return {
          ...c,
          citizenPhotos: sanitizedPhotos,
          photoAfter: sanitizedPhotoAfter,
        };
      }
      return c;
    });

    if (storageNeedsResave && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEYS.COMPLAINTS, JSON.stringify(sanitized));
      } catch {
        // Ignore silent storage write error during sanitize pass
      }
    }

    return sanitized;
  },

  getComplaintById(id: string): Complaint | undefined {
    return this.getComplaints().find((c) => c.id.toUpperCase() === id.toUpperCase());
  },

  createComplaint(newComplaint: Complaint): void {
    const list = this.getComplaints();
    const updated = [newComplaint, ...list];
    safeWrite(STORAGE_KEYS.COMPLAINTS, updated);
    this.addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: "Just now",
      actorId: "citizen-guest",
      actorName: newComplaint.reportedBy || "Citizen",
      actorRole: "citizen",
      action: "Citizen Complaint Logged",
      targetType: "complaint",
      targetId: newComplaint.id,
      details: `New electrical complaint filed: "${newComplaint.category}" at ${newComplaint.ward}.`,
    });
    notifyAll("complaints");
  },

  updateComplaint(
    complaintId: string,
    updates: Partial<Complaint>,
    timelineEntry?: TimelineEntry
  ): void {
    const list = this.getComplaints();
    const updated = list.map((c) => {
      if (c.id !== complaintId) return c;
      const newTimeline = timelineEntry
        ? [...c.timeline, timelineEntry]
        : c.timeline;
      return {
        ...c,
        ...updates,
        timeline: newTimeline,
      };
    });
    safeWrite(STORAGE_KEYS.COMPLAINTS, updated);
    notifyAll("complaints");
  },

  // --------------------------------------------------------------------------
  // TEAMS
  // --------------------------------------------------------------------------
  getTeams(): MaintenanceTeam[] {
    return safeParse<MaintenanceTeam[]>(STORAGE_KEYS.TEAMS, DEMO_MAINTENANCE_TEAMS);
  },

  createTeam(team: MaintenanceTeam): void {
    const list = this.getTeams();
    safeWrite(STORAGE_KEYS.TEAMS, [...list, team]);
    notifyAll("teams");
  },

  updateTeam(id: string, updates: Partial<MaintenanceTeam>): void {
    const list = this.getTeams();
    safeWrite(
      STORAGE_KEYS.TEAMS,
      list.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
    notifyAll("teams");
  },

  deleteTeam(id: string): void {
    const list = this.getTeams();
    safeWrite(STORAGE_KEYS.TEAMS, list.filter((t) => t.id !== id));
    notifyAll("teams");
  },

  // --------------------------------------------------------------------------
  // STAFF
  // --------------------------------------------------------------------------
  getStaff(): StaffMember[] {
    return safeParse<StaffMember[]>(STORAGE_KEYS.STAFF, DEMO_STAFF_MEMBERS);
  },

  createStaff(staff: StaffMember): void {
    const list = this.getStaff();
    safeWrite(STORAGE_KEYS.STAFF, [...list, staff]);
    notifyAll("staff");
  },

  updateStaff(id: string, updates: Partial<StaffMember>): void {
    const list = this.getStaff();
    safeWrite(
      STORAGE_KEYS.STAFF,
      list.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
    notifyAll("staff");
  },

  deleteStaff(id: string): void {
    const list = this.getStaff();
    safeWrite(STORAGE_KEYS.STAFF, list.filter((s) => s.id !== id));
    notifyAll("staff");
  },

  // --------------------------------------------------------------------------
  // ADMINS
  // --------------------------------------------------------------------------
  getAdmins(): UserProfile[] {
    return safeParse<UserProfile[]>(STORAGE_KEYS.ADMINS, DEMO_ADMINS);
  },

  createAdmin(admin: UserProfile): void {
    const list = this.getAdmins();
    safeWrite(STORAGE_KEYS.ADMINS, [...list, admin]);
    notifyAll("admins");
  },

  updateAdmin(id: string, updates: Partial<UserProfile>): void {
    const list = this.getAdmins();
    safeWrite(
      STORAGE_KEYS.ADMINS,
      list.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
    notifyAll("admins");
  },

  deleteAdmin(id: string): void {
    const list = this.getAdmins();
    safeWrite(STORAGE_KEYS.ADMINS, list.filter((a) => a.id !== id));
    notifyAll("admins");
  },

  // --------------------------------------------------------------------------
  // SUPER ADMINS
  // --------------------------------------------------------------------------
  getSuperAdmins(): UserProfile[] {
    return safeParse<UserProfile[]>(STORAGE_KEYS.SUPER_ADMINS, DEMO_SUPER_ADMINS);
  },

  createSuperAdmin(sa: UserProfile): void {
    const list = this.getSuperAdmins();
    safeWrite(STORAGE_KEYS.SUPER_ADMINS, [...list, sa]);
    notifyAll("super_admins");
  },

  // --------------------------------------------------------------------------
  // WEBSITE CONTENT
  // --------------------------------------------------------------------------
  getWebsiteContent(): WebsiteContent {
    return safeParse<WebsiteContent>(STORAGE_KEYS.WEBSITE, DEFAULT_WEBSITE_CONTENT);
  },

  updateWebsiteContent(updates: Partial<WebsiteContent>): void {
    const current = this.getWebsiteContent();
    safeWrite(STORAGE_KEYS.WEBSITE, { ...current, ...updates });
    notifyAll("website");
  },

  // --------------------------------------------------------------------------
  // COMPLAINT CATEGORIES
  // --------------------------------------------------------------------------
  getCategories(): CategoryItem[] {
    return safeParse<CategoryItem[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
  },

  createCategory(category: CategoryItem): void {
    const list = this.getCategories();
    safeWrite(STORAGE_KEYS.CATEGORIES, [...list, category]);
    notifyAll("categories");
  },

  updateCategory(id: string, updates: Partial<CategoryItem>): void {
    const list = this.getCategories();
    safeWrite(
      STORAGE_KEYS.CATEGORIES,
      list.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
    notifyAll("categories");
  },

  deleteCategory(id: string): void {
    const list = this.getCategories();
    safeWrite(STORAGE_KEYS.CATEGORIES, list.filter((c) => c.id !== id));
    notifyAll("categories");
  },

  // --------------------------------------------------------------------------
  // AUDIT LOGS
  // --------------------------------------------------------------------------
  getAuditLogs(): AuditLogEntry[] {
    return safeParse<AuditLogEntry[]>(STORAGE_KEYS.AUDIT, DEMO_AUDIT_LOGS);
  },

  addAuditLog(entry: AuditLogEntry): void {
    const list = this.getAuditLogs();
    safeWrite(STORAGE_KEYS.AUDIT, [entry, ...list]);
    notifyAll("audit");
  },

  // --------------------------------------------------------------------------
  // SETTINGS
  // --------------------------------------------------------------------------
  getSettings(): OperationalSettings {
    return safeParse<OperationalSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_OPERATIONAL_SETTINGS);
  },

  updateSettings(updates: Partial<OperationalSettings>): void {
    const current = this.getSettings();
    safeWrite(STORAGE_KEYS.SETTINGS, { ...current, ...updates });
    notifyAll("settings");
  },

  // --------------------------------------------------------------------------
  // RESET DEMO DATA
  // --------------------------------------------------------------------------
  resetAll(): void {
    if (typeof window === "undefined") return;
    Object.values(STORAGE_KEYS).forEach((k) => window.localStorage.removeItem(k));
    initializeDemoData();
    notifyAll("all");
  },
};

/**
 * Custom React Hook for Reactive Multi-Tab Synchronization
 */
export function useUrjaSetuData() {
  useSyncExternalStore(
    subscribeToStore,
    () => storeVersion,
    () => 0
  );

  return {
    complaints: dataService.getComplaints(),
    teams: dataService.getTeams(),
    staffMembers: dataService.getStaff(),
    admins: dataService.getAdmins(),
    superAdmins: dataService.getSuperAdmins(),
    websiteContent: dataService.getWebsiteContent(),
    categories: dataService.getCategories(),
    auditLogs: dataService.getAuditLogs(),
    settings: dataService.getSettings(),
    dataService,
  };
}
