"use client";

import React from "react";

interface FooterProps {
  onOpenReportModal: () => void;
  onOpenTrackModal: () => void;
  onScrollToSection: (sectionId: string) => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenReportModal,
  onOpenTrackModal,
  onScrollToSection,
}) => {
  return (
    <footer className="w-full bg-[#173F5F] text-[#F7F7F2] border-t border-[#087E8B]/20 pt-12 pb-8 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-[#EAF3F5]/15">
          {/* Col 1 & 2: Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#087E8B] text-white flex items-center justify-center font-bold">
                <svg
                  className="w-4 h-4 text-[#F4A261]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <span className="font-extrabold text-xl text-white tracking-tight">
                Urja<span className="text-[#087E8B]">Setu</span>
              </span>
            </div>

            <p className="text-xs text-[#EAF3F5]/80 max-w-md leading-relaxed">
              Smart Urban Energy Issue Reporting &amp; Coordination Platform.
              Enabling citizens to report public electrical hazards and track
              street repairs with complete transparency.
            </p>

            <div className="inline-flex items-center gap-2 bg-[#263238]/60 border border-[#087E8B]/30 px-3 py-1.5 rounded-lg text-[#EAF3F5] text-[11px]">
              <span className="w-2 h-2 rounded-full bg-[#087E8B] inline-block"></span>
              <span>Official Public Infrastructure Safety Coordination</span>
            </div>
          </div>

          {/* Col 3: Citizen Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#EAF3F5]">
              Citizen Services
            </h4>
            <ul className="space-y-2 text-[#EAF3F5]/70">
              <li>
                <button
                  type="button"
                  onClick={() => onScrollToSection("home")}
                  className="hover:text-white transition-colors"
                >
                  Home Overview
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onScrollToSection("process")}
                  className="hover:text-white transition-colors"
                >
                  5-Step Complaint Process
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenReportModal}
                  className="hover:text-white transition-colors"
                >
                  Report an Issue
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenTrackModal}
                  className="hover:text-white transition-colors"
                >
                  Track Complaint by ID
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onScrollToSection("safety")}
                  className="hover:text-white transition-colors"
                >
                  Electrical Safety Rules
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Employee Access & Safety Alert (Part 3 Requirement) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#EAF3F5]">
              Employee Access
            </h4>
            <p className="text-[11px] text-[#EAF3F5]/70 leading-relaxed">
              Authorized municipal administrators and field maintenance staff:
            </p>

            {/* Separate links opening in NEW browser tabs */}
            <div className="flex flex-col gap-2 pt-1">
              <a
                href="/super-admin/login"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-between px-3 py-1.5 rounded-md bg-[#263238]/80 hover:bg-[#263238] border border-[#087E8B]/40 text-[#EAF3F5] hover:text-white font-medium transition-all hover:-translate-y-0.5 text-xs"
              >
                <span>Super Admin Login</span>
                <span className="text-[#087E8B] font-bold">[↗]</span>
              </a>

              <a
                href="/admin/login"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-between px-3 py-1.5 rounded-md bg-[#263238]/80 hover:bg-[#263238] border border-[#087E8B]/40 text-[#EAF3F5] hover:text-white font-medium transition-all hover:-translate-y-0.5 text-xs"
              >
                <span>Admin Login</span>
                <span className="text-[#087E8B] font-bold">[↗]</span>
              </a>

              <a
                href="/staff/login"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-between px-3 py-1.5 rounded-md bg-[#263238]/80 hover:bg-[#263238] border border-[#087E8B]/40 text-[#EAF3F5] hover:text-white font-medium transition-all hover:-translate-y-0.5 text-xs"
              >
                <span>Staff Login</span>
                <span className="text-[#087E8B] font-bold">[↗]</span>
              </a>
            </div>

            {/* Safety Reminder Box with Warm Orange accent */}
            <div className="p-3 bg-[#F4A261]/15 border border-[#F4A261]/40 rounded-lg text-[11px] text-[#F7F7F2] flex items-start gap-2 mt-3">
              <svg
                className="w-4 h-4 text-[#F4A261] shrink-0 mt-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>
                <strong>Safety Rule:</strong> Never touch loose wires or open feeder pillars. Maintain 10 meters distance.
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-[#EAF3F5]/60 gap-4 text-[11px]">
          <p>
            &copy; 2026 UrjaSetu. Smart Urban Energy Infrastructure Platform.
          </p>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[#EAF3F5]/80">24/7 Emergency Line: 1912 / 112</span>
            <span>&bull;</span>
            <span className="font-mono text-[#EAF3F5]/80">UrjaSetu 2.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
