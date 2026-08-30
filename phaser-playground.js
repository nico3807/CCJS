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

// Erreurs de la dernière exécution : l'assistant s'en sert comme indice.
let dernieresErreurs = [];

function clearConsole() {
  const out = consoleEl();
  out.innerHTML =
    '<div class="console-placeholder">Les messages de console.log() et les erreurs s\'afficheront ici.</div>';
  dernieresErreurs = [];
}

function appendConsole(type, message) {
  const out = consoleEl();
  const placeholder = out.querySelector(".console-placeholder");
  if (placeholder) placeholder.remove();

  // Une erreur dans update() se répète à chaque frame : on ne la retient
  // qu'une fois, sinon la liste grossirait sans fin.
  if (type === "error" && !dernieresErreurs.includes(message)) {
    dernieresErreurs.push(message);
  }

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

      /* Les deux aperçus (éditeur et « résultat attendu ») sont servis depuis
         des URL blob, qui héritent de l'origine de la page : ils partagent donc
         le même localStorage. Sans cloisonnement, une partie jouée dans la
         solution laisserait son record dans l'exercice de l'étudiant.

         On préfixe donc les clés par le nom de la fenêtre. Le code du jeu
         continue d'écrire localStorage.getItem('mon.record') : le préfixe est
         invisible pour lui, et la notion reste juste à enseigner. */
      (function () {
        var prefixe = 'ccjs:' + ${JSON.stringify(channel)} + ':';
        var reel = window.localStorage;
        var cloison = {
          getItem: function (cle) { return reel.getItem(prefixe + cle); },
          setItem: function (cle, valeur) { return reel.setItem(prefixe + cle, valeur); },
          removeItem: function (cle) { return reel.removeItem(prefixe + cle); },
          key: function (i) {
            var cles = Object.keys(reel).filter(function (k) { return k.indexOf(prefixe) === 0; });
            return i < cles.length ? cles[i].slice(prefixe.length) : null;
          },
          clear: function () {
            Object.keys(reel).forEach(function (k) {
              if (k.indexOf(prefixe) === 0) reel.removeItem(k);
            });
          }
        };
        Object.defineProperty(cloison, 'length', {
          get: function () {
            return Object.keys(reel).filter(function (k) { return k.indexOf(prefixe) === 0; }).length;
          }
        });
        try {
          Object.defineProperty(window, 'localStorage', { value: cloison, configurable: true });
        } catch (e) { /* si le navigateur refuse, on garde le stockage partagé */ }
      })();
      if (!window.Phaser) {
        send('error', ['Phaser n\\'a pas pu être chargé. Vérifie ta connexion internet.']);
      }

      /* Quand la pop-up « résultat attendu » s'ouvre, l'aperçu de l'éditeur
         continue de tourner derrière elle : deux jeux Phaser se disputent alors
         le processeur. Les images s'espacent, donc les corps avancent de plus
         gros pas entre deux tests de collision — et un joueur rapide finit par
         franchir une plate-forme d'un seul bond de simulation.

         La page parente nous demande donc d'endormir la boucle. Encore
         faut-il tenir la liste des jeux créés : le code de l'étudiant écrit
         « new Phaser.Game(config) » sans garder la référence. */
      var jeux = [];
      var dortDeja = false;

      if (window.Phaser && Phaser.Game) {
        var JeuOriginal = Phaser.Game;
        var JeuSuivi = function (config) {
          // Un constructeur qui retourne un objet renvoie cet objet : le code
          // de l'étudiant reçoit bien une vraie instance de Phaser.Game.
          var jeu = new JeuOriginal(config);
          jeux.push(jeu);
          /* Attention au calendrier : à la sortie du constructeur, et même à
             l'événement « ready », loop.running vaut encore false — Phaser ne
             lance sa boucle qu'ensuite, et sleep() ne fait rien sur une boucle
             à l'arrêt. On attend donc un tour de boucle d'événements après
             « ready » pour endormir un aperçu né pendant la pop-up. */
          try {
            jeu.events.once('ready', function () {
              setTimeout(function () { if (dortDeja) endormir(jeu); }, 0);
            });
          } catch (e) { /* version de Phaser inattendue */ }
          return jeu;
        };
        JeuSuivi.prototype = JeuOriginal.prototype; // pour que instanceof tienne
        Phaser.Game = JeuSuivi;
      }

      function endormir(jeu) {
        // sleep() coupe le requestAnimationFrame : le jeu ne consomme plus rien.
        try { jeu.loop.sleep(); } catch (e) { /* version de Phaser inattendue */ }
      }

      function reveiller(jeu) {
        // wake(true) reprend « sans couture » : sans lui, Phaser rattraperait
        // d'un coup tout le temps écoulé pendant la pause.
        try { jeu.loop.wake(true); } catch (e) { /* idem */ }
      }

      window.addEventListener('message', function (e) {
        var ordre = e.data;
        if (!ordre || ordre.source !== 'phaser-playground-parent') return;
        if (ordre.action === 'dormir') {
          dortDeja = true;
          jeux.forEach(endormir);
        } else if (ordre.action === 'reveiller') {
          dortDeja = false;
          jeux.forEach(reveiller);
        }
      });

      /* Relancer l'aperçu remplace le document de l'iframe. Un ordre envoyé
         pendant ce remplacement arriverait dans le document sortant et serait
         perdu. On annonce donc notre arrivée, et la page parente nous renvoie
         l'état courant — ainsi un aperçu qui démarre pop-up déjà ouverte
         naît endormi. */
      try {
        parent.postMessage({ source: 'phaser-playground-pret', channel: ${JSON.stringify(channel)} }, '*');
      } catch (e) { /* la fenêtre parente a pu changer */ }
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

/** La liste des consignes de l'exercice, sans la solution : c'est ce que
    l'assistant reçoit comme énoncé. */
function consignes(code) {
  return code.split("\n").reduce((liste, ligne) => {
    const debut = ligne.match(MARQUEUR_DEBUT);
    if (debut) liste.push(debut[2]);
    return liste;
  }, []);
}

/* ── Pop-up « résultat attendu » ─────────────────────────────────────────── */

/** Endort ou réveille l'aperçu de l'éditeur, caché derrière la pop-up.
    Deux jeux Phaser côte à côte se partagent le processeur : les images
    s'espacent, la physique avance par pas plus grands, et les collisions
    finissent par être franchies. On laisse donc tourner un seul jeu à la fois. */
function piloteApercuEditeur(action) {
  const frame = document.getElementById("gameFrame");
  if (!frame.contentWindow) return;
  frame.contentWindow.postMessage(
    { source: "phaser-playground-parent", action },
    "*"
  );
}

// Un aperçu qui vient de démarrer nous salue : on lui répond l'état courant,
// sans quoi un aperçu relancé pop-up ouverte se remettrait à tourner.
window.addEventListener("message", (event) => {
  if (!event.data || event.data.source !== "phaser-playground-pret") return;
  if (event.data.channel !== "editeur") return;
  if (document.getElementById("solutionModal").hidden) return;
  piloteApercuEditeur("dormir");
});

function openSolution() {
  const modal = document.getElementById("solutionModal");
  modal.hidden = false;
  document.getElementById("solutionLabel").textContent = currentExample.label;
  // On endort avant de lancer la solution, pour qu'elle démarre à plein régime.
  piloteApercuEditeur("dormir");
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
  // L'étudiant retrouve son aperçu là où il l'avait laissé.
  piloteApercuEditeur("reveiller");
}

/* ── Assistant pédagogique ───────────────────────────────────────────────── */

/* Trois niveaux d'aide, comme dans les modules JS et PHP : l'étudiant monte
   d'un cran s'il reste bloqué. La solution n'est jamais envoyée au modèle —
   il ne connaît que les consignes et le code écrit par l'étudiant. */

const NIVEAUX_AIDE = {
  1: `Donne UN SEUL indice léger, en 2-3 phrases maximum, sous forme de piste de
réflexion ou de question qui oriente l'étudiant. Ne montre JAMAIS de code,
ne désigne pas la ligne exacte du problème. Si le code est déjà correct,
félicite-le simplement.`,
  2: `Indique précisément OÙ se situe le problème (quelle partie du code, quel
trou à compléter) et quelle notion Phaser est mal utilisée, en 3-5 phrases.
Ne donne pas la correction, pas de code corrigé. Si le code est déjà correct,
félicite-le.`,
  3: `Explique la démarche complète étape par étape pour compléter l'exercice, et
donne la structure attendue (pseudo-code, ou nom des méthodes Phaser à appeler
et dans quel ordre), mais JAMAIS la solution finale copiable telle quelle.
Si le code est déjà correct, félicite-le.`,
};

const ATTENTE_AIDE = {
  1: "Préparation d'un petit indice... 💡",
  2: "Analyse de ton code en cours... 🔍",
  3: "Préparation d'une aide détaillée... 🛟",
};

function assistantEl() {
  return document.getElementById("assistantContent");
}

function openAssistant() {
  document.getElementById("assistantModal").style.display = "block";
  assistantEl().innerHTML = `<p>
    Je suis là pour t'aider sur cet exercice. Choisis un niveau d'aide ci-dessus :
    commence par l'indice léger 💡, et monte d'un cran si tu restes bloqué.
  </p>`;
}

function closeAssistant() {
  document.getElementById("assistantModal").style.display = "none";
}

async function askAssistant(niveau) {
  document.getElementById("assistantModal").style.display = "block";
  assistantEl().innerHTML =
    `<p style="color:#1e3a5f;text-align:center;margin-top:50px;">${ATTENTE_AIDE[niveau]}</p>`;

  const systemPrompt = `
Tu es un expert de Phaser 3 (version 3.80).
Tu dois aider un étudiant de BUT MMI qui apprend à créer un jeu vidéo.
Tu ne dois jamais donner la correction complète de l'exercice.
Tu dois t'exprimer en français, avec un ton encourageant, et le tutoyer.
Niveau d'aide demandé par l'étudiant :
${NIVEAUX_AIDE[niveau]}
`;

  // Les passages à écrire sont signalés dans l'éditeur par des commentaires
  // « À COMPLETER » : le modèle doit savoir que ce sont eux, le travail demandé.
  const listeConsignes = consignes(currentExample.code)
    .map((texte, i) => `${i + 1}. ${texte}`)
    .join("\n");

  const erreurs = dernieresErreurs.length
    ? `\nErreurs relevées lors de la dernière exécution :\n${dernieresErreurs.join("\n")}\n`
    : "";

  const userQuery = `
Exercice : ${currentExample.label}
${currentExample.description}

Les passages que l'étudiant doit écrire lui-même sont signalés dans son code par
des commentaires « /* À COMPLETER : ... */ ». Voici ce qui lui est demandé :
${listeConsignes}

Voici le code actuel de l'étudiant :
\`\`\`javascript
${cmEditor.getValue()}
\`\`\`
${erreurs}`;

  try {
    assistantEl().innerHTML = formatMarkdown(await callClaude(systemPrompt, userQuery));
  } catch (error) {
    assistantEl().innerHTML =
      `<p style="color:#dc2626;">Erreur d'analyse (${error.message})</p>`;
  }
}

/* ── Exemples ────────────────────────────────────────────────────────────── */

function loadExample(id) {
  const example = PHASER_EXAMPLES.find((item) => item.id === id);
  if (!example) return;

  currentExample = example;
  document.getElementById("exampleDescription").textContent = example.description;

  const depart = codeDepart(example.code);
  // Sans trou à combler, il n'y a ni résultat à dévoiler ni aide à demander :
  // les exemples de base restent de simples démonstrations.
  const estExercice = depart !== example.code;
  document.getElementById("solutionButton").hidden = !estExercice;
  document.getElementById("aideIaButton").hidden = !estExercice;
  closeAssistant();

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

/* ── Collage désactivé ───────────────────────────────────────────────────── */

/* On tape son code, on ne le colle pas : recopier une correction sans la
   lire n'apprend rien.

   On intercepte le changement plutôt que la touche Ctrl-V, parce qu'un
   collage arrive aussi par le menu contextuel, par le menu Édition du
   navigateur ou par le clic du milieu sous Linux. CodeMirror étiquette tous
   ces chemins d'un même « origin » valant "paste", ce qui donne un seul
   point de contrôle. Les chargements d'exemple et le bouton « réinitialiser »
   passent, eux, par setValue() : ils ont un autre origin et ne sont pas
   touchés.

   Ce garde-fou décourage, il ne verrouille pas : un étudiant qui ouvre les
   outils de développement en fera ce qu'il veut. Le but est de supprimer le
   réflexe, pas de gagner une course à l'armement. */
function interdireLeCollage(editeur) {
  let dernierAvertissement = 0;

  editeur.on("beforeChange", (instance, changement) => {
    if (changement.origin !== "paste") return;
    changement.cancel();

    // Un Ctrl-V maintenu enfoncé ne doit pas noyer la console de messages.
    const maintenant = Date.now();
    if (maintenant - dernierAvertissement < 3000) return;
    dernierAvertissement = maintenant;
    appendConsole(
      "warn",
      "Le collage est désactivé dans cet éditeur : tape le code toi-même, c'est comme ça qu'il rentre."
    );
  });
}

/* ── Initialisation ──────────────────────────────────────────────────────── */

document.addEventListener("DOMContentLoaded", () => {
  cmEditor = CodeMirror.fromTextArea(document.getElementById("editor"), {
    mode: "javascript",
    lineNumbers: true,
    indentUnit: 2,
    tabSize: 2,
    lineWrapping: true,
    // Le glisser-déposer de texte est la seconde porte d'entrée pour du code
    // tout fait ; CodeMirror sait la fermer lui-même.
    dragDrop: false,
    extraKeys: {
      "Ctrl-Enter": runCode,
      "Cmd-Enter": runCode,
    },
  });

  interdireLeCollage(cmEditor);

  fillExampleSelect();

  document.getElementById("runButton").addEventListener("click", runCode);
  document.getElementById("resetButton").addEventListener("click", resetCode);
  document.getElementById("clearConsoleButton").addEventListener("click", clearConsole);

  document.getElementById("solutionButton").addEventListener("click", openSolution);
  document.getElementById("solutionClose").addEventListener("click", closeSolution);
  document.getElementById("solutionModal").addEventListener("click", (event) => {
    if (event.target.id === "solutionModal") closeSolution();
  });

  document.getElementById("aideIaButton").addEventListener("click", openAssistant);
  document.getElementById("closeAssistantButton").addEventListener("click", closeAssistant);
  document.getElementById("assistantModal").addEventListener("click", (event) => {
    if (event.target.id === "assistantModal") closeAssistant();
  });
  document.querySelectorAll(".hint-btn").forEach((bouton) => {
    bouton.addEventListener("click", () => askAssistant(Number(bouton.dataset.level)));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeSolution();
    closeAssistant();
  });

  loadExample(PHASER_EXAMPLES[0].id);
});
