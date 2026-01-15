"use client";

import { useRef, useState } from "react";
import { Camera, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadChecklistPhoto } from "@/lib/actions/checklist-actions";

interface PhotoCaptureProps {
  checklistResultId: string | null;
  existingPhotos?: Array<{ id: string; url: string }>;
  onPhotoUploaded?: (photo: { id: string; url: string }) => void;
  disabled?: boolean;
}

export function PhotoCapture({
  checklistResultId,
  existingPhotos = [],
  onPhotoUploaded,
  disabled = false,
}: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !checklistResultId) return;

    // Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    setPendingPhotos((prev) => [...prev, previewUrl]);

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("checklistResultId", checklistResultId);
      formData.append("file", file);

      const result = await uploadChecklistPhoto(formData);

      if (result.success && result.media) {
        onPhotoUploaded?.(result.media);
        // Remove from pending
        setPendingPhotos((prev) => prev.filter((url) => url !== previewUrl));
      }
    } catch (error) {
      console.error("Failed to upload photo:", error);
      // Keep in pending for retry
    } finally {
      setIsUploading(false);
      // Reset input
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const allPhotos = [
    ...existingPhotos.map((p) => ({ url: p.url, isPending: false })),
    ...pendingPhotos.map((url) => ({ url, isPending: true })),
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Photo grid */}
      {allPhotos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {allPhotos.map((photo, index) => (
            <div
              key={photo.url}
              className={cn(
                "relative shrink-0 size-16 rounded-lg overflow-hidden bg-muted",
                photo.isPending && "opacity-70",
              )}
            >
              <img
                src={photo.url}
                alt={`Photo ${index + 1}`}
                className="size-full object-cover"
              />
              {photo.isPending && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Loader2 className="size-5 text-white animate-spin" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Capture button */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        className="hidden"
        disabled={disabled || !checklistResultId}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || !checklistResultId || isUploading}
        className={cn(
          "flex items-center justify-center gap-2 h-12 rounded-xl border-2 border-dashed border-muted-foreground/30",
          "text-muted-foreground hover:border-primary hover:text-primary transition-colors",
          "disabled:opacity-50 disabled:cursor-not-allowed",
        )}
      >
        {isUploading ? (
          <>
            <Loader2 className="size-5 animate-spin" />
            <span>Uploading...</span>
          </>
        ) : (
          <>
            <Camera className="size-5" />
            <span>Add Photo</span>
          </>
        )}
      </button>

      {!checklistResultId && (
        <p className="text-xs text-muted-foreground text-center">
          Select a status first to add photos
        </p>
      )}
    </div>
  );
}
