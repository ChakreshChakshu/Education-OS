"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ApiClient } from '@/lib/api';

const DEFAULT_TENANT = {
  id: '01917f8a-9c42-7a1b-8c4d-123456789abc',
  name: 'Education OS Main Campus',
  slug: 'main-campus',
  branch: 'Main Branch Campus'
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

      if (userData.institutionName) {
        const userTenant = {
          id: '01917f8a-9c42-7a1b-8c4d-123456789abc',
          name: userData.institutionName,
          branch: 'Main Branch Campus'
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

    if (res.success === false) {
      return { success: false, error: res.error || 'Registration failed' };
    }

    // Auto login after registration to receive real signed JWT
    const loginRes = await ApiClient.loginUser({ email, password });
    if (loginRes.token) {
      const userData = loginRes.user || { email, name };
      setToken(loginRes.token);
      setUser(userData);
      localStorage.setItem('eos_token', loginRes.token);
      localStorage.setItem('eos_user', JSON.stringify(userData));
    }

    const tenantName = institutionName && institutionName.trim() ? institutionName.trim() : 'Education OS Main Campus';
    const newTenant = {
      id: '01917f8a-9c42-7a1b-8c4d-123456789abc',
      name: tenantName,
      branch: 'Main Branch Campus'
    };

    setActiveTenant(newTenant);
    setTenants([newTenant]);
    localStorage.setItem('eos_tenant', JSON.stringify(newTenant));
    localStorage.setItem('eos_tenant_id', newTenant.id);

    return { success: true, data: res.data || { name, email } };
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
