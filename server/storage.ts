import { 
  type User, 
  type InsertUser, 
  type Job, 
  type InsertJob,
  type Candidate,
  type InsertCandidate,
  type IntegrityCheck,
  type InsertIntegrityCheck,
  type RecruitmentSession,
  type InsertRecruitmentSession,
  users,
  jobs,
  candidates,
  integrityChecks,
  recruitmentSessions
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAllJobs(): Promise<Job[]>;
  getJob(id: string): Promise<Job | undefined>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: string, job: Partial<InsertJob>): Promise<Job | undefined>;
  deleteJob(id: string): Promise<boolean>;
  
  getAllCandidates(): Promise<Candidate[]>;
  getCandidate(id: string): Promise<Candidate | undefined>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  updateCandidate(id: string, candidate: Partial<InsertCandidate>): Promise<Candidate | undefined>;
  deleteCandidate(id: string): Promise<boolean>;
  
  getAllIntegrityChecks(): Promise<IntegrityCheck[]>;
  getIntegrityCheck(id: string): Promise<IntegrityCheck | undefined>;
  getIntegrityChecksByCandidateId(candidateId: string): Promise<IntegrityCheck[]>;
  createIntegrityCheck(check: InsertIntegrityCheck): Promise<IntegrityCheck>;
  updateIntegrityCheck(id: string, check: Partial<InsertIntegrityCheck>): Promise<IntegrityCheck | undefined>;
  deleteIntegrityCheck(id: string): Promise<boolean>;
  
  getAllRecruitmentSessions(): Promise<RecruitmentSession[]>;
  getRecruitmentSession(id: string): Promise<RecruitmentSession | undefined>;
  getRecruitmentSessionsByJobId(jobId: string): Promise<RecruitmentSession[]>;
  createRecruitmentSession(session: InsertRecruitmentSession): Promise<RecruitmentSession>;
  updateRecruitmentSession(id: string, session: Partial<InsertRecruitmentSession>): Promise<RecruitmentSession | undefined>;
  deleteRecruitmentSession(id: string): Promise<boolean>;
  getJobById(id: string): Promise<Job | undefined>;
  getCandidateById(id: string): Promise<Candidate | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllJobs(): Promise<Job[]> {
    return await db.select().from(jobs).orderBy(desc(jobs.createdAt));
  }

  async getJob(id: string): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job || undefined;
  }

  async createJob(insertJob: InsertJob): Promise<Job> {
    const [job] = await db
      .insert(jobs)
      .values(insertJob)
      .returning();
    return job;
  }

  async updateJob(id: string, updates: Partial<InsertJob>): Promise<Job | undefined> {
    const [job] = await db
      .update(jobs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(jobs.id, id))
      .returning();
    return job || undefined;
  }

  async deleteJob(id: string): Promise<boolean> {
    const result = await db.delete(jobs).where(eq(jobs.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getAllCandidates(): Promise<Candidate[]> {
    return await db.select().from(candidates).orderBy(desc(candidates.createdAt));
  }

  async getCandidate(id: string): Promise<Candidate | undefined> {
    const [candidate] = await db.select().from(candidates).where(eq(candidates.id, id));
    return candidate || undefined;
  }

  async createCandidate(insertCandidate: InsertCandidate): Promise<Candidate> {
    const [candidate] = await db
      .insert(candidates)
      .values(insertCandidate)
      .returning();
    return candidate;
  }

  async updateCandidate(id: string, updates: Partial<InsertCandidate>): Promise<Candidate | undefined> {
    const [candidate] = await db
      .update(candidates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(candidates.id, id))
      .returning();
    return candidate || undefined;
  }

  async deleteCandidate(id: string): Promise<boolean> {
    const result = await db.delete(candidates).where(eq(candidates.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getAllIntegrityChecks(): Promise<IntegrityCheck[]> {
    return await db.select().from(integrityChecks).orderBy(desc(integrityChecks.createdAt));
  }

  async getIntegrityCheck(id: string): Promise<IntegrityCheck | undefined> {
    const [check] = await db.select().from(integrityChecks).where(eq(integrityChecks.id, id));
    return check || undefined;
  }

  async getIntegrityChecksByCandidateId(candidateId: string): Promise<IntegrityCheck[]> {
    return await db.select().from(integrityChecks).where(eq(integrityChecks.candidateId, candidateId)).orderBy(desc(integrityChecks.createdAt));
  }

  async createIntegrityCheck(insertCheck: InsertIntegrityCheck): Promise<IntegrityCheck> {
    const [check] = await db
      .insert(integrityChecks)
      .values(insertCheck)
      .returning();
    return check;
  }

  async updateIntegrityCheck(id: string, updates: Partial<InsertIntegrityCheck>): Promise<IntegrityCheck | undefined> {
    const [check] = await db
      .update(integrityChecks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(integrityChecks.id, id))
      .returning();
    return check || undefined;
  }

  async deleteIntegrityCheck(id: string): Promise<boolean> {
    const result = await db.delete(integrityChecks).where(eq(integrityChecks.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getAllRecruitmentSessions(): Promise<RecruitmentSession[]> {
    return await db.select().from(recruitmentSessions).orderBy(desc(recruitmentSessions.createdAt));
  }

  async getRecruitmentSession(id: string): Promise<RecruitmentSession | undefined> {
    const [session] = await db.select().from(recruitmentSessions).where(eq(recruitmentSessions.id, id));
    return session || undefined;
  }

  async getRecruitmentSessionsByJobId(jobId: string): Promise<RecruitmentSession[]> {
    return await db.select().from(recruitmentSessions).where(eq(recruitmentSessions.jobId, jobId)).orderBy(desc(recruitmentSessions.createdAt));
  }

  async createRecruitmentSession(insertSession: InsertRecruitmentSession): Promise<RecruitmentSession> {
    const [session] = await db
      .insert(recruitmentSessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async updateRecruitmentSession(id: string, updates: Partial<InsertRecruitmentSession>): Promise<RecruitmentSession | undefined> {
    const [session] = await db
      .update(recruitmentSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(recruitmentSessions.id, id))
      .returning();
    return session || undefined;
  }

  async deleteRecruitmentSession(id: string): Promise<boolean> {
    const result = await db.delete(recruitmentSessions).where(eq(recruitmentSessions.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getJobById(id: string): Promise<Job | undefined> {
    return this.getJob(id);
  }

  async getCandidateById(id: string): Promise<Candidate | undefined> {
    return this.getCandidate(id);
  }
}

export const storage = new DatabaseStorage();
