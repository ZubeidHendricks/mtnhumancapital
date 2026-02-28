const XLSX = require('xlsx');

// Changes since 2026-02-16
const changes = [
  { date: '2026-02-23', category: 'WhatsApp Integration', change: 'Fixed WhatsApp message sending: repaired broken sendMessage calls, centralized DEV_TEST_PHONE configuration, updated WhatsApp API to v22.0' },
  { date: '2026-02-21', category: 'Agent Activity & Logging', change: 'Added rich details to Agent Activity logs including document name and reminder count' },
  { date: '2026-02-21', category: 'Email & Onboarding', change: 'Wired onboarding workflow to real email sending and added document templates' },
  { date: '2026-02-21', category: 'Email & Onboarding', change: 'Added SMTP_FROM config for Resend email sending and sanitized dev phone' },
  { date: '2026-02-20', category: 'Onboarding & Verification', change: 'Added manual integrity verification and fixed onboarding dropdown eligibility' },
  { date: '2026-02-20', category: 'Offer Management', change: 'Wired Offer tab to real data with full-stack CRUD operations, email attachments, and pipeline filters' },
  { date: '2026-02-20', category: 'Onboarding & Verification', change: 'Enhanced onboarding workflow with expandable details and configurable provisioning' },
  { date: '2026-02-20', category: 'Integrity Evaluation', change: 'Redesigned Integrity Evaluation Agent layout with horizontal workflow pipeline' },
  { date: '2026-02-20', category: 'Data Integration', change: 'Replaced mock data with real API calls in Onboarding and Integrity tabs' },
  { date: '2026-02-20', category: 'UI/UX Improvements', change: 'Updated font family, WhatsApp message colors, and voice interview guidelines' },
  { date: '2026-02-19', category: 'AI Recruitment', change: 'Added shortlist functionality and auto-scroll in top matches dialog' },
  { date: '2026-02-19', category: 'Bug Fixes', change: 'Fixed pagination response handling in remaining pages and parallelized candidate fetches' },
  { date: '2026-02-19', category: 'Bug Fixes', change: 'Fixed pagination response handling in interview console and HR conversations' },
  { date: '2026-02-19', category: 'Voice Interviews', change: 'Added voice interview invite flow with success dialog and prompt editor' },
  { date: '2026-02-19', category: 'UI/UX Improvements', change: 'Enlarged Create New Job modal and added API pagination support' },
  { date: '2026-02-16', category: 'Maintenance', change: 'Removed Zone.Identifier files and added them to .gitignore' },
];

// Create workbook
const wb = XLSX.utils.book_new();

// ===== SHEET 1: Summary =====
const categories = [...new Set(changes.map(c => c.category))];
const summaryData = [
  ['MTN Human Capital - Development Change Log'],
  ['Period: 19 February 2026 – 23 February 2026'],
  [''],
  ['Category', 'Number of Changes'],
];
categories.forEach(cat => {
  const count = changes.filter(c => c.category === cat).length;
  summaryData.push([cat, count]);
});
summaryData.push(['', '']);
summaryData.push(['TOTAL CHANGES', changes.length]);

const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
summarySheet['!cols'] = [{ wch: 35 }, { wch: 22 }];
summarySheet['!merges'] = [
  { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
  { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
];
XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

// ===== SHEET 2: Detailed Changes (most recent first) =====
const detailData = [
  ['MTN Human Capital - Detailed Change Log'],
  ['Period: 19 February 2026 – 23 February 2026'],
  [''],
  ['#', 'Date', 'Category', 'Change Description'],
];

const sorted = [...changes].sort((a, b) => b.date.localeCompare(a.date));
sorted.forEach((c, i) => {
  detailData.push([i + 1, c.date, c.category, c.change]);
});

const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
detailSheet['!cols'] = [{ wch: 5 }, { wch: 14 }, { wch: 28 }, { wch: 90 }];
detailSheet['!merges'] = [
  { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
  { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
];
XLSX.utils.book_append_sheet(wb, detailSheet, 'Detailed Changes');

// ===== SHEET 3: Changes by Category =====
const byCatData = [
  ['MTN Human Capital - Changes Grouped by Category'],
  ['Period: 19 February 2026 – 23 February 2026'],
  [''],
];

categories.forEach(cat => {
  byCatData.push([cat.toUpperCase(), '', '']);
  const items = changes.filter(c => c.category === cat).sort((a, b) => b.date.localeCompare(a.date));
  items.forEach(item => {
    byCatData.push(['', item.date, item.change]);
  });
  byCatData.push(['', '', '']);
});

const byCatSheet = XLSX.utils.aoa_to_sheet(byCatData);
byCatSheet['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 90 }];
byCatSheet['!merges'] = [
  { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
  { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
];
XLSX.utils.book_append_sheet(wb, byCatSheet, 'By Category');

// Write the file
const outputPath = 'E:\\Client_apps\\mtnhumancapital\\MTN_Human_Capital_Change_Log.xlsx';
XLSX.writeFile(wb, outputPath);
console.log(`Excel file created: ${outputPath}`);
console.log(`Total changes: ${changes.length}`);
console.log(`Categories: ${categories.length}`);
