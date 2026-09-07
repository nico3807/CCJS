/* Explications guidées des exemples Phaser.

   Certains exemples sont trop gros pour être compris en les lisant d'un bloc.
   On leur associe ici une visite guidée : quelques chapitres, chacun composé
   d'un texte court et d'un extrait de code dont les lignes importantes sont
   cliquables. L'étudiant ouvre ce qui l'intéresse au lieu de subir un mur de
   commentaires.

   Structure attendue, indexée par l'identifiant de l'exemple :

     titre     : titre de la pop-up
     intro     : phrase d'accroche
     chapitres : [{ id, onglet, titre, texte: [...], schema?, code: [...] }]

   Dans "code", chaque entrée est un objet { l } où « l » est UNE ligne, et
   « note » (facultatif) le commentaire révélé au clic. Les lignes sans note
   sont là pour le contexte et ne sont pas cliquables.

   RÈGLE IMPORTANTE : toute ligne citée dans « l » doit exister telle quelle
   dans le code de l'exemple. Un test automatique le vérifie — c'est ce qui
   empêche cette page de raconter autre chose que ce que l'étudiant lit dans
   l'éditeur le jour où l'exemple sera retouché. Les coupures dans un extrait
   sont signalées par { saut: true }, qui n'est pas comparé au code. */

const PHASER_EXPLICATIONS = {
  "tuto-niveaux": {
    titre: "comment il est construit",
    intro:
      "Ce jeu est le premier de la série à contenir plusieurs scènes. " +
      "Voici comment elles sont déclarées, ce qui les relie, et pourquoi " +
      "trois niveaux tiennent dans une seule classe.",

    chapitres: [
      /* ── 1 ─────────────────────────────────────────────────────────────── */
      {
        id: "vue-ensemble",
        onglet: "Vue d'ensemble",
        titre: "Quatre scènes, une seule active à la fois",
        texte: [
          "Jusqu'ici, un jeu = une scène. Ici il y en a quatre : un écran de " +
            "choix et trois niveaux. À tout instant une seule tourne ; " +
            "this.scene.start() range la scène courante et démarre l'autre.",
          "Une scène porte un nom, sa « clé ». C'est ce nom, et seulement lui, " +
            "qui permet de la désigner depuis une autre scène.",
        ],
        schema: [
          {
            de: "selection",
            via: "ESPACE devant une porte",
            vers: ["niveau1", "niveau2", "niveau3"],
          },
          {
            de: "niveau1 · niveau2 · niveau3",
            via: "ESPACE devant la porte de retour",
            vers: ["selection"],
          },
        ],
        code: [
          { l: "const config = {" },
          { l: "  type: Phaser.AUTO," },
          { l: "  width: 800," },
          { l: "  height: 600," },
          { saut: true },
          {
            l: "  // La première scène du tableau démarre automatiquement.",
            note:
              "C'est la seule règle de démarrage : Phaser lance la première " +
              "scène de la liste. Pour tester directement le niveau 2, il " +
              "suffirait donc de mettre Niveau2 en tête du tableau.",
          },
          {
            l: "  scene: [Selection, Niveau1, Niveau2, Niveau3]",
            note:
              "On donne ici les CLASSES, pas les clés. Phaser les instancie " +
              "lui-même et récupère la clé dans le constructeur de chacune. " +
              "Les trois autres scènes sont créées mais restent en sommeil.",
          },
          { l: "};" },
        ],
      },

      /* ── 2 ─────────────────────────────────────────────────────────────── */
      {
        id: "selection",
        onglet: "class Selection",
        titre: "La scène de choix : elle seule charge les images",
        texte: [
          "Une scène peut s'écrire comme une classe qui hérite de " +
            "Phaser.Scene. Les fonctions preload / create / update deviennent " +
            "des méthodes, et les variables des attributs (this.player).",
          "Le chargement des images n'est fait qu'ici. Une fois chargées, " +
            "elles appartiennent au jeu entier : les trois niveaux les " +
            "réutilisent sans rien recharger.",
        ],
        code: [
          { l: "class Selection extends Phaser.Scene {" },
          { l: "  constructor() {" },
          {
            l: "    super({ key: 'selection' });",
            note:
              "La clé de la scène. C'est exactement cette chaîne qu'on écrira " +
              "plus tard dans this.scene.start('selection'). Une faute de " +
              "frappe ici ne provoque aucune erreur au chargement : le jeu " +
              "plantera seulement au moment du changement de scène.",
          },
          { l: "  }" },
          { saut: true },
          {
            l: "  preload() {",
            note:
              "preload() s'exécute avant create() et attend que tout soit " +
              "téléchargé. C'est pour cela qu'on peut utiliser les images dès " +
              "la première ligne de create().",
          },
          { l: "    this.load.image('img_ciel', 'assets/sky.png');" },
          { l: "    this.load.image('img_porte1', 'assets/door1.png');" },
          {
            l: "    this.load.spritesheet('img_perso', 'assets/dude.png', {",
            note:
              "Un spritesheet est une seule image contenant toutes les poses " +
              "du personnage côte à côte. On indique la taille d'une case " +
              "(32 × 48) pour que Phaser sache où les découper.",
          },
          { l: "      frameWidth: 32," },
          { l: "      frameHeight: 48" },
          { l: "    });" },
          { l: "  }" },
        ],
      },

      /* ── 3 ─────────────────────────────────────────────────────────────── */
      {
        id: "portes",
        onglet: "Les portes",
        titre: "create() : poser le décor, le joueur et les trois portes",
        texte: [
          "Les animations sont créées ici mais ne sont pas rattachées à cette " +
            "scène : elles vivent au niveau du jeu. Les niveaux pourront " +
            "jouer 'anim_face' sans jamais l'avoir déclarée.",
          "Une porte est un décor immobile que le joueur doit pouvoir " +
            "traverser : c'est un staticSprite, et non un membre du groupe de " +
            "plate-formes, sinon on se cognerait dedans.",
        ],
        code: [
          {
            l: "    this.anims.create({",
            note:
              "this.anims est le gestionnaire d'animations, partagé par tout " +
              "le jeu. C'est la raison pour laquelle les trois niveaux " +
              "n'ont aucune animation à déclarer.",
          },
          { l: "      key: 'anim_tourne_gauche'," },
          { saut: true },
          {
            l: "    this.player = this.physics.add.sprite(100, 450, 'img_perso');",
            note:
              "Dans une classe, on écrit this.player et non player : " +
              "l'attribut reste accessible depuis update(), qui est appelée " +
              "60 fois par seconde bien après la fin de create().",
          },
          { l: "    this.player.setBounce(0.2);" },
          { l: "    this.player.setCollideWorldBounds(true);" },
          { l: "    this.physics.add.collider(this.player, this.groupe_plateformes);" },
          {
            l: "    this.player.setDepth(1);",
            note:
              "À profondeur égale, Phaser dessine dans l'ordre de création. " +
              "Les portes sont créées après le joueur : sans setDepth, elles " +
              "passeraient devant lui et le masqueraient.",
          },
          {
            l: "    this.clavier = this.input.keyboard.createCursorKeys();",
            note:
              "Renvoie un objet contenant left, right, up, down… et space. " +
              "C'est de là que vient this.clavier.space utilisé juste après.",
          },
          { saut: true },
          {
            l: "    this.porte1 = this.physics.add.staticSprite(300, 548, 'img_porte1');",
            note:
              "staticSprite : un corps physique qui ne tombe pas et que rien " +
              "ne peut pousser. On garde la référence dans un attribut pour " +
              "pouvoir tester le chevauchement dans update().",
          },
          { l: "    this.porte2 = this.physics.add.staticSprite(120, 394, 'img_porte2');" },
          { l: "    this.porte3 = this.physics.add.staticSprite(650, 264, 'img_porte3');" },
        ],
      },

      /* ── 4 ─────────────────────────────────────────────────────────────── */
      {
        id: "changer",
        onglet: "Changer de scène",
        titre: "update() : le passage d'une scène à l'autre",
        texte: [
          "C'est le cœur du tutoriel. Trois notions s'y croisent : détecter " +
            "un appui unique, détecter un chevauchement sans collision, et " +
            "lancer une scène.",
        ],
        code: [
          { l: "  update() {" },
          {
            l: "    deplacer(this.player, this.clavier);",
            note:
              "Le déplacement est confié à une fonction extérieure, partagée " +
              "par les quatre scènes. Voir le chapitre « La fonction " +
              "partagée ».",
          },
          { saut: true },
          {
            l: "    if (Phaser.Input.Keyboard.JustDown(this.clavier.space)) {",
            note:
              "JustDown ne se déclenche qu'à l'instant précis de l'appui. " +
              "Avec isDown, qui reste vrai tant que la touche est enfoncée, " +
              "la scène serait relancée 60 fois par seconde tant qu'on garde " +
              "le doigt sur la barre d'espace.",
          },
          {
            l: "      if (this.physics.overlap(this.player, this.porte1)) this.scene.start('niveau1');",
            note:
              "overlap répond « ces deux corps se superposent-ils ? » sans " +
              "les séparer, contrairement à collider. C'est ce qui permet au " +
              "joueur de se tenir DANS la porte. Et scene.start reçoit la " +
              "clé déclarée dans le constructeur de Niveau1.",
          },
          { l: "      if (this.physics.overlap(this.player, this.porte2)) this.scene.start('niveau2');" },
          { l: "      if (this.physics.overlap(this.player, this.porte3)) this.scene.start('niveau3');" },
          { l: "    }" },
          { l: "  }" },
        ],
      },

      /* ── 5 ─────────────────────────────────────────────────────────────── */
      {
        id: "niveaux",
        onglet: "Une classe, trois niveaux",
        titre: "Écrire un niveau une fois, l'utiliser trois fois",
        texte: [
          "Les trois niveaux ne diffèrent que par leur clé et par le numéro " +
            "affiché. Les copier trois fois obligerait à corriger trois fois " +
            "le moindre bug. On écrit donc une classe paramétrée, dont on " +
            "dérive trois variantes de deux lignes.",
          "C'est le même mécanisme que Selection extends Phaser.Scene, mais " +
            "d'un cran plus loin : Niveau1 hérite de Niveau, qui hérite de " +
            "Phaser.Scene.",
        ],
        code: [
          { l: "class Niveau extends Phaser.Scene {" },
          {
            l: "  constructor(cle, numero) {",
            note:
              "Le constructeur prend des paramètres, au lieu de tout fixer en " +
              "dur. C'est ce qui rend la classe réutilisable.",
          },
          {
            l: "    super({ key: cle });",
            note:
              "La clé n'est plus écrite en dur : elle est reçue en paramètre. " +
              "Chaque sous-classe fournira la sienne.",
          },
          { l: "    this.numero = numero;" },
          { l: "  }" },
          { saut: true },
          {
            l: "  preload() {}",
            note:
              "Volontairement vide. Les images ont déjà été chargées par la " +
              "scène « selection », et le jeu ne passe jamais par un niveau " +
              "sans être passé par elle.",
          },
          { saut: true },
          {
            l: "class Niveau1 extends Niveau {",
            note:
              "Une sous-classe par niveau. C'est nécessaire parce que la " +
              "config attend des classes sans paramètres : Phaser fera " +
              "new Niveau1() tout seul, sans rien pouvoir lui passer.",
          },
          {
            l: "  constructor() { super('niveau1', 1); }",
            note:
              "Toute la différence entre les trois niveaux tient dans cette " +
              "ligne : une clé et un numéro.",
          },
          { l: "}" },
          { l: "class Niveau2 extends Niveau {" },
          { l: "  constructor() { super('niveau2', 2); }" },
          { l: "}" },
        ],
      },

      /* ── 6 ─────────────────────────────────────────────────────────────── */
      {
        id: "partage",
        onglet: "La fonction partagée",
        titre: "deplacer() : le code commun aux quatre scènes",
        texte: [
          "Le pilotage du personnage est identique partout. Plutôt que de le " +
            "recopier dans chaque update(), on l'écrit une fois, hors des " +
            "classes, et on lui passe ce dont il a besoin.",
          "Remarquez qu'il reçoit player et clavier en paramètres : la " +
            "fonction ne connaît aucune scène en particulier, c'est ce qui la " +
            "rend utilisable par toutes.",
        ],
        code: [
          {
            l: "function deplacer(player, clavier) {",
            note:
              "Pas de « this » ici : c'est une fonction ordinaire, pas une " +
              "méthode. Les deux objets dont elle a besoin lui sont donnés " +
              "explicitement par l'appelant.",
          },
          { l: "  if (clavier.left.isDown) {" },
          {
            l: "    player.setVelocityX(-160);",
            note:
              "On règle une VITESSE, pas une position. Phaser déplacera le " +
              "sprite tout seul à chaque image, en tenant compte du temps " +
              "écoulé et des collisions.",
          },
          { l: "    player.anims.play('anim_tourne_gauche', true);" },
          { saut: true },
          {
            l: "  if (clavier.up.isDown && player.body.touching.down) {",
            note:
              "touching.down est vrai quand quelque chose est sous les pieds " +
              "du joueur. Sans ce test, on pourrait sauter indéfiniment en " +
              "plein vol.",
          },
          { l: "    player.setVelocityY(-330);" },
          { l: "  }" },
          { l: "}" },
        ],
      },
    ],
  },
};
