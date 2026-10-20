"use client";

import React, { useState, useEffect } from "react";
import { Buildings, GraduationCap, ShieldCheck } from "@phosphor-icons/react";

// Extracts clean 1-2 letter monogram from institution name
function getInitials(name) {
  if (!name || typeof name !== "string") return "ED";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Universal Tenant Logo Component
 * Ensures high-visibility, crisp rendering across light & dark modes with automatic
 * fallback to an institutional crest monogram if image fails or is null.
 */
export function TenantLogo({
  tenant,
  size = "md", // "xs" | "sm" | "md" | "lg" | "xl"
  className = "",
  showBadge = false,
  priority = false
}) {
  const [imgError, setImgError] = useState(false);

  // Resolve logo URL across any nested structure
  const rawLogo = 
    tenant?.logoUrl || 
    tenant?.settings?.branding?.logoUrl || 
    tenant?.settings?.logoUrl || 
    "";

  const name = tenant?.name || "Institution";
  const initials = getInitials(name);
  const brandColor = 
    tenant?.settings?.branding?.primaryColor || 
    tenant?.settings?.primaryColor || 
    tenant?.primaryColor || 
    "#5b12ed";

  // Reset error state if logoUrl changes
  useEffect(() => {
    setImgError(false);
  }, [rawLogo]);

  // Size dimensions
  const sizeMap = {
    xs: "h-6 w-6 text-[10px] rounded-md",
    sm: "h-8 w-8 text-xs rounded-lg",
    md: "h-10 w-10 text-sm rounded-xl",
    lg: "h-12 w-12 text-base rounded-2xl",
    xl: "h-16 w-16 text-xl rounded-2xl"
  };

  const chosenSize = sizeMap[size] || sizeMap.md;

  const hasValidLogo = Boolean(rawLogo && rawLogo.trim() !== "" && !imgError);

  return (
    <div
      className={`relative shrink-0 flex items-center justify-center font-black select-none transition-all ${chosenSize} ${className}`}
      style={{
        backgroundColor: hasValidLogo ? "var(--card)" : brandColor,
        color: hasValidLogo ? "var(--foreground)" : "#ffffff"
      }}
      title={name}
    >
      {hasValidLogo ? (
        <div className="w-full h-full p-1.5 flex items-center justify-center overflow-hidden rounded-[inherit] border border-border/80 bg-white/95 dark:bg-card shadow-2xs">
          <img
            src={rawLogo}
            alt={name}
            loading={priority ? "eager" : "lazy"}
            className="w-full h-full object-contain filter drop-shadow-2xs transition-transform duration-200 hover:scale-105"
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <div 
          className="w-full h-full flex flex-col items-center justify-center rounded-[inherit] shadow-xs border border-white/20 relative overflow-hidden text-white font-mono"
          style={{
            background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}dd 100%)`
          }}
        >
          {/* Subtle crest background watermark */}
          <div className="absolute -right-1 -bottom-1 opacity-20 pointer-events-none">
            <GraduationCap size={size === "xl" ? 36 : size === "lg" ? 28 : 20} weight="fill" />
          </div>
          <span className="relative z-10 tracking-tight leading-none font-bold">
            {initials}
          </span>
        </div>
      )}

      {/* Optional verification badge */}
      {showBadge && (
        <span 
          className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-background bg-emerald-500 shadow-2xs flex items-center justify-center"
          title="Verified Institution"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
        </span>
      )}
    </div>
  );
}
