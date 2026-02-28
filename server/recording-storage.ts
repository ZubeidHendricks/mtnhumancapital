import { Client } from "@replit/object-storage";

let client: Client | null = null;

function getClient(): Client {
  if (!client) {
    client = new Client();
  }
  return client;
}

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
    await getClient().uploadFromBytes(key, buffer);
    return { key, size: buffer.length };
  },

  async downloadRecording(key: string): Promise<Buffer> {
    const { value } = await getClient().downloadAsBytes(key);
    if (!value) throw new Error(`Recording not found: ${key}`);
    return Buffer.from(value as unknown as ArrayBuffer);
  },

  async exists(key: string): Promise<boolean> {
    try {
      const { value } = await getClient().downloadAsBytes(key);
      return !!value;
    } catch {
      return false;
    }
  },

  async deleteRecording(key: string): Promise<void> {
    await getClient().delete(key);
  },
};
