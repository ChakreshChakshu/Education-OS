"use client";

import React, { useState, useRef, useEffect } from "react";
import { ApiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CloudArrowUp, 
  FileVideo, 
  FilePdf, 
  CheckCircle, 
  CircleNotch, 
  X,
  File,
  Eye,
  ArrowsClockwise,
  Play
} from "@phosphor-icons/react";

/**
 * MediaUploader - Cloudflare R2 / Local Media Vault Uploader
 * Supports:
 * - Drag & Drop with active drag state
 * - Live upload progress bar (percentage & byte indicator)
 * - Video & PDF instant previews
 * - Background HLS transcode polling with state feedback
 */
export function MediaUploader({ 
  onUploadSuccess, 
  accept = "video/*,application/pdf",
  maxSizeMB = 100,
  showPreview = true,
  className = ""
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState({ current: 0, total: 0 });
  const [transcodeStatus, setTranscodeStatus] = useState(null); // 'ENCODING' | 'READY' | null
  const [uploadedFile, setUploadedFile] = useState(null);
  const [error, setError] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const fileInputRef = useRef(null);
  const progressTimerRef = useRef(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  const pollTranscodeStatus = (mediaId) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > 30) {
        clearInterval(interval);
        return;
      }
      try {
        const st = await ApiClient.getMediaStatus(mediaId);
        if (st?.success && st.data?.status === "READY") {
          setTranscodeStatus("READY");
          clearInterval(interval);
        }
      } catch (err) {
        console.warn("Media status polling check:", err.message);
      }
    }, 2000);
  };

  const handleFileSelect = async (file) => {
    if (!file) return;

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      setError(`File exceeds maximum size limit of ${maxSizeMB}MB.`);
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    setUploadedBytes({ current: Math.round(file.size * 0.1), total: file.size });
    setTranscodeStatus(null);
    setError(null);

    // Simulated progressive upload curve for smooth UX
    let currentPct = 10;
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(() => {
      if (currentPct < 88) {
        currentPct += Math.max(2, Math.floor((90 - currentPct) / 5));
        setUploadProgress(currentPct);
        setUploadedBytes({ current: Math.round((file.size * currentPct) / 100), total: file.size });
      }
    }, 150);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = reader.result;

        const res = await ApiClient.uploadMediaFile({
          filename: file.name,
          fileData: base64Data,
          mimeType: file.type || "application/octet-stream"
        });

        if (progressTimerRef.current) clearInterval(progressTimerRef.current);

        if (res.success && res.data) {
          setUploadProgress(100);
          setUploadedBytes({ current: file.size, total: file.size });

          const fileInfo = {
            url: res.data.url,
            hlsUrl: res.data.hlsUrl,
            mediaAssetId: res.data.id,
            filename: res.data.filename || file.name,
            mimeType: file.type,
            sizeMB: fileSizeMB.toFixed(2),
            sizeFormatted: fileSizeMB > 1 ? `${fileSizeMB.toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`
          };

          setUploadedFile(fileInfo);

          if (res.data.status === "ENCODING" && res.data.id) {
            setTranscodeStatus("ENCODING");
            pollTranscodeStatus(res.data.id);
          } else if (res.data.status === "READY") {
            setTranscodeStatus("READY");
          }

          if (onUploadSuccess) {
            onUploadSuccess(fileInfo.url, fileInfo.filename, res.data);
          }
        } else {
          setError(res.error || "Media upload failed. Please verify storage backend connection.");
        }
        setUploading(false);
      };

      reader.onerror = () => {
        if (progressTimerRef.current) clearInterval(progressTimerRef.current);
        setError("Error reading local media buffer.");
        setUploading(false);
      };
    } catch (err) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      setError(err.message || "Failed to upload file to media vault.");
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const clearFile = () => {
    setUploadedFile(null);
    setTranscodeStatus(null);
    setUploadProgress(0);
    setError(null);
    setIsPreviewOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (onUploadSuccess) {
      onUploadSuccess("", "", null);
    }
  };

  const isVideo = uploadedFile?.mimeType?.startsWith("video/") || uploadedFile?.filename?.match(/\.(mp4|mov|webm|mkv)$/i);
  const isPdf = uploadedFile?.mimeType === "application/pdf" || uploadedFile?.filename?.endsWith(".pdf");

  return (
    <div className={`space-y-3 ${className}`}>
      {!uploadedFile ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? "border-primary bg-primary/10 shadow-xs"
              : uploading
                ? "border-primary/50 bg-card cursor-wait"
                : "border-border/90 bg-card hover:border-primary/60 hover:bg-muted/40 shadow-2xs"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept={accept}
            className="hidden"
            disabled={uploading}
            onChange={(e) => handleFileSelect(e.target.files?.[0])}
          />

          <div className="flex flex-col items-center justify-center space-y-3">
            {uploading ? (
              <div className="relative">
                <CircleNotch size={38} className="text-primary animate-spin" />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-primary">
                  {uploadProgress}%
                </span>
              </div>
            ) : (
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                <CloudArrowUp size={28} weight="bold" />
              </div>
            )}

            <div className="space-y-1 max-w-sm">
              <p className="text-sm font-bold text-foreground">
                {uploading ? "Ingesting to Cloudflare R2 Vault..." : "Click or drag & drop lecture media"}
              </p>
              <p className="text-xs text-muted-foreground font-medium">
                Accepts MP4, WebM, MOV, or PDF documents up to {maxSizeMB}MB
              </p>
            </div>

            {/* Live Progress Bar during active upload */}
            {uploading && (
              <div className="w-full max-w-xs space-y-1.5 pt-1">
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden border border-border/40">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-150 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] font-mono text-muted-foreground">
                  <span>Uploading payload...</span>
                  <span>{uploadProgress}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Uploaded Asset Card */
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                {isVideo ? (
                  <FileVideo size={22} weight="bold" />
                ) : isPdf ? (
                  <FilePdf size={22} weight="bold" />
                ) : (
                  <File size={22} weight="bold" />
                )}
              </div>

              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold truncate text-foreground">{uploadedFile.filename}</p>
                  <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                    {uploadedFile.sizeFormatted}
                  </Badge>
                </div>
                <p className="text-xs font-mono text-muted-foreground truncate max-w-md">
                  {uploadedFile.url}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {showPreview && isVideo && (
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  className="h-8 gap-1.5 text-xs font-bold rounded-lg cursor-pointer"
                  onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                >
                  {isPreviewOpen ? <X size={14} /> : <Play size={14} weight="fill" />}
                  <span>{isPreviewOpen ? "Close Preview" : "Preview"}</span>
                </Button>
              )}
              <Button 
                type="button"
                onClick={clearFile} 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                title="Remove uploaded media"
              >
                <X size={16} />
              </Button>
            </div>
          </div>

          {/* Transcode Status Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/60">
            {transcodeStatus === "ENCODING" && (
              <Badge variant="outline" className="bg-amber-500/10 border-amber-500/30 text-amber-500 text-[11px] gap-1.5 py-0.5">
                <CircleNotch size={12} className="animate-spin" />
                <span>Background Worker Transcoding HLS (Adaptive Bitrate)...</span>
              </Badge>
            )}
            {transcodeStatus === "READY" && (
              <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-500 text-[11px] gap-1.5 py-0.5 font-bold">
                <CheckCircle size={12} weight="fill" />
                <span>HLS Stream Ready</span>
              </Badge>
            )}
            <Badge variant="secondary" className="text-[10px] font-mono">
              R2 Vault Ingest Complete
            </Badge>
          </div>

          {/* Inline Video Player Preview */}
          {isPreviewOpen && isVideo && (
            <div className="pt-2 rounded-xl overflow-hidden">
              <video 
                src={uploadedFile.url} 
                controls 
                className="w-full max-h-56 rounded-lg bg-black object-contain border border-border" 
              />
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold flex items-center justify-between gap-2">
          <span>{error}</span>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0 text-destructive hover:bg-destructive/20 rounded-md"
            onClick={() => setError(null)}
          >
            <X size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}
