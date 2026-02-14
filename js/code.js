// js/code.js — TF/Keras コードリファレンス

let snippets = [];
let categories = [];
let activeCategory = null;
let activeSnippet = null;

const $ = id => document.getElementById(id);

// Simple Python syntax highlighter (no external deps)
function highlightPython(code) {
    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const lines = code.split('\n');
    return lines.map(line => {
        let s = esc(line);
        const masks = [];
        const mask = (content, className) => {
            const key = `__MASK_${masks.length}__`;
            masks.push({ key, content, className });
            return key;
        };

        // 1. Strings
        s = s.replace(/('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g, (m) => mask(m, 'hljs-string'));

        // 2. Comments
        s = s.replace(/(#.*)$/g, (m) => mask(m, 'hljs-comment'));

        // 3. Numbers
        s = s.replace(/\b(\d+\.?\d*(?:e[+-]?\d+)?)\b/g, (m) => mask(m, 'hljs-number'));

        // 4. Function/Class Names (titles)
        s = s.replace(/(\bdef\b\s+)(\w+)/g, (m, d, n) => d + mask(n, 'hljs-title function_'));
        s = s.replace(/(\bclass\b\s+)(\w+)/g, (m, c, n) => c + mask(n, 'hljs-title class_'));

        // 5. Decorators
        s = s.replace(/(@\w+)/g, (m) => mask(m, 'hljs-keyword'));

        // 6. Keywords
        const kw = ['import', 'from', 'def', 'class', 'return', 'if', 'else', 'elif', 'for', 'in', 'while', 'with', 'as', 'True', 'False', 'None', 'lambda', 'yield', 'raise', 'try', 'except', 'finally', 'pass', 'break', 'continue', 'not', 'and', 'or', 'is', 'assert', 'global', 'nonlocal', 'del', 'async', 'await'];
        kw.forEach(k => {
            const re = new RegExp(`\\b(${k})\\b`, 'g');
            s = s.replace(re, (m) => mask(m, 'hljs-keyword'));
        });

        // 7. Restore masks (reverse order to avoid substring collisions like MASK_1 inside MASK_10)
        for (let i = masks.length - 1; i >= 0; i--) {
            const m = masks[i];
            s = s.replace(m.key, `<span class="${m.className}">${m.content}</span>`);
        }

        return s;
    }).join('\n');
}

fetch('code_snippets.json')
    .then(r => r.json())
    .then(data => {
        snippets = data.snippets;
        categories = [...new Set(snippets.map(s => s.cat))];
        init();
    })
    .catch(e => {
        console.error('Failed to load code_snippets.json:', e);
    });

function init() {
    buildCategories();
    renderTermList();
}

function buildCategories() {
    const el = $('cat-filters');
    // "All" chip
    const all = document.createElement('div');
    all.className = 'cat-chip active';
    all.textContent = 'すべて';
    all.addEventListener('click', () => {
        activeCategory = null;
        el.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
        all.classList.add('active');
        renderTermList();
    });
    el.appendChild(all);

    categories.forEach(cat => {
        const chip = document.createElement('div');
        chip.className = 'cat-chip';
        chip.textContent = cat;
        chip.addEventListener('click', () => {
            activeCategory = cat;
            el.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            renderTermList();
        });
        el.appendChild(chip);
    });
}

function getFiltered() {
    let list = snippets;
    if (activeCategory) list = list.filter(s => s.cat === activeCategory);
    const q = $('search').value.trim().toLowerCase();
    if (q) list = list.filter(s =>
        s.term.toLowerCase().includes(q) ||
        s.cat.toLowerCase().includes(q) ||
        (s.note && s.note.toLowerCase().includes(q))
    );
    return list;
}

function renderTermList() {
    const list = getFiltered();
    const el = $('term-list');
    $('term-count').textContent = list.length + '件';
    el.innerHTML = '';
    list.forEach(s => {
        const item = document.createElement('div');
        item.className = 'term-item' + (activeSnippet === s ? ' active' : '');
        item.innerHTML = `<div>${s.term}</div><div class="term-cat">${s.cat}</div>`;
        item.addEventListener('click', () => showSnippet(s));
        el.appendChild(item);
    });
}

function showSnippet(s) {
    activeSnippet = s;
    renderTermList(); // update active state

    const main = $('main-content');
    main.className = 'main';
    const highlighted = highlightPython(s.code);
    let html = `
        <div class="code-header">
            <div class="code-term">${s.term}</div>
            <span class="code-cat">${s.cat}</span>
        </div>
        <div class="code-note">${s.note}</div>
        <div class="code-block">
            <div class="code-block-header">
                <span>Python / TensorFlow</span>
                <button class="btn-copy" id="btn-copy">📋 コピー</button>
            </div>
            <pre><code>${highlighted}</code></pre>
        </div>`;
    if (s.doc) {
        html += `<a class="doc-link" href="${s.doc}" target="_blank" rel="noopener">📖 TensorFlow ドキュメント →</a>`;
    }
    main.innerHTML = html;

    // Copy button
    $('btn-copy').addEventListener('click', () => {
        navigator.clipboard.writeText(s.code).then(() => {
            const btn = $('btn-copy');
            btn.textContent = '✅ コピー済み';
            btn.classList.add('copied');
            setTimeout(() => { btn.textContent = '📋 コピー'; btn.classList.remove('copied'); }, 1500);
        });
    });
}

// Search
$('search').addEventListener('input', () => renderTermList());
