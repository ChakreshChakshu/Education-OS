const LOGIN_FALLBACK = '/dashboard';
const VALIDATION_ORIGIN = 'https://educationos.invalid';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getPostLoginPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') ||
      /[\\\s]/.test(value)) {
    return LOGIN_FALLBACK;
  }

  try {
    const url = new URL(value, VALIDATION_ORIGIN);
    // URL normalization can turn a path containing dot segments into a leading double slash.
    if (url.origin !== VALIDATION_ORIGIN || url.pathname.startsWith('//') ||
        /%(?:25)*(?:2f|5c)/i.test(url.pathname)) {
      return LOGIN_FALLBACK;
    }
    return url.pathname + url.search + url.hash;
  } catch {
    return LOGIN_FALLBACK;
  }
}

export async function completeLoginEnrollment({ courseId, tenantId }, enrollStudent) {
  if (!UUID.test(courseId) || (tenantId !== null && !UUID.test(tenantId))) {
    return { error: 'This enrollment link is invalid.' };
  }

  const result = await enrollStudent(tenantId ? { courseId, tenantId } : { courseId });
  if (!result?.success) {
    return { error: result?.error || 'Could not complete course enrollment.' };
  }
  return { destination: `/dashboard/courses?${new URLSearchParams({ enrolled: courseId })}` };
}
