import { notFound } from "next/navigation";
import { ApiClient } from "@/lib/api";
import CourseDetailClient from "./CourseDetailClient";

export async function generateMetadata({ params }) {
  const { slug, courseId } = await params;
  const courseRes = await ApiClient.getStorefrontCourse(slug, courseId);
  if (!courseRes.success) {
    return { title: "Course Not Found" };
  }
  const title = courseRes.course.title;
  return {
    title: `${title} | Course Syllabus`,
    description: `Enroll in ${title}. Comprehensive self-paced syllabus with video lectures, exercises, and official certificate.`
  };
}

export default async function CourseDetailPage({ params }) {
  const { slug, courseId } = await params;

  // 1. Fetch tenant branding
  const storefrontRes = await ApiClient.getStorefront(slug);
  if (!storefrontRes.success) {
    notFound();
  }
  const tenant = storefrontRes.tenant;

  // 2. Fetch course syllabus
  const courseRes = await ApiClient.getStorefrontCourse(slug, courseId);
  let course = courseRes.success ? courseRes.course : null;

  // Fallback demo course if course ID was from sample catalog, otherwise 404
  if (!course) {
    if (courseId === "course-1" || courseId === "course-2" || courseId === "course-3") {
      course = {
        id: courseId,
        title: courseId === "course-1"
          ? "Modern Full-Stack Cloud Architecture"
          : courseId === "course-2"
          ? "Database Engineering & Drizzle ORM"
          : "Applied System Security & Cryptography",
        code: courseId === "course-1" ? "CS-401" : courseId === "course-2" ? "DB-201" : "SEC-301",
        level: courseId === "course-1" ? "ADVANCED" : courseId === "course-2" ? "INTERMEDIATE" : "BEGINNER",
      credits: 4,
      price: courseId === "course-1" ? 9900 : 4900,
      currency: "USD",
      shortDescription: "A comprehensive course designed to build production-grade competence with live video lessons, hands-on architectural design, and graduation capstone.",
      description: "In this course, you will learn the end-to-end patterns required to engineer modern software systems. From foundational protocols to resilient cloud deployments, each module features focused video lessons and practical milestone evaluations.",
      modules: [
        {
          id: "mod-1",
          order: 1,
          title: "Module 1: Foundations, Tooling & Setup",
          contentType: "VIDEO",
          isPreview: true,
          contentUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
        },
        {
          id: "mod-2",
          order: 2,
          title: "Module 2: Core Domain Modeling & Use Case Design",
          contentType: "VIDEO",
          isPreview: false
        },
        {
          id: "mod-3",
          order: 3,
          title: "Module 3: Production Hardening & Capstone Quiz",
          contentType: "QUIZ",
          isPreview: false
        }
      ]
    };
    } else {
      notFound();
    }
  }

  return <CourseDetailClient course={course} tenant={tenant} slug={slug} />;
}
