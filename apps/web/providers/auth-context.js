"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ApiClient } from '@/lib/api';

const DEFAULT_TENANT = {
  id: 'tenant_default',
  name: 'SkillYards Academy',
  slug: 'skillyards',
  branch: 'Main Campus'
};

const AuthContext = createContext({
  user: null,
  token: null,
  activeTenant: DEFAULT_TENANT,
  tenants: [DEFAULT_TENANT],
  login: async () => {},
  register: async () => {},
  switchTenant: () => {},
  logout: () => {}
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [activeTenant, setActiveTenant] = useState(DEFAULT_TENANT);
  const [tenants, setTenants] = useState([DEFAULT_TENANT]);

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
      const userData = res.user || { email, name: email.split('@')[0] };
      setToken(res.token);
      setUser(userData);
      localStorage.setItem('eos_token', res.token);
      localStorage.setItem('eos_user', JSON.stringify(userData));

      // Use institution from user meta if available
      if (userData.institutionName) {
        const userTenant = {
          id: 'tenant_' + (userData.institutionSlug || 'custom'),
          name: userData.institutionName,
          branch: 'Main Campus'
        };
        setActiveTenant(userTenant);
        setTenants([userTenant]);
        localStorage.setItem('eos_tenant', JSON.stringify(userTenant));
        localStorage.setItem('eos_tenant_id', userTenant.id);
      }

      return { success: true };
    }
    return { success: false, error: res.error || 'Login failed' };
  };

  const register = async (name, email, password, institutionName) => {
    const res = await ApiClient.registerUser({ name, email, password, institutionName });

    // Build registered tenant context
    const tenantName = institutionName && institutionName.trim() ? institutionName.trim() : 'SkillYards Academy';
    const newTenant = {
      id: 'tenant_' + Date.now(),
      name: tenantName,
      branch: 'Main Campus'
    };

    setActiveTenant(newTenant);
    setTenants([newTenant]);
    localStorage.setItem('eos_tenant', JSON.stringify(newTenant));
    localStorage.setItem('eos_tenant_id', newTenant.id);

    const userData = { email, name, institutionName: tenantName };
    setUser(userData);
    setToken('mock_token_' + Date.now());
    localStorage.setItem('eos_token', 'mock_token_' + Date.now());
    localStorage.setItem('eos_user', JSON.stringify(userData));

    return { success: true, data: res.data || userData };
  };

  const switchTenant = (tenant) => {
    setActiveTenant(tenant);
    localStorage.setItem('eos_tenant', JSON.stringify(tenant));
    localStorage.setItem('eos_tenant_id', tenant.id);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setActiveTenant(DEFAULT_TENANT);
    localStorage.removeItem('eos_token');
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
