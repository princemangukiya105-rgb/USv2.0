"use client";

import React from "react";

interface StakeholderSectionProps {
  onOpenReportModal: () => void;
}

export const StakeholderSection: React.FC<StakeholderSectionProps> = ({
  onOpenReportModal,
}) => {
  const stakeholders = [
    {
      badge: "Public Access",
      badgeColor: "bg-[#EAF3F5] text-[#173F5F] border-[#087E8B]/20",
      title: "1. Citizens",
      summary:
        "Report unlit streetlights, tilted poles, or electrical hazards in seconds with photos. No login or registration required. Track progress using your unique Complaint ID.",
      buttonLabel: "Report an Issue",
      isAction: true,
      action: () => onOpenReportModal(),
      icon: (
        <svg
          className="w-5 h-5 text-[#087E8B]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      badge: "City Administration",
      badgeColor: "bg-[#173F5F]/10 text-[#173F5F] border-[#173F5F]/20",
      title: "2. Administration Desk",
      summary:
        "Municipal officers review incoming citizen photographs, verify electrical urgency, eliminate duplicates, and dispatch specialized maintenance units across wards.",
      buttonLabel: "Restricted Staff System",
      isAction: false,
      footerNote: "Authorized access via Employee Login",
      icon: (
        <svg
          className="w-5 h-5 text-[#173F5F]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
    },
    {
      badge: "Zone Logistics",
      badgeColor: "bg-[#087E8B]/10 text-[#087E8B] border-[#087E8B]/20",
      title: "3. Maintenance Teams",
      summary:
        "Designated electrical units (Team Alpha, Team Beta, Rapid Hazard Response Unit) receive ward work orders, verify equipment stock, and coordinate technician shifts.",
      buttonLabel: "Restricted Staff System",
      isAction: false,
      footerNote: "Authorized access via Employee Login",
      icon: (
        <svg
          className="w-5 h-5 text-[#087E8B]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      ),
    },
    {
      badge: "Mobile Field Crew",
      badgeColor: "bg-[#F4A261]/20 text-[#b25514] border-[#F4A261]/40",
      title: "4. Field Workers",
      summary:
        "On-site electricians access task addresses, follow mandatory safety checklists, perform electrical repairs, and upload verified completion photos.",
      buttonLabel: "Restricted Staff System",
      isAction: false,
      footerNote: "Authorized access via Employee Login",
      icon: (
        <svg
          className="w-5 h-5 text-[#F4A261]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
    },
  ];

  return (
    <section id="stakeholders" className="w-full bg-white py-12 sm:py-16 border-b border-[#EAF3F5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center space-y-2 mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-[#087E8B]">
            Stakeholder Ecosystem
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#263238] tracking-tight">
            Connecting Four Civic Pillars
          </h2>
          <p className="text-sm text-[#263238]/75">
            UrjaSetu creates seamless accountability between citizens,
            management, and technical boots on the ground.
          </p>
        </div>

        {/* 4 Stakeholder Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {stakeholders.map((item, idx) => (
            <div
              key={idx}
              className="bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg p-5 flex flex-col justify-between hover:border-[#087E8B]/40 transition-all hover-lift shadow-xs"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-lg bg-white border border-[#EAF3F5] flex items-center justify-center shadow-2xs">
                    {item.icon}
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-[#263238]">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#263238]/75 leading-relaxed mt-1.5">
                    {item.summary}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-[#EAF3F5]">
                {item.isAction ? (
                  <button
                    type="button"
                    onClick={item.action}
                    className="w-full py-2 px-3 text-xs font-bold bg-[#087E8B] hover:bg-[#06636E] text-white rounded-md transition-all hover-lift shadow-2xs flex items-center justify-center gap-1.5"
                  >
                    <span>{item.buttonLabel}</span>
                    <span>&rarr;</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between text-[11px] text-[#263238]/60 py-1">
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3 text-[#087E8B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <span>{item.footerNote}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
