"use client";

import React from "react";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";

export const REGISTRATION_LOADING_STATES = [
  { text: "Creating master administrator account" },
  { text: "Claiming multi-tenant institutional subdomain" },
  { text: "Provisioning Neon Cloud database schema" },
  { text: "Configuring campus branches and term parameters" },
  { text: "Applying custom brand palette and theme tokens" },
  { text: "Redirecting to your executive command center" }
];

export const LOGIN_LOADING_STATES = [
  { text: "Authenticating encrypted credentials" },
  { text: "Resolving institutional workspace memberships" },
  { text: "Applying campus brand tokens and primary palette" },
  { text: "Establishing secure httpOnly session cookies" },
  { text: "Launching academic curriculum & rosters" }
];

interface AuthMultiStepLoaderProps {
  loading: boolean;
  mode?: "register" | "login";
  customStates?: { text: string }[];
  duration?: number;
  title?: string;
  subtitle?: string;
  onClose?: () => void;
}

export function AuthMultiStepLoader({
  loading,
  mode = "register",
  customStates,
  duration,
  title,
  subtitle,
  onClose
}: AuthMultiStepLoaderProps) {
  const defaultStates = mode === "login" ? LOGIN_LOADING_STATES : REGISTRATION_LOADING_STATES;
  const states = customStates || defaultStates;
  // Login is swift (500ms), registration has more initialization depth (700ms)
  const defaultDuration = mode === "login" ? 550 : 750;

  const defaultTitle = customStates
    ? "Enrolling in Course Program"
    : mode === "login"
    ? "Authenticating Campus Access"
    : "Initializing Campus Institution";

  const defaultSubtitle = customStates
    ? "Verifying student profile & provisioning curriculum streams..."
    : mode === "login"
    ? "Verifying encrypted credentials & loading workspace..."
    : "Configuring schema isolation & campus administrative policies...";

  return (
    <MultiStepLoader
      loading={loading}
      loadingStates={states}
      duration={duration || defaultDuration}
      loop={false}
      title={title || defaultTitle}
      subtitle={subtitle || defaultSubtitle}
      onClose={onClose}
    />
  );
}

export default AuthMultiStepLoader;
