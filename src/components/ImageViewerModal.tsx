"use client";

import React, { useEffect } from "react";
import { DEFAULT_HAZARD_FALLBACK_URL } from "@/utils/imageUtils";

export interface ImageViewerData {
  url: string;
  title?: string;
  caption?: string;
  meta?: string;
}

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageData: ImageViewerData | null;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  onClose,
  imageData,
}) => {
  // Listen for Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageData || !imageData.url) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#173F5F]/90 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 transition-opacity animate-in fade-in"
    >
      {/* Lightbox Container - Click inside does not close */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-4xl w-full flex flex-col items-center bg-[#173F5F] border border-[#087E8B]/40 rounded-2xl shadow-2xl overflow-hidden p-3 sm:p-5"
      >
        {/* Top Header Bar */}
        <div className="w-full flex items-center justify-between border-b border-[#EAF3F5]/15 pb-3 mb-3 text-white">
          <div className="flex items-center gap-2 overflow-hidden pr-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#087E8B] shrink-0"></span>
            <div className="overflow-hidden">
              <h3 className="font-bold text-sm text-white truncate">
                {imageData.title || "Photo Evidence"}
              </h3>
              {imageData.caption && (
                <p className="text-[11px] text-[#EAF3F5]/80 truncate">
                  {imageData.caption}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {imageData.meta && (
              <span className="hidden sm:inline-block text-[11px] font-mono bg-[#263238]/80 text-[#EAF3F5] px-2 py-0.5 rounded border border-[#087E8B]/30">
                {imageData.meta}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-[#263238]/80 hover:bg-[#263238] text-[#EAF3F5] hover:text-white text-xs font-bold transition-colors flex items-center gap-1.5 border border-[#EAF3F5]/20"
              title="Close image preview (Escape)"
            >
              <span>✕</span>
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* Image Display Area */}
        <div className="w-full flex items-center justify-center bg-[#0d2335] rounded-xl p-2 sm:p-3 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageData.url}
            alt={imageData.title || "Hazard evidence photograph"}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = DEFAULT_HAZARD_FALLBACK_URL;
            }}
            className="max-h-[70vh] sm:max-h-[75vh] max-w-full object-contain rounded-lg shadow-md transition-transform"
          />
        </div>

        {/* Bottom Helper Bar */}
        <div className="w-full pt-2.5 flex items-center justify-between text-[11px] text-[#EAF3F5]/70">
          <span>Click outside the window or press Escape to close.</span>
          <span className="text-[10px] uppercase font-mono tracking-wider text-[#087E8B]">
            Official UrjaSetu Verification
          </span>
        </div>
      </div>
    </div>
  );
};
