// js/tree.js — Tree data operations

import { state } from './app.js';

let idC = 0;

export function initNode(n, d = 0) {
    n._id = idC++;
    n._depth = d;
    n._collapsed = d >= 2;
    n._hl = false;
    if (n.children) n.children.forEach(c => initNode(c, d + 1));
}

export function vis(n) {
    return (!n._collapsed && n.children) ? n.children : [];
}

export function flatAll(n, a = []) {
    a.push(n);
    if (n.children) n.children.forEach(c => flatAll(c, a));
    return a;
}

export function layout(root) {
    function ch(n) {
        const c = vis(n);
        if (!c.length) { n._h = 1; return 1; }
        let s = 0;
        c.forEach(x => s += ch(x));
        s += (c.length - 1) * 0.08;
        n._h = s;
        return s;
    }
    function pos(n, x, y) {
        const c = vis(n);
        n._x = x;
        if (!c.length) { n._y = y + 0.5; return; }
        let off = y;
        const childX = x + Math.max(state.LG[Math.min(n._depth + 1, 4)], nw(n) + state.LINK_GAP);
        c.forEach(child => { pos(child, childX, off); off += child._h + 0.08; });
        n._y = (c[0]._y + c[c.length - 1]._y) / 2;
    }
    ch(root);
    pos(root, 0, 0);
    const g = 28;
    (function sc(n) { n._y *= g; vis(n).forEach(sc); })(root);
}

export function collect(n, a = []) {
    a.push(n);
    vis(n).forEach(c => collect(c, a));
    return a;
}

export function lks(n, a = []) {
    vis(n).forEach(c => { a.push({ s: n, t: c }); lks(c, a); });
    return a;
}

export function findParent(root, target) {
    if (!root.children) return null;
    for (const c of root.children) {
        if (c._id === target._id) return root;
        const x = findParent(c, target);
        if (x) return x;
    }
    return null;
}

export function getPath(root, target) {
    if (root._id === target._id) return [root];
    if (!root.children) return [];
    for (const c of root.children) {
        const p = getPath(c, target);
        if (p.length) return [root, ...p];
    }
    return [];
}

// --- Text measurement (SVG-based, font/kerning accurate) ---
const _mSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
_mSvg.setAttribute('style', 'position:absolute;top:-9999px;left:-9999px;width:0;height:0;overflow:hidden');
document.body.appendChild(_mSvg);
const _mt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
_mSvg.appendChild(_mt);
const _mwCache = {};

export function measureText(s, fontSize) {
    const key = s + '|' + fontSize;
    if (_mwCache[key] !== undefined) return _mwCache[key];
    _mt.setAttribute('font-size', fontSize);
    _mt.setAttribute('font-family', "'Segoe UI','Hiragino Sans','Meiryo',sans-serif");
    _mt.textContent = s;
    const w = _mt.getComputedTextLength();
    _mwCache[key] = w;
    return w;
}

export function fs(n) {
    return n._depth === 0 ? 15 : n._depth === 1 ? 11.5 : 10;
}

export function nw(n) {
    const f = fs(n);
    const pad = n._depth === 0 ? 26 : n._depth === 1 ? 18 : 14;
    const min = n._depth === 0 ? 90 : n._depth === 1 ? 72 : 48;
    const lines = n.name.split('\n');
    const maxW = Math.max(...lines.map(s => measureText(s, f)));
    return Math.max(min, maxW + pad);
}

export function nh(n) {
    const l = n.name.split('\n').length;
    return n._depth === 0 ? 16 + l * 20 : n._depth === 1 ? 12 + l * 15 : 10 + l * 13;
}

export function dk(hex, a) {
    if (!hex.startsWith('#')) return hex;
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.max(0, r - a)},${Math.max(0, g - a)},${Math.max(0, b - a)})`;
}
