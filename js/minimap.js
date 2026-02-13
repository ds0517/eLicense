// js/minimap.js — Minimap rendering and interaction

import { state } from './app.js';
import { collect, nw } from './tree.js';

const MM_W = 200, MM_H = 140;
let mmCtx = null;

function getMinimapBounds(vn) {
    let mnX = 1e9, mxX = -1e9, mnY = 1e9, mxY = -1e9;
    vn.forEach(n => {
        const x = n._x + state._oX, y = n._y + state._oY;
        mnX = Math.min(mnX, x);
        mxX = Math.max(mxX, x + nw(n));
        mnY = Math.min(mnY, y - 15);
        mxY = Math.max(mxY, y + 15);
    });
    const pd = 10, rX = mxX - mnX || 1, rY = mxY - mnY || 1;
    const sc = Math.min((MM_W - pd * 2) / rX, (MM_H - pd * 2) / rY);
    const ox = pd + ((MM_W - pd * 2) - rX * sc) / 2;
    const oy = pd + ((MM_H - pd * 2) - rY * sc) / 2;
    return { mnX, mnY, sc, ox, oy };
}

export function renderMinimap() {
    if (!mmCtx) return;
    const ctx = mmCtx;
    ctx.clearRect(0, 0, MM_W, MM_H);
    const vn = collect(state.DATA);
    if (vn.length === 0) return;

    const { mnX, mnY, sc, ox, oy } = getMinimapBounds(vn);
    const tmx = x => ox + (x - mnX) * sc;
    const tmy = y => oy + (y - mnY) * sc;

    vn.forEach(n => {
        const mx = tmx(n._x + state._oX);
        const my = tmy(n._y + state._oY);
        const sz = n._depth === 0 ? 4 : n._depth === 1 ? 2.5 : 1.5;
        ctx.fillStyle = n._hl ? '#fbbf24' : (n.color || '#94a3b8');
        ctx.globalAlpha = n._depth <= 1 ? 0.9 : 0.5;
        ctx.beginPath();
        ctx.arc(mx, my, sz, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.globalAlpha = 1;
    const vl = -state.ct.x / state.ct.k;
    const vt2 = -state.ct.y / state.ct.k;
    const vw = state.W / state.ct.k;
    const vh = state.H / state.ct.k;
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tmx(vl), tmy(vt2), vw * sc, vh * sc);
}

function mmNav(e) {
    const mmCanvas = document.getElementById('minimap');
    const rect = mmCanvas.getBoundingClientRect();
    const mx = (e.clientX || e.pageX) - rect.left;
    const my = (e.clientY || e.pageY) - rect.top;

    const vn = collect(state.DATA);
    if (vn.length === 0) return;

    const { mnX, mnY, sc, ox, oy } = getMinimapBounds(vn);
    state.ct.x = state.W / 2 - (mnX + (mx - ox) / sc) * state.ct.k;
    state.ct.y = state.H / 2 - (mnY + (my - oy) / sc) * state.ct.k;
    state.applyView();
}

export function initMinimap() {
    const mmCanvas = document.getElementById('minimap');
    mmCtx = mmCanvas.getContext('2d');
    let mmDrag = false;

    mmCanvas.addEventListener('mousedown', e => { e.stopPropagation(); mmDrag = true; mmNav(e); });
    window.addEventListener('mousemove', e => { if (mmDrag) mmNav(e); });
    window.addEventListener('mouseup', () => { mmDrag = false; });
    mmCanvas.addEventListener('touchstart', e => { e.stopPropagation(); e.preventDefault(); mmDrag = true; mmNav(e.touches[0]); }, { passive: false });
    mmCanvas.addEventListener('touchmove', e => { e.preventDefault(); if (mmDrag) mmNav(e.touches[0]); }, { passive: false });
    mmCanvas.addEventListener('touchend', () => { mmDrag = false; });
}
