/* Module Phaser : éditeur de code + aperçu du jeu dans une iframe isolée.
   Le code de l'étudiant est injecté dans un document complet chargé via une
   URL blob, ce qui garantit un contexte neuf à chaque exécution (une scène
   Phaser ne peut pas être relancée proprement dans un contexte déjà utilisé). */

const PHASER_CDN =
  "https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js";

let cmEditor = null;
let currentExample = PHASER_EXAMPLES[0];

// Une URL blob par iframe (l'aperçu et la pop-up de correction), pour pouvoir
// libérer la précédente à chaque relance.
const frameUrls = new Map();

/* ── Console ─────────────────────────────────────────────────────────────── */

function consoleEl() {
  return document.getElementById("consoleOutput");
}

function clearConsole() {
  const out = consoleEl();
  out.innerHTML =
    '<div class="console-placeholder">Les messages de console.log() et les erreurs s\'afficheront ici.</div>';
}

function appendConsole(type, message) {
  const out = consoleEl();
  const placeholder = out.querySelector(".console-placeholder");
  if (placeholder) placeholder.remove();

  const line = document.createElement("pre");
  line.className = "console-line console-" + type;
  line.textContent = (type === "error" ? "⛔ " : type === "warn" ? "⚠ " : "") + message;
  out.appendChild(line);
  out.scrollTop = out.scrollHeight;
}

window.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.source !== "phaser-playground") return;
  // La pop-up de correction tourne dans sa propre iframe : ses messages ne
  // doivent pas polluer la console de l'étudiant.
  if (data.channel !== "editeur") return;
  appendConsole(data.type, data.message);
});

/* ── Construction du document de jeu ─────────────────────────────────────── */

function buildGameDocument(userCode, channel) {
  // Une balise fermante dans une chaîne du code étudiant casserait le document.
  const safeCode = String(userCode).replace(/<\/script/gi, "<\\/script");

  const bootstrap = `
    (function () {
      function format(value) {
        if (value instanceof Error) return value.message;
        if (typeof value === 'object' && value !== null) {
          try { return JSON.stringify(value); } catch (e) { return String(value); }
        }
        return String(value);
      }
      // console.log accepte des directives (%s, %d, %c...) : Phaser s'en sert
      // pour sa bannière colorée, qu'il faut résoudre avant affichage.
      function formatArgs(args) {
        var list = Array.prototype.slice.call(args);
        if (typeof list[0] !== 'string' || !/%[scdifoO]/.test(list[0])) {
          return list.map(format).join(' ');
        }
        var rest = list.slice(1);
        var head = list[0].replace(/%([scdifoO%])/g, function (match, kind) {
          if (kind === '%') return '%';
          if (!rest.length) return match;
          var value = rest.shift();
          return kind === 'c' ? '' : format(value);
        });
        return [head].concat(rest.map(format)).join(' ').replace(/\\s+/g, ' ').trim();
      }
      function send(type, args) {
        try {
          parent.postMessage({
            source: 'phaser-playground',
            channel: ${JSON.stringify(channel)},
            type: type,
            message: formatArgs(args)
          }, '*');
        } catch (e) { /* la fenêtre parente a pu changer */ }
      }
      ['log', 'info', 'warn', 'error'].forEach(function (name) {
        var original = console[name];
        console[name] = function () {
          send(name === 'info' ? 'log' : name, arguments);
          original.apply(console, arguments);
        };
      });
      window.addEventListener('error', function (e) { send('error', [e.message]); });
      window.addEventListener('unhandledrejection', function (e) {
        send('error', [e.reason && e.reason.message ? e.reason.message : e.reason]);
      });
      if (!window.Phaser) {
        send('error', ['Phaser n\\'a pas pu être chargé. Vérifie ta connexion internet.']);
      }
    })();
  `;

  // Le document est chargé via une URL blob, qui n'a pas de chemin de base :
  // sans cette balise, "assets/sky.png" ne résoudrait vers rien.
  const base = new URL("./phaser/", window.location.href).href;

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<base href="${base}">
<style>
  /* Phaser mesure la taille de body pour son mode FIT : body doit donc
     occuper toute la fenêtre, et c'est autoCenter qui centre le canvas. */
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
  body { background: #11162a; }
  canvas { display: block; }
</style>
<script src="${PHASER_CDN}"></script>
</head>
<body>
<script>${bootstrap}</script>
<script>${safeCode}</script>
</body>
</html>`;
}

/* ── Exécution ───────────────────────────────────────────────────────────── */

function runInFrame(frame, code, channel) {
  // On libère l'URL précédente pour ne pas fuir de mémoire.
  const previous = frameUrls.get(channel);
  if (previous) URL.revokeObjectURL(previous);

  const blob = new Blob([buildGameDocument(code, channel)], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  frameUrls.set(channel, url);
  frame.src = url;
}

function runCode() {
  clearConsole();
  runInFrame(document.getElementById("gameFrame"), cmEditor.getValue(), "editeur");
}

function resetCode() {
  cmEditor.setValue(codeDepart(currentExample.code));
  runCode();
}

/* ── Code à trous ────────────────────────────────────────────────────────── */

/* Les exemples de tutoriels sont écrits en entier, mais les passages que
   l'étudiant doit trouver sont encadrés par deux marqueurs :

     // @trou Créer le groupe de plates-formes
     ...lignes de solution...
     // @fin

   L'éditeur n'affiche que la consigne ; la solution ne sert qu'à faire tourner
   l'aperçu du résultat attendu dans la pop-up. */

const MARQUEUR_DEBUT = /^([ \t]*)\/\/ @trou (.+)$/;
const MARQUEUR_FIN = /^[ \t]*\/\/ @fin\s*$/;

function codeDepart(code) {
  const lignes = [];
  let ouvert = null;

  code.split("\n").forEach((ligne) => {
    if (ouvert) {
      if (MARQUEUR_FIN.test(ligne)) {
        lignes.push(ouvert[1] + "/* À COMPLETER : " + ouvert[2] + " */");
        ouvert = null;
      }
      return;
    }
    const debut = ligne.match(MARQUEUR_DEBUT);
    if (debut) ouvert = debut;
    else lignes.push(ligne);
  });

  return lignes.join("\n");
}

function codeSolution(code) {
  return code.split("\n").filter((ligne) => {
    return !MARQUEUR_DEBUT.test(ligne) && !MARQUEUR_FIN.test(ligne);
  }).join("\n");
}

/* ── Pop-up « résultat attendu » ─────────────────────────────────────────── */

function openSolution() {
  const modal = document.getElementById("solutionModal");
  modal.hidden = false;
  document.getElementById("solutionLabel").textContent = currentExample.label;
  runInFrame(
    document.getElementById("solutionFrame"),
    codeSolution(currentExample.code),
    "solution"
  );
}

function closeSolution() {
  const modal = document.getElementById("solutionModal");
  modal.hidden = true;
  // On vide l'iframe pour arrêter la boucle de rendu du jeu.
  document.getElementById("solutionFrame").src = "about:blank";
}

/* ── Exemples ────────────────────────────────────────────────────────────── */

function loadExample(id) {
  const example = PHASER_EXAMPLES.find((item) => item.id === id);
  if (!example) return;

  currentExample = example;
  document.getElementById("exampleDescription").textContent = example.description;

  const depart = codeDepart(example.code);
  // Sans trou à combler, montrer le résultat attendu n'apporterait rien.
  document.getElementById("solutionButton").hidden = depart === example.code;

  cmEditor.setValue(depart);
  runCode();
}

function fillExampleSelect() {
  const select = document.getElementById("exampleSelect");
  const groups = new Map();

  PHASER_EXAMPLES.forEach((example) => {
    if (!groups.has(example.group)) {
      const optgroup = document.createElement("optgroup");
      optgroup.label = example.group;
      select.appendChild(optgroup);
      groups.set(example.group, optgroup);
    }
    const option = document.createElement("option");
    option.value = example.id;
    option.textContent = example.label;
    groups.get(example.group).appendChild(option);
  });

  select.addEventListener("change", () => loadExample(select.value));
}

/* ── Initialisation ──────────────────────────────────────────────────────── */

document.addEventListener("DOMContentLoaded", () => {
  cmEditor = CodeMirror.fromTextArea(document.getElementById("editor"), {
    mode: "javascript",
    lineNumbers: true,
    indentUnit: 2,
    tabSize: 2,
    lineWrapping: true,
    extraKeys: {
      "Ctrl-Enter": runCode,
      "Cmd-Enter": runCode,
    },
  });

  fillExampleSelect();

  document.getElementById("runButton").addEventListener("click", runCode);
  document.getElementById("resetButton").addEventListener("click", resetCode);
  document.getElementById("clearConsoleButton").addEventListener("click", clearConsole);

  document.getElementById("solutionButton").addEventListener("click", openSolution);
  document.getElementById("solutionClose").addEventListener("click", closeSolution);
  document.getElementById("solutionModal").addEventListener("click", (event) => {
    if (event.target.id === "solutionModal") closeSolution();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSolution();
  });

  loadExample(PHASER_EXAMPLES[0].id);
});
