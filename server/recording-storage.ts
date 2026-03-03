import fs from "fs";
import path from "path";

const RECORDINGS_DIR = path.join(process.cwd(), "uploads", "recordings");

// Ensure directory exists on startup
if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}

function buildPath(tenantId: string, sessionId: string, filename: string): string {
  const dir = path.join(RECORDINGS_DIR, tenantId, sessionId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, filename);
}

function buildKey(tenantId: string, sessionId: string, filename: string): string {
  return `${tenantId}/${sessionId}/${filename}`;
}

export const recordingStorage = {
  async uploadRecording(
    tenantId: string,
    sessionId: string,
    filename: string,
    buffer: Buffer,
    _mimeType: string
  ): Promise<{ key: string; size: number }> {
    const key = buildKey(tenantId, sessionId, filename);
    const filePath = buildPath(tenantId, sessionId, filename);
    fs.writeFileSync(filePath, buffer);
    return { key, size: buffer.length };
  },

  async downloadRecording(key: string): Promise<Buffer> {
    const filePath = path.join(RECORDINGS_DIR, key);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Recording not found: ${key}`);
    }
    return fs.readFileSync(filePath);
  },

  async exists(key: string): Promise<boolean> {
    const filePath = path.join(RECORDINGS_DIR, key);
    return fs.existsSync(filePath);
  },

  async deleteRecording(key: string): Promise<void> {
    const filePath = path.join(RECORDINGS_DIR, key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  },
};
