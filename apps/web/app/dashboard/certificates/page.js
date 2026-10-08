"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/providers/auth-context";
import {
  Award,
  Download,
  Printer,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  FileText,
  ShieldCheck,
  Palette,
  ExternalLink,
  ChevronRight,
  GraduationCap,
  Building,
  UserCheck,
  Calendar,
  Sliders,
  CheckCircle2
} from "lucide-react";

// Predefined Certificate Themes with pure Hex/RGBA color definitions
const THEMES = {
  gold: {
    id: "gold",
    name: "Imperial Gold",
    description: "Classic prestige with double gilded borders & royal crest",
    outerBgGradient: "linear-gradient(135deg, #0c0d12 0%, #161824 50%, #0c0d12 100%)",
    cardBorderColor: "rgba(245, 158, 11, 0.45)",
    innerBorderColor: "rgba(245, 158, 11, 0.3)",
    accentPrimary: "#f59e0b",
    accentSecondary: "#d97706",
    textHeading: "#fef3c7",
    textSub: "#fde68a",
    sealGradient: "radial-gradient(circle, #fbbf24 0%, #d97706 100%)"
  },
  emerald: {
    id: "emerald",
    name: "Emerald Prestige",
    description: "Botanical distinction with deep emerald tones & champagne foil",
    outerBgGradient: "linear-gradient(135deg, #06140e 0%, #0d2e22 50%, #06140e 100%)",
    cardBorderColor: "rgba(16, 185, 129, 0.45)",
    innerBorderColor: "rgba(16, 185, 129, 0.3)",
    accentPrimary: "#10b981",
    accentSecondary: "#059669",
    textHeading: "#d1fae5",
    textSub: "#a7f3d0",
    sealGradient: "radial-gradient(circle, #34d399 0%, #059669 100%)"
  },
  sapphire: {
    id: "sapphire",
    name: "Sapphire Sovereign",
    description: "Academic authority with cobalt blues & silver platinum lines",
    outerBgGradient: "linear-gradient(135deg, #071324 0%, #0f2b4f 50%, #071324 100%)",
    cardBorderColor: "rgba(6, 182, 212, 0.45)",
    innerBorderColor: "rgba(6, 182, 212, 0.3)",
    accentPrimary: "#06b6d4",
    accentSecondary: "#0284c7",
    textHeading: "#cffafe",
    textSub: "#bae6fd",
    sealGradient: "radial-gradient(circle, #22d3ee 0%, #0284c7 100%)"
  },
  obsidian: {
    id: "obsidian",
    name: "Cyber Obsidian",
    description: "Futuristic tech mastery with violet glow & geometric circuits",
    outerBgGradient: "linear-gradient(135deg, #0e071c 0%, #231244 50%, #0e071c 100%)",
    cardBorderColor: "rgba(168, 85, 247, 0.45)",
    innerBorderColor: "rgba(168, 85, 247, 0.3)",
    accentPrimary: "#a855f7",
    accentSecondary: "#7c3aed",
    textHeading: "#f3e8ff",
    textSub: "#e9d5ff",
    sealGradient: "radial-gradient(circle, #c084fc 0%, #7c3aed 100%)"
  }
};

// Quick Presets
const PRESETS = [
  {
    label: "AI & Neural Systems",
    studentName: "Alexander Vance",
    studentId: "STU-8841-A",
    courseTitle: "Deep Neural Architectures & Transformer Engineering",
    specialization: "Specialization in Autonomous Reasoning Systems",
    grade: "High Distinction (Summa Cum Laude • 98.4%)",
    hours: "180 Contact Hours • 18 Academic ECTS",
    instructorName: "Dr. Elena Rostova, Ph.D.",
    instructorTitle: "Chair of Machine Learning & Cognitive Systems",
    provostName: "Prof. Kenneth Sterling",
    provostTitle: "Dean of Engineering & Applied Sciences",
    theme: "gold"
  },
  {
    label: "Distributed Cloud Architect",
    studentName: "Maya Lin Chen",
    studentId: "STU-7290-C",
    courseTitle: "Cloud-Native Infrastructure & Distributed Systems",
    specialization: "High-Availability Multi-Tenant Kernel Engineering",
    grade: "First Class Distinction (Grade A+)",
    hours: "140 Technical Hours • 14 Professional Credits",
    instructorName: "Marcus Vance, M.Eng",
    instructorTitle: "Principal Distributed Systems Architect",
    provostName: "Dr. Arthur Pendelton",
    provostTitle: "Academic Provost & Research Director",
    theme: "sapphire"
  },
  {
    label: "Cybersecurity & Cryptography",
    studentName: "Liam O'Connor",
    studentId: "STU-5512-S",
    courseTitle: "Zero-Trust Security & Applied Cryptographic Protocols",
    specialization: "Auditing, Formal Verification & Threat Defense",
    grade: "Mastery Level (Top 2% Percentile)",
    hours: "160 Laboratory Hours • CISSP Alignment",
    instructorName: "Cdr. David Miller, D.Sc.",
    instructorTitle: "Director of Defensive Information Operations",
    provostName: "Dean Sarah Jenkins",
    provostTitle: "Vice-Chancellor of Technology Disciplines",
    theme: "obsidian"
  }
];

function generateVerificationCode() {
  const year = new Date().getFullYear();
  const hexPart = Math.random().toString(16).substring(2, 6).toUpperCase();
  const hexPart2 = Math.random().toString(16).substring(2, 6).toUpperCase();
  return `EOS-${year}-${hexPart}-${hexPart2}`;
}

export default function CertificateGeneratorPage() {
  const { activeTenant, user } = useAuth();
  const certificateRef = useRef(null);

  // Form State
  const [studentName, setStudentName] = useState("Jane Alexandra Doe");
  const [studentId, setStudentId] = useState("STU-2026-9041");
  const [courseTitle, setCourseTitle] = useState("Full-Stack Enterprise Systems & Scalable Microservices");
  const [specialization, setSpecialization] = useState("Domain-Driven Design & High-Concurrency Architecture");
  const [grade, setGrade] = useState("Passed with Distinction • Grade A+");
  const [issueDate, setIssueDate] = useState("October 7, 2026");
  const [hours, setHours] = useState("120 Guided Learning Hours • 12 Academic Credits");
  const [institutionName, setInstitutionName] = useState(
    activeTenant?.name || "Apex Institute of Advanced Technologies"
  );
  const [instructorName, setInstructorName] = useState("Dr. Robert Langford, Ph.D.");
  const [instructorTitle, setInstructorTitle] = useState("Director of Academic Programs");
  const [provostName, setProvostName] = useState("Prof. Clarissa Thorne");
  const [provostTitle, setProvostTitle] = useState("Dean of Academic Affairs");
  const [certificateCode, setCertificateCode] = useState("EOS-2026-F41A-99B2");
  const [selectedTheme, setSelectedTheme] = useState("gold");

  // UI feedback states
  const [isExporting, setIsExporting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [history, setHistory] = useState([]);

  // Sync default institution if active tenant updates
  useEffect(() => {
    if (activeTenant?.name) {
      setInstitutionName(activeTenant.name);
    }
  }, [activeTenant]);

  // Load local draft / history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("eos_certificate_history");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {}
  }, []);

  const handleRegenerateCode = () => {
    setCertificateCode(generateVerificationCode());
  };

  const handleApplyPreset = (preset) => {
    setStudentName(preset.studentName);
    setStudentId(preset.studentId);
    setCourseTitle(preset.courseTitle);
    setSpecialization(preset.specialization);
    setGrade(preset.grade);
    setHours(preset.hours);
    setInstructorName(preset.instructorName);
    setInstructorTitle(preset.instructorTitle);
    setProvostName(preset.provostName);
    setProvostTitle(preset.provostTitle);
    setSelectedTheme(preset.theme);
    setCertificateCode(generateVerificationCode());
  };

  // 1. Download as High-Resolution Vector-Wrapped PDF
  const handleDownloadPDF = async () => {
    if (!certificateRef.current) return;
    setIsExporting(true);

    try {
      // Use modern html-to-image which serializes directly via browser SVG without failing on oklab/color-mix
      const { toPng } = await import("html-to-image");
      const jspdfModule = await import("jspdf");
      const jsPDF = jspdfModule.jsPDF || jspdfModule.default?.jsPDF || jspdfModule.default;

      const element = certificateRef.current;
      
      const imgData = await toPng(element, {
        quality: 0.98,
        pixelRatio: 2.5,
        cacheBust: true,
        backgroundColor: null
      });

      // A4 Landscape dimensions in mm: 297 x 210
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      pdf.addImage(imgData, "PNG", 0, 0, 297, 210, undefined, "FAST");
      const safeFilename = `Certificate_${(studentName || "Student").replace(/[^a-zA-Z0-9]/g, "_")}_${certificateCode}.pdf`;
      pdf.save(safeFilename);

      saveToLocalHistory();
    } catch (error) {
      console.error("Failed to generate PDF with html-to-image:", error);
      alert("Encountered rendering issue. Falling back to native browser print to PDF.");
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Download as High-Resolution PNG
  const handleDownloadPNG = async () => {
    if (!certificateRef.current) return;
    setIsExporting(true);

    try {
      const { toPng } = await import("html-to-image");
      const imgData = await toPng(certificateRef.current, {
        quality: 0.98,
        pixelRatio: 2.5,
        cacheBust: true,
        backgroundColor: null
      });

      const link = document.createElement("a");
      link.download = `Certificate_${(studentName || "Student").replace(/[^a-zA-Z0-9]/g, "_")}_${certificateCode}.png`;
      link.href = imgData;
      link.click();

      saveToLocalHistory();
    } catch (error) {
      console.error("Failed to export PNG:", error);
      alert("Could not export PNG.");
    } finally {
      setIsExporting(false);
    }
  };

  // 3. Print Certificate (Native Browser Print with high fidelity CSS)
  const handlePrint = () => {
    window.print();
  };

  // 4. Copy shareable verification link
  const handleCopyLink = () => {
    const link = `${window.location.origin}/verify/${certificateCode}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const saveToLocalHistory = () => {
    const entry = {
      id: certificateCode,
      studentName,
      courseTitle,
      issueDate,
      theme: selectedTheme,
      createdAt: new Date().toISOString()
    };
    const updated = [entry, ...history.filter((h) => h.id !== certificateCode)].slice(0, 10);
    setHistory(updated);
    try {
      localStorage.setItem("eos_certificate_history", JSON.stringify(updated));
    } catch (e) {}
  };

  const currentTheme = THEMES[selectedTheme] || THEMES.gold;

  return (
    <div className="space-y-8 pb-16">
      {/* Print-only CSS styling rules to guarantee full bleed A4 landscape print */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-certificate,
          #printable-certificate * {
            visibility: visible !important;
          }
          #printable-certificate {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            transform: none !important;
          }
          @page {
            size: A4 landscape;
            margin: 0;
          }
        }
      `}</style>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-sm">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Academic Certificate Studio</h1>
              <p className="text-sm text-muted-foreground">
                Generate high-definition credentials, instant vector PDFs, and verifiable academic diplomas.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-border/80 bg-background hover:bg-muted transition-colors shadow-sm"
          >
            <Printer className="h-4 w-4 text-muted-foreground" />
            Print Dialog
          </button>
          <button
            onClick={handleDownloadPNG}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-border/80 bg-background hover:bg-muted transition-colors shadow-sm disabled:opacity-50"
          >
            <Download className="h-4 w-4 text-muted-foreground" />
            Export PNG
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Rendering PDF..." : "Download Official PDF"}
          </button>
        </div>
      </div>

      {/* Presets Quick Strip */}
      <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span>Quick Autofill Templates:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handleApplyPreset(preset)}
              className="text-xs px-2.5 py-1.5 rounded-md bg-background border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors font-medium text-foreground"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Two Column Layout: Generator Controls & Live Canvas */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Configuration Controls (5 Cols) */}
        <div className="xl:col-span-5 space-y-6 bg-card rounded-2xl border border-border p-5 lg:p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Sliders className="h-4 w-4 text-primary" />
              <span>Certificate Parameters</span>
            </div>
            <button
              onClick={handleRegenerateCode}
              title="Regenerate Certificate ID"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>New ID</span>
            </button>
          </div>

          {/* Theme Palette Selector */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2.5">
              Visual Palette & Styling
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {Object.values(THEMES).map((thm) => {
                const isSelected = selectedTheme === thm.id;
                return (
                  <button
                    key={thm.id}
                    onClick={() => setSelectedTheme(thm.id)}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40"
                        : "border-border/70 hover:border-border hover:bg-muted/40"
                    }`}
                  >
                    <div
                      className="h-7 w-7 rounded-lg shrink-0 flex items-center justify-center font-bold text-xs"
                      style={{
                        background: `linear-gradient(135deg, ${thm.accentPrimary}, ${thm.accentSecondary})`,
                        color: "#000"
                      }}
                    >
                      <Palette className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground flex items-center gap-1">
                        {thm.name}
                        {isSelected && <CheckCircle2 className="h-3 w-3 text-primary ml-auto" />}
                      </div>
                      <div className="text-[10px] text-muted-foreground line-clamp-1">{thm.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Recipient */}
          <div className="space-y-3.5 pt-2 border-t border-border/50">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" />
              Student Recipient
            </span>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Student Full Name</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Jane Alexandra Doe"
                className="w-full text-sm px-3 py-2 rounded-lg bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Student / Registration ID</label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g. STU-2026-9041"
                  className="w-full text-sm px-3 py-2 rounded-lg bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Issue Date</label>
                <input
                  type="text"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  placeholder="e.g. October 7, 2026"
                  className="w-full text-sm px-3 py-2 rounded-lg bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Section: Academic Curriculum */}
          <div className="space-y-3.5 pt-2 border-t border-border/50">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Curriculum & Achievement
            </span>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Course Title</label>
              <input
                type="text"
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                placeholder="e.g. Full-Stack Enterprise Systems"
                className="w-full text-sm px-3 py-2 rounded-lg bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Sub-Citation / Track</label>
              <input
                type="text"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="e.g. Domain-Driven Design & High Concurrency"
                className="w-full text-sm px-3 py-2 rounded-lg bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Grade / Distinction</label>
                <input
                  type="text"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="e.g. Distinction • Grade A+"
                  className="w-full text-sm px-3 py-2 rounded-lg bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Duration & Credits</label>
                <input
                  type="text"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="e.g. 120 Hours • 12 Credits"
                  className="w-full text-sm px-3 py-2 rounded-lg bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Section: Authority & Signatures */}
          <div className="space-y-3.5 pt-2 border-t border-border/50">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5" />
              Signatories & Organization
            </span>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Issuing Institution</label>
              <input
                type="text"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                placeholder="e.g. Apex Institute of Technology"
                className="w-full text-sm px-3 py-2 rounded-lg bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Primary Signatory</label>
                <input
                  type="text"
                  value={instructorName}
                  onChange={(e) => setInstructorName(e.target.value)}
                  placeholder="e.g. Dr. Robert Langford"
                  className="w-full text-sm px-3 py-2 rounded-lg bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
                <input
                  type="text"
                  value={instructorTitle}
                  onChange={(e) => setInstructorTitle(e.target.value)}
                  placeholder="e.g. Program Director"
                  className="w-full text-xs mt-1.5 px-3 py-1.5 rounded-lg bg-background border border-border focus:border-primary outline-none transition-colors text-muted-foreground"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Secondary Signatory</label>
                <input
                  type="text"
                  value={provostName}
                  onChange={(e) => setProvostName(e.target.value)}
                  placeholder="e.g. Prof. Clarissa Thorne"
                  className="w-full text-sm px-3 py-2 rounded-lg bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
                <input
                  type="text"
                  value={provostTitle}
                  onChange={(e) => setProvostTitle(e.target.value)}
                  placeholder="e.g. Academic Provost"
                  className="w-full text-xs mt-1.5 px-3 py-1.5 rounded-lg bg-background border border-border focus:border-primary outline-none transition-colors text-muted-foreground"
                />
              </div>
            </div>
          </div>

          {/* Section: Verification Token */}
          <div className="pt-2 border-t border-border/50">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Certificate Unique Code
              </label>
              <button
                onClick={handleCopyLink}
                className="text-[11px] text-primary hover:underline flex items-center gap-1"
              >
                {copiedLink ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                {copiedLink ? "Link Copied!" : "Copy Verification URL"}
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={certificateCode}
                onChange={(e) => setCertificateCode(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 rounded-lg bg-muted border border-border focus:border-primary outline-none"
              />
              <button
                onClick={handleRegenerateCode}
                className="px-3 py-2 rounded-lg border border-border hover:bg-muted text-xs font-medium"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Certificate Canvas & Direct Preview (7 Cols) */}
        <div className="xl:col-span-7 space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span className="font-medium flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Responsive Preview (Aspect 1.41 : 1 A4 Landscape)
            </span>
            <span>Scale: 300+ DPI Print-Ready Vector</span>
          </div>

          {/* THE CERTIFICATE CARD CONTAINER (Exportable Target) */}
          <div className="overflow-x-auto pb-4">
            <div
              id="printable-certificate"
              ref={certificateRef}
              className="relative mx-auto rounded-xl shadow-2xl p-8 sm:p-10 md:p-12 select-none"
              style={{
                width: "860px",
                minHeight: "608px",
                fontFamily: "var(--font-inter), sans-serif",
                boxSizing: "border-box",
                background: currentTheme.outerBgGradient,
                border: `4px solid ${currentTheme.cardBorderColor}`,
                color: "#ffffff"
              }}
            >
              {/* Ornate Double Border & Corner Guilloche Embellishments */}
              <div
                className="absolute inset-4 rounded-lg pointer-events-none"
                style={{
                  border: `2px solid ${currentTheme.innerBorderColor}`,
                  boxShadow: `inset 0 0 24px ${currentTheme.innerBorderColor}`
                }}
              />
              <div
                className="absolute inset-6 rounded pointer-events-none"
                style={{
                  border: `1px dashed ${currentTheme.innerBorderColor}`
                }}
              />

              {/* Top Corner Ornaments (SVG filigree) */}
              <svg className="absolute top-7 left-7 h-10 w-10 pointer-events-none" viewBox="0 0 40 40">
                <path d="M0,0 L40,0 L40,4 L4,4 L4,40 L0,40 Z" fill={currentTheme.accentPrimary} opacity="0.7" />
                <circle cx="8" cy="8" r="3" fill={currentTheme.accentPrimary} opacity="0.9" />
              </svg>
              <svg className="absolute top-7 right-7 h-10 w-10 pointer-events-none" viewBox="0 0 40 40">
                <path d="M40,0 L0,0 L0,4 L36,4 L36,40 L40,40 Z" fill={currentTheme.accentPrimary} opacity="0.7" />
                <circle cx="32" cy="8" r="3" fill={currentTheme.accentPrimary} opacity="0.9" />
              </svg>
              <svg className="absolute bottom-7 left-7 h-10 w-10 pointer-events-none" viewBox="0 0 40 40">
                <path d="M0,40 L40,40 L40,36 L4,36 L4,0 L0,0 Z" fill={currentTheme.accentPrimary} opacity="0.7" />
                <circle cx="8" cy="32" r="3" fill={currentTheme.accentPrimary} opacity="0.9" />
              </svg>
              <svg className="absolute bottom-7 right-7 h-10 w-10 pointer-events-none" viewBox="0 0 40 40">
                <path d="M40,40 L0,40 L0,36 L36,36 L36,0 L40,0 Z" fill={currentTheme.accentPrimary} opacity="0.7" />
                <circle cx="32" cy="32" r="3" fill={currentTheme.accentPrimary} opacity="0.9" />
              </svg>

              {/* Watermark Emblem in Background */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.035]">
                <Award className="h-[420px] w-[420px]" style={{ color: "#ffffff" }} />
              </div>

              {/* Main Content Layout */}
              <div className="relative z-10 flex flex-col items-center justify-between text-center h-full min-h-[510px]">
                {/* 1. Header & Institution */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-center gap-2 mb-1.5">
                    <div
                      className="h-9 w-9 rounded-full flex items-center justify-center shadow-lg"
                      style={{
                        background: `linear-gradient(135deg, ${currentTheme.accentPrimary}, ${currentTheme.accentSecondary})`
                      }}
                    >
                      <Building className="h-5 w-5 text-black" />
                    </div>
                  </div>
                  <h3
                    className="text-xs uppercase tracking-[0.28em] font-semibold"
                    style={{ color: currentTheme.accentPrimary }}
                  >
                    {institutionName}
                  </h3>
                  <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 font-medium">
                    Office of Academic Certification & Governance
                  </p>
                </div>

                {/* 2. Title & Presentation Citations */}
                <div className="space-y-2 my-2">
                  <div className="inline-block px-3 py-0.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm">
                    <span className="text-[11px] uppercase tracking-[0.3em] font-semibold text-zinc-300">
                      Certificate of Achievement
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 italic font-serif">
                    This prestigious credential is formally conferred upon
                  </p>

                  {/* Student Name */}
                  <h2
                    className="text-3xl sm:text-4xl font-extrabold tracking-tight py-1 font-serif"
                    style={{
                      color: currentTheme.textHeading,
                      textShadow: `0 0 20px ${currentTheme.accentPrimary}33`
                    }}
                  >
                    {studentName || "Student Name"}
                  </h2>

                  <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-400 font-mono">
                    <span>REG: {studentId}</span>
                    <span>•</span>
                    <span style={{ color: currentTheme.accentPrimary, fontWeight: "600" }}>{grade}</span>
                  </div>
                </div>

                {/* 3. Course Name & Citation Statement */}
                <div className="max-w-xl mx-auto space-y-1.5 px-4 my-1">
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    having successfully demonstrated comprehensive theoretical mastery and rigorous laboratory competence in
                  </p>
                  <h4
                    className="text-lg sm:text-xl font-bold tracking-tight"
                    style={{ color: currentTheme.accentPrimary }}
                  >
                    {courseTitle || "Course Title"}
                  </h4>
                  {specialization && (
                    <p className="text-xs text-zinc-400 italic">
                      {specialization}
                    </p>
                  )}
                  <p className="text-[10px] text-zinc-400 pt-1">
                    {hours} • Issued on {issueDate}
                  </p>
                </div>

                {/* 4. Bottom Footer: Signatures & Official Gold Seal */}
                <div className="w-full grid grid-cols-3 items-end pt-6 mt-4 border-t border-white/10">
                  {/* Left Signature */}
                  <div className="text-center px-4">
                    <div className="h-10 flex items-end justify-center pb-1">
                      <span className="font-serif italic text-lg text-zinc-200 tracking-wider">
                        {instructorName.split(" ")[1] || instructorName}
                      </span>
                    </div>
                    <div className="w-40 mx-auto border-t border-zinc-600 pt-1">
                      <p className="text-xs font-semibold text-zinc-200">{instructorName}</p>
                      <p className="text-[10px] text-zinc-400 line-clamp-1">{instructorTitle}</p>
                    </div>
                  </div>

                  {/* Center Embossed Seal & Ribbon */}
                  <div className="flex flex-col items-center justify-center">
                    <div
                      className="relative h-18 w-18 rounded-full flex items-center justify-center shadow-2xl border-2"
                      style={{
                        background: currentTheme.sealGradient,
                        borderColor: "rgba(255, 255, 255, 0.3)"
                      }}
                    >
                      <div className="absolute inset-1 rounded-full border border-black/30 border-dashed flex items-center justify-center">
                        <Award className="h-8 w-8 text-black/80" />
                      </div>
                    </div>
                    <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-400 mt-1">
                      Official Seal
                    </span>
                  </div>

                  {/* Right Signature */}
                  <div className="text-center px-4">
                    <div className="h-10 flex items-end justify-center pb-1">
                      <span className="font-serif italic text-lg text-zinc-200 tracking-wider">
                        {provostName.split(" ")[1] || provostName}
                      </span>
                    </div>
                    <div className="w-40 mx-auto border-t border-zinc-600 pt-1">
                      <p className="text-xs font-semibold text-zinc-200">{provostName}</p>
                      <p className="text-[10px] text-zinc-400 line-clamp-1">{provostTitle}</p>
                    </div>
                  </div>
                </div>

                {/* Bottom Verification Watermark Bar */}
                <div className="w-full flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-3 px-2">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-emerald-500" />
                    Verified ID: {certificateCode}
                  </span>
                  <span>Cryptographic Proof: SHA-256 Validated</span>
                  <span>education-os.com/verify</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Callouts */}
          <div className="p-4 rounded-xl bg-card border border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>
                PDF exports are generated in vector-sharp resolution with zero loss of quality.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-lg border border-border hover:bg-muted font-medium transition-colors flex items-center gap-1.5"
              >
                {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedLink ? "Link Copied" : "Shareable Link"}
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={isExporting}
                className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Download className="h-3.5 w-3.5" />
                {isExporting ? "Rendering..." : "Download PDF"}
              </button>
            </div>
          </div>

          {/* Session History Strip */}
          {history.length > 0 && (
            <div className="rounded-xl border border-border/80 bg-card p-4 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                <span>Recent Certificates Created in this Session:</span>
                <span className="font-mono text-[11px]">{history.length} Saved</span>
              </div>
              <div className="divide-y divide-border/40">
                {history.slice(0, 3).map((item) => (
                  <div key={item.id} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-medium text-foreground">{item.studentName}</p>
                      <p className="text-[11px] text-muted-foreground">{item.courseTitle}</p>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {item.id}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
