"use client";

import React, { useState } from "react";

interface NavbarProps {
  onOpenReportModal: () => void;
  onOpenTrackModal: () => void;
  onScrollToSection: (sectionId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenReportModal,
  onOpenTrackModal,
  onScrollToSection,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#EAF3F5] shadow-xs">
      {/* Top Utility Strip (Deep Blue: #173F5F) */}
      <div className="bg-[#173F5F] text-[#F7F7F2] text-xs py-1.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#087E8B] inline-block animate-pulse"></span>
            <span className="font-medium text-[#EAF3F5]">
              Citywide Public Electrical Hazard &amp; Streetlight Coordination Portal
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-[#EAF3F5]/80 hidden sm:inline">
              24/7 Citizen Emergency Line:
            </span>
            <span className="font-bold text-[#F7F7F2] bg-[#263238]/60 px-2.5 py-0.5 rounded border border-[#087E8B]/40">
              Dial 1912 / 112
            </span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <div
            onClick={() => onScrollToSection("home")}
            className="flex items-center gap-2.5 cursor-pointer select-none shrink-0 group"
          >
            <div className="w-9 h-9 rounded-lg bg-[#173F5F] text-[#EAF3F5] border border-[#087E8B]/30 flex items-center justify-center font-bold transition-transform group-hover:scale-105">
              <svg
                className="w-5 h-5 text-[#F4A261]"
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
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl text-[#263238] tracking-tight">
                  Urja<span className="text-[#087E8B]">Setu</span>
                </span>
                <span className="bg-[#EAF3F5] text-[#173F5F] text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#087E8B]/20 uppercase tracking-wider">
                  Civic 24/7
                </span>
              </div>
              <span className="block text-[11px] font-medium text-[#263238]/70 -mt-0.5">
                Public Energy Safety &amp; Streetlight Service
              </span>
            </div>
          </div>

          {/* Center Navigation Links (Citizen Only) */}
          <nav className="hidden lg:flex items-center gap-1 text-xs font-semibold text-[#263238]">
            <button
              type="button"
              onClick={() => onScrollToSection("home")}
              className="px-3 py-2 rounded-md hover:bg-[#EAF3F5] text-[#263238] transition-colors"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => onScrollToSection("process")}
              className="px-3 py-2 rounded-md hover:bg-[#EAF3F5] text-[#263238]/80 hover:text-[#263238] transition-colors"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => onScrollToSection("stakeholders")}
              className="px-3 py-2 rounded-md hover:bg-[#EAF3F5] text-[#263238]/80 hover:text-[#263238] transition-colors"
            >
              Civic Coordination
            </button>
            <button
              type="button"
              onClick={() => onScrollToSection("safety")}
              className="px-3 py-2 rounded-md hover:bg-[#EAF3F5] text-[#263238]/80 hover:text-[#263238] transition-colors"
            >
              Safety Rules
            </button>
          </nav>

          {/* Right Citizen Action Buttons (Login button removed from header) */}
          <div className="flex items-center gap-2.5">
            {/* Private Track Complaint Button */}
            <button
              type="button"
              onClick={onOpenTrackModal}
              className="hidden sm:flex px-3.5 py-2 rounded-lg border border-[#087E8B]/30 bg-white hover:bg-[#EAF3F5] text-[#173F5F] text-xs font-semibold transition-all hover:-translate-y-0.5 shadow-2xs items-center gap-1.5"
            >
              <svg
                className="w-3.5 h-3.5 text-[#087E8B]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>Track Complaint</span>
            </button>

            {/* Report an Issue Primary Button (Teal: #087E8B) */}
            <button
              type="button"
              onClick={onOpenReportModal}
              className="px-4 py-2 rounded-lg bg-[#087E8B] hover:bg-[#06636E] text-white text-xs font-bold transition-all hover:-translate-y-0.5 shadow-xs flex items-center gap-1.5"
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <span>Report Issue</span>
            </button>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-md text-[#263238] hover:bg-[#EAF3F5]"
              aria-label="Toggle menu"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-[#EAF3F5] space-y-2 text-xs">
            <div className="flex flex-col gap-1 pb-2 border-b border-[#EAF3F5]">
              <button
                type="button"
                onClick={() => {
                  onScrollToSection("home");
                  setMobileMenuOpen(false);
                }}
                className="text-left px-3 py-2 rounded hover:bg-[#EAF3F5] font-medium text-[#263238]"
              >
                Home Overview
              </button>
              <button
                type="button"
                onClick={() => {
                  onScrollToSection("process");
                  setMobileMenuOpen(false);
                }}
                className="text-left px-3 py-2 rounded hover:bg-[#EAF3F5] font-medium text-[#263238]"
              >
                How It Works (5-Step Process)
              </button>
              <button
                type="button"
                onClick={() => {
                  onScrollToSection("stakeholders");
                  setMobileMenuOpen(false);
                }}
                className="text-left px-3 py-2 rounded hover:bg-[#EAF3F5] font-medium text-[#263238]"
              >
                Civic Coordination
              </button>
              <button
                type="button"
                onClick={() => {
                  onScrollToSection("safety");
                  setMobileMenuOpen(false);
                }}
                className="text-left px-3 py-2 rounded hover:bg-[#EAF3F5] font-medium text-[#263238]"
              >
                Safety Guidelines
              </button>
            </div>

            <div className="flex flex-col gap-2 pt-1 sm:hidden">
              <button
                type="button"
                onClick={() => {
                  onOpenReportModal();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 bg-[#087E8B] text-white font-bold rounded-lg text-center"
              >
                Report an Issue
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenTrackModal();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 border border-[#087E8B]/30 bg-white text-[#173F5F] font-semibold rounded-lg text-center"
              >
                Track Complaint
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
