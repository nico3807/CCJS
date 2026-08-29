/* Module Phaser : éditeur de code + aperçu du jeu dans une iframe isolée.
   Le code de l'étudiant est injecté dans un document complet chargé via une
   URL blob, ce qui garantit un contexte neuf à chaque exécution (une scène
   Phaser ne peut pas être relancée proprement dans un contexte déjà utilisé). */

const PHASER_CDN =
  "https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js";

let cmEditor = null;
let currentExample = PHASER_EXAMPLES[0];
let currentObjectUrl = null;

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
  appendConsole(data.type, data.message);
});

/* ── Construction du document de jeu ─────────────────────────────────────── */

function buildGameDocument(userCode) {
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

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
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

function runCode() {
  const frame = document.getElementById("gameFrame");
  const code = cmEditor.getValue();

  clearConsole();

  // On libère l'URL précédente pour ne pas fuir de mémoire.
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);

  const blob = new Blob([buildGameDocument(code)], { type: "text/html" });
  currentObjectUrl = URL.createObjectURL(blob);
  frame.src = currentObjectUrl;
}

function resetCode() {
  cmEditor.setValue(currentExample.code);
  runCode();
}

/* ── Exemples ────────────────────────────────────────────────────────────── */

function loadExample(id) {
  const example = PHASER_EXAMPLES.find((item) => item.id === id);
  if (!example) return;

  currentExample = example;
  document.getElementById("exampleDescription").textContent = example.description;
  cmEditor.setValue(example.code);
  runCode();
}

function fillExampleSelect() {
  const select = document.getElementById("exampleSelect");
  PHASER_EXAMPLES.forEach((example) => {
    const option = document.createElement("option");
    option.value = example.id;
    option.textContent = example.label;
    select.appendChild(option);
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

  loadExample(PHASER_EXAMPLES[0].id);
});
