"use client";

import React, { useState } from "react";
import { Complaint } from "@/types/urjasetu";
import { ImageViewerModal, ImageViewerData } from "@/components/ImageViewerModal";
import { DEFAULT_HAZARD_FALLBACK_URL } from "@/utils/imageUtils";

interface TrackComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  complaints: Complaint[];
  initialSearchId?: string;
}

export const TrackComplaintModal: React.FC<TrackComplaintModalProps> = ({
  isOpen,
  onClose,
  complaints,
  initialSearchId = "",
}) => {
  const [searchInput, setSearchInput] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [liveComplaint, setLiveComplaint] = useState<Complaint | null>(null);
  const [viewerImage, setViewerImage] = useState<ImageViewerData | null>(null);

  // Auto-fetch if initialSearchId is provided on open
  React.useEffect(() => {
    if (!isOpen) return;
    const targetId = (initialSearchId || userQuery).trim().toUpperCase();
    if (!targetId) return;

    let isMounted = true;
    const timer = setTimeout(() => {
      setIsLoading(true);
      setErrorMessage("");

      fetch(`/api/complaints/track?id=${encodeURIComponent(targetId)}`)
        .then((res) => res.json())
        .then((data) => {
          if (!isMounted) return;
          if (data.success && data.complaint) {
            setLiveComplaint(data.complaint as Complaint);
          } else {
            const match = complaints.find((c) => c.id.toUpperCase() === targetId);
            if (match) setLiveComplaint(match);
          }
        })
        .catch(() => {
          if (!isMounted) return;
          const match = complaints.find((c) => c.id.toUpperCase() === targetId);
          if (match) setLiveComplaint(match);
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, initialSearchId, userQuery, complaints]);

  if (!isOpen) return null;

  const activeQuery = (userQuery || initialSearchId || "URJ-2026-000101").trim().toUpperCase();

  const foundComplaint =
    liveComplaint ||
    complaints.find((c) => c.id.toUpperCase() === activeQuery) ||
    complaints.find((c) => c.location.toUpperCase().includes(activeQuery)) ||
    null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    const term = searchInput.trim().toUpperCase();
    if (!term) return;

    setUserQuery(term);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/complaints/track?id=${encodeURIComponent(term)}`);
      const data = await res.json();
      if (res.ok && data.success && data.complaint) {
        setLiveComplaint(data.complaint as Complaint);
      } else {
        const match =
          complaints.find((c) => c.id.toUpperCase() === term) ||
          complaints.find((c) => c.location.toUpperCase().includes(term));
        if (match) {
          setLiveComplaint(match);
        } else {
          setLiveComplaint(null);
          setErrorMessage(
            data.error ||
              `No complaint found matching "${searchInput}". Please check the Reference ID format (e.g. URJ-2026-000001).`
          );
        }
      }
    } catch {
      const match =
        complaints.find((c) => c.id.toUpperCase() === term) ||
        complaints.find((c) => c.location.toUpperCase().includes(term));
      if (match) {
        setLiveComplaint(match);
      } else {
        setLiveComplaint(null);
        setErrorMessage(`Could not reach the server. Please verify your connection.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { key: "Submitted", label: "Citizen Report" },
    { key: "Under Review", label: "Admin Review" },
    { key: "Assigned", label: "Team Assigned" },
    { key: "Work Started", label: "Field Repair" },
    { key: "Resolved", label: "Resolved & Tested" },
  ];

  const getStepIndex = (status: string) => {
    switch (status) {
      case "Submitted":
        return 0;
      case "Under Review":
      case "In Review":
        return 1;
      case "Assigned":
      case "Team Assigned":
        return 2;
      case "On the Way":
      case "Work Started":
      case "Work Completed": // Field work completed, awaiting admin sign-off
        return 3;
      case "Resolved":
        return 4; // Only Admin-approved complaints reach step 5
      case "Rejected":
        return -1; // Special rejected state
      default:
        return 0;
    }
  };

  const currentStepIdx = foundComplaint ? getStepIndex(foundComplaint.status) : 0;

  // Priority 4: Citizens only see public-facing timeline entries. Internal directives are strictly excluded.
  const publicTimeline = foundComplaint
    ? foundComplaint.timeline.filter((item) => !item.isInternal)
    : [];

  return (
    <div className="fixed inset-0 z-50 bg-[#173F5F]/60 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border border-[#EAF3F5] rounded-xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden transition-all">
        {/* Modal Header (Deep Blue: #173F5F) */}
        <div className="bg-[#173F5F] text-[#F7F7F2] px-6 py-4 flex items-center justify-between border-b border-[#087E8B]/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#087E8B] text-white flex items-center justify-center font-bold">
              <svg
                className="w-4 h-4 text-[#F4A261]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Track Complaint Status</h3>
              <p className="text-[11px] text-[#EAF3F5]/80">
                No Login Needed &bull; Real-Time Repair Progress
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#263238]/60 hover:bg-[#263238] text-[#EAF3F5] flex items-center justify-center text-sm font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-[#263238]">
          {/* Search Box */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Enter Complaint ID (e.g. URJ-2026-000101)"
              className="flex-1 bg-white border border-[#EAF3F5] rounded-lg py-2.5 px-3.5 text-xs text-[#263238] font-mono focus:border-[#087E8B]"
              required
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 bg-[#173F5F] hover:bg-[#132a4a] disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all hover-lift shrink-0 shadow-xs flex items-center gap-1.5"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                  <span>Searching...</span>
                </>
              ) : (
                <span>Search Complaint</span>
              )}
            </button>
          </form>

          {errorMessage && (
            <div className="p-3 bg-[#F4A261]/20 border border-[#F4A261] text-[#b25514] rounded-lg text-xs">
              {errorMessage}
            </div>
          )}

          {foundComplaint && (
            <div className="space-y-5">
              {/* Complaint Header Card */}
              <div className="bg-[#F7F7F2] border border-[#EAF3F5] rounded-xl p-4.5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EAF3F5] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-base text-[#173F5F]">
                        {foundComplaint.id}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          foundComplaint.priority === "Critical"
                            ? "bg-[#F4A261]/25 text-[#b25514] border-[#F4A261]/50"
                            : foundComplaint.priority === "High"
                            ? "bg-[#F4A261]/15 text-[#b25514] border-[#F4A261]/30"
                            : "bg-[#EAF3F5] text-[#173F5F] border-[#087E8B]/20"
                        }`}
                      >
                        {foundComplaint.priority} Priority
                      </span>
                    </div>
                    <span className="font-bold text-[#263238] block mt-1 text-sm">
                      {foundComplaint.category}
                    </span>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-[#263238]/60 block">Reported At:</span>
                    <span className="font-medium text-[#263238] block">
                      {foundComplaint.reportedAt}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[#263238]/60 block text-[11px]">General Location</span>
                    <span className="font-bold text-[#263238]">{foundComplaint.ward}</span>
                    <span className="text-[#263238]/80 block text-[11px]">{foundComplaint.location}</span>
                  </div>
                  <div>
                    <span className="text-[#263238]/60 block text-[11px]">Assigned Maintenance Team</span>
                    <span className="font-semibold text-[#087E8B]">
                      {foundComplaint.assignedTeam || "Waiting for Review"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#263238]/60 block text-[11px]">Current Status</span>
                    <span className="font-bold text-[#173F5F]">
                      {foundComplaint.status}
                    </span>
                  </div>
                </div>

                {/* Privacy Guarantee Note */}
                <div className="pt-2 border-t border-[#EAF3F5] flex items-center justify-between text-[10px] text-[#263238]/60">
                  <span>🔒 Public Tracking View: Citizen phone numbers and private details are protected.</span>
                  {foundComplaint.coordinates && (
                    <span className="text-[#087E8B] font-mono">📍 Geotagged Issue</span>
                  )}
                </div>
              </div>

              {/* Priority 3: Rejection Notice in Public Tracking */}
              {foundComplaint.status === "Rejected" && (
                <div className="p-4 bg-[#F4A261]/20 border border-[#F4A261] rounded-xl text-xs text-[#b25514] space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <span>❌ Complaint Not Approved for Municipal Action</span>
                  </div>
                  <p className="leading-relaxed">
                    <strong>Official Explanation:</strong> {foundComplaint.rejectionReason || "This issue has been reviewed and determined to be outside municipal electrical jurisdiction or a duplicate submission."}
                  </p>
                  <p className="text-[11px] text-[#263238]/70">
                    If you believe this decision was made in error, you may submit a new report with additional location details or call the 24/7 helpline at 1912.
                  </p>
                </div>
              )}

              {/* Priority 2: Work Completed Awaiting Sign-off Notice */}
              {foundComplaint.status === "Work Completed" && (
                <div className="p-3.5 bg-[#EAF3F5] border border-[#087E8B]/40 rounded-xl text-xs text-[#173F5F] flex items-center gap-2.5 shadow-2xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#087E8B] shrink-0 animate-pulse"></span>
                  <div className="leading-relaxed">
                    <strong className="text-[#087E8B]">Field Repair Completed:</strong> On-site linemen have completed technical repairs and submitted photo evidence. Currently awaiting final review and verification by the Municipal Admin Desk before official closure.
                  </div>
                </div>
              )}

              {/* 5-Step Visual Stepper (Only when not rejected) */}
              {foundComplaint.status !== "Rejected" ? (
                <div>
                  <h4 className="font-extrabold text-xs text-[#173F5F] uppercase tracking-wider mb-2.5">
                    Five-Step Progress Lifecycle
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    {steps.map((st, idx) => {
                      const isPassed = idx < currentStepIdx;
                      const isCurrent = idx === currentStepIdx;
                      return (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                            isCurrent
                              ? "bg-[#EAF3F5] border-[#087E8B] ring-2 ring-[#087E8B]/20 text-[#173F5F]"
                              : isPassed
                              ? "bg-white border-[#087E8B]/30 text-[#087E8B]"
                              : "bg-[#F7F7F2] border-[#EAF3F5] text-[#263238]/40"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-[10px] font-bold">
                              0{idx + 1}
                            </span>
                            {isPassed && (
                              <span className="text-[#087E8B] text-xs font-bold">✓</span>
                            )}
                            {isCurrent && (
                              <span className="w-2 h-2 rounded-full bg-[#087E8B] inline-block animate-pulse"></span>
                            )}
                          </div>
                          <span className="font-bold text-[11px]">{st.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg text-center text-xs font-semibold text-[#b25514]">
                  Lifecycle stopped: Complaint marked as Rejected
                </div>
              )}

              {/* Citizen Evidence Photographs Section */}
              {foundComplaint.citizenPhotos && foundComplaint.citizenPhotos.length > 0 && (
                <div className="border border-[#EAF3F5] rounded-xl p-3.5 bg-[#F7F7F2]/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-[#173F5F] uppercase tracking-wider block">
                      Citizen Uploaded Hazard Evidence ({foundComplaint.citizenPhotos.length}):
                    </span>
                    <span className="text-[10px] text-[#087E8B] font-medium">Click to view full size</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {foundComplaint.citizenPhotos.map((photo, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          setViewerImage({
                            url: photo.url,
                            title: `Citizen Evidence: ${photo.name} (${foundComplaint.id})`,
                            caption: `${foundComplaint.category} • ${foundComplaint.location}`,
                          })
                        }
                        className="group relative bg-white border border-[#EAF3F5] hover:border-[#087E8B] p-1.5 rounded-lg shadow-2xs text-left cursor-pointer transition-transform hover:scale-102 focus:outline-none"
                        title={`Click to view ${photo.name}`}
                      >
                        <div className="relative overflow-hidden rounded-md">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo.url}
                            alt={photo.name}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = DEFAULT_HAZARD_FALLBACK_URL;
                            }}
                            className="w-full h-24 object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-[#173F5F]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                            🔍
                          </div>
                        </div>
                        <span className="text-[10px] text-[#263238]/70 truncate block mt-1 font-medium">
                          {photo.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Approved Resolution Photograph Section */}
              {foundComplaint.photoAfter && (
                <div className="border border-[#087E8B]/30 rounded-xl p-4 bg-[#EAF3F5] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-[#087E8B] uppercase tracking-wider block">
                      Approved Field Resolution Evidence (Site Proof):
                    </span>
                    <span className="text-[10px] text-[#087E8B] font-medium">Click to enlarge</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setViewerImage({
                        url: foundComplaint.photoAfter!,
                        title: `Official Repair Completion Proof (${foundComplaint.id})`,
                        caption: `Verified by UrjaSetu Administration for ${foundComplaint.category}`,
                      })
                    }
                    className="group relative inline-block bg-white border border-[#087E8B]/20 hover:border-[#087E8B] p-2 rounded-lg text-left cursor-pointer transition-all focus:outline-none"
                    title="Click to view full completion photo"
                  >
                    <div className="relative overflow-hidden rounded-md">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={foundComplaint.photoAfter}
                        alt="Resolution verification proof"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = DEFAULT_HAZARD_FALLBACK_URL;
                        }}
                        className="w-64 h-40 object-cover group-hover:opacity-95 transition-opacity"
                      />
                      <div className="absolute inset-0 bg-[#173F5F]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5">
                        <span>🔍 Click to View Full Size</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-[#087E8B] font-semibold block mt-1">
                      ✓ Repair verified by on-site electrical team
                    </span>
                  </button>
                </div>
              )}

              {/* Transparent Timeline Log (Priority 4: Public View only) */}
              <div>
                <h4 className="font-extrabold text-xs text-[#173F5F] uppercase tracking-wider mb-2">
                  Public Progress Milestones
                </h4>
                <div className="border border-[#EAF3F5] rounded-xl divide-y divide-[#EAF3F5] bg-white overflow-hidden shadow-2xs">
                  {publicTimeline.length === 0 ? (
                    <div className="p-3 text-xs text-[#263238]/60 text-center">
                      No public milestone updates yet.
                    </div>
                  ) : (
                    publicTimeline.map((item, idx) => (
                      <div key={idx} className="p-3 text-xs flex flex-col sm:flex-row justify-between gap-1">
                        <div>
                          <span className="font-bold text-[#263238]">{item.stage}: </span>
                          <span className="text-[#263238]/80">{item.note}</span>
                        </div>
                        <div className="text-[11px] text-[#263238]/60 font-mono shrink-0">
                          {item.time} &bull; {item.actor}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Resolution Note if resolved */}
              {foundComplaint.resolutionNotes && (
                <div className="p-3.5 bg-[#EAF3F5] border border-[#087E8B]/30 rounded-xl text-xs text-[#173F5F]">
                  <span className="font-extrabold block mb-0.5">Field Resolution Sign-Off:</span>
                  <p>{foundComplaint.resolutionNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-[#F7F7F2] border-t border-[#EAF3F5] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold border border-[#087E8B]/30 rounded-lg bg-white hover:bg-[#EAF3F5] text-[#173F5F] transition-colors"
          >
            Close Window
          </button>
        </div>
      </div>

      {/* Reusable Image Lightbox */}
      <ImageViewerModal
        isOpen={!!viewerImage}
        onClose={() => setViewerImage(null)}
        imageData={viewerImage}
      />
    </div>
  );
};
