"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/providers/auth-context";
import { ApiClient } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  UserPlus, 
  MagnifyingGlass, 
  GraduationCap, 
  CheckCircle, 
  X, 
  Trash,
  BookOpen,
  Trophy
} from "@phosphor-icons/react";

export default function StudentsPage() {
  const { activeTenant } = useAuth();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initialized empty array for single tenant clean state
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");

  useEffect(() => {
    async function loadData() {
      // Load courses for enrollment dropdown
      const courseRes = await ApiClient.getCourses();
      if (courseRes.success && Array.isArray(courseRes.data)) {
        setCourses(courseRes.data);
        if (courseRes.data.length > 0) {
          setSelectedCourse(courseRes.data[0].title);
        }
      }
    }
    loadData();
  }, [activeTenant]);

  const handleEnrollStudent = (e) => {
    e.preventDefault();
    if (!name || !email) return;

    const newStudent = {
      id: "std_" + Date.now(),
      name,
      email,
      studentCode: studentCode || `STD-${Math.floor(1000 + Math.random() * 9000)}`,
      enrolledCourse: selectedCourse || "General Academics",
      progress: 0,
      status: "ENROLLED",
      joinedAt: new Date().toLocaleDateString()
    };

    setStudents([newStudent, ...students]);
    setIsModalOpen(false);
    setName("");
    setEmail("");
    setStudentCode("");
  };

  const filteredStudents = students.filter(s =>
    (s.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.studentCode || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-2xl border border-border">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Student Roster</h1>
          <p className="text-base text-muted-foreground mt-1 font-medium">
            Manage student enrollments & cohort rosters for <span className="font-bold text-foreground">{activeTenant?.name || "Institution"}</span>
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} size="lg" className="gap-2 font-bold px-6">
          <UserPlus size={20} weight="bold" /> Enroll Student
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-4 border-border bg-card">
          <CardContent className="pt-2 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase">Enrolled Students</p>
              <p className="text-3xl font-extrabold text-foreground mt-1">{students.length}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Users size={28} weight="bold" />
            </div>
          </CardContent>
        </Card>

        <Card className="p-4 border-border bg-card">
          <CardContent className="pt-2 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase">Active Courses</p>
              <p className="text-3xl font-extrabold text-foreground mt-1">{courses.length}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <BookOpen size={28} weight="bold" />
            </div>
          </CardContent>
        </Card>

        <Card className="p-4 border-border bg-card">
          <CardContent className="pt-2 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase">Average Progress</p>
              <p className="text-3xl font-extrabold text-foreground mt-1">
                {students.length > 0 ? `${Math.round(students.reduce((acc, s) => acc + s.progress, 0) / students.length)}%` : "0%"}
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Trophy size={28} weight="bold" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-lg">
        <MagnifyingGlass size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search students by name, email, or code..."
          className="pl-11 h-12 text-base rounded-xl"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Roster Table or Empty Card */}
      {filteredStudents.length === 0 ? (
        <Card className="p-16 text-center flex flex-col items-center justify-center space-y-5 border-dashed border-2 border-border/80 rounded-2xl">
          <div className="h-20 w-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Users size={44} weight="bold" />
          </div>
          <div className="space-y-2 max-w-md">
            <h3 className="text-2xl font-bold">No Students Enrolled Yet</h3>
            <p className="text-sm text-muted-foreground font-medium">
              Roster for {activeTenant?.name || "Institution"} is currently empty. Click <strong>"Enroll Student"</strong> to register your first student.
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} size="lg" className="gap-2 font-bold mt-2">
            <UserPlus size={20} weight="bold" /> Enroll Student
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden border-border bg-card p-0 rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-medium">
              <thead className="bg-muted/40 border-b border-border text-xs uppercase font-bold text-muted-foreground">
                <tr>
                  <th className="p-4 pl-6">Student Info</th>
                  <th className="p-4">Student ID</th>
                  <th className="p-4">Enrolled Course</th>
                  <th className="p-4">Completion Progress</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredStudents.map((std) => (
                  <tr key={std.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                          {std.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-base text-foreground">{std.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{std.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-xs font-bold">{std.studentCode}</td>
                    <td className="p-4 font-bold text-foreground">{std.enrolledCourse}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3 max-w-xs">
                        <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${std.progress}%` }} />
                        </div>
                        <span className="text-xs font-mono font-bold">{std.progress}%</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="success" className="text-xs font-bold px-2.5 py-0.5">{std.status}</Badge>
                    </td>
                    <td className="p-4 text-right pr-6">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-9 w-9 p-0 text-destructive hover:bg-destructive/10"
                        onClick={() => setStudents(students.filter(s => s.id !== std.id))}
                      >
                        <Trash size={18} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ENROLL MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-popover border-border shadow-2xl rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
              <div>
                <CardTitle className="text-xl font-bold">Enroll Student</CardTitle>
                <CardDescription className="text-sm">Register new student to {activeTenant?.name || "Institution"}</CardDescription>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg">
                <X size={22} />
              </button>
            </CardHeader>

            <form onSubmit={handleEnrollStudent}>
              <CardContent className="space-y-4 pt-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Student Full Name</label>
                  <Input required placeholder="e.g. Alex Morgan" className="h-11 text-base font-bold" value={name} onChange={(e) => setName(e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Student Email</label>
                  <Input required type="email" placeholder="alex@student.edu" className="h-11 text-base" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Student Code / Roll #</label>
                    <Input placeholder="STD-2026-001" className="h-11 text-base font-mono font-bold" value={studentCode} onChange={(e) => setStudentCode(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Enroll Course</label>
                    <select 
                      className="w-full h-11 rounded-xl border border-input bg-background px-3 text-base font-bold text-foreground"
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                    >
                      {courses.length > 0 ? (
                        courses.map(c => <option key={c.id} value={c.title}>{c.title}</option>)
                      ) : (
                        <option value="General Academics">General Academics</option>
                      )}
                    </select>
                  </div>
                </div>
              </CardContent>

              <div className="flex justify-end gap-3 p-5 border-t border-border bg-muted/20 rounded-b-2xl">
                <Button type="button" variant="outline" size="lg" className="font-semibold" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" size="lg" className="font-bold">Confirm Enrollment</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
