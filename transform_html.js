#!/usr/bin/env node
/**
 * Transform index.html to load DATA and ABBR from data.json
 * 
 * Original structure (index.html):
 *   Line 95:  <script>
 *   Line 96:  const DATA={...};   (one massive line)
 *   Line 97:  (empty line)
 *   Lines 98-233: Engine code (svg, render, makeGraph, etc.)
 *   Line 234: // Abbreviation → Full name dictionary
 *   Lines 235-369: const ABBR={...};
 *   Lines 370-447: Runtime code (showDetail, event listeners, render())
 *   Line 448: </script>
 * 
 * Target structure:
 *   Line 95:  <script>
 *   NEW:      fetch('data.json').then(r=>r.json()).then(json=>{
 *   NEW:      const DATA=json.data;
 *   NEW:      const ABBR=json.abbr;
 *   Lines 98-233: Engine code (preserved as-is)
 *   (ABBR lines 234-369 removed)
 *   Lines 370-447: Runtime code (preserved as-is)
 *   NEW:      }).catch(e=>{console.error('data.json load error:',e);});
 *   Line 448: </script>
 */

const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const lines = html.split('\n');

console.log(`Total lines: ${lines.length}`);

// Verify key markers
const line96 = lines[95]; // 0-indexed
if (!line96.startsWith('const DATA=')) {
    console.error(`ERROR: Line 96 does not start with 'const DATA='. Found: "${line96.substring(0, 50)}"`);
    process.exit(1);
}

const line234 = lines[233]; // 0-indexed
if (!line234.includes('Abbreviation')) {
    console.error(`ERROR: Line 234 does not contain 'Abbreviation'. Found: "${line234}"`);
    process.exit(1);
}

const line235 = lines[234]; // 0-indexed
if (!line235.startsWith('const ABBR=')) {
    console.error(`ERROR: Line 235 does not start with 'const ABBR='. Found: "${line235.substring(0, 50)}"`);
    process.exit(1);
}

const line369 = lines[368]; // 0-indexed  
if (!line369.includes('};')) {
    console.error(`ERROR: Line 369 does not contain '};'. Found: "${line369}"`);
    process.exit(1);
}

const line448 = lines[447]; // 0-indexed
if (!line448.includes('</script>')) {
    console.error(`ERROR: Line 448 does not contain '</script>'. Found: "${line448}"`);
    process.exit(1);
}

console.log('All markers verified successfully.');

// Build the new file
const newLines = [];

// Lines 1-95 (before script): keep as-is (0-indexed: 0-94)
for (let i = 0; i < 95; i++) {
    newLines.push(lines[i]);
}

// Add fetch wrapper and DATA/ABBR from JSON
newLines.push("fetch('data.json').then(r=>r.json()).then(json=>{");
newLines.push("const DATA=json.data;");
newLines.push("const ABBR=json.abbr;");

// Lines 97-233: Engine code (0-indexed: 96-232) - skip line 96 (DATA)
for (let i = 96; i <= 232; i++) {
    newLines.push(lines[i]);
}

// Skip lines 234-369: ABBR comment + object (0-indexed: 233-368)

// Lines 370-447: Runtime code (0-indexed: 369-446)
for (let i = 369; i <= 446; i++) {
    newLines.push(lines[i]);
}

// Add fetch error handler
newLines.push("}).catch(e=>{console.error('Failed to load data.json:',e);document.body.innerHTML='<h1 style=\"color:red;text-align:center;margin-top:20vh\">data.json の読み込みに失敗しました</h1>';});");

// Lines 448-end: </script> and rest (0-indexed: 447+)
for (let i = 447; i < lines.length; i++) {
    newLines.push(lines[i]);
}

const newHtml = newLines.join('\n');
fs.writeFileSync(htmlPath, newHtml, 'utf8');

console.log(`\nTransformation complete!`);
console.log(`Original lines: ${lines.length}`);
console.log(`New lines: ${newLines.length}`);
console.log(`Lines removed: ${lines.length - newLines.length}`);
console.log(`  - Line 96 (DATA object): 1 line`);
console.log(`  - Lines 234-369 (ABBR): ${369 - 234 + 1} lines`);
console.log(`  + Added: 4 lines (fetch wrapper + DATA/ABBR + catch)`);
