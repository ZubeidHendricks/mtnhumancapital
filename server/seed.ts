import { db } from "./db";
import { users, jobs, candidates } from "@shared/schema";

async function seedDatabase() {
  console.log("🌱 Starting database seed...");

  try {
    console.log("Clearing existing data...");
    await db.delete(candidates);
    await db.delete(jobs);
    await db.delete(users);

    console.log("Creating users...");
    const userRecords = await db.insert(users).values([
      {
        username: "admin",
        password: "admin123"
      },
      {
        username: "hr_manager",
        password: "hr123"
      },
      {
        username: "recruiter",
        password: "recruiter123"
      }
    ]).returning();

    console.log(`✓ Created ${userRecords.length} users`);

    console.log("Creating job postings...");
    const jobRecords = await db.insert(jobs).values([
      {
        title: "Senior Backend Developer",
        department: "Engineering",
        location: "Gauteng",
        salaryMin: 650000,
        salaryMax: 850000,
        description: "We're seeking an experienced Backend Developer to join our growing engineering team. You'll work on scalable microservices architecture using Node.js, Python, and PostgreSQL. Requirements: 5+ years experience, Node.js, Python, PostgreSQL, Redis, microservices. Benefits: Medical aid, provident fund, remote work.",
        status: "Active"
      },
      {
        title: "Frontend React Developer",
        department: "Engineering",
        location: "Western Cape",
        salaryMin: 550000,
        salaryMax: 750000,
        description: "Join our product team to build beautiful, responsive user interfaces using React, TypeScript, and modern CSS frameworks. Requirements: 3+ years React, TypeScript, Tailwind CSS, state management. Benefits: Medical aid, hybrid work, learning stipend.",
        status: "Active"
      },
      {
        title: "DevOps Engineer",
        department: "Infrastructure",
        location: "Gauteng",
        salaryMin: 700000,
        salaryMax: 950000,
        description: "We need a talented DevOps Engineer to manage our cloud infrastructure, CI/CD pipelines, and ensure system reliability. Requirements: 4+ years DevOps, AWS/Azure, Kubernetes, Docker, Terraform. Benefits: Medical aid, certifications, flexible hours.",
        status: "Active"
      },
      {
        title: "Product Manager",
        department: "Product",
        location: "Western Cape",
        salaryMin: 800000,
        salaryMax: 1100000,
        description: "Lead product strategy and execution for our AI-powered HR platform. Work with engineering, design, and business teams to deliver exceptional products. Requirements: 5+ years PM experience, SaaS background, analytical skills. Benefits: Medical aid, equity, remote work.",
        status: "Active"
      },
      {
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

    console.log("\n✅ Database seeded successfully!");
    console.log("\nSummary:");
    console.log(`- ${userRecords.length} users`);
    console.log(`- ${jobRecords.length} jobs`);
    console.log(`- ${candidateRecords.length} candidates`);
    
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
