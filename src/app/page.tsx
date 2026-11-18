"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { ProcessSection } from "@/components/ProcessSection";
import { StatsSection } from "@/components/StatsSection";
import { SafetySection } from "@/components/SafetySection";
import { StakeholderSection } from "@/components/StakeholderSection";
import { Footer } from "@/components/Footer";
import { ReportIssueModal } from "@/components/ReportIssueModal";
import { TrackComplaintModal } from "@/components/TrackComplaintModal";
import { useUrjaSetuData } from "@/services/dataService";
import { Complaint, PublicHomepageStats } from "@/types/urjasetu";
import { DEFAULT_PUBLIC_STATS } from "@/data/demoData";

export default function Home() {
  const { complaints, dataService } = useUrjaSetuData();
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [activeTrackId, setActiveTrackId] = useState<string>("");

  // Consistent initial stats to match SSR and initial client hydration exactly
  const [stats, setStats] = useState<PublicHomepageStats>(DEFAULT_PUBLIC_STATS);

  // Update stats dynamically after client-side mount when complaints change in demo storage
  useEffect(() => {
    const updateStats = () => {
      const extraComplaints = Math.max(0, complaints.length - 5);
      const resolvedInDemo = complaints.filter((c) => c.status === "Resolved").length;
      // DEMO_COMPLAINTS has 1 resolved complaint (URJ-2026-000105) and 4 in-progress/unresolved complaints
      const resolvedDelta = Math.max(0, resolvedInDemo - 1);
      const unresolvedInDemo = complaints.filter(
        (c) => c.status !== "Resolved" && c.status !== "Rejected"
      ).length;
      const inProgressDelta = unresolvedInDemo - 4;

      setStats({
        totalReceived: DEFAULT_PUBLIC_STATS.totalReceived + extraComplaints,
        totalResolved: DEFAULT_PUBLIC_STATS.totalResolved + resolvedDelta,
        inProgress: Math.max(0, DEFAULT_PUBLIC_STATS.inProgress + inProgressDelta),
        activeTeamsCount: DEFAULT_PUBLIC_STATS.activeTeamsCount,
      });
    };

    const timer = setTimeout(updateStats, 0);
    return () => clearTimeout(timer);
  }, [complaints]);

  // Smooth scroll helper for navbar and footer links
  const handleScrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Add new citizen complaint to shared data service
  const handleCreateComplaint = (newComplaint: Complaint) => {
    dataService.createComplaint(newComplaint);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F7F2] text-[#263238]">
      {/* 1. Navbar with UrjaSetu Logo, Citizen Navigation & Emergency Hotline */}
      <Navbar
        onOpenReportModal={() => setReportModalOpen(true)}
        onOpenTrackModal={() => {
          setActiveTrackId("");
          setTrackModalOpen(true);
        }}
        onScrollToSection={handleScrollToSection}
      />

      {/* Main Citizen Content */}
      <main className="flex-1 w-full">
        {/* 2, 3, 4. Hero Section: "Making Our Streets Safer, Together." + Explanation + 2 Action Buttons */}
        <HeroSection
          onOpenReportModal={() => setReportModalOpen(true)}
          onOpenTrackModal={() => {
            setActiveTrackId("");
            setTrackModalOpen(true);
          }}
        />

        {/* 5. Five-Step Complaint Lifecycle Process */}
        <ProcessSection />

        {/* 6. UrjaSetu at a Glance Transparency Section (Part 7) */}
        <StatsSection
          totalReceived={stats.totalReceived}
          totalResolved={stats.totalResolved}
          inProgress={stats.inProgress}
          activeTeamsCount={stats.activeTeamsCount}
        />

        {/* 7. Electrical Safety Guidance & 10m Danger Warning */}
        <SafetySection />

        {/* 8. Four Stakeholder Sections */}
        <StakeholderSection
          onOpenReportModal={() => setReportModalOpen(true)}
        />
      </main>

      {/* 9. Civic Footer with Employee Access Section (Super Admin, Admin & Staff Logins opening in new tabs) */}
      <Footer
        onOpenReportModal={() => setReportModalOpen(true)}
        onOpenTrackModal={() => {
          setActiveTrackId("");
          setTrackModalOpen(true);
        }}
        onScrollToSection={handleScrollToSection}
      />

      {/* Citizen Report Issue Modal with Hazard Photo Uploader & Optional GPS Detection */}
      <ReportIssueModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        onSubmit={handleCreateComplaint}
        onTrackSubmitted={(complaintId) => {
          setActiveTrackId(complaintId);
          setTrackModalOpen(true);
        }}
        existingCount={complaints.length}
      />

      {/* Login-Free Citizen Track Complaint Modal */}
      <TrackComplaintModal
        isOpen={trackModalOpen}
        onClose={() => setTrackModalOpen(false)}
        complaints={complaints}
        initialSearchId={activeTrackId}
      />
    </div>
  );
}
