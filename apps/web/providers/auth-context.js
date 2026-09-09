"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ApiClient } from '@/lib/api';

const AuthContext = createContext({
  user: null,
  token: null,
  activeTenant: null,
  tenants: [],
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
  const [token, setToken] = useState(null);
  const [activeTenant, setActiveTenant] = useState(null);
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    const savedToken = localStorage.getItem('eos_token');
    const savedUser = localStorage.getItem('eos_user');
    const savedTenant = localStorage.getItem('eos_tenant');

    if (savedToken) setToken(savedToken);
    if (savedUser) {
      try { setUser(JSON.parse(savedUser)); } catch (e) {}
    }
    if (savedTenant) {
      try {
        const parsedTenant = JSON.parse(savedTenant);
        setActiveTenant(parsedTenant);
        setTenants([parsedTenant]);
      } catch (e) {}
    }
  }, []);

  const login = async (email, password) => {
    const res = await ApiClient.loginUser({ email, password });
    if (res.token) {
      const userData = res.user || res.data || { email, name: email.split('@')[0] };
      setToken(res.token);
      setUser(userData);
      localStorage.setItem('eos_token', res.token);
      localStorage.setItem('eos_user', JSON.stringify(userData));
      if (res.refreshToken) {
        localStorage.setItem('eos_refresh_token', res.refreshToken);
      }

      // Use the tenants the backend actually returns for this user — never a
      // placeholder ID, since that silently scopes their data to the wrong tenant.
      const realTenants = Array.isArray(res.tenants) ? res.tenants.map(toUiTenant) : [];
      setTenants(realTenants);
      const primary = realTenants[0] || null;
      setActiveTenant(primary);
      if (primary) {
        localStorage.setItem('eos_tenant', JSON.stringify(primary));
        localStorage.setItem('eos_tenant_id', primary.id);
      } else {
        localStorage.removeItem('eos_tenant');
        localStorage.removeItem('eos_tenant_id');
      }

      return { success: true };
    }
    return { success: false, error: res.error || 'Login failed' };
  };

  const register = async (name, email, password, institutionName) => {
    const res = await ApiClient.registerUser({ name, email, password, institutionName });

    if (res.success === false) {
      return { success: false, error: res.error || 'Registration failed' };
    }

    // Auto login after registration — this also picks up the real tenant the
    // backend just auto-provisioned for the new user (see apps/api's /auth/register).
    const loginRes = await login(email, password);
    if (!loginRes.success) {
      return { success: false, error: loginRes.error || 'Auto-login after registration failed' };
    }

    return { success: true, data: res.data || { name, email } };
  };

  const switchTenant = (tenant) => {
    setActiveTenant(tenant);
    localStorage.setItem('eos_tenant', JSON.stringify(tenant));
    localStorage.setItem('eos_tenant_id', tenant.id);
  };

  const logout = () => {
    const refreshToken = localStorage.getItem('eos_refresh_token');
    if (refreshToken) {
      ApiClient.logout(refreshToken).catch(() => {});
    }
    setUser(null);
    setToken(null);
    setActiveTenant(null);
    setTenants([]);
    localStorage.removeItem('eos_token');
    localStorage.removeItem('eos_refresh_token');
    localStorage.removeItem('eos_user');
    localStorage.removeItem('eos_tenant');
    localStorage.removeItem('eos_tenant_id');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        activeTenant,
        tenants,
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
