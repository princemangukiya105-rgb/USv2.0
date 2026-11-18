"use client";

import React from "react";

export const ProcessSection: React.FC = () => {
  const steps = [
    {
      step: "01",
      title: "Citizen Report",
      description:
        "Citizen reports a streetlight hazard, leaning pole, or exposed wire with location and photos. No login required.",
      tag: "Immediate",
    },
    {
      step: "02",
      title: "Admin Review",
      description:
        "The municipal administration desk audits the issue, checks photos, verifies urgency, and sets resolution priority.",
      tag: "Triage",
    },
    {
      step: "03",
      title: "Team Assigned",
      description:
        "The work order is dispatched to the designated electrical maintenance unit covering that specific ward zone.",
      tag: "Dispatch",
    },
    {
      step: "04",
      title: "Work in Progress",
      description:
        "Field linemen arrive on site with equipment, isolate the hazard, make electrical repairs, and restore lighting.",
      tag: "On-Site Repair",
    },
    {
      step: "05",
      title: "Resolved & Tested",
      description:
        "Field crew verifies circuit voltage, uploads repair completion photographs, and closes the ticket on the timeline.",
      tag: "Verified",
    },
  ];

  return (
    <section id="process" className="w-full bg-[#EAF3F5]/50 py-12 sm:py-16 border-b border-[#EAF3F5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center space-y-2 mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-[#087E8B]">
            Five-Stage Civic Lifecycle
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#263238] tracking-tight">
            How Complaints Are Handled &amp; Resolved
          </h2>
          <p className="text-sm text-[#263238]/75">
            Every reported issue follows a transparent, accountable workflow
            from first report to verified field completion.
          </p>
        </div>

        {/* 5 Process Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {steps.map((item, idx) => (
            <div
              key={idx}
              className="bg-white border border-[#EAF3F5] rounded-lg p-5 shadow-xs flex flex-col justify-between hover-lift transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#EAF3F5] text-[#173F5F] border border-[#087E8B]/20">
                    Step {item.step}
                  </span>
                  <span className="text-[10px] font-semibold text-[#087E8B] bg-[#EAF3F5] border border-[#087E8B]/20 px-1.5 py-0.5 rounded">
                    {item.tag}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#263238] mb-2">
                  {item.title}
                </h3>
                <p className="text-xs text-[#263238]/70 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {idx < steps.length - 1 && (
                <div className="hidden md:block pt-4 text-[#087E8B]/30 text-right font-bold">
                  &rarr;
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
