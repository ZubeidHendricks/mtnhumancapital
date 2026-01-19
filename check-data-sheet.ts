import XLSX from 'xlsx';

const salariesWB = XLSX.readFile('attached_assets/fleetlogix/Fleet Logix - Driver Salaries - January 2025.xlsx');
const loadReconWB = XLSX.readFile('attached_assets/fleetlogix/Fleet Logix Load Recon - January 2026v1.xlsx');

// Check Data sheet from salaries
const salariesData = XLSX.utils.sheet_to_json(salariesWB.Sheets['Data']);
console.log('=== SALARIES DATA SHEET ===');
console.log('Rows:', salariesData.length);
if (salariesData.length > 0) {
  console.log('Columns:', Object.keys(salariesData[0]));
  console.log('Sample:', salariesData[0]);
}

// Check Data sheet from load recon
const loadData = XLSX.utils.sheet_to_json(loadReconWB.Sheets['Data']);
console.log('\n=== LOAD RECON DATA SHEET ===');
console.log('Rows:', loadData.length);
if (loadData.length > 0) {
  console.log('Columns:', Object.keys(loadData[0]));
  console.log('Sample:', loadData[0]);
}
