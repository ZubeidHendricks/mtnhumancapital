import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import type { User } from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = "7d";
const SALT_ROUNDS = 10;

export interface AuthTokenPayload {
  userId: string;
  tenantId: string | null;
  role: string;
  isSuperAdmin: boolean;
}

export class AuthService {
  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Verify a password against a hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate a JWT token for a user
   */
  generateToken(user: User): string {
    const payload: AuthTokenPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin === 1,
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
  }

  /**
   * Verify and decode a JWT token
   */
  verifyToken(token: string): AuthTokenPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
      return decoded;
    } catch (error) {
      console.error("Token verification failed:", error);
      return null;
    }
  }

  /**
   * Register a new user
   */
  async register(
    tenantId: string,
    username: string,
    password: string,
    role: string = "user"
  ): Promise<{ user: User; token: string }> {
    // Check if user already exists
    const existingUser = await storage.getUserByUsername(tenantId, username);
    if (existingUser) {
      throw new Error("Username already exists");
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Create user
    const user = await storage.createUser(tenantId, {
      username,
      password: hashedPassword,
      role,
      isSuperAdmin: 0,
    });

    // Generate token
    const token = this.generateToken(user);

    return { user, token };
  }

  /**
   * Login a user - looks up by username across all tenants
   */
  async loginByUsername(
    username: string,
    password: string
  ): Promise<{ user: User; token: string } | null> {
    // Find user by username only (across all tenants)
    const user = await storage.getUserByUsernameOnly(username);
    if (!user) {
      return null;
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(password, user.password);
    if (!isValidPassword) {
      return null;
    }

    // Generate token
    const token = this.generateToken(user);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword as User, token };
  }

  /**
   * Login a user (original method - kept for compatibility)
   */
  async login(
    tenantId: string,
    username: string,
    password: string
  ): Promise<{ user: User; token: string } | null> {
    // Find user
    const user = await storage.getUserByUsername(tenantId, username);
    if (!user) {
      return null;
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(password, user.password);
    if (!isValidPassword) {
      return null;
    }

    // Generate token
    const token = this.generateToken(user);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword as User, token };
  }

  /**
   * Get user from token
   */
  async getUserFromToken(token: string): Promise<User | null> {
    const payload = this.verifyToken(token);
    if (!payload) {
      return null;
    }

    const user = await storage.getUser(payload.userId);
    return user || null;
  }

  /**
   * Refresh token
   */
  async refreshToken(token: string): Promise<string | null> {
    const user = await this.getUserFromToken(token);
    if (!user) {
      return null;
    }

    return this.generateToken(user);
  }
}

export const authService = new AuthService();
