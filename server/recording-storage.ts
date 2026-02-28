import { Client } from "@replit/object-storage";

const client = new Client();

const BUCKET_PREFIX = "recordings";

function buildKey(tenantId: string, sessionId: string, filename: string): string {
  return `${BUCKET_PREFIX}/${tenantId}/${sessionId}/${filename}`;
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
    await client.uploadFromBytes(key, buffer);
    return { key, size: buffer.length };
  },

  async downloadRecording(key: string): Promise<Buffer> {
    const { value } = await client.downloadAsBytes(key);
    if (!value) throw new Error(`Recording not found: ${key}`);
    return Buffer.from(value as unknown as ArrayBuffer);
  },

  async exists(key: string): Promise<boolean> {
    try {
      const { value } = await client.downloadAsBytes(key);
      return !!value;
    } catch {
      return false;
    }
  },

  async deleteRecording(key: string): Promise<void> {
    await client.delete(key);
  },
};
