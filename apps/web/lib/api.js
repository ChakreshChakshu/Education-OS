const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

class ApiClient {
  static getHeaders(extraHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...extraHeaders
    };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('eos_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const tenantId = localStorage.getItem('eos_tenant_id');
      if (tenantId) {
        headers['x-tenant-id'] = tenantId;
      }
    }
    return headers;
  }

  // Attempts a single silent access-token refresh using the stored refresh token.
  // Access tokens are short-lived (15 min, see docs/auth_and_authorization.md), so
  // without this every internal request would start failing mid-session.
  static async _tryRefreshAccessToken() {
    if (typeof window === 'undefined') return false;
    const refreshToken = localStorage.getItem('eos_refresh_token');
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_BASE_URL}/public/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      const data = await res.json();
      if (!res.ok || !data.accessToken) return false;

      localStorage.setItem('eos_token', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('eos_refresh_token', data.refreshToken);
      }
      return true;
    } catch (err) {
      return false;
    }
  }

  // Shared fetch wrapper for authenticated internal routes: retries exactly once
  // after a silent refresh if the access token has expired (401).
  static async _authorizedFetch(url, options = {}) {
    let res = await fetch(url, { ...options, headers: this.getHeaders(options.headers) });

    if (res.status === 401) {
      const refreshed = await this._tryRefreshAccessToken();
      if (refreshed) {
        res = await fetch(url, { ...options, headers: this.getHeaders(options.headers) });
      }
    }

    return res;
  }

  static async registerUser(payload) {
    try {
      const res = await fetch(`${API_BASE_URL}/public/auth/register`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      return data;
    } catch (err) {
      console.error('API registerUser Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  static async loginUser(payload) {
    try {
      const res = await fetch(`${API_BASE_URL}/public/auth/login`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      if (data.token && typeof window !== 'undefined') {
        localStorage.setItem('eos_token', data.token);
      }
      return data;
    } catch (err) {
      console.error('API loginUser Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  static async logout(refreshToken) {
    try {
      const res = await fetch(`${API_BASE_URL}/public/auth/logout`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ refreshToken })
      });
      return await res.json();
    } catch (err) {
      console.error('API logout Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  static async createTenant(payload) {
    try {
      // ownerUserId is intentionally omitted — the API derives the owner from the
      // authenticated JWT (see apps/api/src/routes/v1/internal/index.js) so a tenant
      // can never be provisioned "owned by" someone else's account.
      const body = {
        name: payload.name || payload.tenantName,
        slug: payload.slug,
        orgName: payload.orgName || payload.organizationName || 'Main Campus',
        orgCode: payload.orgCode || 'BRANCH-01'
      };
      const res = await this._authorizedFetch(`${API_BASE_URL}/internal/tenants`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Tenant creation failed');
      return data;
    } catch (err) {
      console.error('API createTenant Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  static async getCourses() {
    try {
      const res = await this._authorizedFetch(`${API_BASE_URL}/internal/academics/courses`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch courses');
      return data;
    } catch (err) {
      console.error('API getCourses Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  static async getCourseById(courseId) {
    try {
      const res = await this._authorizedFetch(`${API_BASE_URL}/internal/academics/courses/${courseId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch course details');
      return data;
    } catch (err) {
      console.error('API getCourseById Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  static async createCourse(payload) {
    try {
      const res = await this._authorizedFetch(`${API_BASE_URL}/internal/academics/courses`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Course creation failed');
      return data;
    } catch (err) {
      console.error('API createCourse Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  static async getCourseModules(courseId) {
    try {
      const res = await this._authorizedFetch(`${API_BASE_URL}/internal/academics/courses/${courseId}/modules`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch modules');
      return data;
    } catch (err) {
      console.error('API getCourseModules Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  static async createCourseModule(courseId, payload) {
    try {
      const res = await this._authorizedFetch(`${API_BASE_URL}/internal/academics/courses/${courseId}/modules`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Module creation failed');
      return data;
    } catch (err) {
      console.error('API createCourseModule Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  static async uploadMediaFile({ filename, fileData, mimeType }) {
    try {
      const res = await this._authorizedFetch(`${API_BASE_URL}/internal/media/upload`, {
        method: 'POST',
        body: JSON.stringify({ filename, fileData, mimeType })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Media upload failed');
      return data;
    } catch (err) {
      console.error('API uploadMediaFile Error:', err.message);
      return { success: false, error: err.message };
    }
  }
}

export { ApiClient };
