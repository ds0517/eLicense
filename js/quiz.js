// js/quiz.js — E資格 用語クイズ

// ── State ──
let DATA = null, ABBR = null;
let allNodes = [], categoryNodes = {};
let questions = [], currentIdx = 0, score = 0, answers = [];
let settings = { categories: [], count: 20, type: 'all' };

// ── Init ──
fetch('data.json')
    .then(r => r.json())
    .then(json => {
        DATA = json.data;
        ABBR = json.abbr;
        flatAll(DATA);
        buildCategoryMap();
        setupUI();
    })
    .catch(e => {
        console.error('Failed to load data.json:', e);
        document.body.innerHTML = '<h1 style="color:red;text-align:center;margin-top:20vh">data.json の読み込みに失敗しました</h1>';
    });

function flatAll(n, depth = 0, color = null) {
    n._depth = depth;
    if (depth === 1) color = n.color;
    if (depth >= 1) n._catColor = color;
    allNodes.push(n);
    if (n.children) n.children.forEach(c => flatAll(c, depth + 1, color || n.color));
}

function buildCategoryMap() {
    if (!DATA.children) return;
    DATA.children.forEach(cat => {
        const catName = cat.name.replace(/\n/g, ' ');
        const nodes = [];
        (function collect(n) { if (n._depth >= 2 && n.desc && n.desc.length > 15) nodes.push(n); if (n.children) n.children.forEach(collect); })(cat);
        categoryNodes[catName] = nodes;
    });
}

function getCatName(node) {
    let cur = node;
    while (cur && cur._depth > 1) {
        cur = findParent(DATA, cur);
    }
    return cur ? cur.name.replace(/\n/g, ' ') : '';
}

function findParent(root, target) {
    if (!root.children) return null;
    for (const c of root.children) {
        if (c === target) return root;
        const x = findParent(c, target);
        if (x) return x;
    }
    return null;
}

// ── Question Generators ──

function genDescQuestion(pool) {
    // Show description, ask for the term name (4-choice)
    const node = pool[Math.floor(Math.random() * pool.length)];
    const answer = node.name.replace(/\n/g, ' ');
    let desc = node.desc;
    if (desc.length > 120) desc = desc.substring(0, 120) + '…';
    const distractors = getDistractors(node, pool, 3);
    return {
        type: 'desc',
        question: desc,
        answer,
        choices: shuffle([answer, ...distractors]),
        category: getCatName(node),
        node,
    };
}

function genKeywordQuestion(pool) {
    // Extract 3-4 keywords from a description, ask which term they describe (4-choice)
    const candidates = pool.filter(n => n.desc && n.desc.length >= 30);
    if (candidates.length === 0) return null;
    const node = candidates[Math.floor(Math.random() * candidates.length)];
    const answer = node.name.replace(/\n/g, ' ');
    const keywords = extractKeywords(node.desc, answer);
    if (keywords.length < 2) return genDescQuestion(pool); // fallback
    const distractors = getDistractors(node, pool, 3);
    return {
        type: 'keyword',
        question: keywords.map(kw => `<span class="keyword-chip">${kw}</span>`).join(''),
        answer,
        choices: shuffle([answer, ...distractors]),
        category: getCatName(node),
        node,
    };
}

function extractKeywords(desc, termName) {
    // Remove the term name from the description to avoid giving the answer away
    let text = desc;
    text = text.replace(new RegExp(escapeRegex(termName), 'gi'), '');

    const keywords = [];
    const seen = new Set();

    // 1. Extract English terms/abbreviations (high value)
    const enTerms = text.match(/[A-Z][A-Za-z0-9]+(?:[\s-][A-Z][A-Za-z0-9]+)*/g) || [];
    enTerms.forEach(p => {
        const t = p.trim();
        if (t.length >= 2 && !seen.has(t)) {
            keywords.push({ text: t, score: t.length * 3 });
            seen.add(t);
        }
    });

    // 2. Split Japanese text into meaningful phrases at particle/punctuation boundaries
    // Split at common particles: の、は、が、を、に、で、と、も、や、か、へ、から、まで、より、など、て、た、する、される、ている
    const jpText = text.replace(/[A-Za-z0-9_.\-+*/=()%#@!?;:,\[\]{}'"``]/g, ' ');
    const fragments = jpText.split(/[。、．，\s·・]+|(?:(?:を|が|は|の|に|で|と|も|や|か|へ)(?=[^\u3040-\u309f]))|[。、]/);

    fragments.forEach(frag => {
        // Clean up: trim trailing particles
        let f = frag.replace(/^[のはがをにでともやかへ]+/, '').replace(/[のはがをにでともやかへ]+$/, '').trim();
        if (f.length < 2 || f.length > 12) return;
        // Must contain meaningful content (kanji or katakana)
        if (!/[\u4e00-\u9fff\u30a0-\u30ff]/.test(f)) return;
        // Skip generic words
        const stop = ['ことが', 'として', 'による', 'ための', 'における', 'である', 'であり', 'により', 'すること', 'できる', 'される', 'している', 'となる', 'それぞれ', 'これは', 'に対して', 'を用いて', 'によって', 'について', 'に対する', 'ある場合', 'する手法', 'した手法', 'する方法', 'した方法', '用いる手法', '手法群', 'ペナルティ'];
        if (stop.some(s => f === s)) return;
        if (!seen.has(f)) {
            // Score: prefer longer phrases with kanji
            const kanjiCount = (f.match(/[\u4e00-\u9fff]/g) || []).length;
            keywords.push({ text: f, score: f.length + kanjiCount * 2 });
            seen.add(f);
        }
    });

    // 3. Extract numeric + unit patterns
    const numPatterns = text.match(/\d+[%％次元層個bit]+/g) || [];
    numPatterns.forEach(p => {
        if (!seen.has(p)) {
            keywords.push({ text: p, score: 5 });
            seen.add(p);
        }
    });

    // Sort by score and take top 3-4
    keywords.sort((a, b) => b.score - a.score);
    const count = Math.min(keywords.length, 3 + (Math.random() > 0.5 ? 1 : 0));
    const selected = keywords.slice(0, count).map(k => k.text);
    return shuffle(selected);
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getDistractors(node, pool, count) {
    const answer = node.name.replace(/\n/g, ' ');
    const sameColor = pool.filter(n => n._catColor === node._catColor && n.name.replace(/\n/g, ' ') !== answer);
    const shuffled = shuffle([...sameColor]);
    const result = shuffled.slice(0, count).map(n => n.name.replace(/\n/g, ' '));
    if (result.length < count) {
        const others = pool.filter(n => n.name.replace(/\n/g, ' ') !== answer && !result.includes(n.name.replace(/\n/g, ' ')));
        shuffle(others).slice(0, count - result.length).forEach(n => result.push(n.name.replace(/\n/g, ' ')));
    }
    return result;
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ── Build Questions ──

function buildQuestions() {
    const pool = [];
    if (settings.categories.length === 0) {
        Object.values(categoryNodes).forEach(nodes => pool.push(...nodes));
    } else {
        settings.categories.forEach(cat => {
            if (categoryNodes[cat]) pool.push(...categoryNodes[cat]);
        });
    }
    if (pool.length === 0) return;

    questions = [];
    const total = settings.count === 0 ? pool.length : Math.min(settings.count, pool.length);
    const usedNodes = new Set();

    for (let i = 0; i < total; i++) {
        let q = null;
        let attempts = 0;
        while (!q && attempts < 50) {
            attempts++;
            let typeRoll;
            if (settings.type === 'all') {
                typeRoll = Math.random();
            } else if (settings.type === 'desc') {
                typeRoll = 0;
            } else {
                typeRoll = 0.8; // keyword
            }

            if (typeRoll < 0.5) {
                q = genDescQuestion(pool);
            } else {
                q = genKeywordQuestion(pool);
            }
            if (q && usedNodes.has(q.answer)) { q = null; continue; }
            if (q) usedNodes.add(q.answer);
        }
        if (q) questions.push(q);
    }
    shuffle(questions);
}

// ── UI ──

function $(id) { return document.getElementById(id); }

function setupUI() {
    const setupEl = $('setup');
    const quizEl = $('quiz');
    const resultEl = $('result');

    // Build category chips
    const catGroup = $('cat-chips');
    Object.keys(categoryNodes).forEach(cat => {
        const chip = document.createElement('div');
        chip.className = 'chip active';
        chip.textContent = cat;
        chip.dataset.cat = cat;
        chip.addEventListener('click', () => {
            chip.classList.toggle('active');
            updateStartBtn();
        });
        catGroup.appendChild(chip);
    });

    // Count chips
    $('count-chips').querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            $('count-chips').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
        });
    });

    // Type chips
    $('type-chips').querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            $('type-chips').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
        });
    });

    // Start button
    $('btn-start').addEventListener('click', () => {
        settings.categories = Array.from(catGroup.querySelectorAll('.chip.active')).map(c => c.dataset.cat);
        const countChip = $('count-chips').querySelector('.chip.active');
        settings.count = parseInt(countChip.dataset.count);
        const typeChip = $('type-chips').querySelector('.chip.active');
        settings.type = typeChip.dataset.type;

        buildQuestions();
        if (questions.length === 0) return;
        currentIdx = 0;
        score = 0;
        answers = [];
        setupEl.classList.add('hidden');
        quizEl.classList.remove('hidden');
        showQuestion();
    });

    // Retry
    $('btn-retry').addEventListener('click', () => {
        resultEl.classList.add('hidden');
        setupEl.classList.remove('hidden');
    });

    updateStartBtn();
}

function updateStartBtn() {
    const active = document.querySelectorAll('#cat-chips .chip.active');
    $('btn-start').disabled = active.length === 0;
}

function showQuestion() {
    const q = questions[currentIdx];
    const total = questions.length;

    // Progress
    $('progress-fill').style.width = ((currentIdx) / total * 100) + '%';
    $('progress-current').textContent = currentIdx + 1;
    $('progress-total').textContent = total;
    $('score-display').textContent = score;

    // Question
    const typeLabel = { desc: '説明 → 用語', keyword: 'キーワード連想' };
    const typeClass = { desc: 'type-desc', keyword: 'type-keyword' };
    $('q-type').textContent = typeLabel[q.type];
    $('q-type').className = 'question-type ' + typeClass[q.type];
    $('q-text').innerHTML = q.question;
    $('q-category').textContent = '分野: ' + q.category;

    // Choices
    const choicesEl = $('choices');
    choicesEl.innerHTML = '';
    q.choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.textContent = choice;
        btn.addEventListener('click', () => handleAnswer(choice, q));
        choicesEl.appendChild(btn);
    });

    // Hide feedback and next
    $('feedback').classList.add('hidden');
    $('feedback').className = 'feedback hidden';
    $('btn-next').classList.add('hidden');
}

function handleAnswer(choice, q) {
    const isCorrect = choice === q.answer;
    if (isCorrect) score++;
    answers.push({ question: q, chosen: choice, correct: isCorrect });

    // Highlight choices
    const btns = $('choices').querySelectorAll('.choice-btn');
    btns.forEach(btn => {
        btn.classList.add('disabled');
        if (btn.textContent === q.answer) btn.classList.add('correct');
        else if (btn.textContent === choice && !isCorrect) btn.classList.add('wrong');
    });

    // Feedback
    const fb = $('feedback');
    fb.classList.remove('hidden');
    if (isCorrect) {
        fb.className = 'feedback correct-fb';
        fb.innerHTML = '✅ 正解！';
    } else {
        fb.className = 'feedback wrong-fb';
        fb.innerHTML = `❌ 不正解　<span class="answer-label">正解: ${q.answer}</span>`;
    }

    $('score-display').textContent = score;

    // Show next button
    const nextBtn = $('btn-next');
    nextBtn.classList.remove('hidden');
    nextBtn.textContent = currentIdx < questions.length - 1 ? '次の問題 →' : '結果を見る →';
    nextBtn.onclick = () => {
        currentIdx++;
        if (currentIdx < questions.length) {
            showQuestion();
        } else {
            showResult();
        }
    };
}

function showResult() {
    $('quiz').classList.add('hidden');
    $('result').classList.remove('hidden');

    const total = questions.length;
    const pct = Math.round(score / total * 100);

    $('result-score').textContent = pct + '%';
    $('result-correct-num').textContent = score;
    $('result-wrong-num').textContent = total - score;
    $('result-total-label').textContent = `${total}問中 ${score}問正解`;

    const wrongList = $('wrong-list');
    wrongList.innerHTML = '';
    const wrongs = answers.filter(a => !a.correct);
    if (wrongs.length === 0) {
        wrongList.innerHTML = '<p style="color:#34d399;text-align:center;padding:20px">🎉 全問正解！すばらしい！</p>';
    } else {
        wrongs.forEach(a => {
            const div = document.createElement('div');
            div.className = 'wrong-item';
            const qText = a.question.question.length > 80 ? a.question.question.substring(0, 80) + '…' : a.question.question;
            div.innerHTML = `<div class="wi-q">${qText}</div><div class="wi-a">正解: ${a.question.answer}</div><div class="wi-yours">あなたの回答: ${a.chosen}</div>`;
            wrongList.appendChild(div);
        });
    }

    $('progress-fill').style.width = '100%';
}
