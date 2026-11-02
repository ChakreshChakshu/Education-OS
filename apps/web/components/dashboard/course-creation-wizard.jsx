"use client";

import React, { useState, useRef, useEffect } from "react";
import { ApiClient } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkle, 
  X, 
  CloudArrowUp, 
  Trash, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Hourglass, 
  GraduationCap, 
  BookBookmark, 
  Globe, 
  Image as ImageIcon,
  Plus,
  Video,
  FileText,
  CheckSquare,
  CircleNotch,
  ArrowsClockwise
} from "@phosphor-icons/react";

export function CourseCreationWizard({ isOpen, onClose, onCourseCreated, activeTenant }) {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  // Step 1: Course Identity
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [level, setLevel] = useState("ALL_LEVELS");
  const [credits, setCredits] = useState("3");
  const [duration, setDuration] = useState("6 Weeks");
  const [shortDesc, setShortDesc] = useState("");
  const [desc, setDesc] = useState("");

  // Step 2: Media Studio
  const [thumbnailFileId, setThumbnailFileId] = useState(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Step 3: Curriculum Blueprint
  const [starterModules, setStarterModules] = useState([
    { id: "mod_init_1", title: "Module 1: Orientation & Foundations", contentType: "VIDEO" },
    { id: "mod_init_2", title: "Module 2: Core Concepts & Practice", contentType: "DOCUMENT" }
  ]);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newModuleType, setNewModuleType] = useState("VIDEO");

  // Publishing State
  const [publishing, setPublishing] = useState(false);
  const [publishStep, setPublishStep] = useState("");
  const [error, setError] = useState(null);

  // Auto-slugify title
  const handleTitleChange = (val) => {
    setTitle(val);
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setSlug(generatedSlug);
  };

  // Thumbnail Upload handling
  const handleFileUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, or WebP).");
      return;
    }

    setUploadingImage(true);
    setUploadProgress(15);
    setError(null);

    const progressTimer = setInterval(() => {
      setUploadProgress((prev) => (prev < 85 ? prev + 15 : prev));
    }, 120);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fileData = event.target.result;
        setThumbnailPreviewUrl(fileData);

        const uploadRes = await ApiClient.uploadMediaFile({
          filename: file.name,
          fileData,
          mimeType: file.type
        });

        clearInterval(progressTimer);
        setUploadProgress(100);

        if (uploadRes.success && uploadRes.data?.id) {
          setThumbnailFileId(uploadRes.data.id);
          if (uploadRes.data.url) {
            setThumbnailPreviewUrl(uploadRes.data.url);
          }
        } else {
          console.warn("Media upload error:", uploadRes.error);
        }
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      clearInterval(progressTimer);
      setError("Failed to upload course thumbnail.");
      setUploadingImage(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Add starter module
  const handleAddModule = (e) => {
    e?.preventDefault();
    if (!newModuleTitle.trim()) return;
    setStarterModules([
      ...starterModules,
      {
        id: `mod_${Date.now()}`,
        title: newModuleTitle.trim(),
        contentType: newModuleType
      }
    ]);
    setNewModuleTitle("");
  };

  const handleRemoveModule = (id) => {
    setStarterModules(starterModules.filter((m) => m.id !== id));
  };

  // Publish Full Course
  const handlePublishCourse = async () => {
    if (!title.trim() || !code.trim()) {
      setCurrentStep(1);
      setError("Course code and title are required.");
      return;
    }

    setPublishing(true);
    setError(null);
    setPublishStep("Provisioning course entity in institution database...");

    const payload = {
      tenantId: activeTenant?.id || null,
      title: title.trim(),
      code: code.trim().toUpperCase(),
      slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      shortDescription: shortDesc.trim() || desc.trim() || "Academic curriculum course module.",
      description: desc.trim() || "Comprehensive course curriculum and modular lectures.",
      thumbnailFileId: thumbnailFileId || null,
      level,
      language: "en",
      visibility: "PUBLIC",
      credits: parseInt(credits) || 3
    };

    try {
      const res = await ApiClient.createCourse(payload);

      if (!res.success || !res.data) {
        throw new Error(res.error || "Failed to create course. Please review inputs.");
      }

      const createdCourse = {
        ...res.data,
        thumbnailUrl: res.data.thumbnailUrl || thumbnailPreviewUrl || null,
        enrolled: 0,
        instructor: "Academic Faculty",
        duration: duration || `${(payload.credits || 3) * 2} Weeks`
      };

      // Provision starter curriculum modules if specified
      if (starterModules.length > 0) {
        setPublishStep(`Building ${starterModules.length} initial curriculum modules...`);
        for (let i = 0; i < starterModules.length; i++) {
          const mod = starterModules[i];
          try {
            await ApiClient.createCourseModule(createdCourse.id, {
              title: mod.title,
              contentType: mod.contentType,
              contentUrl: "#",
              order: i + 1
            });
          } catch (modErr) {
            console.warn("Could not provision initial module:", modErr);
          }
        }
      }

      setPublishStep("Course published successfully!");
      if (onCourseCreated) {
        onCourseCreated(createdCourse);
      }
      handleClose();
    } catch (err) {
      setError(err.message || "Failed to publish course");
    } finally {
      setPublishing(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setCode("");
    setTitle("");
    setSlug("");
    setLevel("ALL_LEVELS");
    setCredits("3");
    setDuration("6 Weeks");
    setShortDesc("");
    setDesc("");
    setThumbnailFileId(null);
    setThumbnailPreviewUrl("");
    setUploadProgress(0);
    setError(null);
    setPublishing(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl bg-card border-border shadow-2xl rounded-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Wizard Header */}
        <CardHeader className="border-b border-border p-6 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                <Sparkle size={22} weight="fill" />
              </div>
              <div>
                <CardTitle className="text-xl font-extrabold tracking-tight text-foreground">
                  Course Studio & Curriculum Studio
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Publish centralized course for <strong className="text-foreground">{activeTenant?.name || "Institution"}</strong>
                </CardDescription>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={handleClose}
              disabled={publishing}
            >
              <X size={18} />
            </Button>
          </div>

          {/* Stepper Progress Bar */}
          <div className="pt-5 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {[
                { num: 1, label: "Course Identity" },
                { num: 2, label: "Media Studio" },
                { num: 3, label: "Curriculum Blueprint" }
              ].map((step) => {
                const isActive = currentStep === step.num;
                const isPassed = currentStep > step.num;
                return (
                  <button
                    key={step.num}
                    type="button"
                    onClick={() => !publishing && setCurrentStep(step.num)}
                    className={`text-left p-2 rounded-xl transition-all border ${
                      isActive
                        ? "border-primary bg-primary/10 text-primary font-bold"
                        : isPassed
                          ? "border-border/80 bg-background text-foreground hover:border-primary/50"
                          : "border-transparent text-muted-foreground opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-5 w-5 rounded-full text-[10px] flex items-center justify-center font-mono font-bold ${
                        isActive 
                          ? "bg-primary text-primary-foreground" 
                          : isPassed 
                            ? "bg-muted text-foreground" 
                            : "bg-muted/50 text-muted-foreground"
                      }`}>
                        {isPassed ? <Check size={12} weight="bold" /> : step.num}
                      </span>
                      <span className="text-xs truncate">{step.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </CardHeader>

        {/* Wizard Step Body */}
        <CardContent className="p-6 max-h-[68vh] overflow-y-auto space-y-5">
          {/* STEP 1: IDENTITY */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5 col-span-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Course Code <span className="text-destructive">*</span>
                  </label>
                  <Input
                    required
                    placeholder="CS-302"
                    className="h-10 text-sm font-mono font-bold uppercase"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Course Title <span className="text-destructive">*</span>
                  </label>
                  <Input
                    required
                    placeholder="Distributed Cloud Architectures"
                    className="h-10 text-sm font-semibold"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                  />
                </div>
              </div>

              {/* URL Slug Auto-generated */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Globe size={13} /> URL Slug Identifier
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-2.5 py-2 rounded-lg border border-border shrink-0">
                    /courses/
                  </span>
                  <Input
                    placeholder="distributed-cloud-architectures"
                    className="h-9 text-xs font-mono text-foreground"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                  />
                </div>
              </div>

              {/* Level & Credits & Duration */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Academic Level</label>
                  <select
                    className="w-full h-10 px-3 text-xs font-semibold rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                  >
                    <option value="ALL_LEVELS">All Levels</option>
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Credits</label>
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    className="h-10 text-sm font-bold"
                    value={credits}
                    onChange={(e) => setCredits(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Est. Duration</label>
                  <Input
                    placeholder="e.g. 8 Weeks"
                    className="h-10 text-sm"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                </div>
              </div>

              {/* Short Summary */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Catalog Summary</label>
                <Input
                  placeholder="One sentence description for catalog listings and cards..."
                  className="h-10 text-sm"
                  value={shortDesc}
                  onChange={(e) => setShortDesc(e.target.value)}
                />
              </div>

              {/* Full Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Syllabus Overview</label>
                <textarea
                  rows={3}
                  placeholder="Comprehensive prerequisites, learning outcomes, and course structure..."
                  className="w-full p-3 text-sm rounded-xl border border-border bg-background focus:outline-hidden focus:ring-2 focus:ring-primary resize-none text-foreground"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* STEP 2: MEDIA STUDIO */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>Course Banner & Thumbnail</span>
                  <Badge variant="outline" className="text-[10px] font-mono">16:9 Aspect Ratio</Badge>
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                  }}
                />

                {thumbnailPreviewUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-border group h-48 bg-black shadow-xs">
                    <img
                      src={thumbnailPreviewUrl}
                      alt="Course Banner Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="gap-1.5 text-xs font-bold rounded-xl"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                      >
                        <CloudArrowUp size={16} /> Replace Banner
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="gap-1.5 text-xs font-bold rounded-xl"
                        onClick={() => {
                          setThumbnailFileId(null);
                          setThumbnailPreviewUrl("");
                        }}
                      >
                        <Trash size={16} /> Remove
                      </Button>
                    </div>

                    {uploadingImage && (
                      <div className="absolute inset-0 bg-background/85 flex flex-col items-center justify-center gap-2 text-xs font-bold text-primary">
                        <CircleNotch size={24} className="animate-spin" />
                        <span>Uploading to Cloudflare R2 Media Vault ({uploadProgress}%)...</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
                      dragActive
                        ? "border-primary bg-primary/10"
                        : "border-border/80 hover:border-primary/60 hover:bg-muted/40 bg-card shadow-2xs"
                    }`}
                  >
                    <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
                      <ImageIcon size={26} weight="duotone" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground">
                        {uploadingImage ? "Uploading to Cloudflare R2 Vault..." : "Drop course thumbnail here, or click to browse"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        High-resolution 1920×1080 banner. Formats: PNG, JPG, WebP
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      Centralized @eos/infra-storage R2 Bucket
                    </Badge>
                  </div>
                )}
              </div>

              {/* Live Catalog Preview */}
              <div className="pt-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                  Live Catalog Card Preview
                </label>
                <div className="p-4 rounded-xl border border-border bg-card/60 flex items-start gap-4">
                  <div className="w-24 h-16 rounded-lg bg-muted border border-border shrink-0 overflow-hidden">
                    {thumbnailPreviewUrl ? (
                      <img src={thumbnailPreviewUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <BookBookmark size={20} />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[10px]">{code || "CS-XXX"}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{level}</Badge>
                    </div>
                    <h4 className="text-sm font-bold text-foreground truncate">{title || "Untitled Course"}</h4>
                    <p className="text-xs text-muted-foreground truncate">{shortDesc || "No summary provided."}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: CURRICULUM BLUEPRINT */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Initial Curriculum Modules</h3>
                  <p className="text-xs text-muted-foreground">
                    Pre-seed lessons and chapters so your course publishes with curriculum structure.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs font-mono font-bold">
                  {starterModules.length} Modules
                </Badge>
              </div>

              {/* Modules List */}
              <div className="space-y-2.5">
                {starterModules.map((mod, idx) => (
                  <div
                    key={mod.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:border-border/80 shadow-2xs gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="h-7 w-7 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-bold flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-foreground truncate">{mod.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="secondary" className="text-[10px] uppercase font-mono py-0">
                            {mod.contentType === "VIDEO" && <Video size={11} className="mr-1" />}
                            {mod.contentType === "DOCUMENT" && <FileText size={11} className="mr-1" />}
                            {mod.contentType === "QUIZ" && <CheckSquare size={11} className="mr-1" />}
                            {mod.contentType}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive rounded-lg cursor-pointer shrink-0"
                      onClick={() => handleRemoveModule(mod.id)}
                    >
                      <Trash size={14} />
                    </Button>
                  </div>
                ))}

                {starterModules.length === 0 && (
                  <div className="p-6 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
                    No starter modules. You can still add curriculum modules anytime after publishing.
                  </div>
                )}
              </div>

              {/* Add New Starter Module Row */}
              <div className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-2.5">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                  Add Starter Module
                </span>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="e.g. Module 3: Advanced Microservices"
                    className="h-9 text-xs sm:text-sm flex-1"
                    value={newModuleTitle}
                    onChange={(e) => setNewModuleTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddModule();
                      }
                    }}
                  />
                  <select
                    className="h-9 px-2.5 text-xs font-semibold rounded-lg border border-border bg-background text-foreground"
                    value={newModuleType}
                    onChange={(e) => setNewModuleType(e.target.value)}
                  >
                    <option value="VIDEO">Video Lecture</option>
                    <option value="DOCUMENT">PDF / Reading</option>
                    <option value="QUIZ">Quiz Check</option>
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-9 px-3 text-xs font-bold gap-1 cursor-pointer shrink-0"
                    onClick={handleAddModule}
                  >
                    <Plus size={14} weight="bold" /> Add
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Feedback & Error Alerts */}
          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold">
              {error}
            </div>
          )}

          {publishing && (
            <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
              <CircleNotch size={18} className="animate-spin shrink-0" />
              <span>{publishStep}</span>
            </div>
          )}
        </CardContent>

        {/* Wizard Footer Controls */}
        <div className="flex items-center justify-between p-4 px-6 border-t border-border bg-muted/20">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl text-xs font-bold gap-1 cursor-pointer"
            onClick={currentStep === 1 ? handleClose : () => setCurrentStep(currentStep - 1)}
            disabled={publishing}
          >
            {currentStep === 1 ? (
              "Cancel"
            ) : (
              <>
                <ArrowLeft size={14} /> Back
              </>
            )}
          </Button>

          <div className="flex items-center gap-2">
            {currentStep < totalSteps ? (
              <Button
                type="button"
                size="sm"
                className="rounded-xl text-xs font-bold gap-1.5 px-4 cursor-pointer"
                onClick={() => {
                  if (currentStep === 1 && (!title.trim() || !code.trim())) {
                    setError("Please provide both Course Code and Course Title.");
                    return;
                  }
                  setError(null);
                  setCurrentStep(currentStep + 1);
                }}
              >
                <span>Continue</span>
                <ArrowRight size={14} />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                className="rounded-xl text-xs font-bold gap-2 px-5 cursor-pointer bg-primary text-primary-foreground shadow-xs"
                onClick={handlePublishCourse}
                disabled={publishing}
              >
                {publishing ? (
                  <>
                    <ArrowsClockwise size={15} className="animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Sparkle size={15} weight="fill" />
                    <span>Publish Course to Catalog</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
