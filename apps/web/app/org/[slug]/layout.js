import Link from "next/link";
import { notFound } from "next/navigation";
import { GraduationCap, ArrowRight, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { ApiClient } from "@/lib/api";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const res = await ApiClient.getStorefront(slug);
  if (!res.success) {
    return { title: "Institution Not Found" };
  }
  const name = res.tenant.name;
  return {
    title: `${name} | Online Courses & Certifications`,
    description: `Official course catalog and online academy for ${name}. Explore verified courses, self-paced syllabus, and instant certification.`
  };
}

export default async function StorefrontLayout({ children, params }) {
  const { slug } = await params;
  const storefrontRes = await ApiClient.getStorefront(slug);
  if (!storefrontRes.success) {
    notFound();
  }
  const tenant = storefrontRes.tenant;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Banner / Announcement */}
      <div className="bg-gradient-to-r from-indigo-900/40 via-zinc-900 to-emerald-950/30 border-b border-zinc-800/80 px-4 py-2 text-xs text-center text-zinc-300 flex items-center justify-center gap-2">
        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>Open Enrollment: <strong>Get lifetime access with verifiable completion certificates</strong></span>
      </div>

      {/* Main Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-zinc-950/80 border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href={`/`} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <GraduationCap size={22} weight="bold" className="text-white" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white block leading-tight">
                {tenant.name}
              </span>
              <span className="text-[11px] font-medium text-emerald-400 tracking-wider uppercase block">
                Official Academy
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <Link href="#courses" className="hover:text-white transition-colors">Courses</Link>
            <Link href="#curriculum" className="hover:text-white transition-colors">Curriculum</Link>
            <Link href="#reviews" className="hover:text-white transition-colors">Reviews</Link>
            <Link href="#faq" className="hover:text-white transition-colors">FAQ</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-semibold px-4 py-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              Student Portal
            </Link>
            <Link
              href="#courses"
              className="text-xs font-semibold px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-1.5"
            >
              Explore Courses
              <ArrowRight size={14} weight="bold" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Page Body */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8 text-zinc-500 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <GraduationCap size={20} className="text-indigo-400" />
            <span className="text-zinc-400 font-semibold">{tenant.name}</span>
            <span>· Verified EducationOS Storefront</span>
          </div>

          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <ShieldCheck size={16} className="text-emerald-400" />
              256-bit Encrypted Checkout
            </span>
            <span>30-Day Refund Guarantee</span>
            <span>Self-Paced Learning</span>
          </div>

          <p className="text-zinc-600">
            © {new Date().getFullYear()} {tenant.name}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
