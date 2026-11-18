"use client";

import React, { useState } from "react";
import { Complaint, IssueCategory } from "@/types/urjasetu";
import { WARDS_LIST, ISSUE_CATEGORIES } from "@/data/demoData";
import {
  fileToDataUrl,
  validateImageFile,
  formatFileSize,
  MAX_PHOTOS_PER_COMPLAINT,
  DEFAULT_HAZARD_FALLBACK_URL,
} from "@/utils/imageUtils";

interface UploadedPhoto {
  id: string;
  file: File;
  name: string;
  sizeFormatted: string;
  dataUrl: string;
}

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newComplaint: Complaint) => void;
  onTrackSubmitted: (complaintId: string) => void;
  existingCount: number;
}

export const ReportIssueModal: React.FC<ReportIssueModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onTrackSubmitted,
  existingCount,
}) => {
  const [category, setCategory] = useState<IssueCategory>("Streetlight Not Working");
  const [ward, setWard] = useState<string>(WARDS_LIST[0]);
  const [location, setLocation] = useState("");
  const [landmark, setLandmark] = useState("");
  const [reportedBy, setReportedBy] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [createdComplaint, setCreatedComplaint] = useState<Complaint | null>(null);
  const [copied, setCopied] = useState(false);

  // GPS Location detection states (Part 4)
  const [isLocating, setIsLocating] = useState(false);
  const [detectedCoords, setDetectedCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null>(null);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDetectLocation = () => {
    setGpsMessage(null);
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGpsMessage("Geolocation is not supported by your browser. Please type your address manually.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy } = position.coords;
        setDetectedCoords({
          latitude: Number(latitude.toFixed(6)),
          longitude: Number(longitude.toFixed(6)),
          accuracy: Math.round(accuracy),
        });
        setGpsMessage(`GPS fix acquired (~${Math.round(accuracy)}m accuracy). Location coordinates pinned.`);
        if (!location) {
          setLocation(`Near GPS Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
        }
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGpsMessage("Location permission denied. Please enter your street address manually.");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setGpsMessage("GPS satellite position unavailable. Please enter address manually.");
        } else {
          setGpsMessage("Location request timed out. Please enter address manually.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError("");
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);

    if (photos.length + files.length > MAX_PHOTOS_PER_COMPLAINT) {
      setUploadError(
        `You can upload up to ${MAX_PHOTOS_PER_COMPLAINT} photos per complaint. You already have ${photos.length}.`
      );
      e.target.value = "";
      return;
    }

    setIsProcessingPhotos(true);
    const validFiles: UploadedPhoto[] = [];

    for (const file of files) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setUploadError(validation.error || `"${file.name}" is not a supported image format.`);
        continue;
      }

      try {
        const dataUrl = await fileToDataUrl(file);
        validFiles.push({
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          file,
          name: file.name,
          sizeFormatted: formatFileSize(file.size),
          dataUrl,
        });
      } catch (err) {
        console.error("Failed to process photo:", err);
        setUploadError(`Failed to process "${file.name}". Please try another image.`);
      }
    }

    setPhotos((prev) => [...prev, ...validFiles]);
    setIsProcessingPhotos(false);
    e.target.value = "";
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const generateComplaintId = (): string => {
    const year = 2026;
    const nextNumber = existingCount + 101;
    const padded = String(nextNumber).padStart(6, "0");
    return `URJ-${year}-${padded}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (isProcessingPhotos) {
      alert("Please wait for photo optimization to finish before submitting.");
      return;
    }

    if (!location.trim()) {
      alert("Please provide the street address or pole number.");
      return;
    }

    if (!phone.trim()) {
      alert("Please provide a contact phone number so we can notify you.");
      return;
    }

    setIsSubmitting(true);

    const isCritical =
      category.includes("Sagging") ||
      category.includes("Pole") ||
      category.includes("Blackout") ||
      category.includes("Transformer") ||
      category.includes("Insulation");

    try {
      const res = await fetch("/api/complaints/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          ward,
          location: location.trim(),
          landmark: landmark.trim() || undefined,
          reportedBy: reportedBy.trim() || "Citizen",
          phone: phone.trim(),
          description:
            description.trim() || "Public electrical hazard reported for municipal field action.",
          coordinates: detectedCoords
            ? {
                latitude: detectedCoords.latitude,
                longitude: detectedCoords.longitude,
                accuracy: detectedCoords.accuracy,
              }
            : undefined,
          photos: photos.map((p) => ({
            name: p.name,
            dataUrl: p.dataUrl,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit complaint to Firestore.");
      }

      const assignedId = data.complaintId || generateComplaintId();

      const newTicket: Complaint = {
        id: assignedId,
        category,
        ward,
        location: location.trim(),
        landmark: landmark.trim() || "Nearby landmark noted",
        coordinates: detectedCoords
          ? {
              latitude: detectedCoords.latitude,
              longitude: detectedCoords.longitude,
              accuracy: detectedCoords.accuracy,
              detectedAt: "Just now",
              addressSnapshot: location.trim(),
            }
          : undefined,
        priority: isCritical ? "Critical" : "High",
        status: "Submitted",
        reportedAt: "Just now",
        reportedBy: reportedBy.trim() || "Citizen",
        phone: phone.trim(),
        description:
          description.trim() || "Public electrical hazard reported for municipal field action.",
        citizenPhotos: photos.map((p) => ({
          name: p.name,
          size: p.file.size,
          url: p.dataUrl,
        })),
        photoBefore: photos[0]?.dataUrl,
        timeline: [
          {
            time: "Just now",
            stage: "Submitted",
            note: `Complaint recorded with ${photos.length} attached photo(s)${detectedCoords ? " and verified GPS coordinates" : ""}.`,
            actor: "Citizen Portal",
            isInternal: false,
          },
        ],
      };

      onSubmit(newTicket);
      setCreatedComplaint(newTicket);
    } catch (err: unknown) {
      console.error("[Report Issue Error]:", err);
      const msg = err instanceof Error ? err.message : "Failed to record complaint.";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyId = () => {
    if (!createdComplaint) return;
    navigator.clipboard.writeText(createdComplaint.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleClose = () => {
    setPhotos([]);
    setIsProcessingPhotos(false);
    setCreatedComplaint(null);
    setCopied(false);
    setLocation("");
    setLandmark("");
    setReportedBy("");
    setPhone("");
    setDescription("");
    setUploadError("");
    setDetectedCoords(null);
    setGpsMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#173F5F]/60 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border border-[#EAF3F5] rounded-xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden transition-all">
        {/* Modal Header (Deep Blue: #173F5F) */}
        <div className="bg-[#173F5F] text-[#F7F7F2] px-6 py-4 flex items-center justify-between border-b border-[#087E8B]/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#087E8B] text-white flex items-center justify-center font-bold shrink-0">
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
            <div>
              <h3 className="font-extrabold text-base text-white">
                Report an Electrical Issue
              </h3>
              <p className="text-[11px] text-[#EAF3F5]/80">
                No Login Needed &bull; Quick Response from Maintenance Squads
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-lg bg-[#263238]/60 hover:bg-[#263238] text-[#EAF3F5] flex items-center justify-center text-sm font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 text-xs text-[#263238]">
          {createdComplaint ? (
            /* Submission Success Screen */
            <div className="space-y-5 py-2">
              <div className="flex items-center gap-3.5 p-4 bg-[#EAF3F5] border border-[#087E8B]/30 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-[#087E8B] text-white flex items-center justify-center font-bold text-lg shrink-0">
                  ✓
                </div>
                <div>
                  <h4 className="font-bold text-[#173F5F] text-sm">
                    Complaint Successfully Registered
                  </h4>
                  <p className="text-xs text-[#263238]/80 mt-0.5">
                    Your electrical issue has been logged into the municipal queue for verification and crew dispatch.
                  </p>
                </div>
              </div>

              {/* Unique Complaint ID Card (Format: URJ-2026-000001) */}
              <div className="bg-[#F7F7F2] border-2 border-[#EAF3F5] rounded-lg p-5 text-center space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#263238]/70 block">
                  Official Complaint Reference ID
                </span>
                <div className="font-mono text-2xl sm:text-3xl font-extrabold text-[#173F5F] tracking-wider select-all">
                  {createdComplaint.id}
                </div>

                {/* Important Citizen Reminder Box (Warm Orange) */}
                <div className="p-3 bg-[#F4A261]/15 border border-[#F4A261]/40 rounded-md text-[#263238] text-left flex items-start gap-2.5 text-xs">
                  <svg
                    className="w-4 h-4 text-[#b25514] shrink-0 mt-0.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>
                    <strong>Please save this Complaint ID.</strong> You will need it to track your complaint or when speaking with the municipal helpline (1912).
                  </span>
                </div>

                {/* Attached Evidence Summary */}
                <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-[#087E8B] font-semibold pt-1">
                  {createdComplaint.citizenPhotos && createdComplaint.citizenPhotos.length > 0 && (
                    <span>✓ {createdComplaint.citizenPhotos.length} photograph(s) attached</span>
                  )}
                  {createdComplaint.coordinates && (
                    <span>✓ GPS Coordinates Pinned ({createdComplaint.coordinates.latitude.toFixed(4)}, {createdComplaint.coordinates.longitude.toFixed(4)})</span>
                  )}
                </div>

                {/* Action Buttons: Copy ID & Track Complaint */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-[#EAF3F5] text-[#173F5F] font-bold border border-[#087E8B]/30 rounded-lg transition-all hover-lift flex items-center justify-center gap-2"
                  >
                    {copied ? (
                      <span className="text-[#087E8B] font-bold">✓ Copied to Clipboard</span>
                    ) : (
                      <>
                        <svg
                          className="w-3.5 h-3.5 text-[#087E8B]"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        <span>Copy Complaint ID</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const id = createdComplaint.id;
                      handleClose();
                      onTrackSubmitted(id);
                    }}
                    className="w-full sm:w-auto px-6 py-2.5 bg-[#087E8B] hover:bg-[#06636E] text-white font-bold rounded-lg transition-all hover-lift shadow-xs flex items-center justify-center gap-2"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <span>Track Complaint Status</span>
                  </button>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs text-[#263238]/80 hover:text-[#263238] border border-[#EAF3F5] rounded-md hover:bg-[#EAF3F5] font-medium"
                >
                  Close Window
                </button>
              </div>
            </div>
          ) : (
            /* Citizen Entry Form */
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Section 1: Hazard Information */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-xs text-[#173F5F] uppercase tracking-wider border-b border-[#EAF3F5] pb-1">
                  1. Hazard Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-[#263238] mb-1">
                      Hazard Category <span className="text-[#b25514]">*</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as IssueCategory)}
                      className="w-full bg-white border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs text-[#263238] focus:border-[#087E8B]"
                      required
                    >
                      {ISSUE_CATEGORIES.map((item) => (
                        <option key={item.label} value={item.label}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    <span className="text-[11px] text-[#263238]/60 mt-1 block">
                      {ISSUE_CATEGORIES.find((c) => c.label === category)?.desc}
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-[#263238] mb-1">
                      Assigned Ward / Area <span className="text-[#b25514]">*</span>
                    </label>
                    <select
                      value={ward}
                      onChange={(e) => setWard(e.target.value)}
                      className="w-full bg-white border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs text-[#263238] focus:border-[#087E8B]"
                      required
                    >
                      {WARDS_LIST.map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                    </select>
                    <span className="text-[11px] text-[#263238]/60 mt-1 block">
                      Routes directly to the area maintenance team
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: Hazard Location */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-xs text-[#173F5F] uppercase tracking-wider border-b border-[#EAF3F5] pb-1">
                  2. Hazard Location
                </h4>

                {/* GPS Location Detection Strip */}
                <div className="bg-[#EAF3F5]/60 border border-[#087E8B]/25 rounded-lg p-3 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-xs text-[#173F5F] flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-[#087E8B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="2" x2="12" y2="6" />
                          <line x1="12" y1="18" x2="12" y2="22" />
                          <line x1="2" y1="12" x2="6" y2="12" />
                          <line x1="18" y1="12" x2="22" y2="12" />
                        </svg>
                        <span>Current Location</span>
                      </span>
                      <span className="text-[11px] text-[#263238]/70 block">
                        Detect your coordinates to help linemen find the exact spot.
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleDetectLocation}
                      disabled={isLocating}
                      className="px-3.5 py-1.5 bg-[#087E8B] hover:bg-[#06636E] text-white font-semibold rounded-md transition-all hover-lift flex items-center gap-1.5 text-xs self-start sm:self-auto shrink-0 shadow-2xs"
                    >
                      {isLocating ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          <span>Acquiring Fix...</span>
                        </>
                      ) : (
                        <>
                          <span>📍</span>
                          <span>Detect Current Location</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* GPS Status Message & Preview */}
                  {gpsMessage && (
                    <div
                      className={`p-2 rounded text-[11px] ${detectedCoords
                        ? "bg-[#EAF3F5] text-[#087E8B] border border-[#087E8B]/30"
                        : "bg-[#F4A261]/20 text-[#b25514] border border-[#F4A261]/40"
                        }`}
                    >
                      {gpsMessage}
                    </div>
                  )}

                  {detectedCoords && (
                    <div className="bg-white p-2.5 rounded border border-[#087E8B]/25 flex items-center justify-between text-[11px]">
                      <div className="font-mono text-[#173F5F]">
                        <strong>Coordinates:</strong> {detectedCoords.latitude}° N, {detectedCoords.longitude}° E
                        {detectedCoords.accuracy && ` (±${detectedCoords.accuracy}m)`}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setDetectedCoords(null);
                          setGpsMessage(null);
                        }}
                        className="text-[#b25514] hover:underline font-semibold"
                      >
                        Remove GPS
                      </button>
                    </div>
                  )}
                </div>

                {/* Street & Landmark */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-[#263238] mb-1">
                      Street Address or Pole Number <span className="text-[#b25514]">*</span>
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Main Market Road, near Pole #LT-14"
                      className="w-full bg-white border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs text-[#263238] focus:border-[#087E8B]"
                      required
                    />
                    <span className="text-[10px] text-[#263238]/60 mt-0.5 block">
                      Always editable as manual fallback
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-[#263238] mb-1">
                      Nearby Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="e.g. Opposite Metro Gate 2 or Hospital"
                      className="w-full bg-white border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs text-[#263238] focus:border-[#087E8B]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Contact Details */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-xs text-[#173F5F] uppercase tracking-wider border-b border-[#EAF3F5] pb-1">
                  3. Contact Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-[#263238] mb-1">
                      Your Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={reportedBy}
                      onChange={(e) => setReportedBy(e.target.value)}
                      placeholder="e.g. Sanjay Mehta"
                      className="w-full bg-white border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs text-[#263238] focus:border-[#087E8B]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#263238] mb-1">
                      Contact Phone Number <span className="text-[#b25514]">*</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit mobile number"
                      className="w-full bg-white border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs text-[#263238] focus:border-[#087E8B] font-mono"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Problem Details */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-xs text-[#173F5F] uppercase tracking-wider border-b border-[#EAF3F5] pb-1">
                  4. Problem Description
                </h4>
                <div>
                  <label className="block font-bold text-[#263238] mb-1">
                    Describe the Problem or Hazard
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide any visible details, e.g., low hanging wire, sparks during rain, damaged pillar latch..."
                    className="w-full bg-white border border-[#EAF3F5] rounded-lg py-2 px-3 text-xs text-[#263238] focus:border-[#087E8B]"
                  ></textarea>
                </div>
              </div>

              {/* Section 5: Photo Upload Section */}
              <div className="border border-[#EAF3F5] rounded-lg p-4 bg-[#F7F7F2]/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <label className="block font-extrabold text-xs text-[#173F5F] uppercase tracking-wider">
                      5. Upload Photos of the Problem
                    </label>
                    <p className="text-[11px] text-[#263238]/70">
                      Add photos of the electrical hazard to help our team understand the issue.
                    </p>
                  </div>
                  <span className="text-[10px] text-[#087E8B] font-semibold bg-[#EAF3F5] px-2 py-0.5 rounded border border-[#087E8B]/20 self-start sm:self-auto">
                    JPG, JPEG, PNG, WEBP (Max 10MB, up to 4 photos)
                  </span>
                </div>

                {/* Drop Trigger */}
                <div className="border-2 border-dashed border-[#087E8B]/40 hover:border-[#087E8B] rounded-lg p-4 text-center bg-white transition-colors">
                  <input
                    id="citizen-photo-upload"
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="citizen-photo-upload"
                    className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#EAF3F5] text-[#087E8B] flex items-center justify-center">
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-[#087E8B] hover:underline">
                      Click to choose or take photos from your camera
                    </span>
                    <span className="text-[10px] text-[#263238]/60">
                      Up to 4 photographs supported
                    </span>
                  </label>
                </div>

                {isProcessingPhotos && (
                  <div className="p-2.5 bg-[#EAF3F5] border border-[#087E8B]/30 text-[#087E8B] rounded text-[11px] flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full border-2 border-[#087E8B] border-t-transparent animate-spin shrink-0"></span>
                    <span>Processing and optimizing photos for persistence...</span>
                  </div>
                )}

                {uploadError && (
                  <div className="p-2.5 bg-[#F4A261]/20 border border-[#F4A261] text-[#b25514] rounded text-[11px]">
                    {uploadError}
                  </div>
                )}

                {/* Uploaded Thumbnails Grid */}
                {photos.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-bold text-[#263238] block">
                      Attached Photos ({photos.length} / {MAX_PHOTOS_PER_COMPLAINT}):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {photos.map((p) => (
                        <div
                          key={p.id}
                          className="bg-white border border-[#EAF3F5] rounded-md p-2 flex items-center justify-between gap-2 shadow-2xs"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={p.dataUrl}
                              alt={p.name}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = DEFAULT_HAZARD_FALLBACK_URL;
                              }}
                              className="w-10 h-10 object-cover rounded shrink-0 border border-[#EAF3F5]"
                            />
                            <div className="overflow-hidden">
                              <span className="font-semibold text-xs text-[#263238] truncate block">
                                {p.name}
                              </span>
                              <span className="text-[10px] text-[#263238]/60 font-mono">
                                {p.sizeFormatted}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(p.id)}
                            className="text-[#b25514] hover:bg-[#F4A261]/20 p-1 rounded font-bold text-xs shrink-0"
                            title="Remove photo"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Server Submit Error Banner */}
              {submitError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{submitError}</span>
                </div>
              )}

              {/* Form Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-[#EAF3F5]">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-[#EAF3F5] text-[#263238]/80 hover:bg-[#F7F7F2] font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingPhotos || isSubmitting}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#087E8B] hover:bg-[#06636E] disabled:opacity-50 text-white font-bold text-xs transition-all hover-lift shadow-xs flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                      <span>Saving to Firestore...</span>
                    </>
                  ) : (
                    <>
                      <span>{isProcessingPhotos ? "Processing Photos..." : "Submit Complaint"}</span>
                      <span>&rarr;</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
