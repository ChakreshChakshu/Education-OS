// Comprehensive catalog of accredited academic courses offered by partner institutions across Education-OS

export const FALLBACK_INSTITUTIONS = [
  {
    id: "apex-sys",
    name: "Apex University System",
    slug: "apex-main",
    branch: "Main Campus",
    city: "Cambridge, MA",
    badge: "Ivy League Tier",
    primaryColor: "#5b12ed",
    description: "Global research university recognized for systems engineering, distributed computing, and autonomous infrastructure.",
    courseCount: 2
  },
  {
    id: "skillyards-sys",
    name: "Skillyards Academy of Technology",
    slug: "skillyards",
    branch: "Innovation Hub",
    city: "Bengaluru, IN",
    badge: "Industry Leader",
    primaryColor: "#2563eb",
    description: "Premier engineering academy pioneering modern full-stack web platforms, microservice architectures, and enterprise engineering.",
    courseCount: 1
  },
  {
    id: "nema-sys",
    name: "Nema Institute of Computing & AI",
    slug: "nem",
    branch: "AI Research Center",
    city: "San Francisco, CA",
    badge: "Top AI Center",
    primaryColor: "#7c3aed",
    description: "Specialized computer science and neural cognition institute leading autonomous agent systems and machine intelligence.",
    courseCount: 1
  },
  {
    id: "med-sys",
    name: "School of Medicine & Health Sciences",
    slug: "apex-med",
    branch: "Medical Campus",
    city: "Boston, MA",
    badge: "Clinical Excellence",
    primaryColor: "#059669",
    description: "Autonomous academic medical center training doctors and health informatics professionals with strict clinical schema isolation.",
    courseCount: 1
  },
  {
    id: "aero-sys",
    name: "Institute of Aerospace & Orbital Engineering",
    slug: "apex-aero",
    branch: "Spaceflight Lab",
    city: "Pasadena, CA",
    badge: "Deep Space Lab",
    primaryColor: "#0284c7",
    description: "World-class aerospace institute specializing in satellite telemetry, orbital mechanics, and autonomous spacecraft navigation.",
    courseCount: 1
  },
  {
    id: "law-sys",
    name: "School of Law & Global Governance",
    slug: "apex-law",
    branch: "Law Center",
    city: "Washington, DC",
    badge: "Juris Tier",
    primaryColor: "#475569",
    description: "Distinguished legal center focusing on digital privacy, IP rights, cybersecurity jurisprudence, and international trade law.",
    courseCount: 1
  }
];

export const FALLBACK_COURSES = [
  {
    id: "c018f92a-cs101-4901-b3b2-7c8d9e0f1a2b",
    tenantId: "apex-sys",
    code: "CS-101",
    title: "Distributed Consensus & Raft Protocol",
    slug: "cs-101-distributed-consensus",
    level: "ADVANCED",
    language: "English",
    duration: "6 Weeks",
    credits: 4,
    price: 49,
    originalPrice: 199,
    rating: 4.9,
    reviewCount: 342,
    enrolledCount: 1840,
    shortDescription: "Master consensus algorithms, Paxos, Raft leader election, log replication, and crash fault tolerance in distributed clusters.",
    description: "This flagship university curriculum explores the core foundations of resilient distributed infrastructure. Students implement Raft consensus from scratch, test network partitions, debug split-brain scenarios, and analyze distributed state machine replication. Complete with interactive assignments, live testing clusters, and final examination checkpoints.",
    prerequisites: ["Data Structures & Algorithms", "Basic Systems Programming (C/Rust/Go)"],
    syllabusHighlights: [
      "State Machine Replication & Invariants",
      "Raft Leader Election & Term Monotonicity",
      "Log Matching Invariant & Conflict Resolution",
      "Log Compaction & Snapshot Transfer Mechanics",
      "Linearizable Read Semantics & Lease Read Optimizations"
    ],
    institution: {
      id: "apex-sys",
      name: "Apex University System",
      slug: "apex-main",
      branch: "Main Campus",
      badge: "Ivy League Tier",
      verified: true
    },
    teacher: {
      name: "Dr. Sarah Vance",
      title: "Dean of Computer Science & Distributed Systems Lead",
      avatar: null,
      credentials: "Ph.D. in Computer Systems, MIT • Former Distributed Systems Lead at Google Cloud",
      bio: "Dr. Sarah Vance has published over 40 research papers on consensus protocols and distributed databases. She leads the Apex Distributed Systems Group."
    },
    modules: [
      { id: "mod-1", title: "Foundations of State Machine Replication & Paxos", contentType: "VIDEO", duration: "48 min", orderIndex: 1 },
      { id: "mod-2", title: "Raft Leader Election & Heartbeat Mechanics", contentType: "VIDEO", duration: "55 min", orderIndex: 2 },
      { id: "mod-3", title: "Log Matching, Conflict Truncation & Commit Index", contentType: "DOCUMENT", duration: "35 min", orderIndex: 3 },
      { id: "mod-4", title: "Network Partition & Split-Brain Crash Lab", contentType: "LAB", duration: "90 min", orderIndex: 4 },
      { id: "mod-5", title: "Snapshot Compaction & Linearizable Reads", contentType: "VIDEO", duration: "45 min", orderIndex: 5 },
      { id: "mod-6", title: "Mid-Term Examination: Raft Invariants", contentType: "QUIZ", duration: "40 min", orderIndex: 6 }
    ]
  },
  {
    id: "c018f92a-cs204-4902-b3b2-7c8d9e0f1a2c",
    tenantId: "apex-sys",
    code: "CS-204",
    title: "Advanced Operating Systems & Memory Isolation",
    slug: "cs-204-advanced-operating-systems",
    level: "ADVANCED",
    language: "English",
    duration: "8 Weeks",
    credits: 4,
    price: 59,
    originalPrice: 249,
    rating: 4.8,
    reviewCount: 289,
    enrolledCount: 1420,
    shortDescription: "Deep dive into kernel architectures, virtual memory paging, process scheduling, and cryptographically isolated hypervisor boundaries.",
    description: "Investigate low-level operating system design, hardware-assisted virtualization, context switching overhead, eBPF telemetry, and kernel security models under multi-tenant isolation. Gain hands-on experience building lightweight unikernels and analyzing cache contention.",
    prerequisites: ["Computer Organization", "C Programming"],
    syllabusHighlights: [
      "Virtual Memory, Page Tables & TLB Shootdowns",
      "Process Scheduling & CFS Load Balancing",
      "Hypervisors, KVM & Hardware Virtualization",
      "eBPF Kernel Probes & Performance Telemetry",
      "Microkernels & Capability-Based Security"
    ],
    institution: {
      id: "apex-sys",
      name: "Apex University System",
      slug: "apex-main",
      branch: "Main Campus",
      badge: "Ivy League Tier",
      verified: true
    },
    teacher: {
      name: "Dr. Marcus Chen",
      title: "Principal Systems Architect & OS Faculty",
      avatar: null,
      credentials: "Ph.D. Stanford • Linux Kernel Contributor",
      bio: "Dr. Marcus Chen conducts research in secure virtualization and hardware-isolated runtime systems with 15+ years of kernel development experience."
    },
    modules: [
      { id: "mod-201", title: "Virtual Memory Hierarchy & Multi-Level Page Tables", contentType: "VIDEO", duration: "52 min", orderIndex: 1 },
      { id: "mod-202", title: "Process Scheduling Algorithms & Context Switch Costs", contentType: "VIDEO", duration: "60 min", orderIndex: 2 },
      { id: "mod-203", title: "Interrupt Handling & Device Driver Interfaces", contentType: "DOCUMENT", duration: "40 min", orderIndex: 3 },
      { id: "mod-204", title: "eBPF Live Kernel Telemetry Lab", contentType: "LAB", duration: "75 min", orderIndex: 4 },
      { id: "mod-205", title: "Hardware-Assisted Virtualization & Extended Page Tables", contentType: "VIDEO", duration: "50 min", orderIndex: 5 }
    ]
  },
  {
    id: "c018f92a-fsd01-4903-b3b2-7c8d9e0f1a2d",
    tenantId: "skillyards-sys",
    code: "FSD-01",
    title: "Full-Stack Architecture & Cloud Microservices",
    slug: "fsd-01-full-stack-architecture",
    level: "INTERMEDIATE",
    language: "English",
    duration: "8 Weeks",
    credits: 4,
    price: 39,
    originalPrice: 179,
    rating: 4.9,
    reviewCount: 512,
    enrolledCount: 2650,
    shortDescription: "End-to-end fullstack platform engineering with Next.js App Router, Fastify microservices, Postgres ACID transactions, and event-driven architectures.",
    description: "Designed for engineers building scalable digital operating systems. Learn modern frontend rendering patterns, clean architectural separation (Hexagonal/DDD), transactional outbox messaging, adaptive video delivery via Cloudflare R2, and database connection pooling under extreme traffic.",
    prerequisites: ["Modern JavaScript/TypeScript", "Basic Web Development"],
    syllabusHighlights: [
      "Next.js App Router & Server Components",
      "Fastify Microservice Architecture & Dependency Injection",
      "Neon PostgreSQL ACID Transactions & Drizzle ORM",
      "Transactional Outbox Pattern & Background Workers",
      "Adaptive Bitrate HLS Video Streaming & Cloudflare R2"
    ],
    institution: {
      id: "skillyards-sys",
      name: "Skillyards Academy of Technology",
      slug: "skillyards",
      branch: "Innovation Hub",
      badge: "Industry Leader",
      verified: true
    },
    teacher: {
      name: "Dr. Chakresh Chakshu",
      title: "Founding Faculty & Chief Software Architect",
      avatar: null,
      credentials: "Chief Technology Architect • Author of High-Throughput Web Systems",
      bio: "Dr. Chakresh Chakshu specializes in scalable cloud architectures, high-performance distributed backends, and multi-tenant web application platforms."
    },
    modules: [
      { id: "mod-301", title: "Clean Architecture & Multi-Tenant Domain Boundary Design", contentType: "VIDEO", duration: "45 min", orderIndex: 1 },
      { id: "mod-302", title: "Next.js App Router & Hybrid SSR/Client Component State", contentType: "VIDEO", duration: "50 min", orderIndex: 2 },
      { id: "mod-303", title: "Postgres Connection Pooling & ACID Isolation in Neon Cloud", contentType: "DOCUMENT", duration: "35 min", orderIndex: 3 },
      { id: "mod-304", title: "Transactional Outbox & Reliable Asynchronous Worker Queues", contentType: "VIDEO", duration: "55 min", orderIndex: 4 },
      { id: "mod-305", title: "Fullstack E-Commerce & LMS Final Capstone Project", contentType: "LAB", duration: "120 min", orderIndex: 5 }
    ]
  },
  {
    id: "c018f92a-ai505-4904-b3b2-7c8d9e0f1a2e",
    tenantId: "nema-sys",
    code: "AI-505",
    title: "Large Language Models, Multi-Agent Systems & Inferences",
    slug: "ai-505-large-language-models",
    level: "ADVANCED",
    language: "English",
    duration: "6 Weeks",
    credits: 3,
    price: 49,
    originalPrice: 199,
    rating: 5.0,
    reviewCount: 428,
    enrolledCount: 1980,
    shortDescription: "Build autonomous multi-agent workflows, tool execution loops, semantic vector retrievals, and deterministic LLM evaluation pipelines.",
    description: "A state-of-the-art curriculum on agentic artificial intelligence. Explore chain-of-thought orchestration, structured tool execution, context window optimization, embedding index fine-tuning, and deterministic automated testing of generative intelligence workflows.",
    prerequisites: ["Python / TypeScript", "Basic Machine Learning Concepts"],
    syllabusHighlights: [
      "Transformer Inferences & KV Caching",
      "Autonomous Multi-Agent Tool Execution Loops",
      "Vector Indexing, Hybrid Search & Enterprise RAG",
      "Prompt Optimization & Structured JSON Validation",
      "Deterministic Safety Guardrails & Model Evaluation"
    ],
    institution: {
      id: "nema-sys",
      name: "Nema Institute of Computing & AI",
      slug: "nem",
      branch: "AI Research Center",
      badge: "Top AI Center",
      verified: true
    },
    teacher: {
      name: "Prof. Adarsh Nema",
      title: "Senior Professor & Department Chair of AI",
      avatar: null,
      credentials: "M.Tech / Ph.D. in Artificial Intelligence • AI Safety Researcher",
      bio: "Prof. Adarsh Nema heads the Intelligent Systems Lab at Nema Institute, focusing on reliable multi-agent coordination, autonomous reasoning, and neural interfaces."
    },
    modules: [
      { id: "mod-401", title: "Attention Mechanisms, KV-Cache & Token Generation", contentType: "VIDEO", duration: "50 min", orderIndex: 1 },
      { id: "mod-402", title: "Agentic Tool Calling & Dynamic Scratchpad State Loops", contentType: "VIDEO", duration: "60 min", orderIndex: 2 },
      { id: "mod-403", title: "Vector Databases, HNSW Indexing & Semantic Retrieval", contentType: "DOCUMENT", duration: "40 min", orderIndex: 3 },
      { id: "mod-404", title: "Multi-Agent Consensus & Collaborative Planning Lab", contentType: "LAB", duration: "90 min", orderIndex: 4 },
      { id: "mod-405", title: "Production LLM Observability & Latency Optimization", contentType: "VIDEO", duration: "45 min", orderIndex: 5 }
    ]
  },
  {
    id: "c018f92a-med301-4905-b3b2-7c8d9e0f1a2f",
    tenantId: "med-sys",
    code: "MED-301",
    title: "Clinical Informatics & Healthcare Telemetry",
    slug: "med-301-clinical-informatics",
    level: "INTERMEDIATE",
    language: "English",
    duration: "12 Weeks",
    credits: 5,
    price: 69,
    originalPrice: 280,
    rating: 4.9,
    reviewCount: 198,
    enrolledCount: 890,
    shortDescription: "Electronic Health Record (EHR) architectures, FHIR APIs, biometric streaming telemetry, and HIPAA-compliant healthcare data systems.",
    description: "Specialized training for healthcare technologists and medical researchers on secure patient record isolation, cryptographic audit trails, biometric streaming pipelines, and automated clinical diagnostic workflows.",
    prerequisites: ["Introductory Biology / Health Sciences", "Basic Database Concepts"],
    syllabusHighlights: [
      "HL7 & FHIR Standard Data Schemas",
      "Real-Time ICU Biometric Telemetry & Streaming",
      "Cryptographic Privacy & Medical Schema Isolation",
      "Electronic Prescription Protocols & Drug Interaction APIs",
      "Clinical Decision Support (CDS) System Architecture"
    ],
    institution: {
      id: "med-sys",
      name: "School of Medicine & Health Sciences",
      slug: "apex-med",
      branch: "Medical Campus",
      badge: "Clinical Excellence",
      verified: true
    },
    teacher: {
      name: "Dr. Elena Rostova",
      title: "Director of Clinical Informatics",
      avatar: null,
      credentials: "M.D., Ph.D. in Biomedical Informatics, Johns Hopkins",
      bio: "Dr. Elena Rostova leads the Center for Healthcare Telemetry, advising national healthcare networks on EHR interoperability and diagnostic telemetry."
    },
    modules: [
      { id: "mod-501", title: "HL7 v2 to FHIR R4: Evolution of Clinical Data Formats", contentType: "VIDEO", duration: "55 min", orderIndex: 1 },
      { id: "mod-502", title: "Real-Time Patient Vitals Streaming & Alert Escalation", contentType: "VIDEO", duration: "50 min", orderIndex: 2 },
      { id: "mod-503", title: "HIPAA Security Rule & Cryptographic Row-Level Isolation", contentType: "DOCUMENT", duration: "45 min", orderIndex: 3 },
      { id: "mod-504", title: "Simulated ICU Telemetry Monitoring Lab", contentType: "LAB", duration: "80 min", orderIndex: 4 },
      { id: "mod-505", title: "Clinical Informatics Final Certification Assessment", contentType: "QUIZ", duration: "60 min", orderIndex: 5 }
    ]
  },
  {
    id: "c018f92a-aero402-4906-b3b2-7c8d9e0f1a30",
    tenantId: "aero-sys",
    code: "AERO-402",
    title: "Orbital Mechanics & Autonomous Satellite Guidance",
    slug: "aero-402-orbital-mechanics",
    level: "ADVANCED",
    language: "English",
    duration: "10 Weeks",
    credits: 4,
    price: 59,
    originalPrice: 220,
    rating: 4.8,
    reviewCount: 164,
    enrolledCount: 740,
    shortDescription: "Two-body problem dynamics, orbital maneuvers, interplanetary transfer orbits (Hohmann), and autonomous attitude control systems.",
    description: "Rigorous astrodynamics curriculum detailing satellite orbital injection, perturbation forces, Kalman filtering for trajectory tracking, and autonomous spacecraft reaction wheel maneuvers. Includes computational orbital trajectory simulation labs.",
    prerequisites: ["Calculus III (Multivariable)", "Classical Mechanics / Differential Equations"],
    syllabusHighlights: [
      "Keplerian Elements & Conic Section Trajectories",
      "Hohmann Transfer & Bi-Elliptic Orbital Maneuvers",
      "Gravitational Perturbations (J2) & Solar Radiation Pressure",
      "Attitude Determination & Reaction Wheel Control",
      "Extended Kalman Filtering (EKF) Satellite Tracking"
    ],
    institution: {
      id: "aero-sys",
      name: "Institute of Aerospace & Orbital Engineering",
      slug: "apex-aero",
      branch: "Spaceflight Lab",
      badge: "Deep Space Lab",
      verified: true
    },
    teacher: {
      name: "Dr. Alistair Finch",
      title: "Aerospace Propulsion & Guidance Fellow",
      avatar: null,
      credentials: "Ph.D. Caltech • Former NASA JPL Guidance Dynamics Engineer",
      bio: "Dr. Alistair Finch has contributed to three deep-space orbital mission trajectories and teaches spacecraft navigation at the Institute of Aerospace."
    },
    modules: [
      { id: "mod-601", title: "Two-Body Equations of Motion & Vis-Viva Formulation", contentType: "VIDEO", duration: "55 min", orderIndex: 1 },
      { id: "mod-602", title: "Orbital Maneuvers: Hohmann & Plane Change Delta-V", contentType: "VIDEO", duration: "60 min", orderIndex: 2 },
      { id: "mod-603", title: "Non-Spherical Earth Perturbations (J2 & Oblateness)", contentType: "DOCUMENT", duration: "40 min", orderIndex: 3 },
      { id: "mod-604", title: "Orbital Rendezvous Simulation & Docking Lab", contentType: "LAB", duration: "90 min", orderIndex: 4 },
      { id: "mod-605", title: "Final Spacecraft Guidance Comprehensive Examination", contentType: "QUIZ", duration: "75 min", orderIndex: 5 }
    ]
  },
  {
    id: "c018f92a-law210-4907-b3b2-7c8d9e0f1a31",
    tenantId: "law-sys",
    code: "LAW-210",
    title: "Digital Privacy, IP & International Cyberspace Law",
    slug: "law-210-digital-privacy-cyberspace-law",
    level: "INTERMEDIATE",
    language: "English",
    duration: "4 Weeks",
    credits: 3,
    price: 35,
    originalPrice: 140,
    rating: 4.7,
    reviewCount: 142,
    enrolledCount: 620,
    shortDescription: "Global data privacy frameworks (GDPR, CCPA), cryptographic IP patents, open-source licensing jurisprudence, and international jurisdiction.",
    description: "Examine legal boundaries in the modern digital age. Analyze cross-border data transfer regulations, liability of autonomous software agents, open-source license enforcement, and cyber warfare treaties under international law.",
    prerequisites: ["None - Open to all academic cohorts"],
    syllabusHighlights: [
      "Comparative Analysis: GDPR, CCPA & Indian DPDP Act",
      "Software Patents & Copyrights in Generated Code",
      "Open Source Licensing (GPL, Apache, MIT) Compliance",
      "Cross-Border Cryptographic Sovereignty & Cloud Jurisdiction",
      "Autonomous Agent Liability & Smart Contract Law"
    ],
    institution: {
      id: "law-sys",
      name: "School of Law & Global Governance",
      slug: "apex-law",
      branch: "Law Center",
      badge: "Juris Tier",
      verified: true
    },
    teacher: {
      name: "Prof. Jonathan Sterling",
      title: "Senior Fellow & Cyberspace Legal Scholar",
      avatar: null,
      credentials: "J.D. Harvard Law • Senior Counsel for Cyberspace Policy",
      bio: "Prof. Jonathan Sterling specializes in telecommunications law, algorithmic accountability, and international cyberspace governance treaties."
    },
    modules: [
      { id: "mod-701", title: "Extraterritorial Reach of Modern Privacy Regulations", contentType: "VIDEO", duration: "45 min", orderIndex: 1 },
      { id: "mod-702", title: "Open Source Licensing Conflicts & Copyright Enforcement", contentType: "VIDEO", duration: "50 min", orderIndex: 2 },
      { id: "mod-703", title: "Cryptographic Data Protection & Government Surveillance", contentType: "DOCUMENT", duration: "35 min", orderIndex: 3 },
      { id: "mod-704", title: "Moot Court: AI Liability & Cross-Border Data Leakage", contentType: "LAB", duration: "75 min", orderIndex: 4 }
    ]
  }
];

// Helper to look up course by ID or slug with fallback
export function findCourseById(idOrSlug) {
  if (!idOrSlug) return null;
  return FALLBACK_COURSES.find(
    (c) => c.id === idOrSlug || c.code?.toLowerCase() === idOrSlug.toLowerCase() || c.slug === idOrSlug
  ) || null;
}

// Helper to look up institution by slug or id with fallback
export function findInstitutionBySlug(slugOrId) {
  if (!slugOrId) return null;
  const s = slugOrId.toLowerCase().trim();

  // 1. Search in static/default institutions
  const staticFound = FALLBACK_INSTITUTIONS.find(
    (inst) => inst.slug?.toLowerCase() === s || inst.id?.toLowerCase() === s
  );
  if (staticFound) return staticFound;

  // 2. Search in custom institutions registered in this browser
  if (typeof window !== "undefined") {
    try {
      const stored = JSON.parse(localStorage.getItem("eos_custom_institutions") || "[]");
      const custom = stored.find(
        (inst) => inst.slug?.toLowerCase() === s || inst.id?.toLowerCase() === s
      );
      if (custom) return custom;
    } catch (e) {}
  }

  return null;
}

// Helper to persist a newly registered institution into browser storage for instant website generation
export function saveCustomInstitution(instData) {
  if (typeof window === "undefined" || !instData?.slug) return;
  try {
    const stored = JSON.parse(localStorage.getItem("eos_custom_institutions") || "[]");
    const filtered = stored.filter((i) => i.slug?.toLowerCase() !== instData.slug?.toLowerCase());
    filtered.unshift(instData);
    localStorage.setItem("eos_custom_institutions", JSON.stringify(filtered));
  } catch (e) {}
}
