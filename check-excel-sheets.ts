import XLSX from 'xlsx';

const workbook = XLSX.readFile('attached_assets/fleetlogix/Fleet Logix Load Recon - January 2026v1.xlsx');

console.log('All sheets in Excel file:');
workbook.SheetNames.forEach((name, i) => {
  const sheet = workbook.Sheets[name];
  const data = XLSX.utils.sheet_to_json(sheet);
  console.log(`\n${i + 1}. "${name}" - ${data.length} rows`);
  if (data.length > 0) {
    console.log('   Columns:', Object.keys(data[0]).slice(0, 8).join(', '));
  }
});
