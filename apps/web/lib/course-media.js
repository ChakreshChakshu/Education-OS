/**
 * Robust course thumbnail media resolver & fallback handler.
 * Prevents broken images, expired R2 presigned URLs, and missing assets.
 */

const TOPIC_IMAGES = {
  mern: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=1200&auto=format&fit=crop",
  fullstack: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=1200&auto=format&fit=crop",
  web: "https://images.unsplash.com/photo-1547658719-da2b51169166?q=80&w=1200&auto=format&fit=crop",
  react: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=1200&auto=format&fit=crop",
  database: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?q=80&w=1200&auto=format&fit=crop",
  dbms: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?q=80&w=1200&auto=format&fit=crop",
  sql: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?q=80&w=1200&auto=format&fit=crop",
  os: "https://images.unsplash.com/photo-1629654297299-c8506221ca97?q=80&w=1200&auto=format&fit=crop",
  operating: "https://images.unsplash.com/photo-1629654297299-c8506221ca97?q=80&w=1200&auto=format&fit=crop",
  kernel: "https://images.unsplash.com/photo-1629654297299-c8506221ca97?q=80&w=1200&auto=format&fit=crop",
  algorithm: "https://images.unsplash.com/photo-1516116211227-bbc07efb6d13?q=80&w=1200&auto=format&fit=crop",
  dsa: "https://images.unsplash.com/photo-1516116211227-bbc07efb6d13?q=80&w=1200&auto=format&fit=crop",
  cloud: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop",
  devops: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop",
  docker: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop",
  distributed: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=1200&auto=format&fit=crop",
  software: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1200&auto=format&fit=crop",
  ai: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?q=80&w=1200&auto=format&fit=crop",
  python: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1200&auto=format&fit=crop",
  default: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop",
};

/**
 * Returns a high-resolution, relevant Unsplash educational photo based on course metadata.
 */
export function getCourseFallbackImage(course = {}) {
  const title = (course?.title || "").toLowerCase();
  const code = (course?.code || "").toLowerCase();
  const slug = (course?.slug || "").toLowerCase();
  const desc = (course?.shortDescription || course?.description || "").toLowerCase();
  const text = `${title} ${code} ${slug} ${desc}`;

  if (text.includes("mern") || text.includes("fullstack") || text.includes("full stack") || text.includes("fsd")) {
    return TOPIC_IMAGES.mern;
  }
  if (text.includes("react") || text.includes("frontend") || text.includes("next.js")) {
    return TOPIC_IMAGES.react;
  }
  if (text.includes("database") || text.includes("dbms") || text.includes("sql") || text.includes("postgres")) {
    return TOPIC_IMAGES.database;
  }
  if (text.includes("operating system") || text.includes("os") || text.includes("kernel") || text.includes("linux")) {
    return TOPIC_IMAGES.os;
  }
  if (text.includes("data structure") || text.includes("algorithm") || text.includes("dsa")) {
    return TOPIC_IMAGES.dsa;
  }
  if (text.includes("cloud") || text.includes("devops") || text.includes("docker") || text.includes("kubernetes")) {
    return TOPIC_IMAGES.cloud;
  }
  if (text.includes("distributed system") || text.includes("microservice")) {
    return TOPIC_IMAGES.distributed;
  }
  if (text.includes("software") || text.includes("engineering") || text.includes("architecture")) {
    return TOPIC_IMAGES.software;
  }
  if (text.includes("ai") || text.includes("machine learning") || text.includes("deep learning") || text.includes("python")) {
    return TOPIC_IMAGES.ai;
  }

  return TOPIC_IMAGES.default;
}

/**
 * Checks whether an S3 / R2 presigned URL is expired.
 */
export function isExpiredPresignedUrl(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const matchDate = url.match(/X-Amz-Date=([0-9]{8}T[0-9]{6}Z)/);
    const matchExpires = url.match(/X-Amz-Expires=([0-9]+)/);
    if (matchDate && matchExpires) {
      const dateStr = matchDate[1];
      // Format: YYYYMMDDTHHMMSSZ
      const year = parseInt(dateStr.slice(0, 4), 10);
      const month = parseInt(dateStr.slice(4, 6), 10) - 1;
      const day = parseInt(dateStr.slice(6, 8), 10);
      const hour = parseInt(dateStr.slice(9, 11), 10);
      const min = parseInt(dateStr.slice(11, 13), 10);
      const sec = parseInt(dateStr.slice(13, 15), 10);
      const signedAtMs = Date.UTC(year, month, day, hour, min, sec);
      const expiresSec = parseInt(matchExpires[1], 10);
      const expiresAtMs = signedAtMs + (expiresSec * 1000);
      // If current time > expiration time, it's expired
      if (Date.now() > expiresAtMs) {
        return true;
      }
    }
  } catch (e) {
    // Ignore parse error
  }
  return false;
}

/**
 * Resolves a reliable, viewable thumbnail URL for any course.
 */
export function resolveCourseThumbnail(course = {}) {
  const url = course?.thumbnailUrl;
  if (!url) {
    return getCourseFallbackImage(course);
  }

  // Check if expired R2 presigned URL
  if (isExpiredPresignedUrl(url)) {
    return getCourseFallbackImage(course);
  }

  // If local uploads relative path, ensure it works with Fastify backend or proxy
  if (url.startsWith("/uploads/")) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    return `${apiUrl}${url}`;
  }

  return url;
}

/**
 * React onError handler for <img> tags.
 * Swaps broken images with topic-curated Unsplash fallback seamlessly.
 */
export function handleCourseImageError(event, course) {
  if (!event || !event.currentTarget) return;
  event.currentTarget.onerror = null; // Prevent infinite fallback loops
  event.currentTarget.src = getCourseFallbackImage(course);
}
