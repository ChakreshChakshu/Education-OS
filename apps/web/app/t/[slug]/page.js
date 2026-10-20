import { redirect } from "next/navigation";

export default async function TenantRootPage({ params }) {
  const resolvedParams = await params;
  redirect(`/t/${resolvedParams.slug}/courses`);
}
