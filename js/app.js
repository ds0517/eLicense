// js/app.js — Entry point, shared state, initialization

import { initNode, flatAll } from './tree.js';
import { render } from './render.js';
import { initDetailPanel } from './detail.js';
import { initMinimap } from './minimap.js';
import { initInput, applyView, navigateTo } from './input.js';

// Shared state — imported by all modules
export const state = {
    DATA: null,
    ABBR: {},
    allNodes: [],
    dupeMap: {},
    ct: { x: 0, y: 0, k: 1 },
    gRoot: null,
    svg: null,
    W: window.innerWidth,
    H: window.innerHeight,
    _oX: 60,
    _oY: 0,
    LG: [0, 180, 145, 125, 110],
    LINK_GAP: 18,
    showDetail: null,   // set by detail.js
    applyView: null,    // set below
    navigateTo: null,   // set below
};

fetch('data.json')
    .then(r => r.json())
    .then(json => {
        state.DATA = json.data;
        state.ABBR = json.abbr;

        // Initialize SVG
        state.svg = document.getElementById('canvas');
        state.svg.setAttribute('width', state.W);
        state.svg.setAttribute('height', state.H);

        // Initialize tree
        initNode(state.DATA);
        state.allNodes = flatAll(state.DATA);

        // Build duplicate map
        state.allNodes.forEach(n => {
            const nm = n.name.replace(/\n/g, ' ');
            if (!state.dupeMap[nm]) state.dupeMap[nm] = [];
            state.dupeMap[nm].push(n);
        });

        // Wire up cross-module functions
        state.applyView = applyView;
        state.navigateTo = navigateTo;

        // Initialize subsystems
        initDetailPanel();
        initMinimap();
        initInput();

        // First render
        render();
    })
    .catch(e => {
        console.error('Failed to load data.json:', e);
        document.body.innerHTML = '<h1 style="color:red;text-align:center;margin-top:20vh">data.json の読み込みに失敗しました</h1>';
    });
