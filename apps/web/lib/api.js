const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// Reads the non-httpOnly csrf_token cookie the API sets on login/refresh. It's
// deliberately readable by JS — the double-submit check just confirms this
// request came from same-origin code, since a cross-site page can't read it.
function readCsrfCookie() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

class ApiClient {
  static getHeaders(extraHeaders = {}, { mutating = false } = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...extraHeaders
    };
    if (typeof window !== 'undefined') {
      const tenantId = localStorage.getItem('eos_tenant_id');
      if (tenantId) {
        headers['x-tenant-id'] = tenantId;
      }
      if (mutating) {
        const csrfToken = readCsrfCookie();
        if (csrfToken) {
          headers['x-csrf-token'] = csrfToken;
        }
      }
    }
    return headers;
  }

  // Attempts a single silent access-token refresh via the httpOnly refresh_token
  // cookie. Access tokens are short-lived (15 min, see docs/auth_and_authorization.md),
  // so without this every internal request would start failing mid-session.
  static async _tryRefreshAccessToken() {
    try {
      const res = await fetch(`${API_BASE_URL}/public/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: this.getHeaders({}, { mutating: true }),
        body: JSON.stringify({})
      });
      return res.ok;
    } catch (err) {
      return false;
    }
  }

  // Shared fetch wrapper for authenticated internal routes: sends cookies, attaches
  // the CSRF header on mutations, and retries once after a silent refresh on a 401.
  static async _authorizedFetch(url, options = {}) {
    const mutating = Boolean(options.method) && options.method !== 'GET';
    const build = () => ({
      ...options,
      credentials: 'include',
      headers: this.getHeaders(options.headers, { mutating })
    });

    let res = await fetch(url, build());

    if (res.status === 401) {
      const refreshed = await this._tryRefreshAccessToken();
      if (refreshed) {
        res = await fetch(url, build());
      }
    }

    return res;
  }

  static async checkSlug(slug) {
    try {
      const res = await fetch(`${API_BASE_URL}/public/auth/check-slug?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('API checkSlug Error:', err.message);
      return { success: false, available: false, error: err.message };
    }
  }

  static async registerUser(payload) {
    try {
      const res = await fetch(`${API_BASE_URL}/public/auth/register`, {
        method: 'POST',
        credentials: 'include',
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
        credentials: 'include',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      return data;
    } catch (err) {
      console.error('API loginUser Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  // Session bootstrap for page load: the access_token cookie is httpOnly, so this
  // is the only way the client can tell whether it's actually logged in.
  static async getMe() {
    try {
      const res = await this._authorizedFetch(`${API_BASE_URL}/internal/me`);
      if (!res.ok) return { success: false };
      return await res.json();
    } catch (err) {
      return { success: false };
    }
  }

  static async logout() {
    try {
      const res = await fetch(`${API_BASE_URL}/public/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: this.getHeaders({}, { mutating: true }),
        body: JSON.stringify({})
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
      // authenticated session (see apps/api/src/routes/v1/internal/index.js) so a
      // tenant can never be provisioned "owned by" someone else's account.
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

  static async updateCourseModule(courseId, moduleId, payload) {
    try {
      const res = await this._authorizedFetch(`${API_BASE_URL}/internal/academics/courses/${courseId}/modules/${moduleId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Module update failed');
      return data;
    } catch (err) {
      console.error('API updateCourseModule Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  static async deleteCourseModule(courseId, moduleId) {
    try {
      const res = await this._authorizedFetch(`${API_BASE_URL}/internal/academics/courses/${courseId}/modules/${moduleId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Module deletion failed');
      return data;
    } catch (err) {
      console.error('API deleteCourseModule Error:', err.message);
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

  static async getMediaStatus(mediaId) {
    try {
      const res = await this._authorizedFetch(`${API_BASE_URL}/internal/media/status/${mediaId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch media status');
      return data;
    } catch (err) {
      console.error('API getMediaStatus Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  static async completeLesson({ studentUserId, lessonModuleId, batchId }) {
    try {
      const activeUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('eos_user') || '{}') : {};
      const resolvedUserId = studentUserId || activeUser.id || activeUser.userId || '018f92ab-1234-7890-a1b2-c3d4e5f6a7b8';
      const res = await this._authorizedFetch(`${API_BASE_URL}/internal/learning/lessons/complete`, {
        method: 'POST',
        body: JSON.stringify({ studentUserId: resolvedUserId, lessonModuleId, batchId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete lesson');
      return data;
    } catch (err) {
      console.error('API completeLesson Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  static async getCourseProgress(courseId, studentUserId) {
    try {
      const activeUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('eos_user') || '{}') : {};
      const resolvedUserId = studentUserId || activeUser.id || activeUser.userId || '018f92ab-1234-7890-a1b2-c3d4e5f6a7b8';
      const res = await this._authorizedFetch(`${API_BASE_URL}/internal/learning/courses/${courseId}/progress?studentUserId=${resolvedUserId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch course progress');
      return data;
    } catch (err) {
      console.error('API getCourseProgress Error:', err.message);
      return { success: false, data: { completedLessonIds: [], progressPercent: 0 } };
    }
  }

  static async submitQuiz({ studentUserId, lessonModuleId, score, passingScore = 70, batchId }) {
    try {
      const activeUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('eos_user') || '{}') : {};
      const resolvedUserId = studentUserId || activeUser.id || activeUser.userId || '018f92ab-1234-7890-a1b2-c3d4e5f6a7b8';
      const res = await this._authorizedFetch(`${API_BASE_URL}/internal/learning/quizzes/submit`, {
        method: 'POST',
        body: JSON.stringify({ studentUserId: resolvedUserId, lessonModuleId, score, passingScore, batchId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit quiz');
      return data;
    } catch (err) {
      console.error('API submitQuiz Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  static async getLessonNotes(lessonId) {
    try {
      const res = await this._authorizedFetch(`${API_BASE_URL}/internal/learning/lessons/${lessonId}/notes`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch lesson notes');
      return data;
    } catch (err) {
      console.error('API getLessonNotes Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  static async saveLessonNotes(lessonId, content) {
    try {
      const res = await this._authorizedFetch(`${API_BASE_URL}/internal/learning/lessons/${lessonId}/notes`, {
        method: 'PUT',
        body: JSON.stringify({ content })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save lesson notes');
      return data;
    } catch (err) {
      console.error('API saveLessonNotes Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  static async getUserProfile() {
    try {
      const res = await this._authorizedFetch(`${API_BASE_URL}/internal/users/profile`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch user profile');
      return data;
    } catch (err) {
      console.error('API getUserProfile Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  static async updateUserProfile(payload) {
    try {
      const res = await this._authorizedFetch(`${API_BASE_URL}/internal/users/profile`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');
      return data;
    } catch (err) {
      console.error('API updateUserProfile Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  static async changePassword(payload) {
    try {
      const res = await this._authorizedFetch(`${API_BASE_URL}/internal/users/change-password`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');
      return data;
    } catch (err) {
      console.error('API changePassword Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  static async getTenantSettings() {
    try {
      const res = await this._authorizedFetch(`${API_BASE_URL}/internal/tenants/current`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch tenant settings');
      return data;
    } catch (err) {
      console.error('API getTenantSettings Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  static async updateTenantSettings(payload) {
    try {
      const res = await this._authorizedFetch(`${API_BASE_URL}/internal/tenants/current/settings`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update tenant settings');
      return data;
    } catch (err) {
      console.error('API updateTenantSettings Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  static async getLessonBookmarks(lessonId) {
    try {
      const res = await this._authorizedFetch(`${API_BASE_URL}/internal/learning/lessons/${lessonId}/bookmarks`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch bookmarks');
      return data;
    } catch (err) {
      console.error('API getLessonBookmarks Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  static async createLessonBookmark(lessonId, payload) {
    try {
      const res = await this._authorizedFetch(`${API_BASE_URL}/internal/learning/lessons/${lessonId}/bookmarks`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create bookmark');
      return data;
    } catch (err) {
      console.error('API createLessonBookmark Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  static async deleteLessonBookmark(lessonId, bookmarkId) {
    try {
      const res = await this._authorizedFetch(`${API_BASE_URL}/internal/learning/lessons/${lessonId}/bookmarks/${bookmarkId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete bookmark');
      return data;
    } catch (err) {
      console.error('API deleteLessonBookmark Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  static async getEnrollments(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (filters.courseId) queryParams.append('courseId', filters.courseId);
      if (filters.batchId) queryParams.append('batchId', filters.batchId);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.search) queryParams.append('search', filters.search);
      const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';

      const res = await this._authorizedFetch(`${API_BASE_URL}/internal/academics/enrollments${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch enrollments');
      return data;
    } catch (err) {
      console.error('API getEnrollments Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  static async enrollStudent(payload) {
    try {
      const res = await this._authorizedFetch(`${API_BASE_URL}/internal/academics/enrollments`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to enroll student');
      return data;
    } catch (err) {
      console.error('API enrollStudent Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  static async updateEnrollment(id, payload) {
    try {
      const res = await this._authorizedFetch(`${API_BASE_URL}/internal/academics/enrollments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update enrollment');
      return data;
    } catch (err) {
      console.error('API updateEnrollment Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  static async getBatches(courseId) {
    try {
      const qs = courseId ? `?courseId=${courseId}` : '';
      const res = await this._authorizedFetch(`${API_BASE_URL}/internal/academics/batches${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch batches');
      return data;
    } catch (err) {
      console.error('API getBatches Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  static async createBatch(payload) {
    try {
      const res = await this._authorizedFetch(`${API_BASE_URL}/internal/academics/batches`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create batch');
      return data;
    } catch (err) {
      console.error('API createBatch Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  static async verifyActivationToken(token) {
    try {
      const res = await fetch(`${API_BASE_URL}/public/auth/verify-activation-token?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid or expired activation link');
      return data;
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  static async activateAccount({ token, password }) {
    try {
      const res = await fetch(`${API_BASE_URL}/public/auth/activate`, {
        method: 'POST',
        credentials: 'include',
        headers: this.getHeaders({}, { mutating: true }),
        body: JSON.stringify({ token, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Account activation failed');
      return data;
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

export { ApiClient };


