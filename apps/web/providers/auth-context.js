"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ApiClient } from '@/lib/api';

const AuthContext = createContext({
  user: null,
  activeTenant: null,
  tenants: [],
  loading: true,
  notEnrolledInSubdomain: null,
  login: async () => {},
  register: async () => {},
  switchTenant: () => {},
  logout: () => {}
});

// Converts any hex color (#RRGGBB or #RGB) into HSL for dynamic CSS variables
export function hexToHsl(hex) {
  if (!hex || typeof hex !== 'string') return null;
  let c = hex.trim().replace('#', '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  if (c.length !== 6) return null;
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h = Math.round(h * 60);
  }
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  return { h, s, l };
}

// Dynamically sets root theme CSS variables based on active tenant branding
export function applyTenantTheme(colorHex) {
  if (typeof document === 'undefined') return;
  const targetHex = colorHex || '#5b12ed';
  const hsl = hexToHsl(targetHex);
  if (hsl) {
    document.documentElement.style.setProperty('--primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
    document.documentElement.style.setProperty('--ring', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
    const isLight = hsl.l > 60;
    document.documentElement.style.setProperty('--primary-foreground', isLight ? '0 0% 0%' : '0 0% 100%');
  }
}

// Maps the API tenant shape into the rich UI tenant structure
function toUiTenant(apiTenant) {
  const settings = apiTenant.settings || apiTenant.settingsJson || apiTenant.settings_json || {};
  const branding = settings.branding || {};
  const campus = settings.campus || {};
  const primaryColor = branding.primaryColor || settings.primaryColor || apiTenant.primaryColor || '#5b12ed';
  const branchName = campus.branchName || settings.branch || apiTenant.branch || 'Main Campus';
  const logoUrl = branding.logoUrl || settings.logoUrl || apiTenant.logoUrl || '';

  return {
    id: apiTenant.tenantId || apiTenant.id,
    name: apiTenant.name,
    slug: apiTenant.slug,
    role: apiTenant.role,
    branch: branchName,
    logoUrl,
    primaryColor,
    settings: {
      ...settings,
      primaryColor,
      branch: branchName,
      branding: {
        primaryColor,
        secondaryColor: branding.secondaryColor || '#efe7fd',
        tagline: branding.tagline || settings.tagline || 'Empowering institutional academic excellence',
        supportEmail: branding.supportEmail || settings.supportEmail || 'support@institution.edu',
        logoUrl
      },
      campus: {
        branchName,
        timezone: campus.timezone || 'UTC',
        academicTerm: campus.academicTerm || 'Spring 2026',
        address: campus.address || ''
      }
    }
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [activeTenant, setActiveTenant] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notEnrolledInSubdomain, setNotEnrolledInSubdomain] = useState(null);

  const applyTenants = (realTenants, preferredId) => {
    // Deduplicate tenants by id so UI never receives multiple items with identical keys
    const seen = new Set();
    const uniqueTenants = (realTenants || []).filter((t) => {
      if (!t?.id || seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });

    setTenants(uniqueTenants);

    // Check if visiting a specific institution subdomain
    let currentSub = null;
    if (typeof window !== 'undefined') {
      const host = window.location.hostname.toLowerCase();
      const parts = host.split('.');
      if (parts.length > 1 && parts[0] !== 'localhost' && parts[0] !== 'www' && !/^\d+$/.test(parts[0])) {
        currentSub = parts[0];
      }
    }

    let next = null;
    if (currentSub) {
      const match = uniqueTenants.find((t) => t.slug?.toLowerCase() === currentSub);
      if (match) {
        next = match;
        setNotEnrolledInSubdomain(null);
      } else {
        // Enrolled in some other tenant, but NOT this subdomain's institution!
        next = null;
        setNotEnrolledInSubdomain(currentSub);
      }
    } else {
      const preferred = preferredId && uniqueTenants.find((t) => t.id === preferredId);
      next = preferred || uniqueTenants[0] || null;
      setNotEnrolledInSubdomain(null);
    }

    setActiveTenant(next);
    if (next) {
      localStorage.setItem('eos_tenant', JSON.stringify(next));
      localStorage.setItem('eos_tenant_id', next.id);
    } else {
      localStorage.removeItem('eos_tenant');
      localStorage.removeItem('eos_tenant_id');
    }
  };

  useEffect(() => {
    // Access/refresh tokens live in httpOnly cookies now — the browser attaches
    // them automatically, but JS can't read them, so this is the only way to
    // learn whether there's an active session (a 401 here just means logged out).
    let savedTenantId = null;
    try {
      savedTenantId = JSON.parse(localStorage.getItem('eos_tenant') || 'null')?.id || null;
    } catch (e) {
      savedTenantId = null;
    }

    ApiClient.getMe()
      .then((res) => {
        if (res.success && res.user) {
          setUser(res.user);
          try { localStorage.setItem('eos_user', JSON.stringify(res.user)); } catch (e) {}
          const realTenants = Array.isArray(res.tenants) ? res.tenants.map(toUiTenant) : [];
          applyTenants(realTenants, savedTenantId);
        } else {
          setUser(null);
          applyTenants([], null);
          try {
            localStorage.removeItem('eos_user');
            localStorage.removeItem('eos_tenant');
            localStorage.removeItem('eos_tenant_id');
          } catch (e) {}
        }
      })
      .catch(() => {
        setUser(null);
        applyTenants([], null);
        try {
          localStorage.removeItem('eos_user');
          localStorage.removeItem('eos_tenant');
          localStorage.removeItem('eos_tenant_id');
        } catch (e) {}
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    try {
      const res = await ApiClient.loginUser({ email, password });
      if (res && res.success !== false && (res.user || res.data)) {
        const loggedUser = res.user || res.data;
        setUser(loggedUser);
        try { localStorage.setItem('eos_user', JSON.stringify(loggedUser)); } catch (e) {}
        const realTenants = Array.isArray(res.tenants) ? res.tenants.map(toUiTenant) : [];
        applyTenants(realTenants, null);
        return { success: true, user: loggedUser };
      }
      return { success: false, error: res?.error || 'Invalid email or password' };
    } catch (err) {
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const register = async (nameOrPayload, email, password, institutionName, options = {}) => {
    let payload;
    if (typeof nameOrPayload === 'object' && nameOrPayload !== null) {
      payload = nameOrPayload;
    } else {
      payload = { name: nameOrPayload, email, password, institutionName, ...options };
    }

    try {
      const res = await ApiClient.registerUser(payload);
      if (res && res.success !== false) {
        const loginRes = await login(payload.email, payload.password);
        return loginRes;
      }
      return { success: false, error: res?.error || 'Registration failed' };
    } catch (err) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  // Automatically inject tenant brand theme into DOM whenever active tenant changes
  useEffect(() => {
    if (activeTenant) {
      const color = activeTenant?.settings?.branding?.primaryColor || 
                    activeTenant?.settings?.primaryColor;
      applyTenantTheme(color);
    }
  }, [activeTenant]);

  const updateCurrentUser = (partialUser) => {
    setUser((prev) => (prev ? { ...prev, ...partialUser } : partialUser));
  };

  const updateActiveTenant = (updatedTenant) => {
    setActiveTenant((prev) => {
      const next = prev ? { ...prev, ...updatedTenant } : updatedTenant;
      if (next) {
        localStorage.setItem('eos_tenant', JSON.stringify(next));
        const color = next?.settings?.branding?.primaryColor || next?.settings?.primaryColor;
        applyTenantTheme(color);
      }
      return next;
    });
    setTenants((prevTenants) =>
      prevTenants.map((t) => (t.id === updatedTenant.id ? { ...t, ...updatedTenant } : t))
    );
  };

  const switchTenant = (tenant) => {
    setActiveTenant(tenant);
    localStorage.setItem('eos_tenant', JSON.stringify(tenant));
    localStorage.setItem('eos_tenant_id', tenant.id);
    const color = tenant?.settings?.branding?.primaryColor || tenant?.settings?.primaryColor;
    applyTenantTheme(color);
  };

  const addTenant = (newTenant) => {
    applyTenants([...tenants, newTenant], newTenant.id);
  };

  const logout = () => {
    ApiClient.logout().catch(() => {});
    setUser(null);
    setActiveTenant(null);
    setTenants([]);
    try {
      localStorage.removeItem('eos_user');
      localStorage.removeItem('eos_tenant');
      localStorage.removeItem('eos_tenant_id');
      localStorage.removeItem('eos_portal_mode');
      localStorage.removeItem('eos_enrolled_courses');
    } catch (e) {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeTenant,
        tenants,
        loading,
        notEnrolledInSubdomain,
        login,
        register,
        switchTenant,
        addTenant,
        updateCurrentUser,
        updateActiveTenant,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
