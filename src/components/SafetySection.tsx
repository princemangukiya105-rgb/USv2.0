"use client";

import React from "react";

export const SafetySection: React.FC = () => {
  return (
    <section id="safety" className="w-full bg-[#F7F7F2] py-12 border-b border-[#EAF3F5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-white border-2 border-[#F4A261]/40 rounded-lg p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#F4A261] text-white flex items-center justify-center shrink-0 mt-1 shadow-2xs">
                <svg
                  className="w-6 h-6 text-[#173F5F]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#b25514]">
                  Electrical Infrastructure Safety Warning
                </span>
                <h3 className="text-lg font-bold text-[#263238]">
                  Critical Safety Directives for Citizens
                </h3>
                <p className="text-xs sm:text-sm text-[#263238]/80 leading-relaxed max-w-3xl">
                  Do not touch, approach, or attempt to move loose wires, open junction boxes,
                  or damaged streetlight poles. Electricity can arc through wet ground and metal railings.
                  Always maintain a safe clearance of at least <strong>10 meters (33 feet)</strong> and report the issue immediately.
                </p>
              </div>
            </div>

            <div className="shrink-0 bg-[#EAF3F5] border border-[#087E8B]/30 rounded-lg p-4 text-center min-w-[200px]">
              <span className="text-[11px] font-semibold text-[#173F5F] uppercase tracking-wide block">
                24/7 Immediate Emergency
              </span>
              <span className="font-mono text-xl font-extrabold text-[#173F5F] block mt-0.5">
                Dial 1912 / 112
              </span>
              <span className="text-[10px] text-[#263238]/70 block mt-0.5">
                City Electrical Emergency Control
              </span>
            </div>
          </div>

          {/* 3 Safety Directives */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-6 pt-6 border-t border-[#EAF3F5] text-xs text-[#263238]">
            <div className="bg-[#EAF3F5]/40 border border-[#EAF3F5] p-3 rounded-md">
              <span className="font-bold text-[#263238] block mb-0.5">1. Keep Children &amp; Pets Away</span>
              <p className="text-[#263238]/70 text-[11px]">
                Ensure children do not play near unhinged junction boxes or sagging wires after storms.
              </p>
            </div>
            <div className="bg-[#EAF3F5]/40 border border-[#EAF3F5] p-3 rounded-md">
              <span className="font-bold text-[#263238] block mb-0.5">2. Avoid Waterlogged Poles</span>
              <p className="text-[#263238]/70 text-[11px]">
                Never wade through floodwater near light poles or feeder boxes as current can leak into standing water.
              </p>
            </div>
            <div className="bg-[#EAF3F5]/40 border border-[#EAF3F5] p-3 rounded-md">
              <span className="font-bold text-[#263238] block mb-0.5">3. Report Sparking Promptly</span>
              <p className="text-[#263238]/70 text-[11px]">
                Upload a photo on UrjaSetu or call 1912 for prioritized rapid electrical isolation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
