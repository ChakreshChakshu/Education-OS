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

  static async createTenant(payload) {
    try {
      const res = await fetch(`${API_BASE_URL}/internal/tenants`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
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
      const res = await fetch(`${API_BASE_URL}/internal/academics/courses`, {
        headers: this.getHeaders()
      });
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
      const res = await fetch(`${API_BASE_URL}/internal/academics/courses/${courseId}`, {
        headers: this.getHeaders()
      });
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
      const res = await fetch(`${API_BASE_URL}/internal/academics/courses`, {
        method: 'POST',
        headers: this.getHeaders(),
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
      const res = await fetch(`${API_BASE_URL}/internal/academics/courses/${courseId}/modules`, {
        headers: this.getHeaders()
      });
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
      const res = await fetch(`${API_BASE_URL}/internal/academics/courses/${courseId}/modules`, {
        method: 'POST',
        headers: this.getHeaders(),
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
      const res = await fetch(`${API_BASE_URL}/internal/media/upload`, {
        method: 'POST',
        headers: this.getHeaders(),
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
