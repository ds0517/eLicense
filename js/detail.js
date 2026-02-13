// js/detail.js — Detail panel, math formatting, activation function graphs

import { state } from './app.js';
import { findParent, getPath } from './tree.js';

export function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function isLight(h) {
    if (!h.startsWith('#')) return false;
    return (parseInt(h.slice(1, 3), 16) * 0.299 + parseInt(h.slice(3, 5), 16) * 0.587 + parseInt(h.slice(5, 7), 16) * 0.114) > 150;
}

export function getCat(node) {
    if (node._depth === 0) return 'E資格';
    let cur = node;
    while (cur._depth > 1) {
        const p = findParent(state.DATA, cur);
        if (!p) break;
        cur = p;
    }
    return cur.name.replace(/\n/g, ' ');
}

export function makeGraph(name) {
    const W = 280, H = 150, mx = 30, my = 20, gw = W - mx * 2, gh = H - my * 2;
    const fns = {
        'ReLU': { f: x => Math.max(0, x), r: [-3, 3], yr: [-0.5, 3], color: '#3b82f6', formula: 'f(x) = max(0, x)' },
        'Leaky ReLU': { f: x => x >= 0 ? x : 0.1 * x, r: [-3, 3], yr: [-0.5, 3], color: '#60a5fa', formula: 'f(x) = max(αx, x), α=0.1' },
        'GELU': { f: x => { const c = Math.sqrt(2 / Math.PI); return 0.5 * x * (1 + Math.tanh(c * (x + 0.044715 * x * x * x))); }, r: [-4, 4], yr: [-0.5, 4], color: '#818cf8', formula: 'f(x) = x·Φ(x)' },
        'Sigmoid function': { f: x => 1 / (1 + Math.exp(-x)), r: [-6, 6], yr: [-0.1, 1.1], color: '#f59e0b', formula: 'σ(x) = 1/(1+e⁻ˣ)' },
        'tanh': { f: x => Math.tanh(x), r: [-4, 4], yr: [-1.2, 1.2], color: '#10b981', formula: 'f(x) = tanh(x)' },
        '双曲線正接関数': { f: x => Math.tanh(x), r: [-4, 4], yr: [-1.2, 1.2], color: '#10b981', formula: 'f(x) = tanh(x)' },
        'Softmax': { f: x => 1 / (1 + Math.exp(-x)), r: [-6, 6], yr: [-0.1, 1.1], color: '#ec4899', formula: 'softmax(zᵢ) = eᶻⁱ/Σeᶻʲ (2クラス時=σ)' },
        'ソフトマックス関数': { f: x => 1 / (1 + Math.exp(-x)), r: [-6, 6], yr: [-0.1, 1.1], color: '#ec4899', formula: 'softmax(zᵢ) = eᶻⁱ/Σeᶻʲ (2クラス時=σ)' },
    };
    const spec = fns[name];
    if (!spec) return null;
    const { f, r, yr, color, formula } = spec;
    const xMin = r[0], xMax = r[1], yMin = yr[0], yMax = yr[1];
    const toX = v => mx + (v - xMin) / (xMax - xMin) * gw;
    const toY = v => my + (yMax - v) / (yMax - yMin) * gh;
    const pts = [];
    const steps = 80;
    for (let i = 0; i <= steps; i++) {
        const x = xMin + (xMax - xMin) * i / steps;
        const y = f(x);
        const cy = Math.max(yMin, Math.min(yMax, y));
        pts.push(`${i === 0 ? 'M' : 'L'}${toX(x).toFixed(1)},${toY(cy).toFixed(1)}`);
    }
    let grid = '';
    if (yMin <= 0 && yMax >= 0) {
        grid += `<line x1="${mx}" y1="${toY(0)}" x2="${mx + gw}" y2="${toY(0)}" stroke="#475569" stroke-width="0.8"/>`;
        grid += `<text x="${mx + gw + 4}" y="${toY(0) + 3}" fill="#64748b" font-size="9">0</text>`;
    }
    if (xMin <= 0 && xMax >= 0) {
        grid += `<line x1="${toX(0)}" y1="${my}" x2="${toX(0)}" y2="${my + gh}" stroke="#475569" stroke-width="0.8"/>`;
    }
    if (yMax >= 1 && (name.includes('Sigmoid') || name.includes('Softmax') || name.includes('ソフトマックス'))) {
        grid += `<line x1="${mx}" y1="${toY(1)}" x2="${mx + gw}" y2="${toY(1)}" stroke="#475569" stroke-width="0.5" stroke-dasharray="4,3"/>`;
        grid += `<text x="${mx - 14}" y="${toY(1) + 3}" fill="#64748b" font-size="8">1</text>`;
    }
    if (name === 'tanh' || name === '双曲線正接関数') {
        grid += `<line x1="${mx}" y1="${toY(1)}" x2="${mx + gw}" y2="${toY(1)}" stroke="#475569" stroke-width="0.5" stroke-dasharray="4,3"/>`;
        grid += `<line x1="${mx}" y1="${toY(-1)}" x2="${mx + gw}" y2="${toY(-1)}" stroke="#475569" stroke-width="0.5" stroke-dasharray="4,3"/>`;
        grid += `<text x="${mx - 14}" y="${toY(1) + 3}" fill="#64748b" font-size="8">1</text>`;
        grid += `<text x="${mx - 18}" y="${toY(-1) + 3}" fill="#64748b" font-size="8">-1</text>`;
    }
    return `<div style="margin:12px 0 6px;text-align:center"><svg width="${W}" height="${H + 22}" viewBox="0 0 ${W} ${H + 22}" style="background:rgba(0,0,0,0.25);border-radius:10px;max-width:100%">${grid}<path d="${pts.join('')}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><text x="${W / 2}" y="${H + 16}" text-anchor="middle" fill="#94a3b8" font-size="11" font-family="monospace">${formula}</text></svg></div>`;
}

export function fmtMath(text) {
    if (!text) return '';
    let s = esc(text);
    s = s.replace(/([A-Za-zα-ωΑ-Ωθσμλεηγβδτπ])_\{([^}]+)\}/g, '$1<sub>$2</sub>');
    s = s.replace(/([A-Za-zα-ωΑ-Ωθσμλεηγβδτπ])_([A-Za-z0-9])/g, '$1<sub>$2</sub>');
    s = s.replace(/([A-Za-z0-9)])?\^(\([^)]+\))/g, '$1<sup>$2</sup>');
    s = s.replace(/([A-Za-z0-9)])?\^([A-Za-z0-9²³]+)/g, '$1<sup>$2</sup>');
    s = s.replace(/(Σ|∫|∇|∂|√|∞|≤|≥|≠|≈|∈|∩|∪)/g, '<span class="dp-math">$1</span>');
    const parts = s.split(/(?<=。)/);
    let result = '';
    for (const p of parts) {
        const mathChars = (p.match(/[=+\-*/()Σ∫∇√∂₀-₉⁰-⁹<>αβγδεθλμστπηφ]/g) || []).length;
        const isFormula = mathChars > 3 && p.length < 80 && /[=]/.test(p) && !/[\u3000-\u9fff]{6,}/.test(p);
        if (isFormula) {
            result += `<span class="dp-math-block">${p.trim()}</span>`;
        } else {
            result += p;
        }
    }
    return result;
}

export function initDetailPanel() {
    const overlay = document.getElementById('detail-overlay');

    state.showDetail = function (node) {
        const cat = getCat(node);
        document.getElementById('dp-badge').textContent = cat;
        const b = document.getElementById('dp-badge');
        b.style.background = node.color;
        b.style.color = isLight(node.color) ? '#111' : '#fff';

        const nm = node.name.replace(/\n/g, ' ');
        document.getElementById('dp-title').textContent = nm;

        const fullName = state.ABBR[nm] || '';
        document.getElementById('dp-subtitle').innerHTML = (fullName ? '<div style="color:#60a5fa;font-size:12px;margin-bottom:6px;font-style:italic">' + esc(fullName) + '</div>' : '') + fmtMath(node.desc) || '';

        let html = '';
        const graph = makeGraph(node.name.replace(/\n/g, ' '));
        if (graph) html += graph;

        const path = getPath(state.DATA, node);
        if (path.length > 1) {
            html += `<div class="dp-section"><div class="dp-section-title">位置</div><p style="font-size:12px;color:#94a3b8">${path.map(p => esc(p.name.replace(/\n/g, ' '))).join(' → ')}</p></div>`;
        }
        if (node.children && node.children.length) {
            html += `<div class="dp-section"><div class="dp-section-title">サブトピック (${node.children.length})</div><div class="dp-keywords">${node.children.map(c => `<span class="dp-kw">${esc(c.name.replace(/\n/g, ' '))}</span>`).join('')}</div></div>`;
        }

        const parent = findParent(state.DATA, node);
        if (parent && parent.children && parent.children.length > 1) {
            const siblings = parent.children.filter(c => c._id !== node._id);
            html += `<div class="dp-section"><div class="dp-section-title">同カテゴリの用語 (${siblings.length})</div><div class="dp-keywords">${siblings.map(c => `<span class="dp-kw">${esc(c.name.replace(/\n/g, ' '))}</span>`).join('')}</div></div>`;
        }

        const _nodeName = node.name.replace(/\n/g, ' ');
        const _dupes = state.dupeMap[_nodeName];
        if (_dupes && _dupes.length > 1) {
            const _others = _dupes.filter(d => d._id !== node._id);
            html += `<div class="dp-section"><div class="dp-section-title">🔗 他分野での登場 (${_others.length})</div>`;
            _others.forEach((d, i) => {
                const p = getPath(state.DATA, d);
                html += `<div class="dp-crosslink" data-nav-idx="${i}"><span class="dp-crosslink-path">${p.slice(1, -1).map(x => esc(x.name.replace(/\n/g, ' '))).join(' › ') || 'ルート'}</span><span class="dp-crosslink-arrow">→</span></div>`;
            });
            html += `</div>`;
        }

        document.getElementById('dp-body').innerHTML = html;
        overlay.classList.add('show');

        if (_dupes && _dupes.length > 1) {
            const _others = _dupes.filter(d => d._id !== node._id);
            document.querySelectorAll('.dp-crosslink').forEach(el => {
                const idx = parseInt(el.dataset.navIdx);
                el.addEventListener('click', () => {
                    overlay.classList.remove('show');
                    state.navigateTo(_others[idx]);
                });
            });
        }
    };

    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('show'); });
    document.getElementById('dp-close').addEventListener('click', () => overlay.classList.remove('show'));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') overlay.classList.remove('show'); });
}
