// js/input.js — Pan, zoom, touch, search, controls, navigation

import { state } from './app.js';
import { nw } from './tree.js';
import { render } from './render.js';
import { renderMinimap } from './minimap.js';

export function applyView() {
    if (state.gRoot) {
        state.gRoot.setAttribute('transform', `translate(${state.ct.x},${state.ct.y}) scale(${state.ct.k})`);
    }
    renderMinimap();
}

export function navigateTo(target) {
    state.allNodes.forEach(n => n._hl = false);
    target._hl = true;
    (function exp(r, t) {
        if (r._id === t._id) return true;
        if (!r.children) return false;
        for (const c of r.children) { if (exp(c, t)) { r._collapsed = false; return true; } }
        return false;
    })(state.DATA, target);
    render();
    state.ct.k = Math.max(state.ct.k, 0.8);
    state.ct.x = state.W / 2 - (target._x + state._oX + nw(target) / 2) * state.ct.k;
    state.ct.y = state.H / 2 - (target._y + state._oY) * state.ct.k;
    applyView();
}

function setDepth(maxD) {
    (function r(n, d) { n._collapsed = d >= maxD; if (n.children) n.children.forEach(c => r(c, d + 1)); })(state.DATA, 0);
    render();
}

export function initInput() {
    const svg = state.svg;

    // Pan & zoom
    let isDrag = false, ds = { x: 0, y: 0 };
    svg.addEventListener('mousedown', e => {
        isDrag = true;
        ds = { x: e.clientX - state.ct.x, y: e.clientY - state.ct.y };
        svg.style.cursor = 'grabbing';
        document.body.style.pointerEvents = 'none';
        svg.style.pointerEvents = 'auto';
    });
    window.addEventListener('mousemove', e => {
        if (!isDrag) return;
        state.ct.x = e.clientX - ds.x;
        state.ct.y = e.clientY - ds.y;
        applyView();
    });
    window.addEventListener('mouseup', () => {
        isDrag = false;
        svg.style.cursor = 'default';
        document.body.style.pointerEvents = '';
    });
    svg.addEventListener('wheel', e => {
        e.preventDefault();
        const d = e.deltaY > 0 ? 0.9 : 1.1;
        const nk = Math.max(0.05, Math.min(5, state.ct.k * d));
        const mx = e.clientX, my = e.clientY;
        state.ct.x = mx - (mx - state.ct.x) * (nk / state.ct.k);
        state.ct.y = my - (my - state.ct.y) * (nk / state.ct.k);
        state.ct.k = nk;
        applyView();
    }, { passive: false });

    // Touch support for mobile
    let tch = { active: false, sx: 0, sy: 0, dist: 0, panning: false };
    function tDist(ts) { return Math.hypot(ts[0].clientX - ts[1].clientX, ts[0].clientY - ts[1].clientY); }
    function tMid(ts) { return { x: (ts[0].clientX + ts[1].clientX) / 2, y: (ts[0].clientY + ts[1].clientY) / 2 }; }
    svg.addEventListener('touchstart', e => {
        if (e.target.closest && e.target.closest('.node-group')) return;
        if (e.touches.length === 1) { tch.active = true; tch.panning = true; tch.sx = e.touches[0].clientX - state.ct.x; tch.sy = e.touches[0].clientY - state.ct.y; }
        if (e.touches.length === 2) { e.preventDefault(); tch.dist = tDist(e.touches); tch.mid = tMid(e.touches); tch.panning = false; }
    }, { passive: false });
    svg.addEventListener('touchmove', e => {
        e.preventDefault();
        if (e.touches.length === 1 && tch.panning) {
            state.ct.x = e.touches[0].clientX - tch.sx;
            state.ct.y = e.touches[0].clientY - tch.sy;
            applyView();
        }
        if (e.touches.length === 2 && tch.dist > 0) {
            const nd = tDist(e.touches), nm = tMid(e.touches), sc = nd / tch.dist;
            const nk = Math.max(0.05, Math.min(5, state.ct.k * sc));
            state.ct.x = nm.x - (nm.x - state.ct.x) * (nk / state.ct.k);
            state.ct.y = nm.y - (nm.y - state.ct.y) * (nk / state.ct.k);
            state.ct.k = nk;
            tch.dist = nd;
            tch.mid = nm;
            applyView();
        }
    }, { passive: false });
    svg.addEventListener('touchend', () => { tch.active = false; tch.panning = false; tch.dist = 0; });

    // Controls
    document.getElementById('btn-reset').addEventListener('click', () => { state.ct = { x: 0, y: 0, k: 1 }; setDepth(2); });
    document.getElementById('btn-expand').addEventListener('click', () => { (function e(n) { n._collapsed = false; if (n.children) n.children.forEach(e); })(state.DATA); render(); });
    document.getElementById('btn-collapse').addEventListener('click', () => { setDepth(1); });
    document.getElementById('btn-lv2').addEventListener('click', () => { setDepth(2); });
    document.getElementById('btn-lv3').addEventListener('click', () => { setDepth(3); });

    // Search
    const searchInput = document.getElementById('search');
    const searchCount = document.getElementById('search-count');
    searchInput.addEventListener('input', () => {
        const q = searchInput.value.trim().toLowerCase();
        state.allNodes.forEach(n => n._hl = false);
        if (!q) { searchCount.textContent = ''; render(); return; }
        let cnt = 0;
        state.allNodes.forEach(n => {
            const nm = n.name.replace(/\n/g, ' ').toLowerCase();
            if (nm.includes(q)) {
                n._hl = true; cnt++;
                (function expandTo(root, target) {
                    if (root._id === target._id) return true;
                    if (!root.children) return false;
                    for (const c of root.children) { if (expandTo(c, target)) { root._collapsed = false; return true; } }
                    return false;
                })(state.DATA, n);
            }
        });
        searchCount.textContent = cnt > 0 ? cnt + '件' : '0件';
        render();
    });

    // Resize
    window.addEventListener('resize', () => {
        state.W = window.innerWidth;
        state.H = window.innerHeight;
        svg.setAttribute('width', state.W);
        svg.setAttribute('height', state.H);
        render();
    });
}
