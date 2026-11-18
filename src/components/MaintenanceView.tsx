"use client";

import React, { useState } from "react";
import { Complaint, MaintenanceTeam, StaffMember } from "@/types/urjasetu";
import { ImageViewerModal, ImageViewerData } from "@/components/ImageViewerModal";
import { DEFAULT_HAZARD_FALLBACK_URL } from "@/utils/imageUtils";

interface MaintenanceViewProps {
  teams: MaintenanceTeam[];
  complaints: Complaint[];
  staffMembers: StaffMember[];
  onAssignWorker: (complaintId: string, workerName: string) => void;
  onSendInstruction?: (complaintId: string, instruction: string) => void;
  onExit?: () => void;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  teams,
  complaints,
  staffMembers,
  onAssignWorker,
  onSendInstruction,
  onExit,
}) => {
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id || "");
  const [filterUrgency, setFilterUrgency] = useState<string>("ALL");
  const [dispatchAlert, setDispatchAlert] = useState<string | null>(null);

  // Work instruction modal state
  const [instructionModalTask, setInstructionModalTask] = useState<Complaint | null>(null);
  const [instructionText, setInstructionText] = useState("");
  const [viewerImage, setViewerImage] = useState<ImageViewerData | null>(null);

  const currentTeam = teams.find((t) => t.id === selectedTeamId) || teams[0];

  // Active staff members assigned to this team
  const teamStaff = staffMembers.filter(
    (s) => s.teamId === currentTeam?.id && s.status === "Active"
  );

  // Complaints assigned strictly to this team (role scoping)
  const assignedComplaints = complaints.filter(
    (c) =>
      c.assignedTeamId === currentTeam?.id ||
      c.assignedTeam === currentTeam?.name
  );

  const delayedCount = assignedComplaints.filter((c) => c.isDelayed && c.status !== "Resolved").length;

  const filteredTasks = assignedComplaints.filter((c) => {
    if (filterUrgency === "CRITICAL") return c.priority === "Critical";
    if (filterUrgency === "PENDING_DISPATCH") return !c.assignedWorker;
    if (filterUrgency === "DELAYED") return c.isDelayed;
    return true;
  });

  const handleQuickDispatch = (complaintId: string, workerName: string) => {
    onAssignWorker(complaintId, workerName);
    setDispatchAlert(`Dispatched ${workerName} to complaint ${complaintId}.`);
    setTimeout(() => setDispatchAlert(null), 3000);
  };

  const handleSendInstructionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!instructionModalTask || !instructionText.trim()) return;

    if (onSendInstruction) {
      onSendInstruction(instructionModalTask.id, instructionText.trim());
    }

    setDispatchAlert(`Work instruction dispatched to field worker for ${instructionModalTask.id}.`);
    setTimeout(() => setDispatchAlert(null), 3500);
    setInstructionModalTask(null);
    setInstructionText("");
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
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                Maintenance Team Dashboard
              </h1>
              <span className="bg-[#263238]/70 text-[#EAF3F5] text-[10px] font-mono px-2 py-0.5 rounded border border-[#087E8B]/40 uppercase font-semibold">
                Squad Control
              </span>
            </div>
            <p className="text-xs text-[#EAF3F5]/80 mt-0.5">
              Manage your squad, assign technicians to complaints, and send instructions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-center">
          <div className="hidden sm:flex items-center gap-2 text-xs bg-[#263238]/60 border border-[#087E8B]/30 px-3 py-1.5 rounded-lg text-[#EAF3F5]">
            <span className="w-2 h-2 rounded-full bg-[#087E8B] animate-pulse"></span>
            <span>Squad Role Scoping Active</span>
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

      {/* Role-Based Notice & Squad Selector */}
      <div className="p-3.5 bg-[#EAF3F5] border border-[#087E8B]/30 rounded-xl text-xs text-[#173F5F] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#087E8B]"></span>
          <span>
            Authorized Unit Access: Displaying work orders dispatched exclusively to <strong>{currentTeam?.name}</strong>.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#263238]/60">Authorized Squad Desk:</span>
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="bg-white border border-[#087E8B]/30 rounded-lg py-1 px-2.5 text-xs font-semibold text-[#173F5F]"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.area})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Squad Roster Overview Card */}
      <div className="bg-white border border-[#EAF3F5] rounded-xl p-4.5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EAF3F5] pb-2.5">
          <div>
            <h3 className="font-bold text-sm text-[#173F5F]">
              {currentTeam?.name} &bull; Personnel Roster ({teamStaff.length} Linemen)
            </h3>
            <span className="text-[11px] text-[#263238]/70">
              Team Leader: <strong>{currentTeam?.leadTechnician || "Unassigned"}</strong> &bull; Area: {currentTeam?.area}
            </span>
          </div>
          <span className="bg-emerald-50 text-[#087E8B] text-[10px] font-bold px-2 py-0.5 rounded border border-[#087E8B]/20 self-start sm:self-auto">
            {currentTeam?.status}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {teamStaff.map((s) => (
            <div
              key={s.id}
              className="bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg p-2.5 flex items-center gap-2 shadow-2xs"
            >
              <div className="w-7 h-7 rounded-full bg-[#EAF3F5] text-[#173F5F] font-bold flex items-center justify-center text-[10px]">
                {s.fullName[0]}
              </div>
              <div>
                <span className="font-bold text-[#263238] block text-[11px]">{s.fullName}</span>
                <span className="text-[10px] text-[#087E8B] font-mono">{s.staffId} &bull; {s.designation}</span>
              </div>
            </div>
          ))}
          {teamStaff.length === 0 && (
            <span className="text-slate-400 italic text-[11px]">No active technicians assigned to this squad.</span>
          )}
        </div>
      </div>

      {/* Dispatch Alert Toast */}
      {dispatchAlert && (
        <div className="p-3 bg-[#EAF3F5] border border-[#087E8B] text-[#087E8B] font-bold rounded-lg text-xs flex items-center justify-between shadow-xs">
          <span>✓ {dispatchAlert}</span>
          <button
            type="button"
            onClick={() => setDispatchAlert(null)}
            className="text-xs text-[#087E8B] hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Task Ledger for this Team */}
      <div className="bg-white border border-[#EAF3F5] rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 bg-[#F7F7F2] border-b border-[#EAF3F5] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-[#263238]">
              Assigned Work Orders for {currentTeam?.name} ({assignedComplaints.length})
            </h3>
            {delayedCount > 0 && (
              <span className="bg-[#F4A261]/25 text-[#b25514] font-bold text-[10px] px-2 py-0.5 rounded border border-[#F4A261]/40">
                ⚠ {delayedCount} Delayed
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#263238]/60">Filter Urgency:</span>
            <select
              value={filterUrgency}
              onChange={(e) => setFilterUrgency(e.target.value)}
              className="bg-white border border-[#EAF3F5] rounded-lg py-1 px-2.5 text-xs text-[#263238]"
            >
              <option value="ALL">All Assigned</option>
              <option value="CRITICAL">Critical Severity Only</option>
              <option value="PENDING_DISPATCH">Pending Lineman Dispatch</option>
              <option value="DELAYED">Delayed Tickets ({delayedCount})</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#173F5F] text-white uppercase text-[11px] font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Ticket ID</th>
                <th className="py-3 px-3">Hazard Details</th>
                <th className="py-3 px-3">Location &amp; GPS</th>
                <th className="py-3 px-3">Priority</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Assigned Lineman</th>
                <th className="py-3 px-4 text-right">Coordination Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAF3F5]">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#263238]/60 text-xs">
                    No work orders found for this maintenance squad matching the active filter.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-[#F7F7F2] transition-colors">
                    {/* ID & Time */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-[#173F5F] block">
                        {task.id}
                      </span>
                      <span className="text-[11px] text-[#263238]/60 font-mono">
                        {task.reportedAt}
                      </span>
                      {task.isDelayed && (
                        <span className="text-[10px] font-bold text-[#b25514] bg-[#F4A261]/20 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                          Delayed SLA
                        </span>
                      )}
                    </td>

                    {/* Hazard */}
                    <td className="py-3.5 px-3">
                      <span className="font-bold text-[#263238] block">{task.category}</span>
                      <span className="text-[11px] text-[#263238]/70 line-clamp-1">
                        {task.description}
                      </span>
                      {task.citizenPhotos && task.citizenPhotos.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {task.citizenPhotos.map((photo, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() =>
                                setViewerImage({
                                  url: photo.url,
                                  title: `Citizen Evidence: ${photo.name} (${task.id})`,
                                  caption: `${task.category} • ${task.location}`,
                                })
                              }
                              className="group relative rounded border border-[#EAF3F5] overflow-hidden hover:border-[#087E8B] transition-transform hover:scale-105 cursor-pointer focus:outline-none"
                              title={`Click to view ${photo.name}`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photo.url}
                                alt={photo.name}
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = DEFAULT_HAZARD_FALLBACK_URL;
                                }}
                                className="w-8 h-8 object-cover"
                              />
                            </button>
                          ))}
                          <span className="text-[10px] text-[#087E8B] font-semibold">
                            {task.citizenPhotos.length} {task.citizenPhotos.length === 1 ? "photo" : "photos"}
                          </span>
                        </div>
                      )}
                      {task.photoAfter && (
                        <button
                          type="button"
                          onClick={() =>
                            setViewerImage({
                              url: task.photoAfter!,
                              title: `Repair Completion Proof (${task.id})`,
                              caption: `Submitted by ${task.assignedWorker || "Lineman"} for ${task.category}`,
                            })
                          }
                          className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-[#087E8B] font-bold bg-[#EAF3F5] px-2 py-0.5 rounded border border-[#087E8B]/30 hover:bg-[#087E8B] hover:text-white transition-colors"
                          title="Click to view repair proof photo"
                        >
                          <span>📸 View Repair Proof</span>
                        </button>
                      )}
                    </td>

                    {/* Location & GPS Map Link */}
                    <td className="py-3.5 px-3">
                      <span className="font-medium text-[#263238] block">{task.location}</span>
                      <span className="text-[11px] text-[#263238]/60 block">{task.ward}</span>
                      {task.coordinates ? (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${task.coordinates.latitude},${task.coordinates.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-[#087E8B] font-semibold hover:underline inline-flex items-center gap-1 mt-0.5"
                        >
                          <span>📍 Maps Directions ({task.coordinates.latitude.toFixed(3)}, {task.coordinates.longitude.toFixed(3)}) [↗]</span>
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-400">Manual address entry</span>
                      )}
                    </td>

                    {/* Priority */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-block ${task.priority === "Critical"
                          ? "bg-[#F4A261]/25 text-[#b25514] border-[#F4A261]/50"
                          : task.priority === "High"
                            ? "bg-[#F4A261]/15 text-[#b25514] border-[#F4A261]/30"
                            : "bg-[#EAF3F5] text-[#173F5F] border-[#087E8B]/20"
                          }`}
                      >
                        {task.priority}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded border inline-block ${
                          task.status === "Resolved"
                            ? "bg-emerald-50 text-[#087E8B] border-[#087E8B]/30"
                            : task.status === "Work Completed"
                            ? "bg-[#EAF3F5] text-[#087E8B] border-[#087E8B]/40 font-bold"
                            : task.status === "Work Started" || task.status === "On the Way"
                            ? "bg-[#F4A261]/15 text-[#b25514] border-[#F4A261]/30"
                            : "bg-[#EAF3F5] text-[#173F5F] border-[#087E8B]/30"
                        }`}
                      >
                        {task.status}
                      </span>
                    </td>

                    {/* Assigned Lineman */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {task.assignedWorker ? (
                        <span className="font-semibold text-[#173F5F] block">
                          {task.assignedWorker}
                        </span>
                      ) : (
                        <span className="text-[#b25514] text-[11px] font-bold bg-[#F4A261]/15 px-2 py-0.5 rounded border border-[#F4A261]/30">
                          Pending Dispatch
                        </span>
                      )}
                    </td>

                    {/* Coordination Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleQuickDispatch(task.id, e.target.value);
                          }
                        }}
                        defaultValue=""
                        className="bg-white border border-[#087E8B]/30 rounded-lg py-1 px-2 text-xs font-semibold text-[#087E8B] hover:bg-[#EAF3F5] transition-colors"
                      >
                        <option value="" disabled>
                          {task.assignedWorker ? "Reassign..." : "Dispatch..."}
                        </option>
                        {teamStaff.map((s) => (
                          <option key={s.id} value={s.fullName}>
                            {s.fullName} ({s.staffId})
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          setInstructionModalTask(task);
                          setInstructionText("");
                        }}
                        className="px-2 py-1 rounded border border-[#173F5F]/30 text-[#173F5F] hover:bg-[#EAF3F5] text-xs font-semibold"
                      >
                        Send Instructions
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Send Instruction Modal */}
      {instructionModalTask && (
        <div className="fixed inset-0 z-50 bg-[#173F5F]/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#EAF3F5] rounded-xl shadow-2xl max-w-md w-full overflow-hidden text-xs text-[#263238]">
            <div className="bg-[#173F5F] text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-extrabold text-sm">Send Instructions: {instructionModalTask.id}</h3>
              <button
                type="button"
                onClick={() => setInstructionModalTask(null)}
                className="text-white/80 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendInstructionSubmit} className="p-5 space-y-4">
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#173F5F] border-b border-[#EAF3F5] pb-1">
                  Technician Assignment
                </h4>
              </div>

              <div className="bg-[#F7F7F2] p-3 rounded-lg border border-[#EAF3F5]">
                <span className="text-[11px] text-[#263238]/60 block font-mono">Assigned Lineman:</span>
                <span className="font-bold text-sm text-[#263238]">
                  {instructionModalTask.assignedWorker || "Squad Lineman (Unassigned)"}
                </span>
                <span className="text-[11px] text-[#087E8B] block mt-0.5">
                  {instructionModalTask.location} ({instructionModalTask.ward})
                </span>
              </div>

              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#173F5F] border-b border-[#EAF3F5] pb-1 pt-1">
                  Work Instructions
                </h4>
              </div>

              <div>
                <label className="block font-bold text-xs text-[#263238] mb-1">
                  Safety &amp; Repair Instructions <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={instructionText}
                  onChange={(e) => setInstructionText(e.target.value)}
                  placeholder="e.g. Ensure 11kV gloves are worn; cordon off pedestrian crossing; bucket truck needed..."
                  className="w-full bg-[#F7F7F2] border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-[#087E8B]"
                  required
                ></textarea>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#EAF3F5]">
                <button
                  type="button"
                  onClick={() => setInstructionModalTask(null)}
                  className="px-4 py-2 border border-[#EAF3F5] rounded-lg font-semibold hover:bg-[#F7F7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#087E8B] hover:bg-[#06636E] text-white font-bold rounded-lg shadow-xs"
                >
                  Send Instructions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Image Viewer */}
      <ImageViewerModal
        isOpen={!!viewerImage}
        onClose={() => setViewerImage(null)}
        imageData={viewerImage}
      />
    </div>
  );
};
