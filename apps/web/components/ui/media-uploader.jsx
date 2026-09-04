"use client";

import React, { useState, useRef } from "react";
import { ApiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CloudArrowUp, 
  FileVideo, 
  FilePdf, 
  CheckCircle, 
  Spinner, 
  X,
  File
} from "@phosphor-icons/react";

export function MediaUploader({ onUploadSuccess, accept = "video/*,application/pdf" }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (file) => {
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = reader.result;
        const res = await ApiClient.uploadMediaFile({
          filename: file.name,
          fileData: base64Data,
          mimeType: file.type
        });

        if (res.success && res.data) {
          const fileInfo = {
            url: res.data.url,
            filename: res.data.filename,
            size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`
          };
          setUploadedFile(fileInfo);
          if (onUploadSuccess) {
            onUploadSuccess(fileInfo.url, fileInfo.filename);
          }
        } else {
          setError(res.error || "Upload failed");
        }
        setUploading(false);
      };
      reader.onerror = () => {
        setError("Error reading local file");
        setUploading(false);
      };
    } catch (err) {
      setError(err.message || "Failed to upload file");
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
    if (onUploadSuccess) {
      onUploadSuccess("", "");
    }
  };

  return (
    <div className="space-y-3">
      {!uploadedFile ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? "border-primary bg-primary/10"
              : "border-border bg-background hover:border-primary/50 hover:bg-card"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept={accept}
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files?.[0])}
          />

          <div className="flex flex-col items-center justify-center space-y-2">
            {uploading ? (
              <Spinner size={36} className="text-primary animate-spin" />
            ) : (
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <CloudArrowUp size={28} weight="bold" />
              </div>
            )}

            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">
                {uploading ? "Saving to local disk storage..." : "Click or drag & drop lecture video or PDF"}
              </p>
              <p className="text-xs text-muted-foreground font-medium">
                Supports MP4, MOV, PDF up to 100MB (Saved directly to <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground font-bold">./uploads/</code>)
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-success/40 bg-success/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 truncate">
            <div className="h-10 w-10 rounded-lg bg-success text-success-foreground flex items-center justify-center shrink-0 font-bold">
              <CheckCircle size={22} weight="bold" />
            </div>
            <div className="truncate">
              <p className="text-sm font-bold truncate text-foreground">{uploadedFile.filename}</p>
              <p className="text-xs font-mono text-muted-foreground truncate">{uploadedFile.url}</p>
            </div>
          </div>

          <Button onClick={clearFile} variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
            <X size={18} />
          </Button>
        </div>
      )}

      {error && (
        <p className="text-xs font-bold text-destructive">{error}</p>
      )}
    </div>
  );
}
