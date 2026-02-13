#!/usr/bin/env node
/**
 * convert_math.js
 * 
 * data.json の全ノードの desc フィールドに含まれる数式表現を
 * Unicode数学記号を使った正式な数学的表記に変換するスクリプト。
 * 
 * 変換内容:
 *   1. 上付き文字 (^T → ᵀ, ^2 → ² 等)
 *   2. 割り算の整形 (/ の前後にスペース)
 *   3. マイナス記号 (数式中の - → −)
 *   4. 等号・不等号の前後スペース
 *   5. 乗算の明示化 (適切な箇所に · を追加)
 *   6. その他の数学記号変換
 */

const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'data.json');
const backupPath = path.join(__dirname, 'data.json.bak');

// Backup
fs.copyFileSync(jsonPath, backupPath);
console.log(`Backup created: ${backupPath}`);

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// ============================================================
// Superscript / Subscript mapping
// ============================================================
const supMap = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
    'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ',
    'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ', 'i': 'ⁱ', 'j': 'ʲ',
    'k': 'ᵏ', 'l': 'ˡ', 'm': 'ᵐ', 'n': 'ⁿ', 'o': 'ᵒ',
    'p': 'ᵖ', 'r': 'ʳ', 's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ',
    'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ',
    'T': 'ᵀ', 'π': 'π',
};

const subMap = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
    'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ',
    'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ',
    'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ',
    'v': 'ᵥ', 'x': 'ₓ',
};

function toSup(str) {
    return str.split('').map(c => supMap[c] || c).join('');
}

function toSub(str) {
    return str.split('').map(c => subMap[c] || c).join('');
}

// ============================================================
// Specific targeted replacements (exact string → replacement)
// These handle complex formulas that regex can't safely transform
// ============================================================
const exactReplacements = [
    // === 確率・統計 ===
    // ベイズ則
    ['P(A|B)=P(B|A)P(A)/P(B)', 'P(A|B) = P(B|A)·P(A) / P(B)'],

    // 周辺尤度
    ['P(D)=∫P(D|θ)P(θ)dθ', 'P(D) = ∫P(D|θ)P(θ)dθ'],

    // MAP推定
    ['事後確率P(θ|D)を最大化するパラメータθを求める', '事後確率 P(θ|D) を最大化するパラメータ θ を求める'],

    // 最尤推定
    ['尤度関数L(θ)=P(D|θ)を最大化するパラメータθを求める', '尤度関数 L(θ) = P(D|θ) を最大化するパラメータ θ を求める'],

    // 対数尤度
    ['尤度関数の対数logL(θ)', '尤度関数の対数 log L(θ)'],

    // 尤度関数
    ['パラメータθの関数として見たデータの生成確率L(θ)=P(D|θ)', 'パラメータ θ の関数として見たデータの生成確率 L(θ) = P(D|θ)'],

    // ベイズ推論
    ['新規データの予測分布∫P(x|θ)P(θ|D)dθの計算', '新規データの予測分布 ∫P(x|θ)P(θ|D)dθ の計算'],

    // ガウス事前分布
    ['N(0,σ²)', 'N(0, σ²)'],

    // === 情報理論 ===
    // エントロピー
    ['H(X)=-Σ P(x)log P(x)', 'H(X) = −Σ P(x)·log P(x)'],

    // 自己情報量
    ['I(x)=-log P(x)', 'I(x) = −log P(x)'],

    // 条件付きエントロピー
    ['H(Y|X)=Σ_x P(x)H(Y|X=x)', 'H(Y|X) = Σₓ P(x)·H(Y|X=x)'],
    ['I(X;Y)=H(Y)-H(Y|X)', 'I(X;Y) = H(Y) − H(Y|X)'],

    // 結合エントロピー
    ['H(X,Y)=H(X)+H(Y|X)=H(Y)+H(X|Y)', 'H(X,Y) = H(X) + H(Y|X) = H(Y) + H(X|Y)'],
    ['H(X,Y)=H(X)+H(Y)', 'H(X,Y) = H(X) + H(Y)'],

    // 交差エントロピー
    ['H(p,q)=-Σp(x)log q(x)', 'H(p,q) = −Σ p(x)·log q(x)'],
    ['H(p,q)=H(p)+D_KL(p||q)', 'H(p,q) = H(p) + D_KL(p‖q)'],

    // 負の対数尤度
    ['-log P(D|θ)', '−log P(D|θ)'],

    // 相互情報量
    ['I(X;Y)=H(X)-H(X|Y)=H(Y)-H(Y|X)', 'I(X;Y) = H(X) − H(X|Y) = H(Y) − H(Y|X)'],
    ['I(X;Z)≤I(X;Y)', 'I(X;Z) ≤ I(X;Y)'],

    // KLダイバージェンス
    ['D_KL(P||Q)=Σ P(x)log(P(x)/Q(x))', 'D_KL(P‖Q) = Σ P(x)·log(P(x) / Q(x))'],
    ['D_KL(P||Q)≠D_KL(Q||P)', 'D_KL(P‖Q) ≠ D_KL(Q‖P)'],
    ['D_KL(P||Q)', 'D_KL(P‖Q)'],
    ['D_KL(Q||P)', 'D_KL(Q‖P)'],
    ['KL(P||M)', 'KL(P‖M)'],
    ['KL(Q||M)', 'KL(Q‖M)'],

    // JSダイバージェンス
    ['JS(P||Q)=(KL(P||M)+KL(Q||M))/2', 'JS(P‖Q) = (KL(P‖M) + KL(Q‖M)) / 2'],
    ['M=(P+Q)/2', 'M = (P+Q) / 2'],
    ['JS(P||Q)=JS(Q||P)', 'JS(P‖Q) = JS(Q‖P)'],

    // ELBO
    ['ELBO=E[log P(D|z)]-D_KL(Q(z)||P(z))', 'ELBO = E[log P(D|z)] − D_KL(Q(z)‖P(z))'],
    ['ELBO=E[log P(D|z)]-D_KL(Q(z)‖P(z))', 'ELBO = 𝔼[log P(D|z)] − D_KL(Q(z)‖P(z))'],

    // GAN目的関数
    ['2·JS(P_data||P_g)-log4', '2·JS(P_data‖P_g) − log 4'],
    ['2·JS(P_data‖P_g)-log4', '2·JS(P_data‖P_g) − log 4'],

    // Wasserstein
    ['W(P,Q)=inf E[||x-y||]', 'W(P, Q) = inf 𝔼[‖x − y‖]'],

    // f-divergence
    ['D_f(P||Q)=Σ Q(x)f(P(x)/Q(x))', 'D_f(P‖Q) = Σ Q(x)·f(P(x) / Q(x))'],
    ['f(t)=tlog t', 'f(t) = t·log t'],
    ['f(t)=-(t+1)log((t+1)/2)+tlog t', 'f(t) = −(t+1)·log((t+1) / 2) + t·log t'],

    // データ処理不等式
    ['X→Y→Z', 'X → Y → Z'],

    // === 微分 ===
    // 連鎖律
    ['y=f(g(x))の微分をdy/dx=(dy/dg)·(dg/dx)', 'y = f(g(x)) の微分を dy/dx = (dy/dg)·(dg/dx)'],

    // 偏微分
    ['f(x₁,...,xₙ)', 'f(x₁, …, xₙ)'],
    ['∇f=(∂f/∂x₁,...,∂f/∂xₙ)', '∇f = (∂f/∂x₁, …, ∂f/∂xₙ)'],

    // === 損失関数・誤差指標 ===
    // 平均二乗誤差  
    ['Σ(yᵢ-ŷᵢ)²/n', '(1/n)·Σ(yᵢ − ŷᵢ)²'],
    ['Σ(y-ŷ)²/n', '(1/n)·Σ(y − ŷ)²'],

    // 平均絶対誤差
    ['Σ|yᵢ-ŷᵢ|/n', '(1/n)·Σ|yᵢ − ŷᵢ|'],
    ['Σ|y-ŷ|/n', '(1/n)·Σ|y − ŷ|'],

    // RMSE
    ['√MSE', '√MSE'],

    // 決定係数
    ['R²=1-SS_res/SS_tot', 'R² = 1 − SS_res / SS_tot'],

    // 性能指標
    ['Accuracy=(TP+TN)/(TP+TN+FP+FN)', 'Accuracy = (TP + TN) / (TP + TN + FP + FN)'],
    ['Precision=TP/(TP+FP)', 'Precision = TP / (TP + FP)'],
    ['Recall=TP/(TP+FN)', 'Recall = TP / (TP + FN)'],
    ['F₁=2PR/(P+R)', 'F₁ = 2PR / (P + R)'],
    ['TPR=TP/(TP+FN)', 'TPR = TP / (TP + FN)'],
    ['TNR=TN/(TN+FP)', 'TNR = TN / (TN + FP)'],
    ['FPR=FP/(FP+TN)', 'FPR = FP / (FP + TN)'],
    ['FNR=FN/(FN+TP)', 'FNR = FN / (FN + TP)'],
    ['1-再現率', '1 − 再現率'],
    ['1-特異度', '1 − 特異度'],

    // Dice係数
    ['Dice=2|A∩B|/(|A|+|B|)', 'Dice = 2|A∩B| / (|A| + |B|)'],
    ['1-Dice', '1 − Dice'],

    // Jaccard係数
    ['J=|A∩B|/|A∪B|', 'J = |A∩B| / |A∪B|'],
    ['Dice=2J/(1+J)', 'Dice = 2J / (1 + J)'],

    // IoU
    ['Intersection over Union=|A∩B|/|A∪B|', 'Intersection over Union = |A∩B| / |A∪B|'],

    // バイナリクロスエントロピー
    ['L=-[y·log(p)+(1-y)·log(1-p)]', 'L = −[y·log(p) + (1 − y)·log(1 − p)]'],

    // Focal Loss
    ['(1-p_t)^γ', '(1 − pₜ)ᵞ'],

    // Multi-task loss
    ['L=Σwᵢ·Lᵢ', 'L = Σwᵢ·Lᵢ'],

    // Contrastive loss
    ['L=-log(exp(sim(z_i,z_j)/τ)/Σexp(sim(z_i,z_k)/τ))', 'L = −log(exp(sim(zᵢ, zⱼ) / τ) / Σexp(sim(zᵢ, zₖ) / τ))'],

    // Triplet loss
    ['L=max(d(a,p)-d(a,n)+margin, 0)', 'L = max(d(a,p) − d(a,n) + margin, 0)'],

    // === 活性化関数 ===
    // ReLU
    ['f(x)=max(0,x)', 'f(x) = max(0, x)'],

    // Leaky ReLU
    ['f(x)=max(αx,x)', 'f(x) = max(αx, x)'],

    // GELU
    ['f(x)=x·Φ(x)', 'f(x) = x·Φ(x)'],

    // Sigmoid
    ['σ(x)=1/(1+e^(-x))', 'σ(x) = 1 / (1 + e⁻ˣ)'],

    // tanh
    ['f(x)=(e^x-e^(-x))/(e^x+e^(-x))', 'f(x) = (eˣ − e⁻ˣ) / (eˣ + e⁻ˣ)'],
    ['y=tanh(x)=(e^x-e^(-x))/(e^x+e^(-x))', 'y = tanh(x) = (eˣ − e⁻ˣ) / (eˣ + e⁻ˣ)'],

    // Softmax
    ['softmax(zᵢ)=exp(zᵢ)/Σexp(zⱼ)', 'softmax(zᵢ) = exp(zᵢ) / Σexp(zⱼ)'],
    ['softmax(zᵢ/τ)', 'softmax(zᵢ / τ)'],
    ['softmax(z/τ)', 'softmax(z / τ)'],

    // === 最適化 ===
    // 最急降下法
    ['∇L(θ)で更新θ←θ-η·∇L(θ)', '∇L(θ) で更新 θ ← θ − η·∇L(θ)'],

    // 学習率
    ['θ←θ-η·∇L', 'θ ← θ − η·∇L'],

    // Momentum
    ['v←βv+∇L, θ←θ-ηv', 'v ← βv + ∇L,  θ ← θ − ηv'],

    // モメンタム
    ['v_t=βv_{t-1}+(1-β)g_t', 'vₜ = β·vₜ₋₁ + (1 − β)·gₜ'],

    // NAG
    ['v←βv+∇L(θ-ηβv)', 'v ← βv + ∇L(θ − ηβv)'],
    ['θ-ηβv', 'θ − ηβv'],

    // Nesterov
    ['O(1/t²)', 'O(1/t²)'],

    // AdaGrad
    ['θ←θ-η/√G·g', 'θ ← θ − (η / √G)·g'],

    // RMSProp
    ['v←ρv+(1-ρ)g²', 'v ← ρv + (1 − ρ)g²'],

    // パラメータ別学習率
    ['η/√(vᵢ+ε)', 'η / √(vᵢ + ε)'],

    // Adam 一次モーメント
    ['m_t=β₁m_{t-1}+(1-β₁)g_t', 'mₜ = β₁·mₜ₋₁ + (1 − β₁)·gₜ'],

    // Adam 二次モーメント
    ['v_t=β₂v_{t-1}+(1-β₂)g_t²', 'vₜ = β₂·vₜ₋₁ + (1 − β₂)·gₜ²'],

    // バイアス補正
    ['m̂_t=m_t/(1-β₁^t)', 'm̂ₜ = mₜ / (1 − β₁ᵗ)'],
    ['v̂_t=v_t/(1-β₂^t)', 'v̂ₜ = vₜ / (1 − β₂ᵗ)'],

    // Xavier法
    ['Var(w)=2/(n_in+n_out)', 'Var(w) = 2 / (n_in + n_out)'],

    // He法
    ['Var(w)=2/n_in', 'Var(w) = 2 / n_in'],

    // 勾配クリッピング
    ['g←g·θ/||g||', 'g ← g·θ / ‖g‖'],

    // Weight Decay
    ['w←(1-λη)w', 'w ← (1 − λη)w'],

    // L1正則化
    ['λΣ|wᵢ|', 'λ·Σ|wᵢ|'],

    // L2正則化
    ['λΣwᵢ²', 'λ·Σwᵢ²'],
    ['λ||w||²', 'λ‖w‖²'],
    ['λ||w||₁', 'λ‖w‖₁'],

    // Elastic Net
    ['L1正則化(α)とL2正則化(1-α)', 'L1正則化(α)とL2正則化(1−α)'],

    // === CNN ===
    // ResNet
    ['y=F(x)+x', 'y = F(x) + x'],
    ['F(x)+x', 'F(x) + x'],

    // Affine層
    ['y=Wx+b', 'y = Wx + b'],

    // 最小二乗法
    ['Σ(yᵢ-ŷᵢ)²', 'Σ(yᵢ − ŷᵢ)²'],
    ['X^TXw=X^Ty', 'XᵀXw = Xᵀy'],

    // === RNN ===
    // RNN desc
    ['h_t=f(h_{t-1},x_t)', 'hₜ = f(hₜ₋₁, xₜ)'],

    // LSTM メモリセル
    ['C_t', 'Cₜ'],

    // 忘却ゲート
    ['f_t=σ(W_f·[h_{t-1},x_t]+b_f)', 'fₜ = σ(W_f·[hₜ₋₁, xₜ] + b_f)'],

    // 入力ゲート
    ['i_t=σ(W_i·[h_{t-1},x_t]+b_i)', 'iₜ = σ(W_i·[hₜ₋₁, xₜ] + b_i)'],

    // 出力ゲート
    ['o_t=σ(W_o·[h_{t-1},x_t]+b_o)', 'oₜ = σ(W_o·[hₜ₋₁, xₜ] + b_o)'],
    ['h_t=o_t·tanh(C_t)', 'hₜ = oₜ·tanh(Cₜ)'],

    // GRU 更新ゲート
    ['z_t=σ(W_z·[h_{t-1},x_t])', 'zₜ = σ(W_z·[hₜ₋₁, xₜ])'],
    ['h_{t-1}', 'hₜ₋₁'],

    // GRU リセットゲート
    ['r_t=σ(W_r·[h_{t-1},x_t])', 'rₜ = σ(W_r·[hₜ₋₁, xₜ])'],

    // === Transformer ===
    // Self-Attention
    ['Attention(Q,K,V)=softmax(QK^T/√d_k)V', 'Attention(Q, K, V) = softmax(QKᵀ / √dₖ)·V'],

    // Query
    ['Q=XW_Q', 'Q = XW_Q'],

    // Key
    ['K=XW_K', 'K = XW_K'],

    // Value
    ['V=XW_V', 'V = XW_V'],

    // Scaled Dot-Product
    ['Attention(Q,K,V)=softmax(QK^T/√d_k)V', 'Attention(Q, K, V) = softmax(QKᵀ / √dₖ)·V'],

    // Multi-Head
    ['MultiHead(Q,K,V)=Concat(head₁,...,headₕ)W_O', 'MultiHead(Q, K, V) = Concat(head₁, …, headₕ)·W_O'],

    // ヘッド数
    ['d_model=512', 'd_model = 512'],
    ['d_k=64', 'dₖ = 64'],
    ['d_k=d_model/h', 'dₖ = d_model / h'],

    // 計算量
    ['O(n²d)', 'O(n²d)'],
    ['O(n²)', 'O(n²)'],
    ['O(nw)', 'O(nw)'],
    ['O(n)', 'O(n)'],
    ['O(log n)', 'O(log n)'],

    // 位置符号化
    ['PE(pos,2i)=sin(pos/10000^(2i/d))', 'PE(pos, 2i) = sin(pos / 10000²ⁱ/ᵈ)'],

    // === 確率・統計の追加 ===
    // 事後確率
    ['P(θ|D)', 'P(θ|D)'],

    // MAP推定 desc
    ['P(θ|D)∝P(D|θ)P(θ)', 'P(θ|D) ∝ P(D|θ)·P(θ)'],

    // 行動価値関数
    ['Q*(s,a)=E[Σγ^t·r_t|s₀=s,a₀=a]', 'Q*(s, a) = 𝔼[Σγᵗ·rₜ | s₀=s, a₀=a]'],
    ['argmax_a Q(s,a)', 'argmax_a Q(s, a)'],

    // TD学習
    ['δ=r+γV(s\')-V(s)', 'δ = r + γV(s\') − V(s)'],

    // 方策ベース
    ['J(θ)=E[Σr_t]', 'J(θ) = 𝔼[Σrₜ]'],

    // 方策勾配法
    ['∇J(θ)=E[Σ∇logπ(a_t|s_t;θ)·G_t]', '∇J(θ) = 𝔼[Σ∇log π(aₜ|sₜ; θ)·Gₜ]'],

    // 方策勾配定理
    ['∇J(θ)=E_π[∇logπ(a|s;θ)·Q^π(s,a)]', '∇J(θ) = 𝔼_π[∇log π(a|s; θ)·Qᵖⁱ(s, a)]'],

    // Advantage
    ['A(s,a)=Q(s,a)-V(s)', 'A(s, a) = Q(s, a) − V(s)'],

    // Q学習 ベルマン方程式
    ['Q(s,a)←r+γ·max_a\'Q(s\',a\')', 'Q(s, a) ← r + γ·max_a\' Q(s\', a\')'],

    // === 生成モデル ===
    // VAE
    ['q(z|x)', 'q(z|x)'],
    ['z=μ+σ·ε', 'z = μ + σ·ε'],
    ['ε~N(0,1)', 'ε ~ N(0, 1)'],
    ['(μ,σ)', '(μ, σ)'],

    // 拡散モデル 前方過程
    ['q(x_t|x_{t-1})=N(√(1-β_t)x_{t-1},β_tI)', 'q(xₜ|xₜ₋₁) = N(√(1 − βₜ)·xₜ₋₁, βₜI)'],
    ['ε~N(0,I)', 'ε ~ N(0, I)'],
    ['ε_θ(x_t,t)', 'εθ(xₜ, t)'],
    ['β_t', 'βₜ'],
    ['p_θ(x_{t-1}|x_t)', 'pθ(xₜ₋₁|xₜ)'],
    ['ε_θ', 'εθ'],
    ['∇log p(x_t)', '∇log p(xₜ)'],

    // GAN
    ['G(z)', 'G(z)'],
    ['min_G E[log(1-D(G(z)))]', 'min_G 𝔼[log(1 − D(G(z)))]'],
    ['max_D E[log D(x)]+E[log(1-D(G(z)))]', 'max_D 𝔼[log D(x)] + 𝔼[log(1 − D(G(z)))]'],
    ['z~P(z)', 'z ~ P(z)'],
    ['P_G=P_data', 'P_G = P_data'],

    // 識別モデル
    ['P(y|x)', 'P(y|x)'],
    ['P(x,y)=P(x|y)P(y)', 'P(x,y) = P(x|y)·P(y)'],

    // 蒸留 Student
    ['L_student=α·CE(y,p_s)+(1-α)·KL(p_t^τ||p_s^τ)', 'L_student = α·CE(y, pₛ) + (1 − α)·KL(pₜᵗ‖pₛᵗ)'],

    // MixUp
    ['(x₁,y₁),(x₂,y₂)をλx₁+(1-λ)x₂, λy₁+(1-λ)y₂', '(x₁, y₁), (x₂, y₂) を λx₁ + (1−λ)x₂,  λy₁ + (1−λ)y₂'],

    // ドロップ率
    ['(1-p)', '(1 − p)'],
    ['1/(1-p)', '1 / (1 − p)'],

    // フローベース カップリング
    ['y₁=x₁, y₂=x₂⊙exp(s(x₁))+t(x₁)', 'y₁ = x₁,  y₂ = x₂ ⊙ exp(s(x₁)) + t(x₁)'],
    ['y₁=x₁, y₂=x₂+t(x₁)', 'y₁ = x₁,  y₂ = x₂ + t(x₁)'],
    ['x₂=y₂-t(y₁)', 'x₂ = y₂ − t(y₁)'],

    // == Misc formatting ==
    ['king-man+woman≈queen', 'king − man + woman ≈ queen'],
    ['(0,1)', '(0, 1)'],
    ['(-1,1)', '(−1, 1)'],
    ['[0,1]', '[0, 1]'],
    ['[-1,1]', '[−1, 1]'],
    ['[0,log2]', '[0, log 2]'],

    // 条件付き生成
    ['P(x|y)', 'P(x|y)'],

    // 双方向RNN
    ['(t=1→T)', '(t = 1 → T)'],
    ['(t=T→1)', '(t = T → 1)'],

    // 汎化誤差分解
    ['バイアス²+バリアンス+ノイズ', 'バイアス² + バリアンス + ノイズ'],

    // 計算量表記の改善
    ['1/C_out', '1/C_out'],
    ['1/G', '1/G'],

    // exp表記
    ['exp(η·T(x)-A(η))', 'exp(η·T(x) − A(η))'],
];

// ============================================================
// Apply transformations
// ============================================================
let changeCount = 0;

function processNode(node) {
    if (node.desc) {
        let original = node.desc;
        let desc = original;

        // Apply exact replacements (order matters - longer/more specific first)
        for (const [from, to] of exactReplacements) {
            if (desc.includes(from)) {
                desc = desc.split(from).join(to);
            }
        }

        if (desc !== original) {
            node.desc = desc;
            changeCount++;
            // Show what changed
            const name = node.name.replace(/\n/g, ' ');
            console.log(`  ✓ ${name}`);
        }
    }

    if (node.children) {
        for (const child of node.children) {
            processNode(child);
        }
    }
}

processNode(json.data);

// Write output
const output = JSON.stringify(json, null, 2);
fs.writeFileSync(jsonPath, output, 'utf8');

console.log(`\n=== 変換完了 ===`);
console.log(`変更されたノード数: ${changeCount}`);
console.log(`バックアップ: ${backupPath}`);
