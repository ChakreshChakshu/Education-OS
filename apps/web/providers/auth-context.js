"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ApiClient } from '@/lib/api';

const AuthContext = createContext({
  user: null,
  activeTenant: null,
  tenants: [],
  loading: true,
  login: async () => {},
  register: async () => {},
  switchTenant: () => {},
  logout: () => {}
});

// Maps the {tenantId, name, slug, role} shape returned by the API's tenant list
// into the {id, name, slug, branch} shape the rest of the dashboard UI expects.
function toUiTenant(apiTenant) {
  return {
    id: apiTenant.tenantId || apiTenant.id,
    name: apiTenant.name,
    slug: apiTenant.slug,
    role: apiTenant.role,
    branch: apiTenant.branch || 'Main Branch Campus'
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [activeTenant, setActiveTenant] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  const applyTenants = (realTenants, preferredId) => {
    setTenants(realTenants);
    const preferred = preferredId && realTenants.find((t) => t.id === preferredId);
    const next = preferred || realTenants[0] || null;
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
        if (res.success) {
          setUser(res.user);
          const realTenants = Array.isArray(res.tenants) ? res.tenants.map(toUiTenant) : [];
          applyTenants(realTenants, savedTenantId);
        } else {
          setUser(null);
          applyTenants([], null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await ApiClient.loginUser({ email, password });
    if (res.success === false) {
      return { success: false, error: res.error || 'Login failed' };
    }

    setUser(res.user || res.data || { email, name: email.split('@')[0] });

    // Use the tenants the backend actually returns for this user — never a
    // placeholder ID, since that silently scopes their data to the wrong tenant.
    const realTenants = Array.isArray(res.tenants) ? res.tenants.map(toUiTenant) : [];
    applyTenants(realTenants, null);

    return { success: true };
  };

  const register = async (nameOrPayload, email, password, institutionName, options = {}) => {
    let payload;
    if (typeof nameOrPayload === 'object' && nameOrPayload !== null) {
      payload = nameOrPayload;
    } else {
      payload = { name: nameOrPayload, email, password, institutionName, ...options };
    }

    const res = await ApiClient.registerUser(payload);

    if (res.success === false) {
      return { success: false, error: res.error || 'Registration failed' };
    }

    // Auto login after registration — picks up the real tenant the backend provisioned
    const loginRes = await login(payload.email, payload.password);
    if (!loginRes.success) {
      return { success: false, error: loginRes.error || 'Auto-login after registration failed' };
    }

    return { success: true, data: res.data || { name: payload.name, email: payload.email }, tenant: res.tenant };
  };

  const switchTenant = (tenant) => {
    setActiveTenant(tenant);
    localStorage.setItem('eos_tenant', JSON.stringify(tenant));
    localStorage.setItem('eos_tenant_id', tenant.id);
  };

  const logout = () => {
    ApiClient.logout().catch(() => {});
    setUser(null);
    setActiveTenant(null);
    setTenants([]);
    localStorage.removeItem('eos_tenant');
    localStorage.removeItem('eos_tenant_id');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeTenant,
        tenants,
        loading,
        login,
        register,
        switchTenant,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
