// --- 1. INITIALISATION ----

const editorElement = document.getElementById("editor");
const codeMirrorInstance = CodeMirror.fromTextArea(editorElement, {
  lineNumbers: true,
  mode: "javascript",
  theme: "gestion",
  lineWrapping: true,
});
//

//const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.0-pro:generateContent?key=${API_KEY}`;
const API_URL =
  "https://web-mmi2.iutbeziers.fr/~nicolas.maurin1/CCJS/proxy.php";

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
// ⭐️ NOUVEAU : Éléments de la modale d'exécution
const executionModal = document.getElementById("executionModal");
const closeExecutionButton = document.getElementById("closeExecutionButton");

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

// --- 2. EXÉCUTION DU CODE (RunCode) ---

function runCode() {
  // ⭐️ NOUVEAU : On ouvre la pop-up dès qu'on lance le test
  if (executionModal) executionModal.style.display = "block";

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
            body { font-family: monospace; margin: 0; padding: 10px; background-color: #dedede; }
            pre { font-size: 16px; margin: 0; white-space: pre-wrap; word-wrap: break-word; }
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
        } catch (e) {
            const p = document.createElement('pre');
            p.style.color = 'red';
            p.textContent = 'Erreur: ' + e.message;
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
    const result = await callGemini(baseSystemPrompt, userQuery);
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
    const result = await callGemini(systemPrompt, userPrompt);

    const isCorrect = result && result.includes("VERDICT: CORRECT");
    const feedback = result
      ? result.replace(/^VERDICT:\s*(CORRECT|INCORRECT)\s*/i, "").trim()
      : "Impossible d'analyser la réponse.";

    const verdictHtml = isCorrect
      ? `<div class="verdict verdict-correct">✅ Exercice réussi !</div>`
      : `<div class="verdict verdict-incorrect">❌ Pas tout à fait...</div>`;

    saveAttempt(isCorrect);
    assistantContent.innerHTML = verdictHtml + formatMarkdown(feedback);
  } catch (error) {
    assistantContent.innerHTML = `<p style="color: #dc2626;">Erreur d'évaluation (${error.message})</p>`;
  }
}

// --- 5. ASSISTANT PÉDAGOGIQUE (Pop-up) ---

async function askAssistant() {
  assistantModal.style.display = "block";
  assistantContent.innerHTML =
    '<p style="color: #1e3a5f; text-align: center; margin-top: 50px;">Analyse de ton code en cours... 🧐</p>';

  const studentCode = codeMirrorInstance.getValue();
  // Pour l'assistant, on garde le texte complet (currentExerciseText) s'il existe
  const exerciseText =
    currentExerciseText.length > 20
      ? currentExerciseText
      : exerciseContainer.innerText;

  const systemPrompt = `
Tu es un expert en développement javascript.
Tu dois aider un étudiant de première année en BUT MMI.
Tu ne dois jamais donner la correction de l'exercice, juste des indices.
Tu dois t'exprimer en français.
Si le code est correct, félicite-le. Sinon, aide-le à trouver l'erreur.
`;

  const userQuery = `
Voici l'exercice complet proposé à l'étudiant : 
${exerciseText}

Voici le programme proposé par l'étudiant : 
${studentCode}
`;

  try {
    const result = await callGemini(systemPrompt, userQuery);
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
  const footer = executionModal.querySelector(".modal-footer");
  if (!footer || document.getElementById("errorExplainBtn")) return;

  const btn = document.createElement("button");
  btn.id = "errorExplainBtn";
  btn.textContent = "Expliquer l'erreur 🚑";
  btn.style.backgroundColor = "#dc2626";
  btn.style.color = "white";
  btn.style.marginRight = "10px";
  btn.onclick = explainError;

  // Insère le bouton avant le bouton "Fermer"
  footer.insertBefore(btn, footer.firstChild);
}

async function explainError() {
  if (!lastError) return;

  executionModal.style.display = "none";
  assistantModal.style.display = "block";
  assistantContent.innerHTML =
    '<p style="color: #1e3a5f; text-align: center; margin-top: 50px;">Analyse de l\'erreur en cours... 🚑</p>';

  const studentCode = codeMirrorInstance.getValue();
  const systemPrompt =
    "Tu es un expert en pédagogie JavaScript. Explique l'erreur rencontrée par l'étudiant simplement et donne une piste de correction sans donner la solution complète.";
  const userPrompt = `Code de l'étudiant :\n${studentCode}\n\nErreur rencontrée :\n${lastError}`;

  try {
    const result = await callGemini(systemPrompt, userPrompt);
    assistantContent.innerHTML = formatMarkdown(result);
  } catch (error) {
    assistantContent.innerHTML = `<p style="color: #dc2626;">Erreur d'analyse (${error.message})</p>`;
  }
}

// --- 5. UTILITAIRES ---

async function callGemini(systemPrompt, userPrompt) {
  const payload = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 1,
      maxOutputTokens: 8192,
    },
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
  return result.candidates?.[0]?.content?.parts?.[0]?.text;
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

const runBtn = document.getElementById("runButton");
if (runBtn) runBtn.addEventListener("click", runCode);

const weakPointsButton = document.getElementById("weakPointsButton");
if (weakPointsButton)
  weakPointsButton.addEventListener("click", generateWeakPointsExercise);

if (newExerciseButton) {
  newExerciseButton.addEventListener("click", () => {
    topicModal.style.display = "block";
  });
}

// Gestion fermeture modale Sujet
if (closeTopicButton) {
  closeTopicButton.addEventListener("click", () => {
    topicModal.style.display = "none";
  });
}

// Fermeture des modales en cliquant en dehors ou avec Échap
window.onclick = function (event) {
  if (event.target == assistantModal) closeAssistant();
  if (event.target == executionModal) executionModal.style.display = "none";
  if (event.target == topicModal) topicModal.style.display = "none";
};

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (assistantModal.style.display === "block") closeAssistant();
  if (executionModal.style.display === "block")
    executionModal.style.display = "none";
  if (topicModal.style.display === "block") topicModal.style.display = "none";
});

if (submitButton) submitButton.addEventListener("click", validateCode);
if (assistantButton) assistantButton.addEventListener("click", askAssistant);
if (closeModalButton)
  closeModalButton.addEventListener("click", closeAssistant);
if (closeExecutionButton) {
  closeExecutionButton.addEventListener("click", () => {
    executionModal.style.display = "none";
  });
}
