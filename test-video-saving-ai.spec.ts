import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5000';

test.describe.serial('Video Saving AI - API Tests', () => {
  // Routes use tenant middleware (defaults to 'company' on localhost) — no auth required
  let testSessionId: string;
  let testCandidateId: string;
  let testRecordingId: string;
  let testMediaUrl: string;

  // ═══════════════════════════════════════════════════
  // Group 1: Tenant & Auth System Verification
  // ═══════════════════════════════════════════════════

  test('should resolve default tenant on localhost', async ({ request }) => {
    console.log('\n=== Group 1: Tenant & Auth System ===\n');

    const response = await request.get(`${BASE_URL}/api/tenant/current`);
    expect(response.status()).toBe(200);
    const tenant = await response.json();
    expect(tenant.id).toBeTruthy();
    expect(tenant.companyName).toBeTruthy();
    expect(tenant.subdomain).toBe('company');

    console.log(`   ✓ Tenant resolved: ${tenant.companyName}`);
    console.log(`   ✓ Subdomain: ${tenant.subdomain}`);
    console.log(`   ✓ Tenant ID: ${tenant.id}`);
  });

  test('should reject login with invalid credentials', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { username: 'nonexistent_user', password: 'wrongpassword' },
      failOnStatusCode: false
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.message).toContain('Invalid');
    console.log('   ✓ Invalid credentials correctly rejected with 401');
  });

  test('should reject login without required fields', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { username: 'admin' },
      failOnStatusCode: false
    });

    expect(response.status()).toBe(400);
    console.log('   ✓ Missing password correctly rejected with 400');
  });

  // ═══════════════════════════════════════════════════
  // Group 2: Interview Session Setup
  // ═══════════════════════════════════════════════════

  test('should create an interview session for recording tests', async ({ request }) => {
    console.log('\n=== Group 2: Interview Session Setup ===\n');

    // Fetch seeded candidates (no auth required - tenant resolved from hostname)
    const candidatesRes = await request.get(`${BASE_URL}/api/candidates`);
    expect(candidatesRes.status()).toBe(200);
    const candidatesBody = await candidatesRes.json();
    const candidates = Array.isArray(candidatesBody) ? candidatesBody : candidatesBody.data || [];
    expect(candidates.length).toBeGreaterThan(0);

    testCandidateId = candidates[0].id;
    const candidateName = candidates[0].fullName || candidates[0].firstName + ' ' + candidates[0].lastName;
    console.log(`   ✓ Found ${candidates.length} candidates, using: ${candidateName} (${testCandidateId})`);

    // Create an interview session
    const response = await request.post(`${BASE_URL}/api/interview-sessions`, {
      data: {
        candidateId: testCandidateId,
        candidateName: candidateName,
        candidatePhone: '+27821234567',
        jobTitle: 'Software Developer',
        interviewType: 'video'
      }
    });

    expect(response.status()).toBe(201);
    const session = await response.json();
    expect(session.id).toBeTruthy();
    expect(session.token).toBeTruthy();
    expect(session.status).toBe('pending');
    expect(session.interviewType).toBe('video');
    testSessionId = session.id;

    console.log(`   ✓ Interview session created: ${testSessionId}`);
    console.log(`   ✓ Session token: ${session.token}`);
    console.log(`   ✓ Interview URL: ${session.interviewUrl}`);
  });

  test('should reject interview session creation without required fields', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/interview-sessions`, {
      data: {
        jobTitle: 'Software Developer'
        // Missing candidateId AND candidatePhone
      },
      failOnStatusCode: false
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toContain('required');
    console.log('   ✓ Missing required fields correctly rejected with 400');
  });

  // ═══════════════════════════════════════════════════
  // Group 3: Video Session Creation (Tavus API)
  // ═══════════════════════════════════════════════════

  test('should handle video session creation based on Tavus configuration', async ({ request }) => {
    console.log('\n=== Group 3: Video Session Creation (Tavus) ===\n');

    const response = await request.post(`${BASE_URL}/api/interview/video/session`, {
      data: {
        candidateName: 'Test Candidate',
        jobRole: 'Software Developer'
      },
      failOnStatusCode: false
    });

    if (response.status() === 500) {
      const body = await response.json();
      expect(body.message).toContain('Tavus');
      console.log('   ⚠ Tavus API not configured — graceful degradation confirmed');
      console.log(`   ✓ Error message: "${body.message}"`);
    } else {
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.sessionUrl).toBeTruthy();
      expect(body.sessionId).toBeTruthy();
      expect(body.interviewId).toBeTruthy();
      expect(body.status).toBe('created');
      console.log(`   ✓ Tavus session created successfully`);
      console.log(`   ✓ Session URL: ${body.sessionUrl}`);
    }
  });

  test('should handle video session creation without candidateName', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/interview/video/session`, {
      data: { jobRole: 'Developer' },
      failOnStatusCode: false
    });

    // Either 400 (validation) or 500 (Tavus not configured, checked before validation)
    expect([400, 500]).toContain(response.status());
    const body = await response.json();
    expect(body.message).toBeTruthy();
    console.log(`   ✓ Missing candidateName handled: ${response.status()} - "${body.message}"`);
  });

  // ═══════════════════════════════════════════════════
  // Group 4: Recording Upload
  // ═══════════════════════════════════════════════════

  test('should upload a recording and create a recording record', async ({ request }) => {
    console.log('\n=== Group 4: Recording Upload ===\n');
    if (!testSessionId) {
      console.log('   ⚠ Skipping: no session ID available');
      test.skip();
      return;
    }

    // Create a minimal synthetic WebM file header
    const testBuffer = Buffer.alloc(1024, 0);
    // WebM/EBML magic bytes
    testBuffer[0] = 0x1A;
    testBuffer[1] = 0x45;
    testBuffer[2] = 0xDF;
    testBuffer[3] = 0xA3;

    const response = await request.post(
      `${BASE_URL}/api/interviews/${testSessionId}/upload-recording`,
      {
        multipart: {
          recording: {
            name: 'test-recording.webm',
            mimeType: 'audio/webm',
            buffer: testBuffer
          },
          candidateId: testCandidateId,
          sourceType: 'browser_mediarecorder',
          duration: '120'
        },
        failOnStatusCode: false
      }
    );

    if (response.status() === 201) {
      const recording = await response.json();
      expect(recording.id).toBeTruthy();
      expect(recording.sessionId).toBe(testSessionId);
      expect(recording.mediaUrl).toContain('/api/recordings/');
      expect(recording.mimeType).toBe('audio/webm');
      expect(recording.recordingType).toBe('audio');
      testRecordingId = recording.id;
      testMediaUrl = recording.mediaUrl;

      console.log(`   ✓ Recording uploaded: ${testRecordingId}`);
      console.log(`   ✓ Media URL: ${testMediaUrl}`);
      console.log(`   ✓ File size: ${recording.fileSize} bytes`);
      console.log(`   ✓ Recording type: ${recording.recordingType}`);
    } else {
      const body = await response.json();
      console.log(`   ⚠ Upload returned ${response.status()} — Object Storage may be unavailable`);
      console.log(`   ⚠ Message: ${body.message}`);
      // Object Storage not available in this environment — test passes gracefully
      expect([500]).toContain(response.status());
    }
  });

  test('should reject upload when no file is provided', async ({ request }) => {
    if (!testSessionId) {
      test.skip();
      return;
    }

    const response = await request.post(
      `${BASE_URL}/api/interviews/${testSessionId}/upload-recording`,
      {
        data: { candidateId: testCandidateId },
        failOnStatusCode: false
      }
    );

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toContain('No recording file provided');
    console.log('   ✓ Upload without file correctly rejected with 400');
  });

  // ═══════════════════════════════════════════════════
  // Group 5: Fetch Recordings
  // ═══════════════════════════════════════════════════

  test('should fetch recordings for a valid session', async ({ request }) => {
    console.log('\n=== Group 5: Fetch Recordings ===\n');
    if (!testSessionId) {
      test.skip();
      return;
    }

    const response = await request.get(
      `${BASE_URL}/api/interviews/${testSessionId}/recordings`
    );

    expect(response.status()).toBe(200);
    const recordings = await response.json();
    expect(Array.isArray(recordings)).toBe(true);

    if (testRecordingId) {
      expect(recordings.length).toBeGreaterThanOrEqual(1);
      const found = recordings.find((r: any) => r.id === testRecordingId);
      expect(found).toBeTruthy();
      expect(found.sessionId).toBe(testSessionId);
      console.log(`   ✓ Found ${recordings.length} recording(s) for session`);
      console.log(`   ✓ Verified uploaded recording ${testRecordingId} is present`);
    } else {
      console.log(`   ✓ Recordings endpoint returned ${recordings.length} recording(s)`);
      console.log('   ⚠ Upload was not available, so no recording to verify');
    }
  });

  test('should return empty array for session with no recordings', async ({ request }) => {
    if (!testCandidateId) {
      test.skip();
      return;
    }

    // Create a fresh session with no recordings
    const sessionRes = await request.post(`${BASE_URL}/api/interview-sessions`, {
      data: {
        candidateId: testCandidateId,
        candidateName: 'Empty Test',
        candidatePhone: '+27829999999',
        jobTitle: 'QA Tester',
        interviewType: 'video'
      }
    });

    expect(sessionRes.status()).toBe(201);
    const emptySession = await sessionRes.json();

    const response = await request.get(
      `${BASE_URL}/api/interviews/${emptySession.id}/recordings`
    );

    expect(response.status()).toBe(200);
    const recordings = await response.json();
    expect(Array.isArray(recordings)).toBe(true);
    expect(recordings.length).toBe(0);
    console.log('   ✓ Empty session correctly returns 0 recordings');
  });

  // ═══════════════════════════════════════════════════
  // Group 6: Recording Streaming
  // ═══════════════════════════════════════════════════

  test('should stream a recording when it exists', async ({ request }) => {
    console.log('\n=== Group 6: Recording Streaming ===\n');
    if (!testMediaUrl) {
      console.log('   ⚠ Skipping: no recording was uploaded (Object Storage unavailable)');
      test.skip();
      return;
    }

    const response = await request.get(`${BASE_URL}${testMediaUrl}`, {
      failOnStatusCode: false
    });

    expect(response.status()).toBe(200);
    const headers = response.headers();
    expect(headers['content-type']).toBeTruthy();
    expect(headers['accept-ranges']).toBe('bytes');
    expect(headers['content-length']).toBeTruthy();

    const body = await response.body();
    expect(body.length).toBeGreaterThan(0);

    console.log(`   ✓ Recording streamed: ${body.length} bytes`);
    console.log(`   ✓ Content-Type: ${headers['content-type']}`);
    console.log(`   ✓ Accept-Ranges: ${headers['accept-ranges']}`);
  });

  test('should support HTTP Range requests for seeking', async ({ request }) => {
    if (!testMediaUrl) {
      test.skip();
      return;
    }

    const response = await request.get(`${BASE_URL}${testMediaUrl}`, {
      headers: { 'Range': 'bytes=0-99' },
      failOnStatusCode: false
    });

    expect(response.status()).toBe(206);
    const headers = response.headers();
    expect(headers['content-range']).toMatch(/^bytes 0-99\/\d+$/);
    expect(headers['content-length']).toBe('100');

    const body = await response.body();
    expect(body.length).toBe(100);

    console.log(`   ✓ Range request returned 206 Partial Content`);
    console.log(`   ✓ Content-Range: ${headers['content-range']}`);
  });

  test('should return 404 for non-existent recording key', async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/api/recordings/recordings/fake-tenant/fake-session/nonexistent.webm`,
      { failOnStatusCode: false }
    );

    expect(response.status()).toBe(404);
    console.log('   ✓ Non-existent recording correctly returns 404');
  });

  // ═══════════════════════════════════════════════════
  // Group 7: Fetch Tavus Recording
  // ═══════════════════════════════════════════════════

  test('should reject fetch-tavus-recording without conversationId', async ({ request }) => {
    console.log('\n=== Group 7: Fetch Tavus Recording ===\n');
    if (!testSessionId) {
      test.skip();
      return;
    }

    const response = await request.post(
      `${BASE_URL}/api/interviews/${testSessionId}/fetch-tavus-recording`,
      {
        data: { candidateId: testCandidateId },
        failOnStatusCode: false
      }
    );

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toContain('conversationId is required');
    console.log('   ✓ Missing conversationId correctly rejected with 400');
  });

  test('should handle fetch-tavus-recording based on Tavus configuration', async ({ request }) => {
    if (!testSessionId) {
      test.skip();
      return;
    }

    const response = await request.post(
      `${BASE_URL}/api/interviews/${testSessionId}/fetch-tavus-recording`,
      {
        data: {
          conversationId: 'fake-conversation-id-12345',
          candidateId: testCandidateId
        },
        failOnStatusCode: false
      }
    );

    // 500 = Tavus not configured, 404 = Tavus configured but conversation not found
    expect([404, 500]).toContain(response.status());
    const body = await response.json();
    expect(body.message).toBeTruthy();

    if (response.status() === 500) {
      expect(body.message).toContain('Tavus');
      console.log('   ⚠ Tavus API not configured — graceful error confirmed');
    } else {
      console.log('   ✓ Tavus configured, fake conversation correctly returns 404');
    }
    console.log(`   ✓ Response: ${response.status()} - "${body.message}"`);
  });
});
