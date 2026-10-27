"use client";

import React from "react";
import { DeviceMobile, DownloadSimple, AppleLogo, GooglePlayLogo } from "@phosphor-icons/react";

export function MobileAppBanner() {
  return (
    <div className="mx-3 my-2 p-4 rounded-2xl bg-muted/40 border border-border/70 text-center space-y-3">
      {/* Icon Badge */}
      <div className="h-10 w-10 rounded-full bg-rose-500/10 text-rose-500 dark:text-primary mx-auto flex items-center justify-center">
        <DownloadSimple size={18} weight="bold" />
      </div>

      <div className="space-y-0.5">
        <p className="font-extrabold text-xs text-foreground tracking-tight">
          EducationOS for Mobile
        </p>
        <p className="text-[10px] text-muted-foreground font-medium">
          Offline video streaming & sync
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 text-muted-foreground">
        <AppleLogo size={16} weight="fill" className="hover:text-foreground transition-colors" />
        <GooglePlayLogo size={16} weight="fill" className="hover:text-foreground transition-colors" />
      </div>

      <button
        onClick={() => alert("EducationOS Mobile Companion is available on iOS & Android via Enterprise MDM.")}
        className="w-full py-1.5 px-3 rounded-xl bg-slate-900 text-white dark:bg-primary dark:text-primary-foreground font-bold text-[11px] shadow-2xs hover:bg-slate-800 transition-colors cursor-pointer"
      >
        Download Now
      </button>
    </div>
  );
}
