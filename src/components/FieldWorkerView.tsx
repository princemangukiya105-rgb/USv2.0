"use client";

import React, { useState } from "react";
import { Complaint, ComplaintStatus, StaffMember, GeoCoordinates } from "@/types/urjasetu";
import { ImageViewerModal, ImageViewerData } from "@/components/ImageViewerModal";
import { fileToDataUrl, validateImageFile, DEFAULT_HAZARD_FALLBACK_URL } from "@/utils/imageUtils";

interface FieldWorkerViewProps {
  complaints: Complaint[];
  staffMembers: StaffMember[];
  onUpdateStatus: (
    complaintId: string,
    newStatus: ComplaintStatus,
    completionNote: string,
    photoProofUrl?: string
  ) => void;
  onExit?: () => void;
}

export const FieldWorkerView: React.FC<FieldWorkerViewProps> = ({
  complaints,
  staffMembers,
  onUpdateStatus,
  onExit,
}) => {
  // Active technicians from staff roster
  const activeTechnicians = staffMembers.filter((s) => s.status === "Active");
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    activeTechnicians[0]?.id || "stf-001"
  );

  const currentTechnician =
    activeTechnicians.find((s) => s.id === selectedStaffId) || activeTechnicians[0];

  // Scoped tasks: only complaints assigned to THIS individual staff member
  const assignedWorkerTasks = complaints.filter((c) => {
    if (!currentTechnician) return false;
    const nameMatch =
      c.assignedWorker &&
      (c.assignedWorker.includes(currentTechnician.fullName) ||
        currentTechnician.fullName.includes(c.assignedWorker.split("(")[0].trim()));
    const idMatch = c.assignedWorkerId === currentTechnician.id;
    return (nameMatch || idMatch) && c.status !== "Resolved" && c.status !== "Rejected";
  });

  const [selectedTask, setSelectedTask] = useState<Complaint | null>(
    assignedWorkerTasks[0] || null
  );

  // Status options per user requirements: Assigned | On the Way | Work Started | Work Completed
  const [statusUpdate, setStatusUpdate] = useState<
    "Assigned" | "On the Way" | "Work Started" | "Work Completed"
  >("On the Way");
  const [technicianNote, setTechnicianNote] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [viewerImage, setViewerImage] = useState<ImageViewerData | null>(null);
  const [safetyCheck1, setSafetyCheck1] = useState(true);
  const [safetyCheck2, setSafetyCheck2] = useState(true);
  const [safetyCheck3, setSafetyCheck3] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Voluntary Technician Location Sharing (Part 4)
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [voluntaryCoords, setVoluntaryCoords] = useState<GeoCoordinates | null>(null);
  const [locationShareMsg, setLocationShareMsg] = useState<string | null>(null);

  const handleVoluntaryLocationShare = () => {
    setLocationShareMsg(null);
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationShareMsg("Geolocation is not supported by your mobile browser.");
      return;
    }

    setIsSharingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsSharingLocation(false);
        const coords: GeoCoordinates = {
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy),
          detectedAt: "Just now",
        };
        setVoluntaryCoords(coords);
        setLocationShareMsg(`Voluntary GPS coordinates shared with squad dispatch (±${coords.accuracy}m).`);
      },
      (err) => {
        setIsSharingLocation(false);
        setLocationShareMsg(`Location sharing failed (${err.message}).`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setPhotoError(validation.error || "Unsupported image file format.");
        return;
      }
      try {
        const dataUrl = await fileToDataUrl(file);
        setPhotoPreview(dataUrl);
      } catch {
        setPhotoError("Failed to process photo proof. Please try another image.");
      }
    }
  };

  const handleSaveProgress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    if (statusUpdate === "Work Completed" && !technicianNote.trim()) {
      alert("Please provide completion notes describing the technical repair conducted on site.");
      return;
    }

    // Work Completed must strictly remain Work Completed — never auto-convert to Resolved.
    // Admin must review completion photos and technician notes to approve resolution.
    onUpdateStatus(
      selectedTask.id,
      statusUpdate,
      technicianNote.trim() || `Field progress updated to "${statusUpdate}".`,
      photoPreview || undefined
    );

    setSuccessMsg(
      statusUpdate === "Work Completed"
        ? `Ticket ${selectedTask.id} marked as "Work Completed". Sent to Admin for final review & sign-off.`
        : `Ticket ${selectedTask.id} status successfully updated to "${statusUpdate}".`
    );
    setTimeout(() => setSuccessMsg(null), 4000);
    setTechnicianNote("");
    setPhotoPreview(null);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Header (Deep Blue: #173F5F) */}
      <div className="bg-[#173F5F] text-[#F7F7F2] rounded-xl p-5 sm:p-6 border border-[#087E8B]/30 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-[#087E8B] text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
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
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                Lineman Work Desk
              </h1>
              <span className="bg-[#263238]/70 text-[#EAF3F5] text-[10px] font-mono px-2 py-0.5 rounded border border-[#087E8B]/40 uppercase font-semibold">
                Field Portal
              </span>
            </div>
            <p className="text-xs text-[#EAF3F5]/80 mt-0.5">
              View assigned electrical complaints, follow directions, check safety steps, and report completed work.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-center">
          <div className="hidden sm:flex items-center gap-2 text-xs bg-[#263238]/60 border border-[#087E8B]/30 px-3 py-1.5 rounded-lg text-[#EAF3F5]">
            <span className="w-2 h-2 rounded-full bg-[#087E8B] animate-pulse"></span>
            <span>Badge: {currentTechnician?.staffId}</span>
          </div>

          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white hover:bg-[#EAF3F5] text-[#173F5F] transition-all hover-lift shadow-2xs flex items-center gap-1.5"
            >
              <span>&larr;</span>
              <span>Back</span>
            </button>
          )}
        </div>
      </div>

      {/* Role-Based Scoping & Voluntary GPS Sharing Strip */}
      <div className="p-3.5 bg-[#EAF3F5] border border-[#087E8B]/30 rounded-xl text-xs text-[#173F5F] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#087E8B]"></span>
          <span>
            Technician: <strong>{currentTechnician?.fullName}</strong> ({currentTechnician?.designation}) &bull; Squad: {currentTechnician?.teamName}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Voluntary GPS Share Button */}
          <button
            type="button"
            onClick={handleVoluntaryLocationShare}
            disabled={isSharingLocation}
            className="px-3 py-1 bg-white hover:bg-[#EAF3F5] text-[#173F5F] border border-[#087E8B]/30 rounded-lg font-semibold text-xs transition-all hover-lift flex items-center gap-1.5 shadow-2xs"
          >
            {isSharingLocation ? (
              <span>Locating...</span>
            ) : (
              <>
                <span>📍</span>
                <span>Share My Location Voluntarily</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[#263238]/70 font-semibold">Switch Badge:</span>
            <select
              value={selectedStaffId}
              onChange={(e) => {
                setSelectedStaffId(e.target.value);
                setSelectedTask(null);
              }}
              className="bg-white border border-[#087E8B]/30 rounded-lg py-1 px-2 text-xs font-semibold text-[#173F5F]"
            >
              {activeTechnicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName} ({t.staffId})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Voluntary Location Feedback */}
      {locationShareMsg && (
        <div className="p-3 bg-white border border-[#087E8B]/40 rounded-xl text-xs text-[#087E8B] flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
          <div className="flex flex-wrap items-center gap-2">
            <span>✓ {locationShareMsg}</span>
            {voluntaryCoords && (
              <span className="font-mono text-[10px] bg-[#EAF3F5] text-[#173F5F] px-2 py-0.5 rounded border border-[#087E8B]/20">
                Fix: {voluntaryCoords.latitude}° N, {voluntaryCoords.longitude}° E
              </span>
            )}
          </div>
          <span className="text-[10px] text-[#263238]/60 italic">Never tracked secretly or continuously.</span>
        </div>
      )}

      {/* Success Notification */}
      {successMsg && (
        <div className="p-3.5 bg-[#EAF3F5] border border-[#087E8B] text-[#087E8B] font-bold rounded-xl text-xs flex items-center justify-between shadow-xs">
          <span>✓ {successMsg}</span>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-xs text-[#087E8B] hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Assigned Work Orders for this Lineman */}
        <div className="lg:col-span-2 space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#263238]">
              Assigned Tickets for {currentTechnician?.fullName} ({assignedWorkerTasks.length})
            </h3>
            <span className="text-[11px] text-[#263238]/60">
              Only authorized tasks assigned to your badge are accessible
            </span>
          </div>

          {assignedWorkerTasks.length === 0 ? (
            <div className="bg-white border border-[#EAF3F5] rounded-xl p-10 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-[#EAF3F5] text-[#087E8B] mx-auto flex items-center justify-center font-bold">
                ✓
              </div>
              <h4 className="font-bold text-sm text-[#173F5F]">No Incomplete Tasks</h4>
              <p className="text-xs text-[#263238]/60 max-w-md mx-auto">
                No active work orders currently assigned to {currentTechnician?.fullName}. New assignments from your Maintenance Squad or Central Dispatch will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignedWorkerTasks.map((task) => {
                const isSelected = selectedTask?.id === task.id;
                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={`bg-white border rounded-xl p-4.5 cursor-pointer transition-all hover-lift ${isSelected
                      ? "border-[#087E8B] ring-2 ring-[#087E8B]/20 shadow-xs"
                      : "border-[#EAF3F5] hover:border-[#087E8B]/40"
                      }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-[#173F5F]">
                            {task.id}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${task.priority === "Critical"
                              ? "bg-[#F4A261]/25 text-[#b25514] border-[#F4A261]/50"
                              : "bg-[#EAF3F5] text-[#173F5F] border-[#087E8B]/20"
                              }`}
                          >
                            {task.priority}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-[#263238] mt-1">{task.category}</h4>
                      </div>

                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${task.status === "Work Completed"
                          ? "bg-[#EAF3F5] text-[#087E8B] border-[#087E8B]/40 font-bold"
                          : task.status === "Work Started" || task.status === "On the Way"
                            ? "bg-[#F4A261]/15 text-[#b25514] border-[#F4A261]/30"
                            : "bg-[#EAF3F5] text-[#173F5F] border-[#087E8B]/30"
                          }`}
                      >
                        {task.status === "Work Completed" ? "Work Completed (Awaiting Admin Sign-off)" : task.status}
                      </span>
                    </div>

                    <div className="text-xs text-[#263238]/80 space-y-1 mb-2">
                      <p>
                        <strong>Location:</strong> {task.location} ({task.ward})
                      </p>
                      <p className="text-[11px] text-[#263238]/60">
                        <strong>Landmark:</strong> {task.landmark}
                      </p>
                    </div>

                    {/* GPS Navigation Link & Coordinates */}
                    {task.coordinates && (
                      <div className="bg-[#EAF3F5] p-2 rounded-lg border border-[#087E8B]/20 flex items-center justify-between mb-2">
                        <span className="text-[11px] font-mono text-[#173F5F]">
                          📍 Coordinates: {task.coordinates.latitude}° N, {task.coordinates.longitude}° E
                        </span>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${task.coordinates.latitude},${task.coordinates.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-[#087E8B] hover:bg-[#06636E] text-white rounded text-[11px] font-bold shadow-2xs inline-flex items-center gap-1"
                        >
                          <span>Open in Maps</span>
                          <span>[↗]</span>
                        </a>
                      </div>
                    )}

                    <p className="text-xs text-[#263238]/70 bg-[#F7F7F2] p-2.5 rounded-lg border border-[#EAF3F5]">
                      {task.description}
                    </p>

                    {/* Citizen evidence preview if present */}
                    {task.citizenPhotos && task.citizenPhotos.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-[#EAF3F5] flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-[#087E8B]">
                          Citizen Photos:
                        </span>
                        <div className="flex gap-1.5 overflow-x-auto">
                          {task.citizenPhotos.map((photo, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewerImage({
                                  url: photo.url,
                                  title: `Citizen Evidence: ${photo.name} (${task.id})`,
                                  caption: `${task.category} • ${task.location}`,
                                });
                              }}
                              className="group relative rounded overflow-hidden border border-[#EAF3F5] hover:border-[#087E8B] transition-transform hover:scale-105 cursor-pointer focus:outline-none"
                              title={`Click to enlarge ${photo.name}`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photo.url}
                                alt={photo.name}
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = DEFAULT_HAZARD_FALLBACK_URL;
                                }}
                                className="w-8 h-8 rounded object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Field Repair & Status Progress Execution Form */}
        <div className="bg-white border border-[#EAF3F5] rounded-xl p-5 shadow-xs text-xs space-y-4">
          <div className="border-b border-[#EAF3F5] pb-3">
            <h3 className="font-extrabold text-sm text-[#173F5F]">On-Site Work Order Execution</h3>
            <p className="text-[11px] text-[#263238]/60">
              Update task status, check safety precautions, and submit photo proof.
            </p>
          </div>

          {selectedTask ? (
            <form onSubmit={handleSaveProgress} className="space-y-4">
              <div className="bg-[#F7F7F2] p-3 rounded-lg border border-[#EAF3F5]">
                <span className="text-[11px] text-[#263238]/60 block font-mono">
                  Active Ticket: {selectedTask.id}
                </span>
                <span className="font-bold text-sm text-[#263238] block mt-0.5">
                  {selectedTask.category}
                </span>
                <span className="text-[11px] text-[#263238]/70 block">
                  {selectedTask.location}
                </span>
              </div>

              {/* Citizen-Reported Hazard Evidence (Dedicated Lineman Reference Section) */}
              {selectedTask.citizenPhotos && selectedTask.citizenPhotos.length > 0 && (
                <div className="border border-[#087E8B]/25 rounded-lg p-3 bg-[#EAF3F5]/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-[#173F5F] flex items-center gap-1.5 uppercase tracking-wider">
                      <span>📸 Citizen Hazard Evidence ({selectedTask.citizenPhotos.length})</span>
                    </span>
                    <span className="text-[10px] text-[#087E8B] font-medium">Click to inspect</span>
                  </div>
                  <p className="text-[11px] text-[#263238]/80">
                    Review photos taken on site by citizen before proceeding with electrical repairs.
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {selectedTask.citizenPhotos.map((photo, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() =>
                          setViewerImage({
                            url: photo.url,
                            title: `Citizen Hazard Photo: ${photo.name} (${selectedTask.id})`,
                            caption: `${selectedTask.category} • ${selectedTask.location}`,
                          })
                        }
                        className="group relative shrink-0 border border-[#087E8B]/30 rounded-md bg-white p-1 hover:border-[#087E8B] transition-transform hover:scale-105 cursor-pointer text-left focus:outline-none"
                        title={`Click to enlarge ${photo.name}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.url}
                          alt={photo.name}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = DEFAULT_HAZARD_FALLBACK_URL;
                          }}
                          className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded"
                        />
                        <div className="absolute inset-1 bg-[#173F5F]/40 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center text-white text-xs font-bold">
                          🔍
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#173F5F] border-b border-[#EAF3F5] pb-1">
                  Safety Checklist
                </h4>
              </div>

              {/* Mandatory Electrical Safety Checklist */}
              <div className="space-y-2 border border-[#EAF3F5] rounded-lg p-3 bg-white">
                <span className="font-bold text-xs text-[#263238] block">
                  Mandatory Safety Checklist:
                </span>
                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-[#263238]">
                  <input
                    type="checkbox"
                    checked={safetyCheck1}
                    onChange={(e) => setSafetyCheck1(e.target.checked)}
                    className="rounded text-[#087E8B] focus:ring-[#087E8B]"
                  />
                  <span>Circuit isolated &amp; Lock-out Tag-out verified</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-[#263238]">
                  <input
                    type="checkbox"
                    checked={safetyCheck2}
                    onChange={(e) => setSafetyCheck2(e.target.checked)}
                    className="rounded text-[#087E8B] focus:ring-[#087E8B]"
                  />
                  <span>High-visibility vest &amp; 11kV insulated gloves worn</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-[#263238]">
                  <input
                    type="checkbox"
                    checked={safetyCheck3}
                    onChange={(e) => setSafetyCheck3(e.target.checked)}
                    className="rounded text-[#087E8B] focus:ring-[#087E8B]"
                  />
                  <span>Hazard zone barricaded &amp; warning cones deployed</span>
                </label>
              </div>

              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#173F5F] border-b border-[#EAF3F5] pb-1 pt-1">
                  Work Progress
                </h4>
              </div>

              {/* Work Status Update Options (Assigned, On the Way, Work Started, Work Completed) */}
              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">
                  Update Work Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={statusUpdate}
                  onChange={(e) =>
                    setStatusUpdate(
                      e.target.value as "Assigned" | "On the Way" | "Work Started" | "Work Completed"
                    )
                  }
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs text-[#263238] focus:bg-white focus:border-[#087E8B]"
                >
                  <option value="Assigned">Assigned (Acknowledged)</option>
                  <option value="On the Way">On the Way (Dispatched to location)</option>
                  <option value="Work Started">Work Started (On site repairing)</option>
                  <option value="Work Completed">Work Completed (Repaired &amp; tested)</option>
                </select>
              </div>

              {/* Field Technician Completion Notes */}
              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">
                  Repair Actions &amp; Work Notes:
                </label>
                <textarea
                  rows={3}
                  value={technicianNote}
                  onChange={(e) => setTechnicianNote(e.target.value)}
                  placeholder="e.g. Replaced faulty photocell sensor, tightened neutral lugs, energized streetlight and tested voltage at 230V..."
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs text-[#263238] focus:bg-white focus:border-[#087E8B]"
                  required={statusUpdate === "Work Completed"}
                ></textarea>
              </div>

              {/* Resolution Photo Upload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-[#263238]">
                    Attach Resolution Photo Proof:
                  </label>
                  <span className="text-[10px] text-[#087E8B] font-medium">Max 10MB (JPG/PNG/WEBP)</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="w-full text-xs text-[#263238] file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#EAF3F5] file:text-[#173F5F] hover:file:bg-[#087E8B] hover:file:text-white"
                />
                {photoError && (
                  <div className="p-2 bg-[#F4A261]/20 border border-[#F4A261] text-[#b25514] rounded text-[11px]">
                    {photoError}
                  </div>
                )}
                {photoPreview && (
                  <div className="border border-[#087E8B]/30 rounded-lg p-2 bg-[#F7F7F2]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-[#087E8B] font-bold">
                        Uploaded Site Proof Preview:
                      </span>
                      <span className="text-[10px] text-[#087E8B]">Click to preview full size</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setViewerImage({
                          url: photoPreview,
                          title: `Field Repair Completion Proof (${selectedTask.id})`,
                          caption: `Repairs by ${currentTechnician?.fullName || "Lineman"}`,
                        })
                      }
                      className="group relative w-full block cursor-pointer focus:outline-none"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoPreview}
                        alt="Completion Proof"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = DEFAULT_HAZARD_FALLBACK_URL;
                        }}
                        className="w-full h-32 object-cover rounded-md group-hover:opacity-95"
                      />
                      <div className="absolute inset-0 bg-[#173F5F]/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center text-white text-xs font-bold gap-1.5">
                        <span>🔍 Click to View Full Size</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-2.5 bg-[#087E8B] hover:bg-[#06636E] text-white font-bold rounded-lg transition-all hover-lift shadow-xs flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Save Work Progress &rarr;</span>
              </button>
            </form>
          ) : (
            <div className="py-12 text-center text-[#263238]/60">
              Select an assigned work order from the list to update progress.
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Image Viewer */}
      <ImageViewerModal
        isOpen={!!viewerImage}
        onClose={() => setViewerImage(null)}
        imageData={viewerImage}
      />
    </div>
  );
};
