"use client";

import React from "react";

interface HeroSectionProps {
  onOpenReportModal: () => void;
  onOpenTrackModal: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onOpenReportModal,
  onOpenTrackModal,
}) => {
  return (
    <section id="home" className="w-full bg-[#F7F7F2] border-b border-[#EAF3F5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          {/* Civic Announcement Badge */}
          <div className="inline-flex items-center gap-2 bg-[#EAF3F5] border border-[#087E8B]/20 px-3 py-1 rounded-md text-xs text-[#173F5F]">
            <span className="w-2 h-2 rounded-full bg-[#087E8B] inline-block animate-pulse"></span>
            <span className="font-semibold text-[#173F5F]">
              Smart Urban Energy Platform
            </span>
            <span className="text-[#087E8B]">&bull;</span>
            <span className="text-[#263238]/80">
              100% Login-Free Public Hazard Reporting
            </span>
          </div>

          {/* Hero Heading */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#263238] tracking-tight leading-tight">
            Making Our Streets Safer, Together.
          </h1>

          {/* Short Explanation of the Platform */}
          <p className="text-base sm:text-lg text-[#263238]/80 leading-relaxed max-w-2xl mx-auto">
            UrjaSetu connects citizens, city administration, maintenance teams,
            and field workers into one transparent system. Report broken
            streetlights, flickering fixtures, or hazardous wires, and follow
            repairs from start to finish.
          </p>

          {/* Two Prominent Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              type="button"
              onClick={onOpenReportModal}
              className="w-full sm:w-auto px-6 py-3 bg-[#087E8B] hover:bg-[#06636E] text-white text-sm font-bold rounded-lg shadow-xs hover-lift transition-all flex items-center justify-center gap-2"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <span>Report an Issue</span>
            </button>

            <button
              type="button"
              onClick={onOpenTrackModal}
              className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-[#EAF3F5] text-[#173F5F] text-sm font-semibold rounded-lg border border-[#087E8B]/30 shadow-xs hover-lift transition-all flex items-center justify-center gap-2"
            >
              <svg
                className="w-4 h-4 text-[#087E8B]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>Track Complaint</span>
            </button>
          </div>

          {/* Key Citizen Guarantee Badges */}
          <div className="pt-6 border-t border-[#EAF3F5] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-[#263238]/80 max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2">
              <svg
                className="w-4 h-4 text-[#087E8B] shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>No login or sign-up needed</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <svg
                className="w-4 h-4 text-[#087E8B] shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <span>Instant unique Complaint ID</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <svg
                className="w-4 h-4 text-[#087E8B] shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Attach hazard photographs</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
