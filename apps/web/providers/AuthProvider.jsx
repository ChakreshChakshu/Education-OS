'use client';

import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState({ id: '1', email: 'admin@educationos.com', role: 'admin' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Mock auto-login/token checks placeholder
  }, []);

  const login = async (email, password) => {
    setUser({ id: '1', email, role: 'admin' });
  };

  const logout = async () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
