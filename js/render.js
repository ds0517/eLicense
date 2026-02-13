// js/render.js — SVG rendering

import { state } from './app.js';
import { layout, collect, lks, nw, nh, fs, dk } from './tree.js';
import { esc } from './detail.js';
import { renderMinimap } from './minimap.js';

export function render() {
    layout(state.DATA);
    const nodes = collect(state.DATA);
    const links = lks(state.DATA);
    let minY = 1e9, maxY = -1e9;
    nodes.forEach(n => { minY = Math.min(minY, n._y); maxY = Math.max(maxY, n._y); });
    const oX = 60, oY = state.H / 2 - (minY + maxY) / 2;
    state._oX = oX;
    state._oY = oY;

    let s = `<g id="gRoot" transform="translate(${state.ct.x},${state.ct.y}) scale(${state.ct.k})">`;

    // Links
    links.forEach(l => {
        const sx = l.s._x + oX + nw(l.s), sy = l.s._y + oY;
        const tx = l.t._x + oX, ty = l.t._y + oY;
        const mx = (sx + tx) / 2;
        s += `<path class="link" d="M${sx},${sy} C${mx},${sy} ${mx},${ty} ${tx},${ty}" stroke="${l.t.color}" stroke-width="${l.t._depth >= 3 ? 0.7 : 1.2}" opacity="${l.t._depth >= 3 ? 0.18 : 0.32}"/>`;
    });

    // Nodes
    nodes.forEach(n => {
        const x = n._x + oX, y = n._y + oY, w = nw(n), h = nh(n);
        const r = n._depth === 0 ? 10 : n._depth === 1 ? 7 : 5;
        const f = fs(n), lines = n.name.split('\n');
        const hasCh = n.children && n.children.length > 0;

        s += `<g class="node-group" data-id="${n._id}" transform="translate(${x},${y - h / 2})">`;
        if (n._hl) s += `<rect x="-3" y="-3" width="${w + 6}" height="${h + 6}" rx="${r + 2}" fill="none" stroke="#fbbf24" stroke-width="2.5" opacity="0.9"/>`;
        s += `<rect class="node-bg" x="0" y="0" width="${w}" height="${h}" rx="${r}" fill="${dk(n.color, n._hl ? 80 : 120)}" stroke="${n.color}" stroke-width="${n._depth === 0 ? 2.2 : n._hl ? 1.8 : 1}" opacity="${n._depth === 0 ? 1 : n._depth === 1 ? 0.85 : 0.7}"/>`;
        lines.forEach((ln, i) => {
            const ty2 = h / 2 + (i - (lines.length - 1) / 2) * (f + 1.5);
            s += `<text x="${w / 2}" y="${ty2}" text-anchor="middle" dominant-baseline="central" fill="${n._depth === 0 ? '#111' : '#f1f5f9'}" font-size="${f}" font-weight="${n._depth <= 1 ? '700' : '500'}" style="pointer-events:none">${ln}</text>`;
        });
        if (hasCh) {
            s += `<text x="${w - 4}" y="7" text-anchor="end" font-size="8" fill="${n.color}" opacity="0.8" style="pointer-events:none">${n._collapsed ? '+' + n.children.length : '\u2212'}</text>`;
        }
        if (n.desc && n.desc.length > 0) {
            s += `<title>${esc(n.name.replace(/\n/g, ' '))}${n.desc ? ': ' + esc(n.desc) : ''}</title>`;
        }
        // Duplicate badge
        const _nm = n.name.replace(/\n/g, ' ');
        if (state.dupeMap[_nm] && state.dupeMap[_nm].length > 1 && n._depth >= 2) {
            s += `<text x="4" y="${h - 3}" font-size="7" fill="#60a5fa" opacity="0.85" style="pointer-events:none">🔗</text>`;
        }
        s += `</g>`;
    });

    s += `</g>`;
    state.svg.innerHTML = s;
    state.gRoot = document.getElementById('gRoot');

    // Bind node events
    document.querySelectorAll('.node-group').forEach(el => {
        const id = parseInt(el.dataset.id);
        const node = nodes.find(n => n._id === id);
        if (!node) return;
        let pt = null, dlp = false;
        el.addEventListener('pointerdown', e => {
            e.stopPropagation(); e.preventDefault();
            dlp = false;
            pt = setTimeout(() => { dlp = true; state.showDetail(node); }, 420);
        });
        el.addEventListener('pointerup', e => {
            e.stopPropagation(); e.preventDefault();
            clearTimeout(pt);
            if (!dlp && node.children && node.children.length > 0) {
                node._collapsed = !node._collapsed;
                render();
            }
        });
        el.addEventListener('pointerleave', () => clearTimeout(pt));
        el.addEventListener('pointercancel', () => clearTimeout(pt));
        el.addEventListener('mousedown', e => e.stopPropagation());
        el.addEventListener('touchstart', e => { e.stopPropagation(); }, { passive: true });
        el.addEventListener('contextmenu', e => e.preventDefault());
    });

    renderMinimap();
}
