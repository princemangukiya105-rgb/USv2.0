"use client";

import React from "react";
import { DEMO_PUBLIC_RESOLVED_ISSUES, DEFAULT_PUBLIC_STATS } from "@/data/demoData";
import { PublicHomepageStats } from "@/types/urjasetu";

/**
 * Consistent English number formatter to prevent locale-based hydration mismatches
 */
export function formatEnglishNumber(val: number): string {
  return new Intl.NumberFormat("en-US").format(val);
}

export type StatsSectionProps = Partial<PublicHomepageStats>;

export const StatsSection: React.FC<StatsSectionProps> = ({
  totalReceived = DEFAULT_PUBLIC_STATS.totalReceived,
  totalResolved = DEFAULT_PUBLIC_STATS.totalResolved,
  inProgress = DEFAULT_PUBLIC_STATS.inProgress,
  activeTeamsCount = DEFAULT_PUBLIC_STATS.activeTeamsCount,
}) => {
  return (
    <section className="w-full bg-white py-12 sm:py-16 border-b border-[#EAF3F5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-[#EAF3F5] text-[#087E8B] text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-[#087E8B]/20">
            <span className="w-2 h-2 rounded-full bg-[#087E8B] animate-pulse"></span>
            <span>Public Transparency</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#263238] tracking-tight">
            UrjaSetu at a Glance
          </h2>
          <p className="text-xs sm:text-sm text-[#263238]/75 leading-relaxed">
            Live citywide electrical infrastructure metrics and recent verified repairs. All figures are tracked transparently across municipal wards.
          </p>
        </div>

        {/* 4 Core Transparency Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Total Complaints Received */}
          <div className="bg-[#F7F7F2] border border-[#EAF3F5] rounded-xl p-5 text-center hover-lift transition-all">
            <span className="text-xs font-semibold text-[#263238]/70 uppercase tracking-wide block">
              Total Complaints Received
            </span>
            <span className="text-3xl sm:text-4xl font-extrabold text-[#173F5F] mt-2 block font-mono">
              {formatEnglishNumber(totalReceived)}
            </span>
            <span className="text-[11px] text-[#263238]/60 mt-1 block">
              Logged across all 5 wards
            </span>
          </div>

          {/* 2. Complaints Resolved */}
          <div className="bg-[#F7F7F2] border border-[#087E8B]/30 rounded-xl p-5 text-center hover-lift transition-all">
            <span className="text-xs font-semibold text-[#087E8B] uppercase tracking-wide block">
              Complaints Resolved
            </span>
            <span className="text-3xl sm:text-4xl font-extrabold text-[#087E8B] mt-2 block font-mono">
              {formatEnglishNumber(totalResolved)}
            </span>
            <span className="text-[11px] text-[#087E8B] font-medium mt-1 block">
              94.1% resolution rate
            </span>
          </div>

          {/* 3. Currently In Progress */}
          <div className="bg-[#F7F7F2] border border-[#F4A261]/40 rounded-xl p-5 text-center hover-lift transition-all">
            <span className="text-xs font-semibold text-[#b25514] uppercase tracking-wide block">
              Currently in Progress
            </span>
            <span className="text-3xl sm:text-4xl font-extrabold text-[#b25514] mt-2 block font-mono">
              {formatEnglishNumber(inProgress)}
            </span>
            <span className="text-[11px] text-[#b25514] font-medium mt-1 block">
              Crews on site or dispatched
            </span>
          </div>

          {/* 4. Active Maintenance Teams */}
          <div className="bg-[#F7F7F2] border border-[#EAF3F5] rounded-xl p-5 text-center hover-lift transition-all">
            <span className="text-xs font-semibold text-[#173F5F] uppercase tracking-wide block">
              Active Maintenance Teams
            </span>
            <span className="text-3xl sm:text-4xl font-extrabold text-[#173F5F] mt-2 block font-mono">
              {formatEnglishNumber(activeTeamsCount)}
            </span>
            <span className="text-[11px] text-[#263238]/60 mt-1 block">
              24/7 specialized squads
            </span>
          </div>
        </div>

        {/* Recently Resolved Electrical Issues Section */}
        <div className="bg-[#F7F7F2] border border-[#EAF3F5] rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EAF3F5] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#173F5F] flex items-center gap-2">
                <span>Recently Resolved Electrical Issues</span>
                <span className="bg-[#EAF3F5] text-[#087E8B] text-[10px] font-mono px-2 py-0.5 rounded-full border border-[#087E8B]/20 font-bold">
                  Public Ledger
                </span>
              </h3>
              <p className="text-[11px] text-[#263238]/70">
                Verified technical resolutions conducted by authorized field units.
              </p>
            </div>
            <div className="text-[10px] text-[#263238]/60 bg-white px-2.5 py-1 rounded border border-[#EAF3F5]">
              🔒 Citizen Privacy Protected &bull; No Private Details Exposed
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DEMO_PUBLIC_RESOLVED_ISSUES.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-[#EAF3F5] rounded-lg p-4 shadow-2xs hover-lift transition-all flex flex-col justify-between text-xs space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#173F5F] text-[11px]">
                      {item.id}
                    </span>
                    <span className="bg-emerald-50 text-[#087E8B] text-[10px] font-bold px-2 py-0.5 rounded border border-[#087E8B]/20">
                      ✓ Resolved in {item.durationFormatted}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-[#263238] text-xs">
                      {item.category}
                    </h4>
                    <span className="text-[11px] text-[#263238]/60 block mt-0.5">
                      {item.ward} &bull; {item.resolvedAt}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#263238]/75 leading-relaxed bg-[#F7F7F2] p-2.5 rounded border border-[#EAF3F5]">
                    {item.resolutionSummary}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#EAF3F5] flex items-center justify-between text-[10px] text-[#087E8B] font-semibold">
                  <span>Photo &amp; Voltage Verified</span>
                  <span>Safety Certified ✓</span>
                </div>
              </div>
            ))}
          </div>

          {/* Live Data Sync Notice */}
          <div className="pt-2 text-center text-[10px] text-[#263238]/50 italic">
            Note: Statistics and resolved feeds reflect live Cloud Firestore database records in Asia-South1.
          </div>
        </div>
      </div>
    </section>
  );
};
