// --- 1. INITIALISATION ----

const editorElement = document.getElementById("editor");
const codeMirrorInstance = CodeMirror.fromTextArea(editorElement, {
  lineNumbers: true,
  mode: "javascript",
  theme: "gestion",
  lineWrapping: true,
});
//

// URL du Cloudflare Worker (voir cloudflare-worker/)
const API_URL = "https://round-lake-72da.nicolas-maurin1.workers.dev/";

const exerciseContainer = document.getElementById("exerciseContainer");

// Bloquer la sélection et le copier-coller sur l'énoncé
exerciseContainer.addEventListener("selectstart", (e) => e.preventDefault());
exerciseContainer.addEventListener("copy", (e) => e.preventDefault());
exerciseContainer.addEventListener("contextmenu", (e) => e.preventDefault());
exerciseContainer.style.userSelect = "none";

const newExerciseButton = document.getElementById("newExerciseButton");
const assistantModal = document.getElementById("assistantModal");
const assistantContent = document.getElementById("assistantContent");
const closeModalButton = document.getElementById("closeModalButton");
const assistantButton = document.getElementById("assistantButton");
const topicModal = document.getElementById("topicModal");
const closeTopicButton = document.getElementById("closeTopicButton");
const hintLevels = document.getElementById("hintLevels");

// Variable pour stocker l'exercice (texte complet pour l'assistant)
let currentExerciseText = "Aucun exercice généré pour le moment.";
let lastError = null;
let currentDifficulty = "débutant";
let currentTopic = null;
let sessionErrors = [];
const submitButton = document.getElementById("submitButton");

// --- HISTORIQUE & SCORE ---

const HISTORY_KEY = "ccjs_history";
const MAX_HISTORY = 50;

const topicLabels = {
  "variables.txt": "Variables",
  "if.txt": "If / Else",
  "for.txt": "Boucles For",
  "while.txt": "While",
  "tableaux.txt": "Tableaux",
  "fonctions.txt": "Fonctions",
  "objets.txt": "Objets",
  "dom.txt": "DOM",
  "evenements.txt": "Événements",
};

function getHistory() {
  return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
}

function saveAttempt(isCorrect) {
  if (!currentTopic) return;
  const history = getHistory();
  history.push({
    topic: currentTopic,
    topicLabel: topicLabels[currentTopic] || currentTopic,
    difficulty: currentDifficulty,
    result: isCorrect ? "correct" : "incorrect",
    runtimeErrors: [...sessionErrors],
    timestamp: Date.now(),
  });
  if (history.length > MAX_HISTORY)
    history.splice(0, history.length - MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  updateScoreDisplay();
  updateWeakPointsButton();
  updateTopicProgress();
}

function getTopicStats() {
  const stats = {};
  getHistory().forEach((attempt) => {
    if (!stats[attempt.topic]) {
      stats[attempt.topic] = {
        label: attempt.topicLabel,
        correct: 0,
        total: 0,
        errors: [],
      };
    }
    stats[attempt.topic].total++;
    if (attempt.result === "correct") stats[attempt.topic].correct++;
    if (attempt.runtimeErrors)
      stats[attempt.topic].errors.push(...attempt.runtimeErrors);
  });
  return stats;
}

function updateScoreDisplay() {
  const history = getHistory();
  const scoreDisplay = document.getElementById("scoreDisplay");
  if (!scoreDisplay) return;
  if (history.length === 0) {
    scoreDisplay.style.display = "none";
    return;
  }

  const correct = history.filter((a) => a.result === "correct").length;
  const total = history.length;
  const pct = Math.round((correct / total) * 100);
  scoreDisplay.style.display = "inline-flex";
  scoreDisplay.innerHTML = `
    <span class="score-correct">${correct} ✅</span>
    <span class="score-sep">/</span>
    <span class="score-total">${total}</span>
    <span class="score-pct">${pct}%</span>
  `;
}

function updateWeakPointsButton() {
  const btn = document.getElementById("weakPointsButton");
  if (btn) btn.disabled = getHistory().length === 0;
}

// --- PROGRESSION PAR THÈME (objectif : 5 réussites par thème) ---

const TOPIC_GOAL = 5;

function updateTopicProgress() {
  const stats = getTopicStats();
  document.querySelectorAll(".topic-btn[data-topic]").forEach((btn) => {
    const prog = btn.querySelector(".topic-progress");
    if (!prog) return;
    const correct = stats[btn.dataset.topic]?.correct || 0;
    const pct = Math.min(100, (correct / TOPIC_GOAL) * 100);
    const done = correct >= TOPIC_GOAL;
    prog.innerHTML = `
      <span class="topic-progress-bar"><span class="topic-progress-fill${done ? " done" : ""}" style="width:${pct}%"></span></span>
      <span class="topic-progress-count">${done ? "🏆" : correct + "/" + TOPIC_GOAL}</span>
    `;
  });
}

// --- SAUVEGARDE AUTOMATIQUE (code + exercice en cours) ---

const DRAFT_CODE_KEY = "ccjs_draft_code";
const CURRENT_EX_KEY = "ccjs_current_exercise";

let draftSaveTimer;
codeMirrorInstance.on("change", () => {
  clearTimeout(draftSaveTimer);
  draftSaveTimer = setTimeout(() => {
    localStorage.setItem(DRAFT_CODE_KEY, codeMirrorInstance.getValue());
  }, 400);
});

function saveExerciseState() {
  localStorage.setItem(
    CURRENT_EX_KEY,
    JSON.stringify({
      html: exerciseContainer.innerHTML,
      text: currentExerciseText,
      topic: currentTopic,
      difficulty: currentDifficulty,
      id: currentExerciseId,
    }),
  );
}

function restoreSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(CURRENT_EX_KEY) || "null");
    if (saved && saved.text && saved.text.length > 20) {
      exerciseContainer.innerHTML = saved.html;
      currentExerciseText = saved.text;
      currentTopic = saved.topic;
      currentDifficulty = saved.difficulty || "débutant";
      currentExerciseId = saved.id || null;
      if (submitButton) submitButton.disabled = false;
    }
  } catch {
    /* sauvegarde corrompue : on repart de zéro */
  }
  const draft = localStorage.getItem(DRAFT_CODE_KEY);
  if (draft) codeMirrorInstance.setValue(draft);
}

// --- HISTORIQUE DES EXERCICES (revoir / refaire) ---

const EXERCISES_KEY = "ccjs_exercises";
const MAX_EXERCISES = 20;
let currentExerciseId = null;

function getExercises() {
  try {
    return JSON.parse(localStorage.getItem(EXERCISES_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveExerciseToHistory(html, code) {
  const exercises = getExercises();
  currentExerciseId = Date.now();
  exercises.push({
    id: currentExerciseId,
    html,
    code,
    text: currentExerciseText,
    topic: currentTopic,
    topicLabel: topicLabels[currentTopic] || "Points faibles",
    difficulty: currentDifficulty,
    timestamp: currentExerciseId,
    result: null,
  });
  if (exercises.length > MAX_EXERCISES)
    exercises.splice(0, exercises.length - MAX_EXERCISES);
  localStorage.setItem(EXERCISES_KEY, JSON.stringify(exercises));
}

function markExerciseResult(isCorrect) {
  if (!currentExerciseId) return;
  const exercises = getExercises();
  const entry = exercises.find((e) => e.id === currentExerciseId);
  // On ne rétrograde jamais un exercice déjà réussi
  if (entry && entry.result !== "correct") {
    entry.result = isCorrect ? "correct" : "incorrect";
    localStorage.setItem(EXERCISES_KEY, JSON.stringify(exercises));
  }
}

function renderHistoryList() {
  const list = document.getElementById("historyList");
  if (!list) return;
  const exercises = getExercises().slice().reverse();

  if (exercises.length === 0) {
    list.innerHTML =
      '<p class="history-empty">Aucun exercice pour l\'instant. Clique sur "Nouvel Exercice" pour commencer !</p>';
    return;
  }

  const badgeClasses = {
    débutant: "badge-debutant",
    intermédiaire: "badge-intermediaire",
    avancé: "badge-avance",
  };
  const resultIcons = { correct: "✅", incorrect: "❌" };

  list.innerHTML = exercises
    .map((e) => {
      const d = new Date(e.timestamp);
      const date =
        d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) +
        " " +
        d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      return `
        <div class="history-row">
          <span class="history-result">${resultIcons[e.result] || "▫️"}</span>
          <span class="history-topic">${e.topicLabel}</span>
          <span class="difficulty-badge ${badgeClasses[e.difficulty] || ""}">${e.difficulty}</span>
          <span class="history-date">${date}</span>
          <button class="history-retry" onclick="retryExercise(${e.id})">↻ Refaire</button>
        </div>`;
    })
    .join("");
}

function retryExercise(id) {
  const entry = getExercises().find((e) => e.id === id);
  if (!entry) return;

  exerciseContainer.innerHTML = entry.html;
  codeMirrorInstance.setValue(entry.code);
  currentExerciseText = entry.text;
  currentTopic = entry.topic;
  currentDifficulty = entry.difficulty;
  currentExerciseId = entry.id;
  sessionErrors = [];
  if (submitButton) submitButton.disabled = false;
  saveExerciseState();
  document.getElementById("historyModal").style.display = "none";
}

async function generateWeakPointsExercise() {
  topicModal.style.display = "none";

  const stats = getTopicStats();
  const statsLines = Object.values(stats)
    .sort((a, b) => a.correct / a.total - b.correct / b.total)
    .map((s) => {
      const pct = Math.round((s.correct / s.total) * 100);
      const errList = [...new Set(s.errors)].slice(0, 3);
      const errStr =
        errList.length > 0
          ? ` — erreurs fréquentes : ${errList.join(", ")}`
          : "";
      return `- ${s.label} : ${s.correct}/${s.total} réussis (${pct}%)${errStr}`;
    })
    .join("\n");

  const instructions = `Voici les statistiques de progression de l'étudiant :
${statsLines}

Génère un exercice ciblé sur le(s) sujet(s) où l'étudiant a le plus de difficultés (taux de réussite le plus bas ou erreurs récurrentes).
Si plusieurs sujets sont faibles, tu peux les combiner dans un seul exercice.
Adapte la difficulté pour permettre à l'étudiant de progresser.`;

  generateExercise(instructions);
}

// Gestion des boutons de difficulté
document.querySelectorAll(".difficulty-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".difficulty-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentDifficulty = btn.dataset.level;
  });
});

// --- 2. EXÉCUTION DU CODE (Console intégrée) ---

const CONSOLE_STYLE = `
  body { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; margin: 0; padding: 10px; background-color: #f8f9fa; color: #1a1a1a; }
  pre { font-size: 14px; margin: 0 0 4px; white-space: pre-wrap; word-wrap: break-word; }
  .placeholder { color: #9ca3af; font-style: italic; font-size: 13px; font-family: system-ui, sans-serif; }
`;

function initConsole(message) {
  const outputFrame = document.getElementById("outputFrame");
  const iframeDoc =
    outputFrame.contentDocument || outputFrame.contentWindow.document;
  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html>
    <head><style>${CONSOLE_STYLE}</style></head>
    <body><div class="placeholder">${message}</div></body>
    </html>
  `);
  iframeDoc.close();
}

function clearConsole() {
  lastError = null;
  const existingErrorBtn = document.getElementById("errorExplainBtn");
  if (existingErrorBtn) existingErrorBtn.remove();
  initConsole("Console effacée. Clique sur ▶ Tester le code pour relancer.");
}

function runCode() {
  // Réinitialisation de l'état d'erreur
  lastError = null;
  const existingErrorBtn = document.getElementById("errorExplainBtn");
  if (existingErrorBtn) existingErrorBtn.remove();

  const rawCode = codeMirrorInstance.getValue();

  // 🛡️ SÉCURITÉ : Échappement des caractères spéciaux
  // L'ordre est CRUCIAL : on échappe d'abord les antislashs (\)
  // Sinon, on échapperait les antislashs ajoutés pour les autres caractères !
  let code = rawCode.replace(/\\/g, "\\\\");
  code = code.replace(/`/g, "\\`");
  code = code.replace(/\${/g, "\\${");

  const outputFrame = document.getElementById("outputFrame");
  const iframeDoc =
    outputFrame.contentDocument || outputFrame.contentWindow.document;

  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            ${CONSOLE_STYLE}
            pre.error { color: #dc2626; }
        </style>
    </head>
    <body><div id="script-target"></div></body>
    </html>
  `);
  iframeDoc.close();

  setTimeout(() => {
    const scriptElement = iframeDoc.createElement("script");
    // On insère le code sécurisé dans le gabarit
    const scriptContent = `
        var originalLog = console.log;
        console.log = function(...args) {
            const message = args.map(arg => {
                return (typeof arg === 'object' && arg !== null) ? JSON.stringify(arg, null, 2) : String(arg);
            }).join(' ');
            const p = document.createElement('pre');
            p.textContent = message;
            document.body.appendChild(p);
        };
        try {
            ${code}
            if (!document.querySelector('pre')) {
                const p = document.createElement('div');
                p.className = 'placeholder';
                p.textContent = '✓ Code exécuté sans erreur (aucune sortie console — utilise console.log() pour afficher un résultat).';
                document.body.appendChild(p);
            }
        } catch (e) {
            const p = document.createElement('pre');
            p.className = 'error';
            p.textContent = 'Erreur : ' + e.message;
            document.body.appendChild(p);
            window.parent.postMessage({ type: 'error', message: e.message }, '*');
        }
    `;
    scriptElement.textContent = scriptContent;
    const target = iframeDoc.getElementById("script-target");
    if (target) target.appendChild(scriptElement);
  }, 50);
}

// --- 3. GÉNÉRATION D'EXERCICE ---

// Fonction 1 : Appelée quand on clique sur un bouton de sujet
async function loadPromptAndRun(fileName) {
  currentTopic = fileName;
  sessionErrors = [];
  topicModal.style.display = "none";

  // 2. On essaie de lire le fichier texte correspondant
  try {
    const response = await fetch("./" + fileName); // Suppose que les fichiers sont à la racine
    if (!response.ok) throw new Error("Fichier introuvable");
    const promptContent = await response.text();

    // 3. On lance la génération avec ce contenu spécifique
    generateExercise(promptContent);
  } catch (error) {
    alert(
      "Erreur : Impossible de lire le fichier " +
        fileName +
        ". Vérifie qu'il existe !",
    );
    console.error(error);
  }
}

// Fonction 2 : La génération (Mise à jour pour accepter les instructions)
async function generateExercise(specificInstructions = "") {
  if (newExerciseButton) newExerciseButton.disabled = true;

  exerciseContainer.innerHTML =
    '<p style="color: #1e3a5f;">Création de l\'exercice en cours... 🤖</p><p style="color: #1e3a5f;">Merci de patienter quelques secondes...</p>';

  // Le prompt "Système" reste le cadre général (Persona + Format de réponse)
  // J'ai retiré la partie "Contexte" pour la laisser au fichier texte spécifique
  const baseSystemPrompt = `
    Tu es un professeur expert en pédagogie pour le BUT MMI. 
    Tu dois créer un exercice court de JavaScript.
    
    Contraintes de rédaction :
    - Adresse-toi directement à l'étudiant (tu).
    - Pas d'introduction ni de conclusion.
    - L'énoncé ne doit pas dépasser 400 mots.
    
    Structure OBLIGATOIRE de la réponse (Respecte scrupuleusement le Markdown) :
    🎯 Consignes
    [Insérer l'énoncé]
    
    Code à Compléter
    [Insérer le bloc de code JS]
  `;

  const difficultyInstructions = {
    débutant:
      "L'exercice doit être très simple : une seule notion, peu de lignes, pas de cas limites.",
    intermédiaire:
      "L'exercice doit combiner 2-3 notions, avec une logique un peu plus élaborée.",
    avancé:
      "L'exercice doit être challenging : algorithme non trivial, gestion de cas particuliers, code plus long.",
  };

  // On combine la demande utilisateur avec le contenu du fichier texte
  const userQuery = `Génère un exercice JavaScript de niveau ${currentDifficulty}.
  Contrainte de difficulté : ${difficultyInstructions[currentDifficulty]}
  Voici les consignes pédagogiques spécifiques à respecter pour cet exercice :
  ${specificInstructions}`;

  try {
    const result = await callClaude(baseSystemPrompt, userQuery);
    const text = result || "Erreur de génération.";

    currentExerciseText = text; // Sauvegarde pour l'assistant
    if (submitButton) submitButton.disabled = false;

    const difficultyBadges = {
      débutant:
        '<span class="difficulty-badge badge-debutant">🟢 Débutant</span>',
      intermédiaire:
        '<span class="difficulty-badge badge-intermediaire">🟡 Intermédiaire</span>',
      avancé: '<span class="difficulty-badge badge-avance">🔴 Avancé</span>',
    };
    const badge = difficultyBadges[currentDifficulty] || "";

    // --- LOGIQUE DE SÉPARATION (Identique à avant) ---
    const separatorRegex =
      /#{1,6}\s*Code à Compléter|\*\*Code à Compléter\*\*|Code à Compléter/i;
    const splitMatch = text.match(separatorRegex);

    let instructionsPart = text;
    let codePart = "// Code ici...";

    if (splitMatch) {
      const splitIndex = splitMatch.index;
      instructionsPart = text.substring(0, splitIndex).trim();
      let rawCodePart = text
        .substring(splitIndex + splitMatch[0].length)
        .trim();
      codePart = rawCodePart
        .replace(/^```(javascript|js)?/i, "")
        .replace(/```$/, "")
        .trim();
    }

    exerciseContainer.innerHTML = `${badge}<div class="markdown-content">${formatMarkdown(
      instructionsPart,
    )}</div>`;
    codeMirrorInstance.setValue(codePart);
    saveExerciseToHistory(exerciseContainer.innerHTML, codePart);
    saveExerciseState();
  } catch (error) {
    console.error(error);
    exerciseContainer.innerHTML = `<p style="color: #dc2626;">Erreur API. Ça arrive... Regénère l'exercice !</p>`;
  } finally {
    if (newExerciseButton) newExerciseButton.disabled = false;
  }
}

// --- 4. VALIDATION AUTOMATIQUE ---

async function validateCode() {
  if (currentExerciseText === "Aucun exercice généré pour le moment.") return;

  if (hintLevels) hintLevels.style.display = "none";
  assistantModal.style.display = "block";
  assistantContent.innerHTML =
    '<p style="color: #1e3a5f; text-align: center; margin-top: 50px;">Évaluation de ta réponse en cours... ⏳</p>';

  const studentCode = codeMirrorInstance.getValue();

  const systemPrompt = `
Tu es un correcteur automatique d'exercices JavaScript pour étudiants BUT MMI.
Tu dois évaluer si le code de l'étudiant répond correctement à l'exercice demandé.
Réponds TOUJOURS en commençant par une ligne de verdict avec exactement ce format :
VERDICT: CORRECT ou VERDICT: INCORRECT

Puis explique en 2-4 phrases pourquoi, sans donner la correction complète si c'est incorrect.
Tu dois t'exprimer en français.
`;

  const userPrompt = `
Exercice proposé à l'étudiant :
${currentExerciseText}

Code soumis par l'étudiant :
${studentCode}
`;

  try {
    const result = await callClaude(systemPrompt, userPrompt);

    const isCorrect = result && result.includes("VERDICT: CORRECT");
    const feedback = result
      ? result.replace(/^VERDICT:\s*(CORRECT|INCORRECT)\s*/i, "").trim()
      : "Impossible d'analyser la réponse.";

    const verdictHtml = isCorrect
      ? `<div class="verdict verdict-correct">✅ Exercice réussi !</div>`
      : `<div class="verdict verdict-incorrect">❌ Pas tout à fait...</div>`;

    saveAttempt(isCorrect);
    markExerciseResult(isCorrect);
    assistantContent.innerHTML = verdictHtml + formatMarkdown(feedback);
    if (isCorrect) launchConfetti();
  } catch (error) {
    assistantContent.innerHTML = `<p style="color: #dc2626;">Erreur d'évaluation (${error.message})</p>`;
  }
}

// --- 4a. CONFETTIS DE RÉUSSITE ---

function launchConfetti() {
  const colors = ["#1e3a5f", "#16a34a", "#0369a1", "#d97706", "#dc2626"];
  const container = document.createElement("div");
  container.className = "confetti-container";
  for (let i = 0; i < 70; i++) {
    const c = document.createElement("div");
    c.className = "confetti";
    c.style.left = Math.random() * 100 + "vw";
    c.style.backgroundColor = colors[i % colors.length];
    c.style.animationDelay = Math.random() * 0.7 + "s";
    c.style.animationDuration = 2 + Math.random() * 1.5 + "s";
    c.style.width = 6 + Math.random() * 6 + "px";
    c.style.height = 8 + Math.random() * 8 + "px";
    container.appendChild(c);
  }
  document.body.appendChild(container);
  setTimeout(() => container.remove(), 4500);
}

// --- 5. ASSISTANT PÉDAGOGIQUE (indices progressifs) ---

const HINT_PROMPTS = {
  1: `Donne UN SEUL indice léger, en 2-3 phrases maximum, sous forme de piste de
réflexion ou de question qui oriente l'étudiant. Ne montre JAMAIS de code,
ne désigne pas la ligne exacte du problème. Si le code est déjà correct,
félicite-le simplement.`,
  2: `Indique précisément OÙ se situe le problème (quelle partie ou quelle ligne
du code) et quelle notion est mal utilisée, en 3-5 phrases. Ne donne pas la
correction, pas de code corrigé. Si le code est déjà correct, félicite-le.`,
  3: `Explique la démarche complète étape par étape pour résoudre l'exercice, et
donne la structure du code attendue (squelette ou pseudo-code avec des trous),
mais JAMAIS la solution finale copiable telle quelle. Si le code est déjà
correct, félicite-le.`,
};

const HINT_LOADING = {
  1: "Préparation d'un petit indice... 💡",
  2: "Analyse de ton code en cours... 🔍",
  3: "Préparation d'une aide détaillée... 🛟",
};

function openAssistant() {
  if (hintLevels) hintLevels.style.display = "flex";
  assistantContent.innerHTML = `<p>
    Je suis là pour t'aider. Choisis un niveau d'aide ci-dessus :
    commence par l'indice léger 💡, et monte d'un cran si tu restes bloqué.
  </p>`;
  assistantModal.style.display = "block";
}

async function askAssistant(level = 1) {
  if (hintLevels) hintLevels.style.display = "flex";
  assistantModal.style.display = "block";
  assistantContent.innerHTML = `<p style="color: #1e3a5f; text-align: center; margin-top: 50px;">${HINT_LOADING[level]}</p>`;

  const studentCode = codeMirrorInstance.getValue();
  // Pour l'assistant, on garde le texte complet (currentExerciseText) s'il existe
  const exerciseText =
    currentExerciseText.length > 20
      ? currentExerciseText
      : exerciseContainer.innerText;

  const systemPrompt = `
Tu es un expert en développement javascript.
Tu dois aider un étudiant de première année en BUT MMI.
Tu ne dois jamais donner la correction complète de l'exercice.
Tu dois t'exprimer en français, avec un ton encourageant.
Niveau d'aide demandé par l'étudiant :
${HINT_PROMPTS[level]}
`;

  const userQuery = `
Voici l'exercice complet proposé à l'étudiant :
${exerciseText}

Voici le programme proposé par l'étudiant :
${studentCode}
`;

  try {
    const result = await callClaude(systemPrompt, userQuery);
    assistantContent.innerHTML = formatMarkdown(result);
  } catch (error) {
    assistantContent.innerHTML = `<p style="color: #dc2626;">Erreur d'analyse (${error.message})</p>`;
  }
}

function closeAssistant() {
  assistantModal.style.display = "none";
}

// --- 4b. GESTION DES ERREURS (Debug Assistant) ---

window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "error") {
    lastError = event.data.message;
    sessionErrors.push(event.data.message);
    addErrorButton();
  }
});

function addErrorButton() {
  const actions = document.querySelector(".console-actions");
  if (!actions || document.getElementById("errorExplainBtn")) return;

  const btn = document.createElement("button");
  btn.id = "errorExplainBtn";
  btn.textContent = "🚑 Expliquer l'erreur";
  btn.onclick = explainError;

  // Insère le bouton avant le bouton "Effacer"
  actions.insertBefore(btn, actions.firstChild);
}

async function explainError() {
  if (!lastError) return;

  if (hintLevels) hintLevels.style.display = "none";
  assistantModal.style.display = "block";
  assistantContent.innerHTML =
    '<p style="color: #1e3a5f; text-align: center; margin-top: 50px;">Analyse de l\'erreur en cours... 🚑</p>';

  const studentCode = codeMirrorInstance.getValue();
  const systemPrompt =
    "Tu es un expert en pédagogie JavaScript. Explique l'erreur rencontrée par l'étudiant simplement et donne une piste de correction sans donner la solution complète.";
  const userPrompt = `Code de l'étudiant :\n${studentCode}\n\nErreur rencontrée :\n${lastError}`;

  try {
    const result = await callClaude(systemPrompt, userPrompt);
    assistantContent.innerHTML = formatMarkdown(result);
  } catch (error) {
    assistantContent.innerHTML = `<p style="color: #dc2626;">Erreur d'analyse (${error.message})</p>`;
  }
}

// --- 5. UTILITAIRES ---

async function callClaude(systemPrompt, userPrompt) {
  const payload = {
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8192,
    temperature: 1,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  };

  let response;
  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      "Impossible de contacter le serveur. Vérifie ta connexion internet.",
    );
  }

  if (!response.ok) {
    if (response.status === 0 || !response.status) {
      throw new Error("Serveur inaccessible. Vérifie ta connexion réseau.");
    }
    if (response.status >= 500) {
      throw new Error(
        "Le serveur proxy est indisponible. Réessaie dans quelques instants.",
      );
    }
    if (response.status === 429) {
      throw new Error(
        "Trop de requêtes envoyées. Attends quelques secondes avant de réessayer.",
      );
    }
    throw new Error(
      `Erreur serveur (code ${response.status}). Réessaie ou contacte ton professeur.`,
    );
  }

  const result = await response.json();
  return result.content?.[0]?.text;
}

function formatMarkdown(text) {
  if (!text) return "";
  let html = text;
  html = html.replace(/^###\s*(.*$)/gim, "<h4>$1</h4>");
  html = html.replace(/^##\s*(.*$)/gim, "<h3>$1</h3>");
  html = html.replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/gim, "<em>$1</em>");
  html = html.replace(/\n/g, "<br>");
  return html;
}

// --- 6. ÉVÉNEMENTS ---

// Initialisation
updateScoreDisplay();
updateWeakPointsButton();
updateTopicProgress();
restoreSession();
initConsole(
  "La sortie de ton code s'affichera ici. Clique sur ▶ Tester le code (ou Ctrl + Entrée).",
);

const runBtn = document.getElementById("runButton");
if (runBtn) runBtn.addEventListener("click", runCode);

const clearConsoleBtn = document.getElementById("clearConsoleButton");
if (clearConsoleBtn) clearConsoleBtn.addEventListener("click", clearConsole);

// Raccourci clavier : Ctrl+Entrée (ou Cmd+Entrée sur Mac) pour tester
document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    runCode();
  }
});

const weakPointsButton = document.getElementById("weakPointsButton");
if (weakPointsButton)
  weakPointsButton.addEventListener("click", generateWeakPointsExercise);

if (newExerciseButton) {
  newExerciseButton.addEventListener("click", () => {
    updateTopicProgress();
    topicModal.style.display = "block";
  });
}

// Gestion fermeture modale Sujet
if (closeTopicButton) {
  closeTopicButton.addEventListener("click", () => {
    topicModal.style.display = "none";
  });
}

// Historique des exercices
const historyModal = document.getElementById("historyModal");
const historyButton = document.getElementById("historyButton");
if (historyButton) {
  historyButton.addEventListener("click", () => {
    renderHistoryList();
    historyModal.style.display = "block";
  });
}
const closeHistoryButton = document.getElementById("closeHistoryButton");
if (closeHistoryButton) {
  closeHistoryButton.addEventListener("click", () => {
    historyModal.style.display = "none";
  });
}

// Fermeture des modales en cliquant en dehors ou avec Échap
window.onclick = function (event) {
  if (event.target == assistantModal) closeAssistant();
  if (event.target == topicModal) topicModal.style.display = "none";
  if (event.target == historyModal) historyModal.style.display = "none";
};

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (assistantModal.style.display === "block") closeAssistant();
  if (topicModal.style.display === "block") topicModal.style.display = "none";
  if (historyModal && historyModal.style.display === "block")
    historyModal.style.display = "none";
});

if (submitButton) submitButton.addEventListener("click", validateCode);
if (assistantButton) assistantButton.addEventListener("click", openAssistant);
if (closeModalButton)
  closeModalButton.addEventListener("click", closeAssistant);

// Boutons de niveau d'indice
document.querySelectorAll(".hint-btn").forEach((btn) => {
  btn.addEventListener("click", () => askAssistant(parseInt(btn.dataset.level)));
});
