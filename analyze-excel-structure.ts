import XLSX from 'xlsx';

const salariesWorkbook = XLSX.readFile('attached_assets/fleetlogix/Fleet Logix - Driver Salaries - January 2025.xlsx');
const loadReconWorkbook = XLSX.readFile('attached_assets/fleetlogix/Fleet Logix Load Recon - January 2026v1.xlsx');

console.log('=== SALARIES FILE ===');
console.log('All sheets:', salariesWorkbook.SheetNames);
console.log();

// Try the second sheet
if (salariesWorkbook.SheetNames.length > 1) {
  const sheetName = salariesWorkbook.SheetNames[1];
  const sheet = salariesWorkbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  
  console.log(`Sheet: ${sheetName}`);
  console.log(`Rows: ${data.length}`);
  if (data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
    console.log('First row:', data[0]);
  }
}

console.log('\n=== LOAD RECON FILE ===');
console.log('All sheets:', loadReconWorkbook.SheetNames);
console.log();

// Try different sheets
for (let i = 0; i < Math.min(3, loadReconWorkbook.SheetNames.length); i++) {
  const sheetName = loadReconWorkbook.SheetNames[i];
  const sheet = loadReconWorkbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  
  console.log(`\nSheet ${i}: ${sheetName}`);
  console.log(`Rows: ${data.length}`);
  if (data.length > 0) {
    console.log('Columns:', Object.keys(data[0]).slice(0, 10));
    if (data.length > 0) console.log('Sample row:', data[0]);
  }
}
