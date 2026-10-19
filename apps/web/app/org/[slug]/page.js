import { notFound } from "next/navigation";
import { ApiClient } from "@/lib/api";
import StorefrontClient from "./StorefrontClient";

export default async function OrgStorefrontPage({ params }) {
  const { slug } = await params;

  // 1. Fetch tenant public profile from API
  const storefrontRes = await ApiClient.getStorefront(slug);
  if (!storefrontRes.success) {
    notFound();
  }
  const tenant = storefrontRes.tenant;

  // 2. Fetch tenant public courses
  const coursesRes = await ApiClient.getStorefrontCourses(slug);
  let courses = coursesRes.success ? coursesRes.courses : [];

  // Curated educational sample courses if tenant does not yet have published courses
  if (courses.length === 0) {
    courses = [
      {
        id: "course-1",
        title: "Modern Full-Stack Cloud Architecture",
        code: "CS-401",
        slug: "modern-full-stack-cloud-architecture",
        shortDescription: "Design, build, and deploy resilient distributed microservices using Next.js, Node.js, and Cloudflare R2.",
        level: "ADVANCED",
        credits: 4,
        price: 9900,
        currency: "USD"
      },
      {
        id: "course-2",
        title: "Database Engineering & Drizzle ORM",
        code: "DB-201",
        slug: "database-engineering-drizzle-orm",
        shortDescription: "Master relational schema design, connection pooling, indexing strategies, and automated migrations.",
        level: "INTERMEDIATE",
        credits: 3,
        price: 4900,
        currency: "USD"
      },
      {
        id: "course-3",
        title: "Applied System Security & Cryptography",
        code: "SEC-301",
        slug: "applied-system-security-cryptography",
        shortDescription: "Implement robust JWT session rotation, bcrypt entropy, CSRF mitigation, and RBAC authorization.",
        level: "BEGINNER",
        credits: 3,
        price: 3900,
        currency: "USD"
      }
    ];
  }

  return (
    <StorefrontClient tenant={tenant} initialCourses={courses} slug={slug} />
  );
}
