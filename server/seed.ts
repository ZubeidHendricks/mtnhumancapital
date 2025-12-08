import { db } from "./db";
import { sql } from "drizzle-orm";
import { users, jobs, candidates, whatsappConversations, whatsappMessages, whatsappDocumentRequests, whatsappAppointments, tenantConfig, integrityChecks, interviews, recruitmentSessions, interviewAssessments, documents, documentBatches, candidateDocuments, integrityDocumentRequirements, candidateSocialConsent, candidateSocialProfiles, socialScreeningFindings, socialScreeningPosts, interviewSessions, interviewFeedback, interviewRecordings, interviewTranscripts, candidateRecommendations, modelTrainingEvents, onboardingAgentLogs, onboardingDocumentRequests, onboardingWorkflows, whatsappDocumentSessions } from "@shared/schema";

async function seedDatabase() {
  console.log("🌱 Starting database seed...");

  try {
    console.log("Clearing existing data using CASCADE TRUNCATE...");
    await db.execute(sql`
      TRUNCATE TABLE 
        social_screening_posts,
        social_screening_findings,
        candidate_social_profiles,
        candidate_social_consent,
        candidate_documents,
        integrity_document_requirements,
        whatsapp_appointments,
        whatsapp_document_sessions,
        whatsapp_document_requests,
        whatsapp_messages,
        interview_transcripts,
        interview_recordings,
        interview_feedback,
        candidate_recommendations,
        model_training_events,
        interview_sessions,
        whatsapp_conversations,
        interview_assessments,
        interviews,
        onboarding_agent_logs,
        onboarding_document_requests,
        onboarding_workflows,
        recruitment_sessions,
        integrity_checks,
        documents,
        document_batches,
        kpi_scores,
        kpi_assignments,
        feedback_360_responses,
        feedback_360_requests,
        review_submissions,
        review_cycles,
        kpi_templates,
        candidates,
        jobs,
        users,
        tenant_config
      CASCADE
    `);

    console.log("Creating default tenant...");
    const [tenant] = await db.insert(tenantConfig).values({
      companyName: "Avatar Human Capital",
      subdomain: "company",
      logoUrl: "/logo.png",
      primaryColor: "#6366f1",
      secondaryColor: "#8b5cf6",
      tagline: "AI-Powered HR Management",
      industry: "Technology",
      modulesEnabled: { recruitment: true, whatsapp: true, integrity: true },
      apiKeysConfigured: {},
      settings: {
        timezone: "Africa/Johannesburg",
        currency: "ZAR",
        language: "en-ZA"
      }
    }).returning();
    const tenantId = tenant.id;
    console.log(`✓ Created tenant: ${tenant.companyName} (${tenantId})`);

    console.log("Creating users...");
    const userRecords = await db.insert(users).values([
      {
        tenantId,
        username: "admin",
        password: "admin123"
      },
      {
        tenantId,
        username: "hr_manager",
        password: "hr123"
      },
      {
        tenantId,
        username: "recruiter",
        password: "recruiter123"
      }
    ]).returning();

    console.log(`✓ Created ${userRecords.length} users`);

    console.log("Creating job postings...");
    const jobRecords = await db.insert(jobs).values([
      {
        tenantId,
        title: "Senior Backend Developer",
        department: "Engineering",
        location: "Gauteng",
        salaryMin: 650000,
        salaryMax: 850000,
        description: "We're seeking an experienced Backend Developer to join our growing engineering team. You'll work on scalable microservices architecture using Node.js, Python, and PostgreSQL. Requirements: 5+ years experience, Node.js, Python, PostgreSQL, Redis, microservices. Benefits: Medical aid, provident fund, remote work.",
        status: "Active"
      },
      {
        tenantId,
        title: "Frontend React Developer",
        department: "Engineering",
        location: "Western Cape",
        salaryMin: 550000,
        salaryMax: 750000,
        description: "Join our product team to build beautiful, responsive user interfaces using React, TypeScript, and modern CSS frameworks. Requirements: 3+ years React, TypeScript, Tailwind CSS, state management. Benefits: Medical aid, hybrid work, learning stipend.",
        status: "Active"
      },
      {
        tenantId,
        title: "DevOps Engineer",
        department: "Infrastructure",
        location: "Gauteng",
        salaryMin: 700000,
        salaryMax: 950000,
        description: "We need a talented DevOps Engineer to manage our cloud infrastructure, CI/CD pipelines, and ensure system reliability. Requirements: 4+ years DevOps, AWS/Azure, Kubernetes, Docker, Terraform. Benefits: Medical aid, certifications, flexible hours.",
        status: "Active"
      },
      {
        tenantId,
        title: "Product Manager",
        department: "Product",
        location: "Western Cape",
        salaryMin: 800000,
        salaryMax: 1100000,
        description: "Lead product strategy and execution for our AI-powered HR platform. Work with engineering, design, and business teams to deliver exceptional products. Requirements: 5+ years PM experience, SaaS background, analytical skills. Benefits: Medical aid, equity, remote work.",
        status: "Active"
      },
      {
        tenantId,
        title: "HR Business Partner",
        department: "Human Resources",
        location: "KwaZulu-Natal",
        salaryMin: 500000,
        salaryMax: 650000,
        description: "Support our business units with strategic HR guidance, talent management, and employee relations. Requirements: BCOM/BA HR, 3+ years HRBP experience, SA labour law knowledge. Benefits: Medical aid, provident fund, study assistance.",
        status: "Active"
      }
    ]).returning();

    console.log(`✓ Created ${jobRecords.length} job postings`);

    console.log("Creating candidates...");
    const candidateRecords = await db.insert(candidates).values([
      {
        tenantId,
        jobId: jobRecords[0].id,
        fullName: "Sipho Dlamini",
        email: "sipho.dlamini@email.com",
        phone: "+27 82 345 6789",
        role: "Senior Backend Developer",
        cvUrl: "https://example.com/cv/sipho-dlamini.pdf",
        skills: ["Node.js", "Python", "PostgreSQL", "Redis", "AWS", "Docker"],
        status: "Screening",
        stage: "Screening",
        match: 92,
        metadata: {
          location: "Gauteng",
          linkedinUrl: "https://linkedin.com/in/siphodlamini",
          experienceYears: 7,
          currentCompany: "Tech Solutions SA",
          education: [{
            degree: "BSc Computer Science",
            institution: "University of the Witwatersrand",
            year: "2016"
          }],
          aiNotes: "Excellent technical background with strong problem-solving skills. Great cultural fit based on values alignment."
        }
      },
      {
        tenantId,
        jobId: jobRecords[0].id,
        fullName: "Lerato Molefe",
        email: "lerato.molefe@email.com",
        phone: "+27 83 456 7890",
        role: "Backend Engineer",
        cvUrl: "https://example.com/cv/lerato-molefe.pdf",
        skills: ["Node.js", "TypeScript", "MongoDB", "GraphQL", "Kubernetes"],
        status: "Interview",
        stage: "Interview",
        match: 88,
        metadata: {
          location: "Western Cape",
          experienceYears: 6,
          currentCompany: "Digital Innovations"
        }
      },
      {
        tenantId,
        jobId: jobRecords[1].id,
        fullName: "Thandi Ndlovu",
        email: "thandi.ndlovu@email.com",
        phone: "+27 84 567 8901",
        role: "Senior Frontend Developer",
        cvUrl: "https://example.com/cv/thandi-ndlovu.pdf",
        skills: ["React", "TypeScript", "Tailwind CSS", "Next.js", "GraphQL", "Jest"],
        status: "Screening",
        stage: "Screening",
        match: 90,
        metadata: {
          location: "Western Cape",
          githubUrl: "https://github.com/thandindlovu",
          experienceYears: 4,
          currentCompany: "Creative Web Studios"
        }
      },
      {
        tenantId,
        jobId: jobRecords[1].id,
        fullName: "Michael Van Der Merwe",
        email: "michael.vdm@email.com",
        phone: "+27 85 678 9012",
        role: "Frontend Lead",
        cvUrl: "https://example.com/cv/michael-vandermerwe.pdf",
        skills: ["React", "Vue.js", "TypeScript", "CSS3", "Webpack", "Vite"],
        status: "New",
        stage: "Screening",
        match: 85,
        metadata: {
          location: "Gauteng",
          linkedinUrl: "https://linkedin.com/in/michaelvdm",
          githubUrl: "https://github.com/mvdmerwe",
          experienceYears: 5,
          currentCompany: "StartupHub"
        }
      },
      {
        tenantId,
        jobId: jobRecords[2].id,
        fullName: "Nomvula Khumalo",
        email: "nomvula.khumalo@email.com",
        phone: "+27 86 789 0123",
        role: "DevOps Engineer",
        cvUrl: "https://example.com/cv/nomvula-khumalo.pdf",
        skills: ["AWS", "Kubernetes", "Terraform", "Jenkins", "Python", "Bash", "Prometheus"],
        status: "Interview",
        stage: "Interview",
        match: 94,
        metadata: {
          location: "Gauteng",
          linkedinUrl: "https://linkedin.com/in/nomvulakhumalo",
          experienceYears: 5,
          currentCompany: "CloudOps Africa",
          certifications: ["AWS Solutions Architect"]
        }
      },
      {
        tenantId,
        jobId: jobRecords[2].id,
        fullName: "David Botha",
        email: "david.botha@email.com",
        phone: "+27 87 890 1234",
        role: "Senior DevOps Engineer",
        cvUrl: "https://example.com/cv/david-botha.pdf",
        skills: ["Azure", "Docker", "Kubernetes", "Ansible", "GitLab CI", "Monitoring"],
        status: "Screening",
        stage: "Screening",
        match: 87,
        metadata: {
          location: "Western Cape",
          experienceYears: 6,
          currentCompany: "Enterprise Tech"
        }
      },
      {
        tenantId,
        jobId: jobRecords[3].id,
        fullName: "Zanele Mthembu",
        email: "zanele.mthembu@email.com",
        phone: "+27 88 901 2345",
        role: "Senior Product Manager",
        cvUrl: "https://example.com/cv/zanele-mthembu.pdf",
        skills: ["Product Strategy", "Agile", "User Research", "Analytics", "Roadmapping"],
        status: "Interview",
        stage: "Interview",
        match: 91,
        metadata: {
          location: "Western Cape",
          linkedinUrl: "https://linkedin.com/in/zanelemthembu",
          experienceYears: 7,
          currentCompany: "SaaS Innovators",
          education: ["BCOM Business Management (UCT)", "MBA (GIBS)"]
        }
      },
      {
        tenantId,
        jobId: jobRecords[4].id,
        fullName: "Bongani Sithole",
        email: "bongani.sithole@email.com",
        phone: "+27 89 012 3456",
        role: "HR Business Partner",
        cvUrl: "https://example.com/cv/bongani-sithole.pdf",
        skills: ["Employee Relations", "Talent Management", "Labour Law", "Performance Management", "HRIS"],
        status: "Screening",
        stage: "Screening",
        match: 86,
        metadata: {
          location: "KwaZulu-Natal",
          experienceYears: 4,
          currentCompany: "Corporate HR Solutions"
        }
      },
      {
        tenantId,
        jobId: jobRecords[0].id,
        fullName: "Chloe Smith",
        email: "chloe.smith@email.com",
        phone: "+27 81 234 5678",
        role: "Lead Backend Engineer",
        cvUrl: "https://example.com/cv/chloe-smith.pdf",
        skills: ["Python", "Django", "PostgreSQL", "RabbitMQ", "Celery", "FastAPI"],
        status: "Offer",
        stage: "Offer",
        match: 95,
        metadata: {
          location: "Gauteng",
          githubUrl: "https://github.com/chloesmith",
          experienceYears: 8,
          currentCompany: "FinTech SA"
        }
      },
      {
        tenantId,
        jobId: jobRecords[1].id,
        fullName: "Katlego Mokoena",
        email: "katlego.mokoena@email.com",
        phone: "+27 82 345 6789",
        role: "Frontend Developer",
        cvUrl: "https://example.com/cv/katlego-mokoena.pdf",
        skills: ["React", "TypeScript", "SCSS", "Figma", "Storybook", "Accessibility"],
        status: "Rejected",
        stage: "Rejected",
        match: 72,
        metadata: {
          location: "Gauteng",
          portfolioUrl: "https://katlegomokoena.dev",
          experienceYears: 3,
          currentCompany: "Design & Dev Co"
        }
      }
    ]).returning();

    console.log(`✓ Created ${candidateRecords.length} candidates`);

    console.log("Creating WhatsApp conversations...");
    const siphoCandidate = candidateRecords.find(c => c.fullName === "Sipho Dlamini")!;
    const leratoCandidate = candidateRecords.find(c => c.fullName === "Lerato Molefe")!;
    const thandiCandidate = candidateRecords.find(c => c.fullName === "Thandi Ndlovu")!;

    const conversationRecords = await db.insert(whatsappConversations).values([
      {
        tenantId,
        candidateId: siphoCandidate.id,
        phone: "+27823456789",
        waId: "27823456789",
        profileName: "Sipho Dlamini",
        type: "recruitment",
        status: "active",
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 30),
        lastMessagePreview: "Thank you! I will send my CV shortly.",
        unreadCount: 1,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)
      },
      {
        tenantId,
        candidateId: leratoCandidate.id,
        phone: "+27834567890",
        waId: "27834567890",
        profileName: "Lerato Molefe",
        type: "document_request",
        status: "active",
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
        lastMessagePreview: "I have attached my proof of address document.",
        unreadCount: 0,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5)
      },
      {
        tenantId,
        candidateId: thandiCandidate.id,
        phone: "+27845678901",
        waId: "27845678901",
        profileName: "Thandi Ndlovu",
        type: "appointment",
        status: "active",
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
        lastMessagePreview: "Perfect, I'll be there at 10am tomorrow.",
        unreadCount: 0,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3)
      }
    ]).returning();

    console.log(`✓ Created ${conversationRecords.length} WhatsApp conversations`);

    console.log("Creating WhatsApp messages...");
    const siphoConv = conversationRecords.find(c => c.profileName === "Sipho Dlamini")!;
    const leratoConv = conversationRecords.find(c => c.profileName === "Lerato Molefe")!;
    const thandiConv = conversationRecords.find(c => c.profileName === "Thandi Ndlovu")!;

    await db.insert(whatsappMessages).values([
      {
        conversationId: siphoConv.id,
        tenantId: tenantId,
        waMessageId: "wamid_" + Date.now() + "_1",
        direction: "outbound",
        senderType: "ai",
        body: "Hello Sipho! Thank you for your interest in the Senior Backend Developer position at Avatar Human Capital. We were impressed by your profile. Would you be interested in scheduling an interview?",
        status: "delivered",
        sentAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)
      },
      {
        conversationId: siphoConv.id,
        tenantId: tenantId,
        waMessageId: "wamid_" + Date.now() + "_2",
        direction: "inbound",
        senderType: "candidate",
        body: "Hi! Yes, I'm very interested in this opportunity. The role sounds like a great fit for my experience.",
        status: "read",
        sentAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 15)
      },
      {
        conversationId: siphoConv.id,
        tenantId: tenantId,
        waMessageId: "wamid_" + Date.now() + "_3",
        direction: "outbound",
        senderType: "ai",
        body: "That's wonderful! Before we proceed, could you please send us your updated CV? This will help us prepare for the technical discussion.",
        status: "delivered",
        sentAt: new Date(Date.now() - 1000 * 60 * 60)
      },
      {
        conversationId: siphoConv.id,
        tenantId: tenantId,
        waMessageId: "wamid_" + Date.now() + "_4",
        direction: "inbound",
        senderType: "candidate",
        body: "Thank you! I will send my CV shortly.",
        status: "delivered",
        sentAt: new Date(Date.now() - 1000 * 60 * 30)
      },
      {
        conversationId: leratoConv.id,
        tenantId: tenantId,
        waMessageId: "wamid_" + Date.now() + "_5",
        direction: "outbound",
        senderType: "human",
        body: "Hi Lerato, this is the HR team at Avatar Human Capital. We need a few documents for your background check. Could you please send your proof of address?",
        status: "delivered",
        sentAt: new Date(Date.now() - 1000 * 60 * 60 * 24)
      },
      {
        conversationId: leratoConv.id,
        tenantId: tenantId,
        waMessageId: "wamid_" + Date.now() + "_6",
        direction: "inbound",
        senderType: "candidate",
        body: "No problem, let me find my utility bill. Is a bank statement also acceptable?",
        status: "read",
        sentAt: new Date(Date.now() - 1000 * 60 * 60 * 5)
      },
      {
        conversationId: leratoConv.id,
        tenantId: tenantId,
        waMessageId: "wamid_" + Date.now() + "_7",
        direction: "outbound",
        senderType: "human",
        body: "Yes, a recent bank statement (within the last 3 months) showing your address would be perfect.",
        status: "delivered",
        sentAt: new Date(Date.now() - 1000 * 60 * 60 * 4)
      },
      {
        conversationId: leratoConv.id,
        tenantId: tenantId,
        waMessageId: "wamid_" + Date.now() + "_8",
        direction: "inbound",
        senderType: "candidate",
        body: "I have attached my proof of address document.",
        status: "read",
        sentAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
        mediaUrl: "https://example.com/docs/lerato-proof-of-address.pdf",
        mediaType: "document"
      },
      {
        conversationId: thandiConv.id,
        tenantId: tenantId,
        waMessageId: "wamid_" + Date.now() + "_9",
        direction: "outbound",
        senderType: "ai",
        body: "Good morning Thandi! We would like to schedule your first-round interview for the Frontend React Developer position. Are you available tomorrow at 10:00 AM?",
        status: "delivered",
        sentAt: new Date(Date.now() - 1000 * 60 * 60 * 8)
      },
      {
        conversationId: thandiConv.id,
        tenantId: tenantId,
        waMessageId: "wamid_" + Date.now() + "_10",
        direction: "inbound",
        senderType: "candidate",
        body: "Good morning! Yes, 10am tomorrow works perfectly for me. Should I come to your office?",
        status: "read",
        sentAt: new Date(Date.now() - 1000 * 60 * 60 * 7)
      },
      {
        conversationId: thandiConv.id,
        tenantId: tenantId,
        waMessageId: "wamid_" + Date.now() + "_11",
        direction: "outbound",
        senderType: "ai",
        body: "Great! The interview will be conducted via video call. I'll send you the meeting link shortly. Please make sure you have a stable internet connection.",
        status: "delivered",
        sentAt: new Date(Date.now() - 1000 * 60 * 60 * 6)
      },
      {
        conversationId: thandiConv.id,
        tenantId: tenantId,
        waMessageId: "wamid_" + Date.now() + "_12",
        direction: "inbound",
        senderType: "candidate",
        body: "Perfect, I'll be there at 10am tomorrow.",
        status: "read",
        sentAt: new Date(Date.now() - 1000 * 60 * 60 * 5)
      }
    ]);

    console.log("✓ Created WhatsApp messages");

    console.log("Creating document requests...");
    await db.insert(whatsappDocumentRequests).values([
      {
        conversationId: siphoConv.id,
        tenantId: tenantId,
        candidateId: siphoCandidate.id,
        documentType: "cv",
        documentName: "Updated CV / Resume",
        description: "Please send your updated CV for the Senior Backend Developer position",
        status: "requested"
      },
      {
        conversationId: leratoConv.id,
        tenantId: tenantId,
        candidateId: leratoCandidate.id,
        documentType: "proof_of_address",
        documentName: "Proof of Address",
        description: "Bank statement or utility bill showing current address",
        status: "received",
        receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 2)
      }
    ]);

    console.log("✓ Created document requests");

    console.log("Creating appointments...");
    await db.insert(whatsappAppointments).values([
      {
        conversationId: thandiConv.id,
        tenantId: tenantId,
        candidateId: thandiCandidate.id,
        appointmentType: "interview",
        title: "First Round Interview",
        description: "Video call interview - Frontend React Developer position",
        scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        duration: 60,
        location: "virtual",
        meetingLink: "https://meet.google.com/abc-defg-hij",
        status: "confirmed",
        confirmedAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
        candidateResponse: "accepted"
      }
    ]);

    console.log("✓ Created appointments");

    console.log("Creating candidate documents...");
    const nomvulaCandidate = candidateRecords.find(c => c.fullName === "Nomvula Khumalo")!;
    const zaneleCandidate = candidateRecords.find(c => c.fullName === "Zanele Mthembu")!;
    const chloeCandidate = candidateRecords.find(c => c.fullName === "Chloe Smith")!;
    const bonganiCandidate = candidateRecords.find(c => c.fullName === "Bongani Sithole")!;
    
    const documentRecords = await db.insert(candidateDocuments).values([
      {
        tenantId: tenantId,
        candidateId: siphoCandidate.id,
        documentType: "cv",
        fileName: "Sipho_Dlamini_CV.pdf",
        fileUrl: "uploads/documents/sipho_dlamini_cv.pdf",
        fileSize: 245760,
        mimeType: "application/pdf",
        referenceCode: "DOC-CV-001",
        collectedVia: "portal",
        status: "verified",
        verifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
        verifiedBy: "manual",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7)
      },
      {
        tenantId: tenantId,
        candidateId: siphoCandidate.id,
        documentType: "id_document",
        fileName: "Sipho_Dlamini_ID.pdf",
        fileUrl: "uploads/documents/sipho_dlamini_id.pdf",
        fileSize: 156000,
        mimeType: "application/pdf",
        referenceCode: "DOC-ID-001",
        collectedVia: "whatsapp",
        status: "verified",
        verifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4),
        verifiedBy: "ai",
        aiVerification: { verified: true, confidence: 0.95, issues: [] },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5)
      },
      {
        tenantId: tenantId,
        candidateId: siphoCandidate.id,
        documentType: "police_clearance",
        fileName: "Sipho_Dlamini_Police_Clearance.pdf",
        fileUrl: "uploads/documents/sipho_dlamini_police_clearance.pdf",
        fileSize: 89000,
        mimeType: "application/pdf",
        referenceCode: "DOC-PC-001",
        collectedVia: "whatsapp",
        status: "received",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)
      },
      {
        tenantId: tenantId,
        candidateId: leratoCandidate.id,
        documentType: "cv",
        fileName: "Lerato_Molefe_CV.pdf",
        fileUrl: "uploads/documents/lerato_molefe_cv.pdf",
        fileSize: 312000,
        mimeType: "application/pdf",
        referenceCode: "DOC-CV-002",
        collectedVia: "portal",
        status: "verified",
        verifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
        verifiedBy: "manual",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6)
      },
      {
        tenantId: tenantId,
        candidateId: leratoCandidate.id,
        documentType: "proof_of_address",
        fileName: "Lerato_Molefe_Proof_of_Address.pdf",
        fileUrl: "uploads/documents/lerato_molefe_poa.pdf",
        fileSize: 78000,
        mimeType: "application/pdf",
        referenceCode: "DOC-POA-001",
        collectedVia: "whatsapp",
        status: "verified",
        verifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
        verifiedBy: "ai",
        aiVerification: { verified: true, confidence: 0.88, issues: [] },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3)
      },
      {
        tenantId: tenantId,
        candidateId: thandiCandidate.id,
        documentType: "cv",
        fileName: "Thandi_Ndlovu_CV.pdf",
        fileUrl: "uploads/documents/thandi_ndlovu_cv.pdf",
        fileSize: 198000,
        mimeType: "application/pdf",
        referenceCode: "DOC-CV-003",
        collectedVia: "portal",
        status: "verified",
        verifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4),
        verifiedBy: "manual",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8)
      },
      {
        tenantId: tenantId,
        candidateId: thandiCandidate.id,
        documentType: "qualification",
        fileName: "Thandi_Ndlovu_Degree_Certificate.pdf",
        fileUrl: "uploads/documents/thandi_ndlovu_degree.pdf",
        fileSize: 450000,
        mimeType: "application/pdf",
        referenceCode: "DOC-QUAL-001",
        collectedVia: "email",
        status: "verified",
        verifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
        verifiedBy: "manual",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5)
      },
      {
        tenantId: tenantId,
        candidateId: nomvulaCandidate.id,
        documentType: "cv",
        fileName: "Nomvula_Khumalo_CV.pdf",
        fileUrl: "uploads/documents/nomvula_khumalo_cv.pdf",
        fileSize: 285000,
        mimeType: "application/pdf",
        referenceCode: "DOC-CV-004",
        collectedVia: "portal",
        status: "verified",
        verifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
        verifiedBy: "manual",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4)
      },
      {
        tenantId: tenantId,
        candidateId: nomvulaCandidate.id,
        documentType: "police_clearance",
        fileName: "Nomvula_Khumalo_Police_Clearance.pdf",
        fileUrl: "uploads/documents/nomvula_khumalo_police.pdf",
        fileSize: 95000,
        mimeType: "application/pdf",
        referenceCode: "DOC-PC-002",
        collectedVia: "whatsapp",
        status: "received",
        candidateNote: "This is my police clearance certificate from SAPS",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1)
      },
      {
        tenantId: tenantId,
        candidateId: zaneleCandidate.id,
        documentType: "cv",
        fileName: "Zanele_Mthembu_CV.pdf",
        fileUrl: "uploads/documents/zanele_mthembu_cv.pdf",
        fileSize: 340000,
        mimeType: "application/pdf",
        referenceCode: "DOC-CV-005",
        collectedVia: "portal",
        status: "verified",
        verifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
        verifiedBy: "manual",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3)
      },
      {
        tenantId: tenantId,
        candidateId: zaneleCandidate.id,
        documentType: "id_document",
        fileName: "Zanele_Mthembu_ID.pdf",
        fileUrl: "uploads/documents/zanele_mthembu_id.pdf",
        fileSize: 142000,
        mimeType: "application/pdf",
        referenceCode: "DOC-ID-002",
        collectedVia: "whatsapp",
        status: "verified",
        verifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
        verifiedBy: "ai",
        aiVerification: { verified: true, confidence: 0.92, issues: [] },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)
      },
      {
        tenantId: tenantId,
        candidateId: chloeCandidate.id,
        documentType: "cv",
        fileName: "Chloe_Smith_CV.pdf",
        fileUrl: "uploads/documents/chloe_smith_cv.pdf",
        fileSize: 390000,
        mimeType: "application/pdf",
        referenceCode: "DOC-CV-006",
        collectedVia: "portal",
        status: "verified",
        verifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
        verifiedBy: "manual",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5)
      },
      {
        tenantId: tenantId,
        candidateId: chloeCandidate.id,
        documentType: "bank_confirmation",
        fileName: "Chloe_Smith_Bank_Confirmation.pdf",
        fileUrl: "uploads/documents/chloe_smith_bank.pdf",
        fileSize: 67000,
        mimeType: "application/pdf",
        referenceCode: "DOC-BANK-001",
        collectedVia: "email",
        status: "verified",
        verifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
        verifiedBy: "manual",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)
      },
      {
        tenantId: tenantId,
        candidateId: chloeCandidate.id,
        documentType: "police_clearance",
        fileName: "Chloe_Smith_Police_Clearance.pdf",
        fileUrl: "uploads/documents/chloe_smith_police.pdf",
        fileSize: 102000,
        mimeType: "application/pdf",
        referenceCode: "DOC-PC-003",
        collectedVia: "portal",
        status: "verified",
        verifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
        verifiedBy: "ai",
        aiVerification: { verified: true, confidence: 0.97, issues: [] },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3)
      },
      {
        tenantId: tenantId,
        candidateId: bonganiCandidate.id,
        documentType: "cv",
        fileName: "Bongani_Sithole_CV.pdf",
        fileUrl: "uploads/documents/bongani_sithole_cv.pdf",
        fileSize: 275000,
        mimeType: "application/pdf",
        referenceCode: "DOC-CV-007",
        collectedVia: "portal",
        status: "received",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1)
      },
      {
        tenantId: tenantId,
        candidateId: bonganiCandidate.id,
        documentType: "qualification",
        fileName: "Bongani_Sithole_HR_Certificate.pdf",
        fileUrl: "uploads/documents/bongani_sithole_cert.pdf",
        fileSize: 520000,
        mimeType: "application/pdf",
        referenceCode: "DOC-QUAL-002",
        collectedVia: "whatsapp",
        status: "received",
        candidateNote: "My HR professional certification from SABPP",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12)
      }
    ]).returning();

    console.log(`✓ Created ${documentRecords.length} candidate documents`);

    // Social Screening Seed Data
    console.log("Creating social screening consents...");
    const consentRecords = await db.insert(candidateSocialConsent).values([
      {
        tenantId: tenantId,
        candidateId: siphoCandidate.id,
        consentStatus: "granted",
        grantedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 87), // 87 days remaining
        ipAddress: "41.13.45.67",
        userAgent: "WhatsApp/2.23.20.76",
        metadata: {
          platforms: ["facebook", "twitter", "linkedin"],
          handles: {
            facebook: "sipho.dlamini.sa",
            twitter: "@siphodlamini",
            linkedin: "siphodlamini"
          },
          consentVersion: "1.0",
          dataRetentionDays: 90
        }
      },
      {
        tenantId: tenantId,
        candidateId: leratoCandidate.id,
        consentStatus: "granted",
        grantedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 85),
        ipAddress: "102.89.23.45",
        userAgent: "WhatsApp/2.23.20.76",
        metadata: {
          platforms: ["facebook", "twitter"],
          handles: {
            facebook: "lerato.molefe",
            twitter: "@lerato_codes"
          },
          consentVersion: "1.0",
          dataRetentionDays: 90
        }
      },
      {
        tenantId: tenantId,
        candidateId: thandiCandidate.id,
        consentStatus: "pending",
        requestedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
        metadata: {
          platforms: ["facebook", "twitter", "linkedin"],
          requestMethod: "whatsapp"
        }
      },
      {
        tenantId: tenantId,
        candidateId: nomvulaCandidate.id,
        consentStatus: "granted",
        grantedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 89),
        ipAddress: "197.234.56.78",
        userAgent: "Mozilla/5.0",
        metadata: {
          platforms: ["twitter", "linkedin"],
          handles: {
            twitter: "@nomvula_devops",
            linkedin: "nomvulakhumalo"
          },
          consentVersion: "1.0",
          dataRetentionDays: 90
        }
      },
      {
        tenantId: tenantId,
        candidateId: zaneleCandidate.id,
        consentStatus: "denied",
        deniedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
        metadata: {
          platforms: ["facebook", "twitter"],
          denialReason: "Privacy concerns"
        }
      },
      {
        tenantId: tenantId,
        candidateId: chloeCandidate.id,
        consentStatus: "granted",
        grantedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 83),
        ipAddress: "154.117.89.12",
        userAgent: "WhatsApp/2.23.20.76",
        metadata: {
          platforms: ["facebook", "twitter", "linkedin"],
          handles: {
            facebook: "chloe.smith.dev",
            twitter: "@chloedev",
            linkedin: "chloesmith"
          },
          consentVersion: "1.0",
          dataRetentionDays: 90
        }
      }
    ]).returning();
    console.log(`✓ Created ${consentRecords.length} social screening consents`);

    // Social Profiles
    console.log("Creating social profiles...");
    const profileRecords = await db.insert(candidateSocialProfiles).values([
      {
        tenantId: tenantId,
        candidateId: siphoCandidate.id,
        platform: "facebook",
        profileUrl: "https://facebook.com/sipho.dlamini.sa",
        profileUsername: "sipho.dlamini.sa",
        displayName: "Sipho Dlamini",
        verified: true,
        verifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
        followerCount: 892,
        accountAge: 8,
        lastActivityDate: new Date(Date.now() - 1000 * 60 * 60 * 2),
        profileData: { bio: "Backend Dev | Node.js | Python | Cloud", location: "Johannesburg, SA" }
      },
      {
        tenantId: tenantId,
        candidateId: siphoCandidate.id,
        platform: "twitter",
        profileUrl: "https://x.com/siphodlamini",
        profileUsername: "siphodlamini",
        displayName: "Sipho Dlamini 🚀",
        verified: true,
        verifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
        followerCount: 1247,
        accountAge: 6,
        lastActivityDate: new Date(Date.now() - 1000 * 60 * 30),
        profileData: { bio: "Software Engineer | Tech enthusiast | Building the future", location: "Gauteng" }
      },
      {
        tenantId: tenantId,
        candidateId: leratoCandidate.id,
        platform: "facebook",
        profileUrl: "https://facebook.com/lerato.molefe",
        profileUsername: "lerato.molefe",
        displayName: "Lerato Molefe",
        verified: true,
        verifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
        followerCount: 543,
        accountAge: 5,
        lastActivityDate: new Date(Date.now() - 1000 * 60 * 60 * 12),
        profileData: { bio: "Coder & Coffee lover ☕", location: "Cape Town" }
      },
      {
        tenantId: tenantId,
        candidateId: leratoCandidate.id,
        platform: "twitter",
        profileUrl: "https://x.com/lerato_codes",
        profileUsername: "lerato_codes",
        displayName: "Lerato | Developer",
        verified: true,
        verifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
        followerCount: 2100,
        accountAge: 4,
        lastActivityDate: new Date(Date.now() - 1000 * 60 * 60 * 1),
        profileData: { bio: "Full-stack developer | TypeScript | GraphQL", location: "Western Cape, SA" }
      },
      {
        tenantId: tenantId,
        candidateId: nomvulaCandidate.id,
        platform: "twitter",
        profileUrl: "https://x.com/nomvula_devops",
        profileUsername: "nomvula_devops",
        displayName: "Nomvula | DevOps 🔧",
        verified: true,
        verifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
        followerCount: 3500,
        accountAge: 5,
        lastActivityDate: new Date(Date.now() - 1000 * 60 * 45),
        profileData: { bio: "DevOps Engineer | AWS | K8s | Terraform | Cloud Native", location: "Johannesburg" }
      },
      {
        tenantId: tenantId,
        candidateId: chloeCandidate.id,
        platform: "twitter",
        profileUrl: "https://x.com/chloedev",
        profileUsername: "chloedev",
        displayName: "Chloe Smith",
        verified: true,
        verifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
        followerCount: 4200,
        accountAge: 7,
        lastActivityDate: new Date(Date.now() - 1000 * 60 * 15),
        profileData: { bio: "Lead Backend Engineer | Python | Django | FastAPI | Speaker", location: "Pretoria, SA" }
      },
      {
        tenantId: tenantId,
        candidateId: chloeCandidate.id,
        platform: "facebook",
        profileUrl: "https://facebook.com/chloe.smith.dev",
        profileUsername: "chloe.smith.dev",
        displayName: "Chloe Smith",
        verified: true,
        verifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
        followerCount: 1560,
        accountAge: 9,
        lastActivityDate: new Date(Date.now() - 1000 * 60 * 60 * 4),
        profileData: { bio: "Software engineer, speaker, mentor", location: "Gauteng, South Africa" }
      }
    ]).returning();
    console.log(`✓ Created ${profileRecords.length} social profiles`);

    // Social Screening Findings
    console.log("Creating social screening findings...");
    const findingRecords = await db.insert(socialScreeningFindings).values([
      {
        tenantId: tenantId,
        candidateId: siphoCandidate.id,
        screeningStatus: "completed",
        platformsAnalyzed: ["facebook", "twitter"],
        totalPostsAnalyzed: 156,
        dateRangeStart: new Date(Date.now() - 1000 * 60 * 60 * 24 * 180),
        dateRangeEnd: new Date(),
        cultureFitScore: 87,
        professionalismScore: 91,
        communicationScore: 85,
        riskLevel: "low",
        sentimentAnalysis: { positive: 72, negative: 8, neutral: 20 },
        topicsIdentified: ["technology", "programming", "career", "sports", "community"],
        redFlags: [],
        positiveIndicators: [
          { type: "professional_engagement", description: "Active in tech community discussions", evidence: "Regular tech posts" },
          { type: "thought_leadership", description: "Shares industry insights", evidence: "Educational content" }
        ],
        culturalAlignmentFactors: { 
          values: ["innovation", "collaboration", "continuous_learning"],
          interests: ["open_source", "mentorship", "tech_events"],
          behavior: ["helpful", "professional", "engaged"]
        },
        aiSummary: "Sipho demonstrates excellent professional presence online with consistent engagement in technology discussions. His social media activity shows strong alignment with company values including innovation, teamwork, and continuous learning. No concerning content identified.",
        aiRecommendation: "proceed",
        aiConfidence: 92,
        humanReviewStatus: "approved",
        humanReviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
        humanReviewNotes: "Excellent candidate. Professional online presence confirmed.",
        analysisVersion: "groq-llama-3.3-70b",
        processingTimeMs: 4500,
        tokensUsed: 8500
      },
      {
        tenantId: tenantId,
        candidateId: leratoCandidate.id,
        screeningStatus: "completed",
        platformsAnalyzed: ["facebook", "twitter"],
        totalPostsAnalyzed: 98,
        dateRangeStart: new Date(Date.now() - 1000 * 60 * 60 * 24 * 180),
        dateRangeEnd: new Date(),
        cultureFitScore: 78,
        professionalismScore: 82,
        communicationScore: 80,
        riskLevel: "low",
        sentimentAnalysis: { positive: 65, negative: 12, neutral: 23 },
        topicsIdentified: ["coding", "tech_events", "music", "travel", "food"],
        redFlags: [],
        positiveIndicators: [
          { type: "community_engagement", description: "Participates in tech meetups", evidence: "Event posts" },
          { type: "creative_interests", description: "Well-rounded personality", evidence: "Diverse content" }
        ],
        culturalAlignmentFactors: {
          values: ["creativity", "teamwork", "work_life_balance"],
          interests: ["hackathons", "music", "travel"],
          behavior: ["friendly", "collaborative", "curious"]
        },
        aiSummary: "Lerato shows a well-balanced online presence with professional tech engagement and healthy personal interests. Active in the developer community with no red flags identified.",
        aiRecommendation: "proceed",
        aiConfidence: 88,
        humanReviewStatus: "pending",
        analysisVersion: "groq-llama-3.3-70b",
        processingTimeMs: 3800,
        tokensUsed: 7200
      },
      {
        tenantId: tenantId,
        candidateId: nomvulaCandidate.id,
        screeningStatus: "in_progress",
        platformsAnalyzed: ["twitter"],
        totalPostsAnalyzed: 45,
        dateRangeStart: new Date(Date.now() - 1000 * 60 * 60 * 24 * 180),
        dateRangeEnd: new Date(),
        cultureFitScore: 0,
        professionalismScore: 0,
        communicationScore: 0,
        riskLevel: "unknown",
        sentimentAnalysis: { positive: 0, negative: 0, neutral: 0 },
        topicsIdentified: [],
        aiSummary: "Analysis in progress. Twitter profile being analyzed.",
        humanReviewStatus: "pending",
        analysisVersion: "groq-llama-3.3-70b",
        processingTimeMs: 0,
        tokensUsed: 0
      },
      {
        tenantId: tenantId,
        candidateId: chloeCandidate.id,
        screeningStatus: "completed",
        platformsAnalyzed: ["facebook", "twitter"],
        totalPostsAnalyzed: 234,
        dateRangeStart: new Date(Date.now() - 1000 * 60 * 60 * 24 * 180),
        dateRangeEnd: new Date(),
        cultureFitScore: 94,
        professionalismScore: 96,
        communicationScore: 92,
        riskLevel: "low",
        sentimentAnalysis: { positive: 78, negative: 5, neutral: 17 },
        topicsIdentified: ["python", "backend", "leadership", "mentorship", "conferences", "diversity_in_tech"],
        redFlags: [],
        positiveIndicators: [
          { type: "thought_leadership", description: "Conference speaker and community leader", evidence: "Speaking engagements" },
          { type: "mentorship", description: "Active mentor in tech community", evidence: "Mentorship posts" },
          { type: "diversity_advocate", description: "Supports diversity in tech", evidence: "D&I content" }
        ],
        culturalAlignmentFactors: {
          values: ["leadership", "mentorship", "diversity", "excellence"],
          interests: ["public_speaking", "open_source", "community_building"],
          behavior: ["inspirational", "supportive", "professional"]
        },
        aiSummary: "Chloe exhibits exceptional professional presence with strong thought leadership and mentorship activities. Her advocacy for diversity in tech and active conference participation demonstrate outstanding cultural alignment. Highly recommended.",
        aiRecommendation: "proceed",
        aiConfidence: 96,
        humanReviewStatus: "approved",
        humanReviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
        humanReviewNotes: "Outstanding candidate. Verified speaker at multiple conferences.",
        analysisVersion: "groq-llama-3.3-70b",
        processingTimeMs: 6200,
        tokensUsed: 12000
      }
    ]).returning();
    console.log(`✓ Created ${findingRecords.length} social screening findings`);

    // Social Screening Posts (sample posts that were analyzed)
    console.log("Creating social screening posts...");
    const siphoFinding = findingRecords.find(f => f.candidateId === siphoCandidate.id)!;
    const leratoFinding = findingRecords.find(f => f.candidateId === leratoCandidate.id)!;
    const chloeFinding = findingRecords.find(f => f.candidateId === chloeCandidate.id)!;

    const postRecords = await db.insert(socialScreeningPosts).values([
      {
        tenantId: tenantId,
        findingId: siphoFinding.id,
        platform: "twitter",
        postDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
        contentType: "text",
        contentSummary: "Shared excitement about learning new cloud technologies and completing AWS certification",
        sentiment: "positive",
        relevanceScore: 85,
        flagged: 0,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 85)
      },
      {
        tenantId: tenantId,
        findingId: siphoFinding.id,
        platform: "twitter",
        postDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12),
        contentType: "text",
        contentSummary: "Discussed best practices for microservices architecture with other developers",
        sentiment: "positive",
        relevanceScore: 90,
        flagged: 0,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 78)
      },
      {
        tenantId: tenantId,
        findingId: siphoFinding.id,
        platform: "facebook",
        postDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20),
        contentType: "text",
        contentSummary: "Celebrated team achievement after successful product launch",
        sentiment: "positive",
        relevanceScore: 75,
        flagged: 0,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 70)
      },
      {
        tenantId: tenantId,
        findingId: leratoFinding.id,
        platform: "twitter",
        postDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
        contentType: "text",
        contentSummary: "Shared insights from attending local JavaScript meetup",
        sentiment: "positive",
        relevanceScore: 80,
        flagged: 0,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 87)
      },
      {
        tenantId: tenantId,
        findingId: leratoFinding.id,
        platform: "twitter",
        postDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8),
        contentType: "text",
        contentSummary: "Posted about debugging a complex TypeScript issue with helpful solution",
        sentiment: "neutral",
        relevanceScore: 85,
        flagged: 0,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 82)
      },
      {
        tenantId: tenantId,
        findingId: chloeFinding.id,
        platform: "twitter",
        postDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
        contentType: "text",
        contentSummary: "Announced upcoming conference talk on Python best practices",
        sentiment: "positive",
        relevanceScore: 95,
        flagged: 0,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 88)
      },
      {
        tenantId: tenantId,
        findingId: chloeFinding.id,
        platform: "twitter",
        postDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15),
        contentType: "text",
        contentSummary: "Shared article about mentoring junior developers with personal insights",
        sentiment: "positive",
        relevanceScore: 90,
        flagged: 0,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 75)
      },
      {
        tenantId: tenantId,
        findingId: chloeFinding.id,
        platform: "facebook",
        postDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
        contentType: "text",
        contentSummary: "Posted about diversity in tech event she organized",
        sentiment: "positive",
        relevanceScore: 88,
        flagged: 0,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60)
      }
    ]).returning();
    console.log(`✓ Created ${postRecords.length} social screening posts`);

    console.log("\n✅ Database seeded successfully!");
    console.log("\nSummary:");
    console.log(`- ${userRecords.length} users`);
    console.log(`- ${jobRecords.length} jobs`);
    console.log(`- ${candidateRecords.length} candidates`);
    console.log(`- ${conversationRecords.length} WhatsApp conversations with messages, documents, and appointments`);
    console.log(`- ${consentRecords.length} social screening consents`);
    console.log(`- ${profileRecords.length} social profiles`);
    console.log(`- ${findingRecords.length} social screening findings`);
    console.log(`- ${postRecords.length} social screening posts`);
    
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

seedDatabase()
  .then(() => {
    console.log("\n🎉 Seed complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Seed failed:", error);
    process.exit(1);
  });
