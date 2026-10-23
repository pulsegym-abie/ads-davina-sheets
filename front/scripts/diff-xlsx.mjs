import * as XLSX from 'xlsx';
import { execSync } from 'child_process';

const b4 = XLSX.read(execSync('git cat-file -p 334623e'), { type: 'buffer' });
const b5 = XLSX.read(execSync('git cat-file -p 499c26d'), { type: 'buffer' });
const b6 = XLSX.read(execSync('git cat-file -p b854a1b'), { type: 'buffer' });

function diffSheets(wbA, wbB, label) {
  console.log('=== Comparing:', label, '===');
  for (const s of ['Formatted Report', 'Raw Data Report']) {
    const sA = XLSX.utils.sheet_to_json(wbA.Sheets[s], { header: 1 });
    const sB = XLSX.utils.sheet_to_json(wbB.Sheets[s], { header: 1 });
    let diffs = 0;
    for (let i = 0; i < Math.max(sA.length, sB.length); i++) {
      const rA = JSON.stringify(sA[i] || []);
      const rB = JSON.stringify(sB[i] || []);
      if (rA !== rB) {
        console.log(`  [${s}] Row ${i}:`);
        console.log('    A:', rA);
        console.log('    B:', rB);
        diffs++;
      }
    }
    if (diffs === 0) console.log(`  [${s}] No changes!`);
  }
}

diffSheets(b4, b5, 'update-metaokt4 vs update-metaokt5');
diffSheets(b5, b6, 'update-metaokt5 vs update-metaokt6');
