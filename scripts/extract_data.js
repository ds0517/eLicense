const fs = require('fs');
const lines = fs.readFileSync('index.html', 'utf8').split('\n');

// Line 96 (0-indexed: 95) has DATA, lines 97-98 have related code, then line 99 is blank
// Line 235 (0-indexed: 234) starts with "const ABBR={"
// Lines continue until the next "const" statement

// Extract DATA - single long line starting with "const DATA="
const dataLine = lines[95]; // line 96
const dataStr = dataLine.replace(/^const DATA=/, '').replace(/;$/, '');

// Extract ABBR - starts at line 235
// Find where ABBR ends (everything until the line with "const overlay" or next variable declaration)
let abbrLines = [];
for (let i = 234; i < lines.length; i++) {
    const line = lines[i];
    if (i > 234 && /^const\s/.test(line)) break;
    abbrLines.push(line);
}
const abbrStr = abbrLines.join('\n').replace(/^const ABBR=/, '').replace(/;\s*$/, '');

try {
    const DATA = eval('(' + dataStr + ')');
    const ABBR = eval('(' + abbrStr + ')');

    const output = { data: DATA, abbr: ABBR };
    fs.writeFileSync('data.json', JSON.stringify(output, null, 2), 'utf8');

    // Count nodes
    let nodeCount = 0;
    function countNodes(n) { nodeCount++; if (n.children) n.children.forEach(countNodes); }
    countNodes(DATA);

    console.log('data.json created successfully!');
    console.log('Root name:', DATA.name);
    console.log('Total nodes:', nodeCount);
    console.log('ABBR entries:', Object.keys(ABBR).length);
    console.log('File size:', fs.statSync('data.json').size, 'bytes');
} catch (e) {
    console.error('Error:', e.message);
    console.log('dataStr starts with:', dataStr.substring(0, 100));
    console.log('abbrStr starts with:', abbrStr.substring(0, 100));
}
