const XLSX = require('xlsx');

const wb = XLSX.utils.book_new();

// ===== SHEET 1: Executive Summary =====
const summaryData = [
  ['MTN Human Capital - Feature Status Report'],
  ['Date: 23 February 2026'],
  [''],
  ['#', 'Feature', 'Status', 'Readiness', 'Notes'],
  [1, 'HR Recruitment Process (Command Center Tabs)', 'Mostly Complete', '90%', '4 of 5 tabs fully wired to real data. Offer tab recently completed.'],
  [2, 'Drafting Job Description & Specifications', 'Complete', '95%', '3 AI-powered creation modes fully functional. Minor polish only.'],
  [3, 'Using Job Spec to Search / Head Hunt Candidates', 'Complete', '85%', 'Multi-platform AI sourcing working. Candidates are AI-simulated (acceptable for demo).'],
  [4, 'Shortlisting Candidates', 'Complete', '90%', 'Full shortlist workflow with match scoring and pipeline validation.'],
  [5, 'Interviewing Candidates', 'Partially Complete', '50%', 'Voice & video interview infrastructure works. "Charles" AI persona not yet created.'],
  [6, 'AI Bot as Charles conducting interviews', 'Outstanding', '20%', 'Requires voice samples & video of Charles to create custom AI persona.'],
  [7, 'Ranking & Rating candidate responses', 'Partially Complete', '70%', 'AI scoring engine works (5 dimensions). Comparison UI and dedicated ranking page needed.'],
  ['', '', '', '', ''],
  ['', 'OVERALL PLATFORM READINESS', '', '~72%', 'Core recruitment workflow functional end-to-end. Key gaps in AI persona and ranking display.'],
];

const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
summarySheet['!cols'] = [{ wch: 4 }, { wch: 50 }, { wch: 20 }, { wch: 12 }, { wch: 80 }];
summarySheet['!merges'] = [
  { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
  { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
];
XLSX.utils.book_append_sheet(wb, summarySheet, 'Executive Summary');

// ===== SHEET 2: Feature 1 - HR Recruitment Process (Tabs) =====
const f1Data = [
  ['Feature 1: HR Recruitment Process (Command Center Tabs)'],
  ['Status: MOSTLY COMPLETE (90% Ready)'],
  [''],
  ['The HR Dashboard is the main command center with 5 tabs: Jobs, Recruitment, Integrity, Offer, and Onboarding.'],
  [''],
  ['Tab', 'Status', 'Readiness', 'Details'],
  ['', '', '', ''],
  ['JOBS TAB', '', '', ''],
  ['Job List Display', 'Complete', '95%', 'Grid and list views showing all jobs with status, location, salary, and department'],
  ['Create New Job Button', 'Complete', '', 'Opens job creation dialog with 3 AI-powered modes (Research, Chat, Paste)'],
  ['Job Detail Cards', 'Complete', '', 'Full job information display with all extracted fields'],
  ['Full CRUD Operations', 'Complete', '', 'Create, read, update, delete jobs via real API calls'],
  ['Job Lifecycle', 'Complete', '', 'Close (with reason), reopen, archive, and restore job postings'],
  ['', '', '', ''],
  ['RECRUITMENT TAB', '', '', ''],
  ['Candidate Pipeline', 'Complete', '90%', 'Full pipeline management with stage transitions (Screening > Shortlisted > Interview > Offer > Hired)'],
  ['Real Candidate Data', 'Complete', '', 'All candidates fetched from database, no mock data'],
  ['Stage Transitions', 'Complete', '', 'Move candidates between stages with validation and audit trail'],
  ['AI Recruitment Launch', 'Complete', '', 'Launch AI sourcing agents directly from recruitment tab'],
  ['Candidate Cards', 'Complete', '', 'Display match scores, skills, contact info, and source badges'],
  ['', '', '', ''],
  ['INTEGRITY TAB', '', '', ''],
  ['Pending Verifications', 'Complete', '90%', 'Real integrity checks fetched from API with candidate name lookup'],
  ['Risk Assessment Overview', 'Complete', '', 'Live risk data via getCandidateRiskData() with culture fit and sentiment scores'],
  ['Auto-Navigate to Agent', 'Complete', '', 'Click candidate to open Integrity Agent with auto-start evaluation'],
  ['Social Screening Integration', 'Complete', '', 'Social Intelligence Screening banner with culture fit scoring'],
  ['URL Tab State', 'Complete', '', 'Direct URL access via /hr-dashboard?tab=integrity with proper back navigation'],
  ['Manual Integrity Verification', 'Complete', '', 'HR can manually trigger and review integrity evaluations'],
  ['Horizontal Workflow Pipeline', 'Complete', '', 'Redesigned layout showing integrity check stages visually'],
  ['Auto-Create on Pipeline Stage', 'Not Started', '', 'Integrity checks not auto-created when candidates reach integrity_checks pipeline stage'],
  ['', '', '', ''],
  ['OFFER TAB', '', '', ''],
  ['Offer CRUD Operations', 'Complete', '85%', 'Full-stack create, read, update operations wired to real database (completed 2026-02-20)'],
  ['Real Candidate Data', 'Complete', '', 'Fetches candidates at offer_pending pipeline stage, no more mock data'],
  ['Email with Attachments', 'Complete', '', 'Send offer emails with document attachments to candidates'],
  ['Pipeline Filters', 'Complete', '', 'Filter candidates by pipeline stage for offer management'],
  ['Offer Status Tracking', 'Complete', '', 'Track offer status: draft, sent, accepted, declined'],
  ['Document Generation', 'Complete', '', 'Generate offer letters, employment contracts, welcome letters, NDAs'],
  ['Offer Analytics/Reporting', 'Not Started', '', 'No offer acceptance rate dashboard or offer timeline tracking'],
  ['', '', '', ''],
  ['ONBOARDING TAB', '', '', ''],
  ['Real Workflow Data', 'Complete', '90%', 'Workflows fetched via API, no mock data (completed 2026-02-20)'],
  ['Employee Selector', 'Complete', '', 'Shows real candidates filtered by onboarding stage'],
  ['Send Onboarding Pack', 'Complete', '', 'Calls real API endpoint to trigger onboarding workflow with email sending'],
  ['Request IT Setup', 'Complete', '', 'Triggers IT provisioning via real API endpoint'],
  ['Status Badges', 'Complete', '', 'Real workflow status display (Pending / In Progress / Completed)'],
  ['Document Generation', 'Complete', '', 'Pre-fills candidate data for welcome letters, handbooks, etc.'],
  ['Expandable Details', 'Complete', '', 'Expandable workflow cards showing step details and progress'],
  ['Configurable Provisioning', 'Complete', '', 'Configurable IT setup, building access, and equipment provisioning'],
  ['Real Email Sending', 'Complete', '', 'Onboarding emails sent via Resend with document templates (completed 2026-02-21)'],
  ['Agent Activity Logs', 'Complete', '', 'Rich activity logs with document name and reminder count details'],
  ['Requirement Checkboxes to API', 'Not Started', '', 'IT/Access/Equipment checkboxes collected in UI but not sent to API'],
  ['Document Request Display', 'Not Started', '', 'API exists for per-workflow document requests but not displayed in UI'],
  ['Auto-Trigger on Pipeline Stage', 'Not Started', '', 'Onboarding not auto-triggered when candidates reach onboarding pipeline stage'],
];

const f1Sheet = XLSX.utils.aoa_to_sheet(f1Data);
f1Sheet['!cols'] = [{ wch: 35 }, { wch: 18 }, { wch: 12 }, { wch: 90 }];
f1Sheet['!merges'] = [
  { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
  { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
  { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } },
];
XLSX.utils.book_append_sheet(wb, f1Sheet, '1 - HR Recruitment Process');

// ===== SHEET 3: Feature 2 - Job Description =====
const f2Data = [
  ['Feature 2: Drafting a Job Description & Specifications'],
  ['Status: COMPLETE (95% Ready)'],
  [''],
  ['Item', 'Status', 'Details'],
  ['AI Research Mode', 'Complete', 'Enter job title and AI auto-generates full job spec using LLaMA 3.3 70B model'],
  ['AI Chat Mode', 'Complete', 'Conversational AI collects job details step-by-step through interactive dialogue'],
  ['Paste Spec Mode', 'Complete', 'Paste free-form text from any source and AI extracts structured data automatically'],
  ['Live Preview Panel', 'Complete', 'Real-time structured preview of extracted job data (duties, qualifications, salary, etc.)'],
  ['Edit & Refine', 'Complete', 'Full editing interface to manually adjust AI-extracted fields before saving'],
  ['Draft Saving', 'Complete', 'Save job specs as drafts before publishing'],
  ['Job Lifecycle Management', 'Complete', 'Create, edit, close (with reason), archive, and restore job postings'],
  ['SA-Context Awareness', 'Complete', 'Understands SA-specific requirements (truck licenses, ZAR salaries, local industry terms)'],
  ['PNET Auto-Posting', 'Complete', 'Background job posting to PNET (SA job board) with AI-generated screening questions'],
  ['Agent Assignment', 'Complete', 'Assign AI recruitment agents to specific jobs for sourcing'],
  ['', '', ''],
  ['Outstanding Items', '', ''],
  ['Job Spec File Upload (PDF/DOCX)', 'Not Started', 'Currently only supports pasted text, not file uploads for parsing'],
  ['Job Template Library', 'Not Started', 'No pre-built templates for common roles (nice-to-have)'],
  ['PNET End-to-End Verification', 'Not Verified', 'PNET API integration may have placeholder credentials'],
];

const f2Sheet = XLSX.utils.aoa_to_sheet(f2Data);
f2Sheet['!cols'] = [{ wch: 35 }, { wch: 18 }, { wch: 85 }];
f2Sheet['!merges'] = [
  { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
  { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
];
XLSX.utils.book_append_sheet(wb, f2Sheet, '2 - Job Descriptions');

// ===== SHEET 4: Feature 3 - Sourcing =====
const f3Data = [
  ['Feature 3: Using the Job Spec to Search / Head Hunt Candidates from Various Platforms'],
  ['Status: COMPLETE (85% Ready)'],
  [''],
  ['Item', 'Status', 'Details'],
  ['LinkedIn Specialist Agent', 'Complete', 'AI-powered sourcing generates realistic LinkedIn candidate profiles for SA market'],
  ['PNet Specialist Agent', 'Complete', 'Targets active job seekers on South Africa\'s largest job portal'],
  ['Indeed Specialist Agent', 'Complete', 'Broad candidate pool sourcing across diverse employment levels'],
  ['6-Step Recruitment Workflow', 'Complete', 'Visible pipeline: Job Analysis > Specialist Sourcing > AI Search > Screening > Ranking > Complete'],
  ['Real-Time Agent Activity Feed', 'Complete', '"AI Agents Working" modal shows live sourcing progress with agent-by-agent updates'],
  ['Top Matches Display', 'Complete', 'Candidate cards with match scores, skills, and contact information'],
  ['Contact Enrichment', 'Complete', '"AI Find Contact" button enriches candidate profiles with email and phone'],
  ['Platform Enable/Disable', 'Complete', 'Tenant-based configuration to enable/disable specific sourcing platforms'],
  ['External Candidate Import', 'Complete', 'Integration with WeFindjobs.co.za for bulk candidate import'],
  ['Recruitment Session History', 'Complete', 'Full audit trail of past sourcing sessions with results'],
  ['Job Spec Analysis', 'Complete', 'AI analyzes job spec to generate search criteria, boolean queries, and target companies'],
  ['Candidate Database Storage', 'Complete', 'All sourced candidates automatically saved with match scores and metadata'],
  ['', '', ''],
  ['Outstanding Items', '', ''],
  ['Real API Integrations', 'Not Started', 'LinkedIn, PNet, and Indeed use AI-simulated profiles, not live API calls. Acceptable for demo.'],
  ['GitHub/StackOverflow API', 'Not Started', 'Scraper infrastructure exists but no live API integration for developer sourcing'],
  ['Cross-Search Deduplication', 'Partial', 'Deduplication works within a session but not across multiple recruitment sessions'],
  ['ML-Based Scoring', 'Not Started', 'Match scoring is percentage-based; no machine learning model for advanced ranking'],
];

const f3Sheet = XLSX.utils.aoa_to_sheet(f3Data);
f3Sheet['!cols'] = [{ wch: 35 }, { wch: 18 }, { wch: 85 }];
f3Sheet['!merges'] = [
  { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
  { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
];
XLSX.utils.book_append_sheet(wb, f3Sheet, '3 - Candidate Sourcing');

// ===== SHEET 5: Feature 4 - Shortlisting =====
const f4Data = [
  ['Feature 4: Shortlisting the Candidates'],
  ['Status: COMPLETE (90% Ready)'],
  [''],
  ['Item', 'Status', 'Details'],
  ['Dedicated Shortlist Page', 'Complete', 'Full-page view at /shortlisted-candidates with search, filter, and candidate cards'],
  ['One-Click Shortlisting', 'Complete', 'Shortlist candidates directly from candidate list or recruitment agent results'],
  ['Remove from Shortlist', 'Complete', 'Remove candidates and move back to Screening stage'],
  ['Match Score Badges', 'Complete', 'Color-coded badges: Green (>=80%), Yellow (>=60%), Red (<60%)'],
  ['Pipeline Validation', 'Complete', 'Minimum 50% match score required to shortlist (enforced by backend)'],
  ['Stage History Audit Trail', 'Complete', 'Full record of all stage transitions with timestamps'],
  ['Source Tracking', 'Complete', 'Badges showing source: Recruited, Uploaded, LinkedIn, PNet, Indeed, etc.'],
  ['AI Interview Invite Button', 'Complete', 'Send voice/video interview invitations directly from shortlist page'],
  ['WhatsApp Integration', 'Complete', 'Send messages and reminders to shortlisted candidates via WhatsApp'],
  ['Kanban Pipeline Board', 'Complete', 'Drag-and-drop board showing all pipeline stages including Shortlisted'],
  ['', '', ''],
  ['Outstanding Items', '', ''],
  ['Sort by Match Score', 'Not Started', 'Shortlisted page does not sort by match score by default'],
  ['Bulk Shortlisting', 'Not Started', 'Can only shortlist one candidate at a time (minor for demo)'],
  ['Filter by Job/Department', 'Not Started', 'No job-specific filtering on shortlist page'],
];

const f4Sheet = XLSX.utils.aoa_to_sheet(f4Data);
f4Sheet['!cols'] = [{ wch: 35 }, { wch: 18 }, { wch: 85 }];
f4Sheet['!merges'] = [
  { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
  { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
];
XLSX.utils.book_append_sheet(wb, f4Sheet, '4 - Shortlisting');

// ===== SHEET 6: Feature 5 - Interviewing =====
const f5Data = [
  ['Feature 5: Interviewing the Candidates'],
  ['Status: PARTIALLY COMPLETE (50% Ready)'],
  [''],
  ['Item', 'Status', 'Details'],
  ['', '', ''],
  ['COMPLETE', '', ''],
  ['Voice Interview (Hume AI)', 'Complete', 'Real-time bidirectional audio streaming with emotion detection and live transcription'],
  ['Video Interview (Tavus AI)', 'Complete', 'Avatar-based video interview with iframe embedding and session management'],
  ['Interview Session Creation', 'Complete', 'Create sessions linked to candidates and jobs with unique tokens'],
  ['Email Interview Invites', 'Complete', 'Send interview invitation emails with secure token-based access links'],
  ['WhatsApp Interview Invites', 'Complete', 'Send interview invitations via WhatsApp messaging'],
  ['Interview Console (HR View)', 'Complete', 'HR review interface showing sessions, scores, transcripts, and decisions'],
  ['Emotion Tracking', 'Complete', 'Real-time emotion analysis from voice prosody during interviews'],
  ['Transcript Capture', 'Complete', 'Full transcription with speaker roles (user/AI) stored in database'],
  ['Interview Prompt Editor', 'Complete', 'HR can customise interview prompts before sending invites'],
  ['', '', ''],
  ['OUTSTANDING - CRITICAL', '', ''],
  ['"Charles" AI Persona - Voice', 'Not Started', 'Requires voice samples from Charles for ElevenLabs voice cloning. Currently uses generic AI voice.'],
  ['"Charles" AI Persona - Avatar', 'Not Started', 'Requires video recording of Charles for Tavus replica creation. Currently uses generic avatar.'],
  ['Persona Selection in UI', 'Not Started', 'No dropdown to select which AI persona conducts the interview. Hardcoded to defaults.'],
  ['Dynamic Interview Questions', 'Not Started', 'Questions are hardcoded. Need job-specific question generation from job spec.'],
  ['Public Interview Token Endpoints', 'Partial', 'Some endpoints for candidates to access interviews via links need verification/fixing'],
  ['', '', ''],
  ['OUTSTANDING - NICE TO HAVE', '', ''],
  ['Question Bank / Management UI', 'Not Started', 'No interface for HR to manage and select interview questions'],
  ['Interview Recording Playback', 'Not Started', 'Metadata stored but no audio/video player for reviewing recordings'],
  ['Face-to-Face Scheduling', 'Not Started', 'Page exists but uses mock data only'],
];

const f5Sheet = XLSX.utils.aoa_to_sheet(f5Data);
f5Sheet['!cols'] = [{ wch: 40 }, { wch: 18 }, { wch: 85 }];
f5Sheet['!merges'] = [
  { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
  { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
];
XLSX.utils.book_append_sheet(wb, f5Sheet, '5 - Interviewing');

// ===== SHEET 7: Feature 6 - AI Bot as Charles =====
const f6Data = [
  ['Feature 6: Utilizing an AI Bot as Charles to Conduct Interviews'],
  ['Status: OUTSTANDING (20% Ready)'],
  [''],
  ['Item', 'Status', 'Details'],
  ['', '', ''],
  ['WHAT EXISTS (Infrastructure)', '', ''],
  ['Hume EVI Voice Engine', 'Complete', 'WebSocket-based real-time voice interview engine is fully built and functional'],
  ['Tavus Video Engine', 'Complete', 'Avatar-based video interview system is integrated and working'],
  ['Persona Management Page', 'Complete', 'CRUD interface for creating AI interview personas (name, prompt, context)'],
  ['ElevenLabs API Key Configured', 'Complete', 'API key is set in environment but no implementation code using it'],
  ['', '', ''],
  ['WHAT IS NEEDED TO CREATE "CHARLES"', '', ''],
  ['Voice Samples from Charles', 'Blocked - Waiting on Client', 'Minimum 30 seconds (ideally 1-3 minutes) of Charles speaking clearly. Needed for voice cloning.'],
  ['Video Recording of Charles', 'Blocked - Waiting on Client', 'Video footage of Charles for Tavus AI replica creation. Needed for video avatar.'],
  ['ElevenLabs Voice Cloning Code', 'Not Started', 'Code to call ElevenLabs API to create cloned voice from samples. ~2-3 hours development.'],
  ['Tavus Replica Creation Code', 'Not Started', 'Code to call Tavus API to create Charles video replica. ~2-3 hours development.'],
  ['Charles Persona Configuration', 'Not Started', 'Define Charles\' interview style, personality, question approach, and context prompt.'],
  ['Persona Selection Integration', 'Not Started', 'Wire persona dropdown into interview creation flow so Charles is selectable. ~2-3 hours.'],
  ['Replace Hardcoded Defaults', 'Not Started', 'Remove hardcoded "Jane Smith" persona and generic voice. Use dynamic persona lookup.'],
  ['', '', ''],
  ['ESTIMATED EFFORT', '', ''],
  ['Development Work', '', '8-12 hours once voice samples and video are provided'],
  ['Client Dependency', '', 'Voice samples and video recording from Charles must be supplied by the client'],
];

const f6Sheet = XLSX.utils.aoa_to_sheet(f6Data);
f6Sheet['!cols'] = [{ wch: 40 }, { wch: 30 }, { wch: 85 }];
f6Sheet['!merges'] = [
  { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
  { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
];
XLSX.utils.book_append_sheet(wb, f6Sheet, '6 - AI Bot Charles');

// ===== SHEET 8: Feature 7 - Ranking & Rating =====
const f7Data = [
  ['Feature 7: Ranking & Rating Candidate Responses'],
  ['Status: PARTIALLY COMPLETE (70% Ready)'],
  [''],
  ['Item', 'Status', 'Details'],
  ['', '', ''],
  ['COMPLETE (Backend & Scoring Engine)', '', ''],
  ['AI-Powered 5-Dimension Scoring', 'Complete', 'Groq LLaMA scores each interview: Overall, Technical, Communication, Culture Fit, Problem Solving (0-100)'],
  ['Dynamic Competency Scoring', 'Complete', 'Additional competency scores stored as JSON (leadership, teamwork, adaptability, etc.)'],
  ['Match Scoring During Sourcing', 'Complete', 'Every sourced candidate receives a 0-100 match score with AI reasoning'],
  ['Decision Classification', 'Complete', 'AI recommends: Accepted, Rejected, Pipeline, or Needs Review with confidence score'],
  ['Strengths & Weaknesses', 'Complete', 'AI identifies specific strengths, weaknesses, key insights, and flagged concerns per candidate'],
  ['Recommendation Engine', 'Complete', 'Suggests alternative roles for pipeline candidates; hire/pass/better_fit recommendations'],
  ['Social Screening Scores', 'Complete', 'Culture fit scoring with risk level assessment from social media screening'],
  ['Color-Coded Match Badges', 'Complete', 'Visual indicators across all candidate lists (Green/Yellow/Red)'],
  ['Candidate Comparison View', 'Complete', 'Side-by-side comparison of up to 4 candidates in workflow showcase'],
  ['HR Decision Override', 'Complete', 'HR can override AI recommendations with notes and final decision'],
  ['', '', ''],
  ['OUTSTANDING', '', ''],
  ['Dedicated Ranking/Leaderboard Page', 'Not Started', 'No single page showing all candidates ranked by score for a specific job'],
  ['Score Breakdown in Interview Console', 'Not Started', 'Individual dimension scores (technical, communication, etc.) not displayed in UI despite being stored'],
  ['Radar/Spider Charts', 'Not Started', 'No visual competency charts. Recharts library is available in the project.'],
  ['Sort by Individual Scores', 'Not Started', 'Cannot sort candidate lists by technical score, communication score, etc.'],
  ['Per-Answer Rating', 'Not Started', 'Scoring is interview-level only. Individual question responses are not rated separately.'],
  ['Candidate vs Candidate Comparison', 'Not Started', 'Cannot compare how two candidates answered the same question'],
  ['Scorecard PDF Export', 'Not Started', 'No export of candidate scorecards for offline review or handouts'],
  ['', '', ''],
  ['ESTIMATED EFFORT', '', ''],
  ['Ranking page + score display', '', '4-6 hours'],
  ['Charts and visual polish', '', '3-4 hours'],
  ['PDF export', '', '3-4 hours'],
];

const f7Sheet = XLSX.utils.aoa_to_sheet(f7Data);
f7Sheet['!cols'] = [{ wch: 45 }, { wch: 18 }, { wch: 85 }];
f7Sheet['!merges'] = [
  { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
  { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
];
XLSX.utils.book_append_sheet(wb, f7Sheet, '7 - Ranking & Rating');

// ===== SHEET 9: Outstanding Work Summary =====
const outData = [
  ['Outstanding Work Summary - All Features'],
  ['Date: 23 February 2026'],
  [''],
  ['Priority', 'Feature Area', 'Outstanding Item', 'Effort Estimate', 'Dependency'],
  ['', '', '', '', ''],
  ['CRITICAL (Must Complete Before Demo)', '', '', '', ''],
  ['Critical', 'AI Bot Charles', 'Obtain voice samples from Charles', 'N/A', 'Client must provide audio recording'],
  ['Critical', 'AI Bot Charles', 'Obtain video recording of Charles', 'N/A', 'Client must provide video footage'],
  ['Critical', 'AI Bot Charles', 'Implement ElevenLabs voice cloning', '2-3 hours', 'Voice samples required first'],
  ['Critical', 'AI Bot Charles', 'Create Tavus video replica of Charles', '2-3 hours', 'Video recording required first'],
  ['Critical', 'AI Bot Charles', 'Configure Charles persona & interview style', '2-3 hours', 'None'],
  ['Critical', 'AI Bot Charles', 'Add persona selection to interview creation flow', '2-3 hours', 'Charles persona must exist'],
  ['Critical', 'Interviewing', 'Generate dynamic interview questions from job spec', '3-4 hours', 'None'],
  ['Critical', 'Interviewing', 'Verify/fix public interview token endpoints', '2-3 hours', 'None'],
  ['', '', '', '', ''],
  ['HIGH (Should Complete Before Demo)', '', '', '', ''],
  ['High', 'Ranking & Rating', 'Build dedicated ranking/leaderboard page', '3-4 hours', 'None'],
  ['High', 'Ranking & Rating', 'Display score breakdowns in interview console', '2-3 hours', 'None'],
  ['High', 'Ranking & Rating', 'Add radar/spider charts for competency scores', '2-3 hours', 'None'],
  ['High', 'Shortlisting', 'Add default sort by match score', '1-2 hours', 'None'],
  ['High', 'Shortlisting', 'Add filter by job/department', '1-2 hours', 'None'],
  ['High', 'HR Process', 'Auto-create integrity checks when candidates reach pipeline stage', '2-3 hours', 'None'],
  ['High', 'HR Process', 'Auto-trigger onboarding when candidates reach pipeline stage', '2-3 hours', 'None'],
  ['High', 'End-to-End', 'Full demo flow testing and bug fixes', '3-4 hours', 'All critical items complete'],
  ['', '', '', '', ''],
  ['NICE TO HAVE (Polish)', '', '', '', ''],
  ['Medium', 'Ranking & Rating', 'Scorecard PDF export', '3-4 hours', 'None'],
  ['Medium', 'Ranking & Rating', 'Per-answer response rating', '4-6 hours', 'None'],
  ['Medium', 'Interviewing', 'Interview recording playback', '3-4 hours', 'None'],
  ['Medium', 'Interviewing', 'Question bank management UI', '3-4 hours', 'None'],
  ['Medium', 'Job Descriptions', 'File upload parsing (PDF/DOCX)', '3-4 hours', 'None'],
  ['Medium', 'HR Process', 'Pass requirement checkboxes and startDate to onboarding API', '1-2 hours', 'None'],
  ['Medium', 'HR Process', 'Display document requests and agent logs per onboarding workflow', '2-3 hours', 'None'],
  ['Medium', 'HR Process', 'Offer analytics and acceptance rate reporting', '3-4 hours', 'None'],
  ['Medium', 'Sourcing', 'Real LinkedIn/PNet/Indeed API integration', '20+ hours', 'API credentials from each platform'],
  ['Low', 'Shortlisting', 'Bulk shortlisting', '2-3 hours', 'None'],
  ['Low', 'Demo', 'Pre-seed realistic demo data', '2-3 hours', 'None'],
  ['', '', '', '', ''],
  ['', '', 'TOTAL CRITICAL EFFORT', '16-22 hours', '+ client dependency for voice/video'],
  ['', '', 'TOTAL HIGH PRIORITY EFFORT', '16-24 hours', ''],
  ['', '', 'TOTAL NICE TO HAVE EFFORT', '45-55 hours', ''],
];

const outSheet = XLSX.utils.aoa_to_sheet(outData);
outSheet['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 60 }, { wch: 18 }, { wch: 45 }];
outSheet['!merges'] = [
  { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
  { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
];
XLSX.utils.book_append_sheet(wb, outSheet, 'Outstanding Work');

// Write
const outputPath = 'E:\\Client_apps\\mtnhumancapital\\MTN_HC_Feature_Status_Report.xlsx';
XLSX.writeFile(wb, outputPath);
console.log(`Feature status report created: ${outputPath}`);
