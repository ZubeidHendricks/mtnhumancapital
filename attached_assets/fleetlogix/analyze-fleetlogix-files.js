const XLSX = require('xlsx');
const path = require('path');

// Read both Excel files
const driverSalariesPath = path.join(__dirname, 'attached_assets/fleetlogix/Fleet Logix - Driver Salaries - January 2025.xlsx');
const loadReconPath = path.join(__dirname, 'attached_assets/fleetlogix/Fleet Logix Load Recon - January 2026v1.xlsx');

console.log('=== DRIVER SALARIES FILE ===\n');
try {
  const wb1 = XLSX.readFile(driverSalariesPath);
  console.log('Sheet Names:', wb1.SheetNames);
  
  wb1.SheetNames.forEach(sheetName => {
    console.log(`\n--- Sheet: ${sheetName} ---`);
    const sheet = wb1.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    
    // Show first 15 rows
    console.log('First 15 rows:');
    data.slice(0, 15).forEach((row, idx) => {
      console.log(`Row ${idx}:`, JSON.stringify(row));
    });
    
    console.log(`\nTotal rows: ${data.length}`);
  });
} catch (e) {
  console.error('Error reading driver salaries file:', e.message);
}

console.log('\n\n=== LOAD RECON FILE ===\n');
try {
  const wb2 = XLSX.readFile(loadReconPath);
  console.log('Sheet Names:', wb2.SheetNames);
  
  wb2.SheetNames.forEach(sheetName => {
    console.log(`\n--- Sheet: ${sheetName} ---`);
    const sheet = wb2.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    
    // Show first 15 rows
    console.log('First 15 rows:');
    data.slice(0, 15).forEach((row, idx) => {
      console.log(`Row ${idx}:`, JSON.stringify(row));
    });
    
    console.log(`\nTotal rows: ${data.length}`);
  });
} catch (e) {
  console.error('Error reading load recon file:', e.message);
}
