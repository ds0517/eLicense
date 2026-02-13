const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

// Find 確率・統計 node
function findNode(node, name) {
    if (node.name === name) return node;
    if (node.children) {
        for (const child of node.children) {
            const found = findNode(child, name);
            if (found) return found;
        }
    }
    return null;
}

const kakuritsu = findNode(data.data, '確率・統計');
if (!kakuritsu) { console.error('確率・統計 not found'); process.exit(1); }

console.log('Before:', kakuritsu.children.map(c => c.name));

// Extract existing nodes we'll reorganize
const oldChildren = kakuritsu.children;
const getChild = (name) => oldChildren.find(c => c.name === name);

const bayesRule = getChild('ベイズ則');
const naiveBayes = getChild('ナイーブベイズ');
const mapEstOld = getChild('MAP推定');
const mleOld = getChild('最尤推定(MLE)');
const bayesEstOld = getChild('ベイズ推定・推論');
const conjugate = getChild('共役事前分布');
const distributions = getChild('確率分布');
const paramEstOld = getChild('パラメータ推定');

// 1. Restructure ベイズ則: add 事前分布 and 尤度関数
// Move 事前分布 from MAP推定, 尤度関数 from 最尤推定(MLE)
const priorDist = mapEstOld.children.find(c => c.name === '事前分布');
const likelihood = mleOld.children.find(c => c.name === '尤度関数');

const newBayesRule = {
    ...bayesRule,
    children: [
        bayesRule.children.find(c => c.name === '条件付き確率'),
        bayesRule.children.find(c => c.name === '事後確率'),
        priorDist,  // moved from MAP推定
        likelihood, // moved from 最尤推定(MLE)
        bayesRule.children.find(c => c.name === '周辺尤度'),
        bayesRule.children.find(c => c.name === 'ベイズ更新'),
    ]
};

// 2. Restructure パラメータ推定: consolidate MLE, MAP, ベイズ推定
const newMLE = {
    ...mleOld,
    children: mleOld.children.filter(c => c.name !== '尤度関数') // 尤度関数 moved to ベイズ則
};

const newMAP = {
    ...mapEstOld,
    children: mapEstOld.children.filter(c => c.name !== '事前分布') // 事前分布 moved to ベイズ則
};

// ベイズ推定 gains ベイズ推論, ベイズ最適化, 獲得関数 from old ベイズ推定・推論
const bayesEstChild = bayesEstOld.children.find(c => c.name === 'ベイズ推定');
const newBayesEst = {
    ...bayesEstChild,
    children: [
        bayesEstOld.children.find(c => c.name === 'ベイズ推論'),
        bayesEstOld.children.find(c => c.name === 'ベイズ最適化'),
        bayesEstOld.children.find(c => c.name === '獲得関数'),
    ]
};

const newParamEst = {
    name: 'パラメータ推定',
    color: '#f59e0b',
    desc: paramEstOld.desc,
    children: [
        newMLE,
        newMAP,
        newBayesEst,
        { name: '推定量', color: '#f59e0b', desc: paramEstOld.children.find(c => c.name === '推定量').desc }
    ]
};

// 3. Build new children array (5 items instead of 8)
kakuritsu.children = [
    newBayesRule,
    naiveBayes,
    newParamEst,
    conjugate,
    distributions,
];

// Count nodes
let count = 0;
function countNodes(n) { count++; if (n.children) n.children.forEach(countNodes); }
countNodes(data.data);

console.log('After:', kakuritsu.children.map(c => c.name));
console.log('Total nodes:', count);

// Verify structure
console.log('ベイズ則 children:', newBayesRule.children.map(c => c.name));
console.log('パラメータ推定 children:', newParamEst.children.map(c => c.name));
console.log('  MLE children:', newMLE.children.map(c => c.name));
console.log('  MAP children:', newMAP.children.map(c => c.name));
console.log('  ベイズ推定 children:', newBayesEst.children.map(c => c.name));

fs.writeFileSync('data.json', JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log('data.json written successfully');
