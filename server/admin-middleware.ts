import { Request, Response, NextFunction } from "express";

/**
 * Middleware to ensure only platform admins can access certain routes
 * 
 * Uses bearer token authentication with ADMIN_API_KEY environment variable
 * 
 * Usage: 
 * - Set ADMIN_API_KEY environment variable to a secure random token
 * - Include "Authorization: Bearer <ADMIN_API_KEY>" header in requests
 * 
 * TODO: Integrate with proper user authentication system once implemented
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const adminApiKey = process.env.ADMIN_API_KEY;
  
  // If no admin key is configured, deny access in production, warn in development
  if (!adminApiKey) {
    if (process.env.NODE_ENV === "production") {
      return res.status(500).json({ 
        message: "Server configuration error: Admin authentication not configured" 
      });
    } else {
      console.warn("⚠️  WARNING: ADMIN_API_KEY not set - allowing admin access in development mode");
      console.warn("⚠️  Set ADMIN_API_KEY environment variable for production deployment");
      return next();
    }
  }
  
  // Check Authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ 
      message: "Unauthorized: Missing or invalid authorization header" 
    });
  }
  
  const token = authHeader.substring(7); // Remove "Bearer " prefix
  
  if (token !== adminApiKey) {
    return res.status(403).json({ 
      message: "Forbidden: Invalid admin credentials" 
    });
  }
  
  // Authorization successful
  next();
}
