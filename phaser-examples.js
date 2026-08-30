/* Exemples Phaser du module Code Coach Phaser.

   Deux familles :
   - "Découverte" : notions isolées, textures générées avec Graphics, aucun
     fichier externe.
   - "Tutoriels" : T1 à T11 reprennent les tutoriels de darties.fr ; T12 à T14
     sont inédits et prolongent la série sur des notions que les articles ne
     couvrent pas (état du jeu, persistance, ennemi autonome). Tous chargent
     leurs assets depuis phaser/assets/.

   Les articles sont écrits en « delta » (ils ne donnent que les lignes à
   ajouter à un projet de base) et laissent des passages à compléter. Les
   exemples ci-dessous sont donc consolidés en un bloc unique exécutable.

   Conventions communes aux exemples de la famille "Tutoriels", reprises des
   TP : noms français (img_ciel, groupe_plateformes, clavier, anim_face...),
   flèche haut pour sauter, barre espace réservée aux interactions. */

const PHASER_EXAMPLES = [
  /* ══════════════════════════════════════════════════════════════════════
     DÉCOUVERTE
     ══════════════════════════════════════════════════════════════════════ */
  {
    id: "bienvenue",
    group: "Découverte",
    label: "1 · Bienvenue (texte + tween)",
    description:
      "La scène la plus simple : un texte centré, animé en boucle par un tween.",
    code: `// Une scène Phaser se décrit dans un objet "config".
const config = {
  type: Phaser.AUTO,          // WebGL si possible, sinon Canvas
  width: 800,
  height: 600,
  backgroundColor: '#1d2b53',
  scale: {
    mode: Phaser.Scale.FIT,   // le jeu s'adapte à la zone d'aperçu
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: { create: create }
};

function create() {
  const titre = this.add.text(400, 300, 'Bienvenue dans Phaser !', {
    fontFamily: 'Arial, sans-serif',
    fontSize: '44px',
    color: '#ffffff'
  }).setOrigin(0.5);

  // Un tween anime une propriété dans le temps.
  this.tweens.add({
    targets: titre,
    y: 260,
    scale: 1.1,
    duration: 900,
    yoyo: true,        // repart en sens inverse
    repeat: -1,        // à l'infini
    ease: 'Sine.easeInOut'
  });

  console.log('Scène créée : le titre est animé par un tween.');
}

new Phaser.Game(config);`,
  },
  {
    id: "formes",
    group: "Découverte",
    label: "2 · Formes géométriques",
    description:
      "Dessiner sans aucune image : rectangles, cercles, triangles et étoiles.",
    code: `const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#1d2b53',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: { create: create }
};

function create() {
  // L'objet Graphics dessine des formes libres.
  const g = this.add.graphics();

  g.fillStyle(0xff004d, 1);
  g.fillRect(80, 90, 190, 130);

  g.fillStyle(0x29adff, 1);
  g.fillCircle(450, 155, 80);

  g.lineStyle(6, 0xffec27, 1);
  g.strokeTriangle(600, 240, 690, 70, 780, 240);

  // Phaser propose aussi des formes toutes faites.
  const etoile = this.add.star(200, 420, 5, 40, 80, 0x00e436);
  const losange = this.add.rectangle(560, 420, 110, 110, 0xffec27);
  losange.setAngle(45);

  this.tweens.add({
    targets: [etoile, losange],
    angle: '+=360',
    duration: 4000,
    repeat: -1
  });

  this.add.text(400, 550, 'Formes et Graphics', {
    fontFamily: 'Arial, sans-serif',
    fontSize: '26px',
    color: '#ffffff'
  }).setOrigin(0.5);
}

new Phaser.Game(config);`,
  },
  {
    id: "physique",
    group: "Découverte",
    label: "3 · Physique (gravité + rebond)",
    description:
      "Le moteur Arcade Physics : 12 balles soumises à la gravité qui rebondissent sur les bords.",
    code: `const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#1d2b53',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  // On active le moteur physique "arcade".
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 300 }, debug: false }
  },
  scene: { create: create }
};

function create() {
  // On fabrique une texture "balle" au lieu de charger un fichier image.
  const g = this.make.graphics({ add: false });
  g.fillStyle(0xffec27, 1);
  g.fillCircle(16, 16, 16);
  g.generateTexture('balle', 32, 32);
  g.destroy();

  for (let i = 0; i < 12; i++) {
    const balle = this.physics.add.image(
      Phaser.Math.Between(60, 740),
      Phaser.Math.Between(0, 200),
      'balle'
    );
    balle.setVelocity(Phaser.Math.Between(-220, 220), 20);
    balle.setBounce(0.9);                 // 0 = pas de rebond, 1 = rebond parfait
    balle.setCollideWorldBounds(true);    // rebondit sur les bords de l'écran
  }

  this.add.text(400, 565, '12 balles : gravité + rebond', {
    fontFamily: 'Arial, sans-serif',
    fontSize: '22px',
    color: '#ffffff'
  }).setOrigin(0.5);

  console.log('12 corps physiques créés.');
}

new Phaser.Game(config);`,
  },
  {
    id: "clavier",
    group: "Découverte",
    label: "4 · Déplacement au clavier",
    description:
      "Lire les touches fléchées dans update() pour déplacer un objet. Clique d'abord dans le jeu.",
    code: `let joueur;
let touches;

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#1d2b53',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 } }   // pas de gravité : vue de dessus
  },
  scene: { create: create, update: update }
};

function create() {
  const g = this.make.graphics({ add: false });
  g.fillStyle(0x29adff, 1);
  g.fillRect(0, 0, 48, 48);
  g.generateTexture('carre', 48, 48);
  g.destroy();

  joueur = this.physics.add.image(400, 300, 'carre');
  joueur.setCollideWorldBounds(true);

  // Raccourci pour récupérer les 4 flèches + espace/shift.
  touches = this.input.keyboard.createCursorKeys();

  this.add.text(400, 40, 'Déplace le carré avec les flèches ⬅ ⬆ ⬇ ➡', {
    fontFamily: 'Arial, sans-serif',
    fontSize: '24px',
    color: '#ffffff'
  }).setOrigin(0.5);
}

// update() est appelée ~60 fois par seconde.
function update() {
  const vitesse = 260;
  joueur.setVelocity(0);

  if (touches.left.isDown)       joueur.setVelocityX(-vitesse);
  else if (touches.right.isDown) joueur.setVelocityX(vitesse);

  if (touches.up.isDown)         joueur.setVelocityY(-vitesse);
  else if (touches.down.isDown)  joueur.setVelocityY(vitesse);
}

new Phaser.Game(config);`,
  },
  {
    id: "souris",
    group: "Découverte",
    label: "5 · Interaction souris",
    description:
      "Réagir aux clics avec les événements du pointeur pour faire éclore des cercles colorés.",
    code: `const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#1d2b53',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: { create: create }
};

function create() {
  this.add.text(400, 40, 'Clique n\\'importe où dans le jeu', {
    fontFamily: 'Arial, sans-serif',
    fontSize: '24px',
    color: '#ffffff'
  }).setOrigin(0.5);

  // On écoute l'événement "pointerdown" sur toute la scène.
  this.input.on('pointerdown', (pointer) => {
    const couleur = Phaser.Display.Color.RandomRGB().color;
    const cercle = this.add.circle(pointer.x, pointer.y, 18, couleur);

    this.tweens.add({
      targets: cercle,
      scale: 4,
      alpha: 0,
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => cercle.destroy()   // on nettoie l'objet
    });
  });
}

new Phaser.Game(config);`,
  },
  {
    id: "plateformes",
    group: "Découverte",
    label: "6 · Plateformes et collisions",
    description:
      "Un mini jeu de plateforme : gravité, sol statique, saut conditionné au contact du sol.",
    code: `let heros;
let plateformes;
let touches;

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#1d2b53',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 700 }, debug: false }
  },
  scene: { create: create, update: update }
};

function create() {
  const g = this.make.graphics({ add: false });

  g.fillStyle(0x00e436, 1);
  g.fillRect(0, 0, 200, 32);
  g.generateTexture('sol', 200, 32);

  g.clear();
  g.fillStyle(0xff004d, 1);
  g.fillRect(0, 0, 40, 56);
  g.generateTexture('heros', 40, 56);
  g.destroy();

  // Un groupe statique : les plateformes ne bougent pas.
  plateformes = this.physics.add.staticGroup();
  plateformes.create(400, 584, 'sol').setScale(4, 1).refreshBody();
  plateformes.create(160, 440, 'sol');
  plateformes.create(650, 340, 'sol');
  plateformes.create(380, 230, 'sol');

  heros = this.physics.add.sprite(120, 300, 'heros');
  heros.setBounce(0.1);
  heros.setCollideWorldBounds(true);

  // Sans collider, le héros traverserait les plateformes.
  this.physics.add.collider(heros, plateformes);

  touches = this.input.keyboard.createCursorKeys();

  this.add.text(400, 40, 'Flèches pour courir, ⬆ pour sauter', {
    fontFamily: 'Arial, sans-serif',
    fontSize: '24px',
    color: '#ffffff'
  }).setOrigin(0.5);
}

function update() {
  if (touches.left.isDown)       heros.setVelocityX(-220);
  else if (touches.right.isDown) heros.setVelocityX(220);
  else                           heros.setVelocityX(0);

  // On ne saute que si le héros touche quelque chose sous lui.
  if (touches.up.isDown && heros.body.touching.down) {
    heros.setVelocityY(-480);
  }
}

new Phaser.Game(config);`,
  },

  /* ══════════════════════════════════════════════════════════════════════
     TUTORIELS
     ══════════════════════════════════════════════════════════════════════ */
  {
    id: "tuto-plateforme",
    group: "Tutoriels",
    label: "T1 · Premier jeu de plate-forme",
    description:
      "Le jeu complet : plates-formes, spritesheet animé, étoiles à ramasser, score et bombes.",
    code: `/* Tutoriel : créer son premier jeu de plate-forme en découvrant Phaser.
   Flèches gauche/droite pour courir, flèche haut pour sauter. */

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 300 },  // accélération verticale en pixels/s²
      debug: false          // à passer à true pour voir les hitbox
    }
  },
  scene: { preload: preload, create: create, update: update }
};

// Variables globales : accessibles depuis preload, create et update.
let groupe_plateformes;
let player;
let clavier;
let groupe_etoiles;
let groupe_bombes;
let score = 0;
let zone_texte_score;
let gameOver = false;

// preload() est appelée une seule fois, avant create().
function preload() {
  this.load.image('img_ciel', 'assets/sky.png');
  this.load.image('img_plateforme', 'assets/platform.png');
  this.load.image('img_etoile', 'assets/star.png');
  this.load.image('img_bombe', 'assets/bomb.png');

  // Un spritesheet découpe une image en frames de taille fixe.
  this.load.spritesheet('img_perso', 'assets/dude.png', {
    frameWidth: 32,
    frameHeight: 48
  });
}

function create() {
  this.add.image(400, 300, 'img_ciel');

  // @trou Créer le groupe STATIQUE des 5 plates-formes (200/584, 600/584, 50/300, 600/450, 750/270), puis le collider avec le joueur
  // Un groupe statique : des corps qui ne bougent pas et ignorent la gravité.
  groupe_plateformes = this.physics.add.staticGroup();
  groupe_plateformes.create(200, 584, 'img_plateforme');
  groupe_plateformes.create(600, 584, 'img_plateforme');
  groupe_plateformes.create(50, 300, 'img_plateforme');
  groupe_plateformes.create(600, 450, 'img_plateforme');
  groupe_plateformes.create(750, 270, 'img_plateforme');
  // @fin

  player = this.physics.add.sprite(100, 450, 'img_perso');
  player.setBounce(0.2);
  player.setCollideWorldBounds(true);
  // @trou Faire entrer le joueur en collision avec les plates-formes
  this.physics.add.collider(player, groupe_plateformes);
  // @fin

  clavier = this.input.keyboard.createCursorKeys();

  // @trou Créer les 3 animations : anim_tourne_gauche (frames 0 à 3), anim_tourne_droite (5 à 8) et anim_face (frame 4)
  // Une animation est une suite de frames jouée à une cadence donnée.
  this.anims.create({
    key: 'anim_tourne_gauche',
    frames: this.anims.generateFrameNumbers('img_perso', { start: 0, end: 3 }),
    frameRate: 10,
    repeat: -1              // -1 = boucle infinie
  });
  this.anims.create({
    key: 'anim_tourne_droite',
    frames: this.anims.generateFrameNumbers('img_perso', { start: 5, end: 8 }),
    frameRate: 10,
    repeat: -1
  });
  this.anims.create({
    key: 'anim_face',
    frames: [{ key: 'img_perso', frame: 4 }],
    frameRate: 20
  });
  // @fin

  // @trou Créer le groupe des 10 étoiles (une tous les 70 px), leur donner un rebond aléatoire, et détecter leur ramassage avec overlap()
  // 10 étoiles réparties tous les 70 pixels.
  groupe_etoiles = this.physics.add.group();
  for (let i = 0; i < 10; i++) {
    groupe_etoiles.create(70 + 70 * i, 10, 'img_etoile');
  }
  this.physics.add.collider(groupe_etoiles, groupe_plateformes);

  // children.iterate() applique un traitement à chaque membre du groupe.
  groupe_etoiles.children.iterate(function (etoile_i) {
    etoile_i.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
  });

  // overlap = simple superposition (pas de rebond), collider = vraie collision.
  this.physics.add.overlap(player, groupe_etoiles, ramasserEtoile, null, this);
  // @fin

  zone_texte_score = this.add.text(16, 16, 'score : 0', {
    fontSize: '32px',
    fill: '#000'
  });

  // @trou Créer le groupe des bombes : elles rebondissent sur les plates-formes et déclenchent chocAvecBombe() au contact du joueur
  groupe_bombes = this.physics.add.group();
  this.physics.add.collider(groupe_bombes, groupe_plateformes);
  this.physics.add.collider(player, groupe_bombes, chocAvecBombe, null, this);
  // @fin
}

function update() {
  if (gameOver) {
    return;
  }

  // @trou Déplacer le joueur à 160 px/s avec les flèches gauche/droite en jouant l'animation qui va bien, et le laisser sauter (-300) seulement s'il touche le sol
  if (clavier.right.isDown) {
    player.setVelocityX(160);
    player.anims.play('anim_tourne_droite', true);
  } else if (clavier.left.isDown) {
    player.setVelocityX(-160);
    player.anims.play('anim_tourne_gauche', true);
  } else {
    player.setVelocityX(0);
    player.anims.play('anim_face', true);
  }

  // On ne peut sauter que si le joueur touche quelque chose sous lui.
  if (clavier.up.isDown && player.body.touching.down) {
    player.setVelocityY(-300);
  }
  // @fin
}

function ramasserEtoile(un_player, une_etoile) {
  // L'étoile devient invisible et perd son corps physique.
  une_etoile.disableBody(true, true);

  score += 10;
  zone_texte_score.setText('Score : ' + score);

  // Toutes les étoiles ramassées : on les réactive et on lâche une bombe.
  if (groupe_etoiles.countActive(true) === 0) {
    groupe_etoiles.children.iterate(function (etoile_i) {
      etoile_i.enableBody(true, etoile_i.x, 0, true, true);
    });

    // La bombe apparaît à l'opposé du joueur.
    let x;
    if (player.x < 400) {
      x = Phaser.Math.Between(400, 800);
    } else {
      x = Phaser.Math.Between(0, 400);
    }

    const une_bombe = groupe_bombes.create(x, 16, 'img_bombe');
    une_bombe.setBounce(1);
    une_bombe.setCollideWorldBounds(true);
    une_bombe.setVelocity(Phaser.Math.Between(-200, 200), 20);
    une_bombe.body.allowGravity = false;
  }
}

function chocAvecBombe(un_player, une_bombe) {
  this.physics.pause();
  player.setTint(0xff0000);
  player.anims.play('anim_face');
  gameOver = true;
  console.log('Game over — score final : ' + score);
}

new Phaser.Game(config);`,
  },
  {
    id: "tuto-tiled",
    group: "Tutoriels",
    label: "T2 · Carte Tiled et caméra",
    description:
      "Charger une carte créée sous Tiled, gérer les collisions par propriété de tuile et faire suivre le joueur par la caméra.",
    code: `/* Tutoriel : créer une carte sur Tiled et l'intégrer en Phaser 3.
   La carte fait 1280 x 640 pixels : plus large que l'écran, donc la caméra
   doit suivre le joueur. */

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 300 }, debug: false }
  },
  scene: { preload: preload, create: create, update: update }
};

let player;
let clavier;

const LARGEUR_MONDE = 1280;
const HAUTEUR_MONDE = 640;

function preload() {
  // L'image du jeu de tuiles...
  this.load.image('tuiles_de_jeu', 'assets/tuilesJeu.png');
  // ...et la carte exportée depuis Tiled au format JSON.
  this.load.tilemapTiledJSON('carte', 'assets/map.json');

  this.load.spritesheet('img_perso', 'assets/dude.png', {
    frameWidth: 32,
    frameHeight: 48
  });
}

function create() {
  const carteDuNiveau = this.add.tilemap('carte');

  // 1er argument : le nom du tileset DANS Tiled.
  // 2e argument : la clé de l'image chargée dans preload.
  const tileset = carteDuNiveau.addTilesetImage('tuiles_de_jeu', 'tuiles_de_jeu');

  // @trou Créer les calques "calque_background" puis "calque_plateformes", et rendre solides les tuiles ayant la propriété estSolide
  // Les calques sont créés dans l'ordre de leur affichage.
  carteDuNiveau.createLayer('calque_background', tileset);
  const calque_plateformes = carteDuNiveau.createLayer('calque_plateformes', tileset);

  // Dans Tiled, une propriété personnalisée "estSolide" a été posée sur les
  // tuiles pleines : Phaser s'en sert pour savoir lesquelles bloquent.
  calque_plateformes.setCollisionByProperty({ estSolide: true });
  // @fin

  player = this.physics.add.sprite(100, 300, 'img_perso');
  player.setBounce(0.2);
  player.setCollideWorldBounds(true);
  // @trou Faire entrer le joueur en collision avec le calque des plates-formes
  this.physics.add.collider(player, calque_plateformes);
  // @fin

  this.anims.create({
    key: 'anim_tourne_gauche',
    frames: this.anims.generateFrameNumbers('img_perso', { start: 0, end: 3 }),
    frameRate: 10,
    repeat: -1
  });
  this.anims.create({
    key: 'anim_tourne_droite',
    frames: this.anims.generateFrameNumbers('img_perso', { start: 5, end: 8 }),
    frameRate: 10,
    repeat: -1
  });
  this.anims.create({
    key: 'anim_face',
    frames: [{ key: 'img_perso', frame: 4 }],
    frameRate: 20
  });

  clavier = this.input.keyboard.createCursorKeys();

  // @trou Donner au monde physique ET à la caméra la taille de la carte, puis demander à la caméra de suivre le joueur
  // Le monde physique et la caméra doivent adopter la taille de la carte.
  this.physics.world.setBounds(0, 0, LARGEUR_MONDE, HAUTEUR_MONDE);
  this.cameras.main.setBounds(0, 0, LARGEUR_MONDE, HAUTEUR_MONDE);
  this.cameras.main.startFollow(player);
  // @fin

  console.log('Carte chargée : ' + carteDuNiveau.width + ' x ' + carteDuNiveau.height + ' tuiles.');
}

function update() {
  if (clavier.right.isDown) {
    player.setVelocityX(160);
    player.anims.play('anim_tourne_droite', true);
  } else if (clavier.left.isDown) {
    player.setVelocityX(-160);
    player.anims.play('anim_tourne_gauche', true);
  } else {
    player.setVelocityX(0);
    player.anims.play('anim_face', true);
  }

  // @trou Faire sauter le joueur (-300) : sur une tilemap, c'est blocked.down qu'il faut tester, pas touching.down
  // Sur une tilemap, on teste blocked.down plutôt que touching.down.
  if (clavier.up.isDown && player.body.blocked.down) {
    player.setVelocityY(-300);
  }
  // @fin
}

new Phaser.Game(config);`,
  },
  {
    id: "tuto-tir",
    group: "Tutoriels",
    label: "T3 · Tir, balles et cibles",
    description:
      "Tirer avec la touche A : groupe de projectiles, points de vie des cibles et destruction des balles sorties du monde.",
    code: `/* Tutoriel : rajouter une fonction de tir, des balles et des cibles.
   Flèches pour se déplacer, flèche haut pour sauter, touche A pour tirer. */

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 300 }, debug: false }
  },
  scene: { preload: preload, create: create, update: update }
};

let groupe_plateformes;
let player;
let clavier;
let boutonFeu;
let groupeBullets;
let groupeCibles;

function preload() {
  this.load.image('img_ciel', 'assets/sky.png');
  this.load.image('img_plateforme', 'assets/platform.png');
  this.load.image('img_balle', 'assets/balle.png');
  this.load.image('img_cible', 'assets/cible.png');
  this.load.spritesheet('img_perso', 'assets/dude.png', {
    frameWidth: 32,
    frameHeight: 48
  });
}

function create() {
  this.add.image(400, 300, 'img_ciel');

  groupe_plateformes = this.physics.add.staticGroup();
  groupe_plateformes.create(200, 584, 'img_plateforme');
  groupe_plateformes.create(600, 584, 'img_plateforme');

  // @trou Créer en masse 8 cibles espacées de 107 px, donner à chacune un attribut pointsVie entre 1 et 5, et les faire rebondir sur les plates-formes
  // Création en masse : 8 cibles espacées de 107 pixels.
  groupeCibles = this.physics.add.group({
    key: 'img_cible',
    repeat: 7,
    setXY: { x: 24, y: 0, stepX: 107 }
  });

  // On personnalise chaque cible avec un attribut inventé : pointsVie.
  groupeCibles.children.iterate(function (cibleTrouvee) {
    cibleTrouvee.pointsVie = Phaser.Math.Between(1, 5);
    cibleTrouvee.y = Phaser.Math.Between(10, 250);
    cibleTrouvee.setBounce(1);
  });
  this.physics.add.collider(groupeCibles, groupe_plateformes);
  // @fin

  player = this.physics.add.sprite(100, 450, 'img_perso');
  player.setBounce(0.2);
  player.setCollideWorldBounds(true);
  this.physics.add.collider(player, groupe_plateformes);

  // Attribut ajouté à la volée pour mémoriser le sens du tir.
  player.direction = 'right';

  this.anims.create({
    key: 'anim_tourne_gauche',
    frames: this.anims.generateFrameNumbers('img_perso', { start: 0, end: 3 }),
    frameRate: 10,
    repeat: -1
  });
  this.anims.create({
    key: 'anim_tourne_droite',
    frames: this.anims.generateFrameNumbers('img_perso', { start: 5, end: 8 }),
    frameRate: 10,
    repeat: -1
  });
  this.anims.create({
    key: 'anim_face',
    frames: [{ key: 'img_perso', frame: 4 }],
    frameRate: 20
  });

  clavier = this.input.keyboard.createCursorKeys();
  // addKey permet d'utiliser n'importe quelle touche.
  boutonFeu = this.input.keyboard.addKey('A');

  // @trou Créer le groupe des balles, appeler toucher() quand une balle touche une cible, et détruire les balles qui sortent du monde
  groupeBullets = this.physics.add.group();
  this.physics.add.overlap(groupeBullets, groupeCibles, toucher, null, this);

  // Une balle qui atteint le bord du monde doit être détruite, sinon elle
  // resterait en mémoire indéfiniment.
  this.physics.world.on('worldbounds', function (body) {
    const objet = body.gameObject;
    if (groupeBullets.contains(objet)) {
      objet.destroy();
    }
  });
  // @fin

  this.add.text(16, 16, 'A pour tirer', { fontSize: '24px', fill: '#000' });
}

function update() {
  if (clavier.left.isDown) {
    player.direction = 'left';
    player.setVelocityX(-160);
    player.anims.play('anim_tourne_gauche', true);
  } else if (clavier.right.isDown) {
    player.direction = 'right';
    player.setVelocityX(160);
    player.anims.play('anim_tourne_droite', true);
  } else {
    player.setVelocityX(0);
    player.anims.play('anim_face', true);
  }

  if (clavier.up.isDown && player.body.touching.down) {
    player.setVelocityY(-330);
  }

  // @trou Appeler tirer(player) à l'appui sur A — avec JustDown, sinon une seule pression lâcherait une rafale
  // JustDown ne se déclenche qu'au moment de l'appui : une balle par pression.
  if (Phaser.Input.Keyboard.JustDown(boutonFeu)) {
    tirer(player);
  }
  // @fin
}

function tirer(player) {
  // @trou Créer la balle devant le joueur selon player.direction : sans gravité, à 1000 px/s, et signalée quand elle atteint le bord du monde
  let coefDir;
  if (player.direction === 'left') {
    coefDir = -1;
  } else {
    coefDir = 1;
  }

  const bullet = groupeBullets.create(player.x + 25 * coefDir, player.y - 4, 'img_balle');
  bullet.body.allowGravity = false;      // la balle vole droit
  bullet.setCollideWorldBounds(true);
  bullet.body.onWorldBounds = true;      // active l'événement "worldbounds"
  bullet.setVelocity(1000 * coefDir, 0);
  // @fin
}

function toucher(bullet, cible) {
  // @trou Retirer un point de vie à la cible, la détruire s'il tombe à zéro, et détruire la balle dans tous les cas
  cible.pointsVie--;
  if (cible.pointsVie === 0) {
    cible.destroy();
  }
  bullet.destroy();
  // @fin
}

new Phaser.Game(config);`,
  },
  {
    id: "tuto-niveaux",
    group: "Tutoriels",
    label: "T4 · Jeu multi-niveaux",
    description:
      "Plusieurs scènes déclarées en classes : trois portes mènent à trois niveaux. Espace devant une porte pour entrer.",
    code: `/* Tutoriel : créer un jeu multi-niveaux.
   L'article répartit le code en 5 fichiers avec des modules ES
   (import / export). Le playground exécutant un seul bloc, les classes sont
   ici simplement concaténées : on retire les "import" et les "export default",
   le reste est identique.

   Flèches pour se déplacer, espace devant une porte pour changer de niveau. */

// Une scène peut aussi s'écrire comme une classe. La clé passée à super()
// identifie la scène : c'est elle qu'on donne à this.scene.start().
class Selection extends Phaser.Scene {
  constructor() {
    super({ key: 'selection' });
  }

  // Seule cette scène charge les assets : ils restent ensuite disponibles
  // pour toutes les autres scènes du jeu.
  preload() {
    this.load.image('img_ciel', 'assets/sky.png');
    this.load.image('img_plateforme', 'assets/platform.png');
    this.load.image('img_porte1', 'assets/door1.png');
    this.load.image('img_porte2', 'assets/door2.png');
    this.load.image('img_porte3', 'assets/door3.png');
    this.load.spritesheet('img_perso', 'assets/dude.png', {
      frameWidth: 32,
      frameHeight: 48
    });
  }

  create() {
    this.add.image(400, 300, 'img_ciel');

    this.add.text(400, 60, 'Choisis une porte, puis appuie sur ESPACE', {
      fontSize: '20px',
      fill: '#000'
    }).setOrigin(0.5);

    this.groupe_plateformes = this.physics.add.staticGroup();
    this.groupe_plateformes.create(200, 584, 'img_plateforme');
    this.groupe_plateformes.create(600, 584, 'img_plateforme');
    this.groupe_plateformes.create(120, 430, 'img_plateforme');
    this.groupe_plateformes.create(650, 300, 'img_plateforme');

    // Les animations sont globales au jeu : créées une fois ici, elles
    // restent jouables dans les autres scènes.
    this.anims.create({
      key: 'anim_tourne_gauche',
      frames: this.anims.generateFrameNumbers('img_perso', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: 'anim_tourne_droite',
      frames: this.anims.generateFrameNumbers('img_perso', { start: 5, end: 8 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: 'anim_face',
      frames: [{ key: 'img_perso', frame: 4 }],
      frameRate: 20
    });

    // Dans une classe, les variables deviennent des attributs : this.player.
    this.player = this.physics.add.sprite(100, 450, 'img_perso');
    this.player.setBounce(0.2);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.groupe_plateformes);
    // À profondeur égale, Phaser dessine dans l'ordre de création : les portes,
    // créées juste après, passeraient devant le joueur. setDepth le remet
    // au premier plan, quel que soit l'ordre du code.
    this.player.setDepth(1);
    this.clavier = this.input.keyboard.createCursorKeys();

    // @trou Poser les 3 portes en staticSprite : porte1 (300/548), porte2 (120/394) et porte3 (650/264)
    // staticSprite : un décor immobile, insensible à la gravité.
    this.porte1 = this.physics.add.staticSprite(300, 548, 'img_porte1');
    this.porte2 = this.physics.add.staticSprite(120, 394, 'img_porte2');
    this.porte3 = this.physics.add.staticSprite(650, 264, 'img_porte3');
    // @fin
  }

  update() {
    deplacer(this.player, this.clavier);

    // @trou À l'appui sur ESPACE, si le joueur est sur une porte, lancer la scène du niveau correspondant avec this.scene.start()
    if (Phaser.Input.Keyboard.JustDown(this.clavier.space)) {
      if (this.physics.overlap(this.player, this.porte1)) this.scene.start('niveau1');
      if (this.physics.overlap(this.player, this.porte2)) this.scene.start('niveau2');
      if (this.physics.overlap(this.player, this.porte3)) this.scene.start('niveau3');
    }
    // @fin
  }
}

// Les trois niveaux ne diffèrent que par leur clé et leur texte : une seule
// classe paramétrée évite de copier trois fois le même code.
class Niveau extends Phaser.Scene {
  constructor(cle, numero) {
    super({ key: cle });
    this.numero = numero;
  }

  // preload vide : les assets ont déjà été chargés par la scène "selection".
  preload() {}

  create() {
    this.add.image(400, 300, 'img_ciel');

    this.add.text(400, 100, 'Vous êtes dans le niveau ' + this.numero, {
      fontFamily: 'Georgia, serif',
      fontSize: '22pt',
      fill: '#000'
    }).setOrigin(0.5);

    this.add.text(400, 160, 'ESPACE sur la porte pour revenir au choix', {
      fontSize: '16px',
      fill: '#000'
    }).setOrigin(0.5);

    this.groupe_plateformes = this.physics.add.staticGroup();
    this.groupe_plateformes.create(200, 584, 'img_plateforme');
    this.groupe_plateformes.create(600, 584, 'img_plateforme');

    this.player = this.physics.add.sprite(400, 450, 'img_perso');
    this.player.setBounce(0.2);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.groupe_plateformes);
    // Même raison que dans la scène de sélection : la porte de retour est
    // créée après le joueur, il faut donc le placer devant explicitement.
    this.player.setDepth(1);
    this.clavier = this.input.keyboard.createCursorKeys();

    // @trou Poser la porte de retour en (100, 548)
    this.porte_retour = this.physics.add.staticSprite(100, 548, 'img_porte1');
    // @fin
  }

  update() {
    deplacer(this.player, this.clavier);

    // @trou À l'appui sur ESPACE devant la porte de retour, revenir à la scène "selection"
    if (Phaser.Input.Keyboard.JustDown(this.clavier.space)) {
      if (this.physics.overlap(this.player, this.porte_retour)) {
        this.scene.start('selection');
      }
    }
    // @fin
  }
}

class Niveau1 extends Niveau {
  constructor() { super('niveau1', 1); }
}
class Niveau2 extends Niveau {
  constructor() { super('niveau2', 2); }
}
class Niveau3 extends Niveau {
  constructor() { super('niveau3', 3); }
}

// Déplacement commun à toutes les scènes.
function deplacer(player, clavier) {
  if (clavier.left.isDown) {
    player.setVelocityX(-160);
    player.anims.play('anim_tourne_gauche', true);
  } else if (clavier.right.isDown) {
    player.setVelocityX(160);
    player.anims.play('anim_tourne_droite', true);
  } else {
    player.setVelocityX(0);
    player.anims.play('anim_face', true);
  }

  if (clavier.up.isDown && player.body.touching.down) {
    player.setVelocityY(-330);
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 300 }, debug: false }
  },
  // La première scène du tableau démarre automatiquement.
  scene: [Selection, Niveau1, Niveau2, Niveau3]
};

new Phaser.Game(config);`,
  },
  {
    id: "tuto-multijoueurs",
    group: "Tutoriels",
    label: "T5 · Deuxième joueur (multi-joueurs)",
    description:
      "Deux personnages sur le même écran : le joueur 1 aux flèches, le joueur 2 en ZQSD.",
    code: `/* Tutoriel : ajouter un personnage pour un jeu multi-joueurs.
   Joueur 1 (bleu clair) : flèches. Joueur 2 (rose) : Z Q S D. */

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 300 }, debug: false }
  },
  scene: { preload: preload, create: create, update: update }
};

let groupe_plateformes;
let player;
let player2;
let clavier;
// Le second joueur n'utilise pas les flèches : on déclare ses touches une à une.
let J2Haut;
let J2Gauche;
let J2Droite;

function preload() {
  this.load.image('img_ciel', 'assets/sky.png');
  this.load.image('img_plateforme', 'assets/platform.png');
  this.load.spritesheet('img_perso', 'assets/dude.png', {
    frameWidth: 32,
    frameHeight: 48
  });
}

function create() {
  this.add.image(400, 300, 'img_ciel');

  groupe_plateformes = this.physics.add.staticGroup();
  groupe_plateformes.create(200, 584, 'img_plateforme');
  groupe_plateformes.create(600, 584, 'img_plateforme');
  groupe_plateformes.create(120, 400, 'img_plateforme');
  groupe_plateformes.create(680, 400, 'img_plateforme');

  this.anims.create({
    key: 'anim_tourne_gauche',
    frames: this.anims.generateFrameNumbers('img_perso', { start: 0, end: 3 }),
    frameRate: 10,
    repeat: -1
  });
  this.anims.create({
    key: 'anim_tourne_droite',
    frames: this.anims.generateFrameNumbers('img_perso', { start: 5, end: 8 }),
    frameRate: 10,
    repeat: -1
  });
  this.anims.create({
    key: 'anim_face',
    frames: [{ key: 'img_perso', frame: 4 }],
    frameRate: 20
  });

  player = this.physics.add.sprite(150, 450, 'img_perso');
  player.setBounce(0.2);
  player.setCollideWorldBounds(true);
  this.physics.add.collider(player, groupe_plateformes);

  // @trou Créer le joueur 2 en (650, 450), le teinter en rose (0xff77aa), le faire tenir sur les plates-formes et se bousculer avec le joueur 1
  // Le second joueur réutilise le même spritesheet : une teinte suffit à
  // les distinguer, inutile de charger une seconde image.
  player2 = this.physics.add.sprite(650, 450, 'img_perso');
  player2.setBounce(0.2);
  player2.setCollideWorldBounds(true);
  player2.setTint(0xff77aa);
  this.physics.add.collider(player2, groupe_plateformes);

  // Les deux joueurs se bousculent.
  this.physics.add.collider(player, player2);
  // @fin

  clavier = this.input.keyboard.createCursorKeys();
  // @trou Déclarer les touches Z, Q et D du joueur 2 avec addKey()
  J2Haut = this.input.keyboard.addKey('Z');
  J2Gauche = this.input.keyboard.addKey('Q');
  J2Droite = this.input.keyboard.addKey('D');
  // @fin

  this.add.text(16, 16, 'J1 : flèches     J2 : Z Q D', {
    fontSize: '22px',
    fill: '#000'
  });
}

function update() {
  // Joueur 1
  if (clavier.left.isDown) {
    player.setVelocityX(-160);
    player.anims.play('anim_tourne_gauche', true);
  } else if (clavier.right.isDown) {
    player.setVelocityX(160);
    player.anims.play('anim_tourne_droite', true);
  } else {
    player.setVelocityX(0);
    player.anims.play('anim_face', true);
  }
  if (clavier.up.isDown && player.body.blocked.down) {
    player.setVelocityY(-330);
  }

  // @trou Déplacer le joueur 2 avec Q et D, et le faire sauter avec Z, exactement comme le joueur 1
  // Joueur 2 : exactement la même logique, avec ses propres touches.
  if (J2Gauche.isDown) {
    player2.setVelocityX(-160);
    player2.anims.play('anim_tourne_gauche', true);
  } else if (J2Droite.isDown) {
    player2.setVelocityX(160);
    player2.anims.play('anim_tourne_droite', true);
  } else {
    player2.setVelocityX(0);
    player2.anims.play('anim_face', true);
  }
  if (J2Haut.isDown && player2.body.blocked.down) {
    player2.setVelocityY(-330);
  }
  // @fin
}

new Phaser.Game(config);`,
  },
  {
    id: "tuto-son",
    group: "Tutoriels",
    label: "T6 · Son : musique et bruitages",
    description:
      "Charger et jouer des sons. M coupe la musique, A déclenche un bruitage. Le navigateur exige un clic avant tout son.",
    code: `/* Tutoriel : ajouter du son à un jeu (musique, bruitages).

   Les navigateurs interdisent de démarrer un son tant que l'utilisateur n'a
   pas interagi avec la page : la musique ne démarre donc qu'au premier clic
   ou à la première touche. */

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 300 }, debug: false }
  },
  scene: { preload: preload, create: create, update: update }
};

let groupe_plateformes;
let player;
let clavier;
let boutonFeu;
let boutonMusique;
// Déclarées en dehors de create() pour rester accessibles dans update().
let son_feu;
let musique_de_fond;
let zone_texte;

function preload() {
  this.load.image('img_ciel', 'assets/sky.png');
  this.load.image('img_plateforme', 'assets/platform.png');
  this.load.spritesheet('img_perso', 'assets/dude.png', {
    frameWidth: 32,
    frameHeight: 48
  });

  // @trou Charger avec load.audio() le bruitage 'coupDeFeu' (assets/gun.mp3) et la musique 'background' (assets/guile.mp3)
  // load.audio(clé, fichier)
  this.load.audio('coupDeFeu', 'assets/gun.mp3');
  this.load.audio('background', 'assets/guile.mp3');
  // @fin
}

function create() {
  this.add.image(400, 300, 'img_ciel');

  groupe_plateformes = this.physics.add.staticGroup();
  groupe_plateformes.create(200, 584, 'img_plateforme');
  groupe_plateformes.create(600, 584, 'img_plateforme');

  this.anims.create({
    key: 'anim_tourne_gauche',
    frames: this.anims.generateFrameNumbers('img_perso', { start: 0, end: 3 }),
    frameRate: 10,
    repeat: -1
  });
  this.anims.create({
    key: 'anim_tourne_droite',
    frames: this.anims.generateFrameNumbers('img_perso', { start: 5, end: 8 }),
    frameRate: 10,
    repeat: -1
  });
  this.anims.create({
    key: 'anim_face',
    frames: [{ key: 'img_perso', frame: 4 }],
    frameRate: 20
  });

  player = this.physics.add.sprite(100, 450, 'img_perso');
  player.setBounce(0.2);
  player.setCollideWorldBounds(true);
  this.physics.add.collider(player, groupe_plateformes);

  clavier = this.input.keyboard.createCursorKeys();
  boutonFeu = this.input.keyboard.addKey('A');
  boutonMusique = this.input.keyboard.addKey('M');

  // @trou Créer les deux sons avec sound.add() : son_feu, et musique_de_fond en boucle (loop) à un volume de 0.4
  // sound.add() enregistre le son et rend un objet manipulable.
  son_feu = this.sound.add('coupDeFeu');
  musique_de_fond = this.sound.add('background', { loop: true, volume: 0.4 });
  // @fin

  zone_texte = this.add.text(16, 16, 'Clique dans le jeu pour lancer la musique', {
    fontSize: '20px',
    fill: '#000'
  });

  // @trou Au premier clic (input.once 'pointerdown'), lancer la musique et changer le texte affiché
  // Premier clic : on a le droit de jouer du son.
  this.input.once('pointerdown', function () {
    musique_de_fond.play();
    zone_texte.setText('A : tirer     M : couper / relancer la musique');
    console.log('Musique lancée.');
  });
  // @fin
}

function update() {
  if (clavier.left.isDown) {
    player.setVelocityX(-160);
    player.anims.play('anim_tourne_gauche', true);
  } else if (clavier.right.isDown) {
    player.setVelocityX(160);
    player.anims.play('anim_tourne_droite', true);
  } else {
    player.setVelocityX(0);
    player.anims.play('anim_face', true);
  }

  if (clavier.up.isDown && player.body.touching.down) {
    player.setVelocityY(-330);
  }

  // @trou Sur A jouer le bruitage (volume 0.6), et sur M arrêter la musique si isPlaying, sinon la relancer
  // play() accepte des options : volume, rate (vitesse), detune, loop...
  if (Phaser.Input.Keyboard.JustDown(boutonFeu)) {
    son_feu.play({ volume: 0.6 });
  }

  if (Phaser.Input.Keyboard.JustDown(boutonMusique)) {
    if (musique_de_fond.isPlaying) {
      musique_de_fond.stop();
      console.log('Musique arrêtée.');
    } else {
      musique_de_fond.play();
      console.log('Musique relancée.');
    }
  }
  // @fin
}

new Phaser.Game(config);`,
  },
  {
    id: "tuto-menu",
    group: "Tutoriels",
    label: "T7 · Page d'accueil au clic",
    description:
      "Un menu d'accueil avec un bouton cliquable qui lance le niveau : setInteractive et événements pointerover / pointerout / pointerup.",
    code: `/* Tutoriel : créer une page d'accueil ou un menu lancé avec un clic de souris.

   Deux scènes : "menu" puis "niveau1". Attention, la clé passée à
   this.scene.start() doit correspondre exactement à celle du super(). */

class Menu extends Phaser.Scene {
  constructor() {
    super({ key: 'menu' });
  }

  preload() {
    this.load.image('menu_fond', 'assets/sky.png');
    this.load.image('img_plateforme', 'assets/platform.png');
    this.load.spritesheet('img_perso', 'assets/dude.png', {
      frameWidth: 32,
      frameHeight: 48
    });
  }

  create() {
    // setOrigin(0) ancre l'image par son coin haut-gauche.
    // setDepth fixe l'ordre d'affichage : 0 derrière, 1 devant.
    this.add.image(0, 0, 'menu_fond').setOrigin(0).setDepth(0);

    this.add.text(400, 180, 'MON JEU', {
      fontFamily: 'Georgia, serif',
      fontSize: '64px',
      fill: '#000'
    }).setOrigin(0.5).setDepth(1);

    // @trou Dessiner le bouton : un rectangle bleu foncé en (400, 380) de 260x80, et par-dessus le libellé « ▶ JOUER » centré
    // Le bouton est dessiné plutôt qu'importé, mais le principe est le même
    // qu'avec une image : un objet auquel on ajoute setInteractive().
    const bouton_play = this.add.rectangle(400, 380, 260, 80, 0x1e3a5f).setDepth(1);
    const libelle = this.add.text(400, 380, '▶ JOUER', {
      fontSize: '32px',
      fill: '#ffffff'
    }).setOrigin(0.5).setDepth(2);
    // @fin

    // @trou Rendre le bouton interactif, le faire réagir au survol (pointerover / pointerout) et lancer la scène 'niveau1' sur pointerup
    // Sans setInteractive(), l'objet ne reçoit aucun événement de souris.
    bouton_play.setInteractive({ useHandCursor: true });

    bouton_play.on('pointerover', () => {
      bouton_play.setFillStyle(0x16a34a);
      libelle.setScale(1.08);
    });

    bouton_play.on('pointerout', () => {
      bouton_play.setFillStyle(0x1e3a5f);
      libelle.setScale(1);
    });

    // pointerup : le clic est relâché sur le bouton, on lance le niveau.
    bouton_play.on('pointerup', () => {
      console.log('Lancement du niveau 1');
      this.scene.start('niveau1');
    });
    // @fin

    this.add.text(400, 500, 'Clique sur le bouton', {
      fontSize: '20px',
      fill: '#000'
    }).setOrigin(0.5).setDepth(1);
  }
}

class Niveau1 extends Phaser.Scene {
  constructor() {
    super({ key: 'niveau1' });
  }

  preload() {}

  create() {
    this.add.image(400, 300, 'menu_fond');

    this.add.text(400, 80, 'Niveau 1 — ESPACE pour revenir au menu', {
      fontSize: '20px',
      fill: '#000'
    }).setOrigin(0.5);

    this.groupe_plateformes = this.physics.add.staticGroup();
    this.groupe_plateformes.create(200, 584, 'img_plateforme');
    this.groupe_plateformes.create(600, 584, 'img_plateforme');

    this.anims.create({
      key: 'anim_tourne_gauche',
      frames: this.anims.generateFrameNumbers('img_perso', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: 'anim_tourne_droite',
      frames: this.anims.generateFrameNumbers('img_perso', { start: 5, end: 8 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: 'anim_face',
      frames: [{ key: 'img_perso', frame: 4 }],
      frameRate: 20
    });

    this.player = this.physics.add.sprite(100, 450, 'img_perso');
    this.player.setBounce(0.2);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.groupe_plateformes);
    this.clavier = this.input.keyboard.createCursorKeys();
  }

  update() {
    if (this.clavier.left.isDown) {
      this.player.setVelocityX(-160);
      this.player.anims.play('anim_tourne_gauche', true);
    } else if (this.clavier.right.isDown) {
      this.player.setVelocityX(160);
      this.player.anims.play('anim_tourne_droite', true);
    } else {
      this.player.setVelocityX(0);
      this.player.anims.play('anim_face', true);
    }

    if (this.clavier.up.isDown && this.player.body.touching.down) {
      this.player.setVelocityY(-330);
    }

    // @trou Revenir au menu quand on appuie sur ESPACE (JustDown + scene.start)
    if (Phaser.Input.Keyboard.JustDown(this.clavier.space)) {
      this.scene.start('menu');
    }
    // @fin
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 300 }, debug: false }
  },
  scene: [Menu, Niveau1]
};

new Phaser.Game(config);`,
  },
  {
    id: "tuto-trou",
    group: "Tutoriels",
    label: "T8 · Mourir en tombant dans un trou",
    description:
      "Détecter finement une collision avec les bornes du monde : le joueur ne meurt que s'il touche le bord du bas.",
    code: `/* Tutoriel : comment faire mourir un sprite s'il tombe dans un trou, ou
   comment détecter efficacement les collisions avec les bornes du monde.

   Le sol est volontairement percé : tombe dans le trou pour déclencher la
   fin de partie. R pour recommencer. */

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 300 }, debug: false }
  },
  scene: { preload: preload, create: create, update: update }
};

let groupe_plateformes;
let player;
let clavier;
let boutonRestart;
let gameOver = false;

function preload() {
  this.load.image('img_ciel', 'assets/sky.png');
  this.load.image('img_plateforme', 'assets/platform.png');
  this.load.spritesheet('img_perso', 'assets/dude.png', {
    frameWidth: 32,
    frameHeight: 48
  });
}

function create() {
  gameOver = false;

  this.add.image(400, 300, 'img_ciel');

  groupe_plateformes = this.physics.add.staticGroup();
  // Les deux plates-formes du sol sont écartées : il reste un trou au milieu.
  groupe_plateformes.create(180, 584, 'img_plateforme');
  groupe_plateformes.create(680, 584, 'img_plateforme');
  groupe_plateformes.create(400, 400, 'img_plateforme');

  this.anims.create({
    key: 'anim_tourne_gauche',
    frames: this.anims.generateFrameNumbers('img_perso', { start: 0, end: 3 }),
    frameRate: 10,
    repeat: -1
  });
  this.anims.create({
    key: 'anim_tourne_droite',
    frames: this.anims.generateFrameNumbers('img_perso', { start: 5, end: 8 }),
    frameRate: 10,
    repeat: -1
  });
  this.anims.create({
    key: 'anim_face',
    frames: [{ key: 'img_perso', frame: 4 }],
    frameRate: 20
  });

  player = this.physics.add.sprite(100, 450, 'img_perso');
  player.setBounce(0.2);
  this.physics.add.collider(player, groupe_plateformes);

  // @trou Activer la collision avec les bords du monde, puis demander à la hitbox du joueur d'émettre l'événement 'worldbounds'
  // 1. Le joueur se cogne aux bords du monde.
  player.setCollideWorldBounds(true);
  // 2. Sa hitbox émet un événement quand elle touche un bord.
  player.body.onWorldBounds = true;
  // @fin

  // @trou Écouter 'worldbounds' : si c'est le joueur ET le bord du bas (down), mettre la physique en pause, le teinter en rouge et passer gameOver à true
  // 3. On écoute l'événement. Les booléens up/down/left/right indiquent QUEL
  //    bord a été touché : ici on ne réagit qu'au bord du bas.
  //    Le 3e argument (this) est indispensable : sans lui, this.physics
  //    serait indéfini dans la fonction.
  player.body.world.on(
    'worldbounds',
    function (body, up, down, left, right) {
      if (body.gameObject === player && down === true) {
        this.physics.pause();
        player.setTint(0xff0000);
        gameOver = true;
        console.log('Tombé dans le trou — appuie sur R pour recommencer.');
      }
    },
    this
  );
  // @fin

  clavier = this.input.keyboard.createCursorKeys();
  boutonRestart = this.input.keyboard.addKey('R');

  this.add.text(16, 16, 'Tombe dans le trou !     R : recommencer', {
    fontSize: '20px',
    fill: '#000'
  });
}

function update() {
  // @trou Sur la touche R, relancer la scène avec scene.restart() ; et si gameOver est vrai, sortir de update() sans rien faire
  if (Phaser.Input.Keyboard.JustDown(boutonRestart)) {
    this.scene.restart();
    return;
  }

  if (gameOver) {
    return;
  }
  // @fin

  if (clavier.left.isDown) {
    player.setVelocityX(-160);
    player.anims.play('anim_tourne_gauche', true);
  } else if (clavier.right.isDown) {
    player.setVelocityX(160);
    player.anims.play('anim_tourne_droite', true);
  } else {
    player.setVelocityX(0);
    player.anims.play('anim_face', true);
  }

  if (clavier.up.isDown && player.body.touching.down) {
    player.setVelocityY(-330);
  }
}

new Phaser.Game(config);`,
  },
  {
    id: "tuto-porte",
    group: "Tutoriels",
    label: "T9 · Ouvrir une porte avec espace",
    description:
      "Interagir avec un décor : se placer devant la porte et appuyer sur espace. L'animation se joue à l'endroit puis à l'envers.",
    code: `/* Tutoriel : ouvrir une porte en appuyant sur espace, ou comment interagir
   avec un élément du jeu.

   Flèches pour se déplacer, flèche haut pour sauter, ESPACE devant la porte
   pour l'ouvrir ou la refermer. */

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 300 }, debug: false }
  },
  scene: { preload: preload, create: create, update: update }
};

let groupe_plateformes;
let player;
let clavier;
let porte;

function preload() {
  this.load.image('img_ciel', 'assets/sky.png');
  this.load.image('img_plateforme', 'assets/platform.png');
  this.load.spritesheet('img_perso', 'assets/dude.png', {
    frameWidth: 32,
    frameHeight: 48
  });
  // 6 images de 96 x 120 côte à côte : la porte du fermé à l'ouvert.
  this.load.spritesheet('img_porte', 'assets/spritesheet_porte.png', {
    frameWidth: 96,
    frameHeight: 120
  });
}

function create() {
  this.add.image(400, 300, 'img_ciel');

  groupe_plateformes = this.physics.add.staticGroup();
  groupe_plateformes.create(200, 584, 'img_plateforme');
  groupe_plateformes.create(600, 584, 'img_plateforme');

  // @trou Placer la porte en (550, 508) avec staticSprite, et lui ajouter un attribut « ouverte » valant false
  // staticSprite : la porte ne tombe pas et ne bouge pas.
  porte = this.physics.add.staticSprite(550, 508, 'img_porte');
  // Attribut inventé pour mémoriser l'état de la porte.
  porte.ouverte = false;
  // @fin

  // @trou Créer les animations 'anim_ouvreporte' (images 0 à 5) et 'anim_fermeporte' (images 5 à 0, donc à l'envers), sans répétition
  // Deux animations sur le même spritesheet : la seconde le parcourt à
  // l'envers (start plus grand que end) pour refermer la porte.
  this.anims.create({
    key: 'anim_ouvreporte',
    frames: this.anims.generateFrameNumbers('img_porte', { start: 0, end: 5 }),
    frameRate: 12,
    repeat: 0
  });
  this.anims.create({
    key: 'anim_fermeporte',
    frames: this.anims.generateFrameNumbers('img_porte', { start: 5, end: 0 }),
    frameRate: 12,
    repeat: 0
  });
  // @fin

  this.anims.create({
    key: 'anim_tourne_gauche',
    frames: this.anims.generateFrameNumbers('img_perso', { start: 0, end: 3 }),
    frameRate: 10,
    repeat: -1
  });
  this.anims.create({
    key: 'anim_tourne_droite',
    frames: this.anims.generateFrameNumbers('img_perso', { start: 5, end: 8 }),
    frameRate: 10,
    repeat: -1
  });
  this.anims.create({
    key: 'anim_face',
    frames: [{ key: 'img_perso', frame: 4 }],
    frameRate: 20
  });

  player = this.physics.add.sprite(100, 450, 'img_perso');
  player.setBounce(0.2);
  player.setCollideWorldBounds(true);
  this.physics.add.collider(player, groupe_plateformes);

  clavier = this.input.keyboard.createCursorKeys();

  this.add.text(16, 16, 'Va sur la porte et appuie sur ESPACE', {
    fontSize: '20px',
    fill: '#000'
  });
}

function update() {
  if (clavier.left.isDown) {
    player.setVelocityX(-160);
    player.anims.play('anim_tourne_gauche', true);
  } else if (clavier.right.isDown) {
    player.setVelocityX(160);
    player.anims.play('anim_tourne_droite', true);
  } else {
    player.setVelocityX(0);
    player.anims.play('anim_face', true);
  }

  if (clavier.up.isDown && player.body.touching.down) {
    player.setVelocityY(-330);
  }

  // @trou Si ESPACE vient d'être pressée (JustDown) ET que le joueur chevauche la porte, jouer l'animation d'ouverture ou de fermeture selon porte.ouverte
  // Deux conditions : la touche vient d'être pressée (JustDown, et non
  // isDown qui serait vrai à chaque frame), et le joueur touche la porte.
  if (Phaser.Input.Keyboard.JustDown(clavier.space) &&
      this.physics.overlap(player, porte)) {
    if (porte.ouverte === false) {
      porte.anims.play('anim_ouvreporte');
      porte.ouverte = true;
      console.log('Porte ouverte');
    } else {
      porte.anims.play('anim_fermeporte');
      porte.ouverte = false;
      console.log('Porte fermée');
    }
  }
  // @fin
}

new Phaser.Game(config);`,
  },
  {
    id: "tuto-timers",
    group: "Tutoriels",
    label: "T10 · Timers et délais",
    description:
      "Programmer des actions dans le temps : message qui s'efface, étoile qui réapparaît en boucle, et tir avec temps de recharge.",
    code: `/* Tutoriel : utiliser des timers pour programmer et répéter des actions,
   ou instaurer des délais.

   L'article ne donne que des extraits de syntaxe ; cet exemple les met en
   scène dans trois situations concrètes. A pour tirer (rechargement de 2 s). */

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 300 }, debug: false }
  },
  scene: { preload: preload, create: create, update: update }
};

let groupe_plateformes;
let player;
let clavier;
let boutonFeu;
let etoile;
let zone_texte_etat;

function preload() {
  this.load.image('img_ciel', 'assets/sky.png');
  this.load.image('img_plateforme', 'assets/platform.png');
  this.load.image('img_etoile', 'assets/star.png');
  this.load.spritesheet('img_perso', 'assets/dude.png', {
    frameWidth: 32,
    frameHeight: 48
  });
}

function create() {
  this.add.image(400, 300, 'img_ciel');

  groupe_plateformes = this.physics.add.staticGroup();
  groupe_plateformes.create(200, 584, 'img_plateforme');
  groupe_plateformes.create(600, 584, 'img_plateforme');

  this.anims.create({
    key: 'anim_tourne_gauche',
    frames: this.anims.generateFrameNumbers('img_perso', { start: 0, end: 3 }),
    frameRate: 10,
    repeat: -1
  });
  this.anims.create({
    key: 'anim_tourne_droite',
    frames: this.anims.generateFrameNumbers('img_perso', { start: 5, end: 8 }),
    frameRate: 10,
    repeat: -1
  });
  this.anims.create({
    key: 'anim_face',
    frames: [{ key: 'img_perso', frame: 4 }],
    frameRate: 20
  });

  player = this.physics.add.sprite(100, 450, 'img_perso');
  player.setBounce(0.2);
  player.setCollideWorldBounds(true);
  this.physics.add.collider(player, groupe_plateformes);
  player.peutTirer = true;

  clavier = this.input.keyboard.createCursorKeys();
  boutonFeu = this.input.keyboard.addKey('A');

  zone_texte_etat = this.add.text(16, 50, 'A : tirer', {
    fontSize: '22px',
    fill: '#000'
  });

  // @trou Afficher un message de bienvenue, puis le détruire au bout de 3 secondes avec time.delayedCall()
  /* 1. delayedCall : une seule exécution, après un délai.
        Ici un message de bienvenue qui s'efface au bout de 3 secondes. */
  const message = this.add.text(400, 150, 'Ce message disparaît dans 3 s...', {
    fontSize: '24px',
    fill: '#000'
  }).setOrigin(0.5);

  this.time.delayedCall(3000, function () {
    message.destroy();
    console.log('Message effacé par delayedCall.');
  }, null, this);
  // @fin

  /* 2. addEvent avec repeat: -1 : exécution répétée à l'infini.
        Une étoile réapparaît à une position aléatoire toutes les 2 s. */
  etoile = this.physics.add.sprite(400, 100, 'img_etoile');
  etoile.setBounceY(0.6);
  this.physics.add.collider(etoile, groupe_plateformes);

  // @trou Avec time.addEvent() et repeat: -1, replacer l'étoile toutes les 2 s à une position horizontale aléatoire (Phaser.Math.Between) en haut de l'écran
  this.time.addEvent({
    delay: 2000,
    callback: function () {
      etoile.setPosition(Phaser.Math.Between(50, 750), 50);
      etoile.setVelocity(0, 0);
    },
    args: [],
    callbackScope: this,
    repeat: -1
  });
  // @fin

  console.log('Timers programmés.');
}

function update() {
  if (clavier.left.isDown) {
    player.setVelocityX(-160);
    player.anims.play('anim_tourne_gauche', true);
  } else if (clavier.right.isDown) {
    player.setVelocityX(160);
    player.anims.play('anim_tourne_droite', true);
  } else {
    player.setVelocityX(0);
    player.anims.play('anim_face', true);
  }

  if (clavier.up.isDown && player.body.touching.down) {
    player.setVelocityY(-330);
  }

  /* 3. Le motif du "temps de recharge" : un attribut booléen désactivé au
        tir, puis réactivé par un delayedCall. */
  if (Phaser.Input.Keyboard.JustDown(boutonFeu)) {
    tirer.call(this, player);
  }
}

function tirer(player) {
  // @trou Sortir immédiatement de la fonction si le joueur est encore en rechargement (peutTirer vaut false)
  if (player.peutTirer === false) {
    return;
  }
  // @fin

  const balle = this.add.circle(player.x, player.y - 4, 6, 0xff0000);
  this.tweens.add({
    targets: balle,
    x: 800,
    duration: 600,
    onComplete: function () { balle.destroy(); }
  });

  // @trou Interdire le tir, afficher « Rechargement... », puis réarmer le joueur 2 secondes plus tard avec delayedCall()
  player.peutTirer = false;
  zone_texte_etat.setText('Rechargement...');

  // Réarmement dans 2 secondes.
  this.time.delayedCall(2000, function () {
    player.peutTirer = true;
    zone_texte_etat.setText('A : tirer');
  }, null, this);
  // @fin
}

new Phaser.Game(config);`,
  },
  {
    id: "tuto-levier",
    group: "Tutoriels",
    label: "T11 · Plate-forme mobile et levier",
    description:
      "Un tween mis en pause à la création, puis démarré et arrêté par un levier actionné à la barre espace.",
    code: `/* Tutoriel : utiliser les tweens pour activer une plate-forme mobile via
   un levier.

   Va sur le levier (à droite) et appuie sur ESPACE : la plate-forme bleue se
   met en mouvement. Monte dessus pour atteindre le haut. */

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 300 }, debug: false }
  },
  scene: { preload: preload, create: create, update: update }
};

let groupe_plateformes;
let player;
let clavier;
let plateforme_mobile;
let tween_mouvement;
let levier;

function preload() {
  this.load.image('img_ciel', 'assets/sky.png');
  this.load.image('img_plateforme', 'assets/platform.png');
  this.load.spritesheet('img_perso', 'assets/dude.png', {
    frameWidth: 32,
    frameHeight: 48
  });
}

function create() {
  this.add.image(400, 300, 'img_ciel');

  // Textures fabriquées à la volée : le tutoriel fournit deux images, on les
  // dessine ici pour que l'exemple reste autonome.
  const g = this.make.graphics({ add: false });
  g.fillStyle(0x29adff, 1);
  g.fillRect(0, 0, 150, 24);
  g.generateTexture('img_plateforme_mobile', 150, 24);
  g.clear();
  g.fillStyle(0x8b4513, 1);
  g.fillRect(24, 20, 12, 40);
  g.fillStyle(0xff004d, 1);
  g.fillCircle(30, 16, 14);
  g.generateTexture('img_levier', 60, 60);
  g.destroy();

  groupe_plateformes = this.physics.add.staticGroup();
  groupe_plateformes.create(200, 584, 'img_plateforme');
  groupe_plateformes.create(600, 584, 'img_plateforme');
  groupe_plateformes.create(180, 200, 'img_plateforme');

  // Un sprite dynamique, pas un staticSprite : la hitbox d'un corps statique
  // ne suivrait pas le déplacement de l'image.
  plateforme_mobile = this.physics.add.sprite(400, 500, 'img_plateforme_mobile');
  // @trou Empêcher la plate-forme mobile de tomber (allowGravity) et de se faire pousser par le joueur (immovable)
  plateforme_mobile.body.allowGravity = false;  // elle ne tombe pas
  plateforme_mobile.body.immovable = true;      // le joueur ne la pousse pas
  // @fin

  // @trou Créer le tween qui monte la plate-forme de 300 px en 2 s, en yoyo et en boucle infinie, mais en pause au départ (paused: true)
  // paused: true — le tween est créé mais ne démarre pas tout de suite.
  tween_mouvement = this.tweens.add({
    targets: [plateforme_mobile],
    paused: true,
    ease: 'Linear',
    duration: 2000,
    yoyo: true,            // rembobine le déplacement une fois arrivé
    y: '-=300',            // valeur relative : 300 px plus haut
    delay: 0,
    hold: 1000,            // temps d'attente en haut
    repeatDelay: 1000,     // temps d'attente en bas
    repeat: -1
  });
  // @fin

  // @trou Placer le levier en (700, 538) avec staticSprite et lui ajouter un attribut « actif » valant false
  levier = this.physics.add.staticSprite(700, 538, 'img_levier');
  // On évite le nom "active", déjà utilisé en interne par Phaser.
  levier.actif = false;
  // @fin

  this.anims.create({
    key: 'anim_tourne_gauche',
    frames: this.anims.generateFrameNumbers('img_perso', { start: 0, end: 3 }),
    frameRate: 10,
    repeat: -1
  });
  this.anims.create({
    key: 'anim_tourne_droite',
    frames: this.anims.generateFrameNumbers('img_perso', { start: 5, end: 8 }),
    frameRate: 10,
    repeat: -1
  });
  this.anims.create({
    key: 'anim_face',
    frames: [{ key: 'img_perso', frame: 4 }],
    frameRate: 20
  });

  player = this.physics.add.sprite(100, 450, 'img_perso');
  player.setBounce(0.2);
  player.setCollideWorldBounds(true);
  this.physics.add.collider(player, groupe_plateformes);
  // Sans ce collider, le joueur traverserait la plate-forme mobile.
  this.physics.add.collider(player, plateforme_mobile);

  clavier = this.input.keyboard.createCursorKeys();

  this.add.text(16, 16, 'ESPACE sur le levier pour lancer la plate-forme', {
    fontSize: '20px',
    fill: '#000'
  });
}

function update() {
  if (clavier.left.isDown) {
    player.setVelocityX(-160);
    player.anims.play('anim_tourne_gauche', true);
  } else if (clavier.right.isDown) {
    player.setVelocityX(160);
    player.anims.play('anim_tourne_droite', true);
  } else {
    player.setVelocityX(0);
    player.anims.play('anim_face', true);
  }

  if (clavier.up.isDown && player.body.touching.down) {
    player.setVelocityY(-330);
  }

  // @trou Sur ESPACE devant le levier, basculer son état : retourner son image (flipX) et mettre le tween en pause ou le relancer (pause / resume)
  if (Phaser.Input.Keyboard.JustDown(clavier.space) &&
      this.physics.overlap(player, levier)) {
    if (levier.actif === true) {
      levier.actif = false;
      levier.flipX = false;
      tween_mouvement.pause();
      console.log('Levier désactivé');
    } else {
      levier.actif = true;
      levier.flipX = true;
      tween_mouvement.resume();
      console.log('Levier activé');
    }
  }
  // @fin
}

new Phaser.Game(config);`,
  },
  {
    id: "tuto-vie",
    group: "Tutoriels",
    label: "T12 · Barre de vie et dégâts",
    description:
      "Donner des points de vie au joueur au lieu de le tuer au premier contact : une donnée, son affichage en barre, et une fenêtre d'invulnérabilité.",
    code: `/* Tutoriel : donner des points de vie au joueur et les afficher dans une
   barre, plutôt que de le tuer dès le premier contact.

   Flèches pour se déplacer, flèche haut pour sauter. Chaque bombe touchée
   coûte 20 points de vie ; le joueur clignote alors et devient invulnérable
   une seconde et demie. R pour recommencer.

   L'idée à retenir : la donnée (pointsDeVie) et son affichage (la barre) sont
   deux choses distinctes. On modifie la donnée, puis on redessine. */

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 300 }, debug: false }
  },
  scene: { preload: preload, create: create, update: update }
};

let groupe_plateformes;
let player;
let clavier;
let boutonRestart;
let groupe_bombes;

// La donnée : ce que vaut la vie du joueur.
let pointsDeVie = 100;
// Le dessin : l'objet Graphics qui la représente à l'écran.
let barre_vie;
// Pendant l'invulnérabilité, les bombes ne font plus de dégâts.
let invincible = false;
let gameOver = false;

function preload() {
  this.load.image('img_ciel', 'assets/sky.png');
  this.load.image('img_plateforme', 'assets/platform.png');
  this.load.image('img_bombe', 'assets/bomb.png');
  this.load.spritesheet('img_perso', 'assets/dude.png', {
    frameWidth: 32,
    frameHeight: 48
  });
}

function create() {
  // create() est rejoué à chaque scene.restart() : on remet tout à zéro ici,
  // sinon la partie suivante reprendrait la vie de la précédente.
  pointsDeVie = 100;
  invincible = false;
  gameOver = false;

  this.add.image(400, 300, 'img_ciel');

  groupe_plateformes = this.physics.add.staticGroup();
  groupe_plateformes.create(400, 584, 'img_plateforme').setScale(2).refreshBody();
  groupe_plateformes.create(600, 400, 'img_plateforme');
  groupe_plateformes.create(50, 250, 'img_plateforme');
  groupe_plateformes.create(750, 220, 'img_plateforme');

  this.anims.create({
    key: 'anim_tourne_gauche',
    frames: this.anims.generateFrameNumbers('img_perso', { start: 0, end: 3 }),
    frameRate: 10,
    repeat: -1
  });
  this.anims.create({
    key: 'anim_tourne_droite',
    frames: this.anims.generateFrameNumbers('img_perso', { start: 5, end: 8 }),
    frameRate: 10,
    repeat: -1
  });
  this.anims.create({
    key: 'anim_face',
    frames: [{ key: 'img_perso', frame: 4 }],
    frameRate: 20
  });

  player = this.physics.add.sprite(100, 450, 'img_perso');
  player.setBounce(0.2);
  player.setCollideWorldBounds(true);
  this.physics.add.collider(player, groupe_plateformes);

  // Trois bombes qui rebondissent sans fin : la source des dégâts.
  groupe_bombes = this.physics.add.group();
  for (let i = 0; i < 3; i++) {
    const une_bombe = groupe_bombes.create(200 + 200 * i, 16, 'img_bombe');
    une_bombe.setBounce(1);
    une_bombe.setCollideWorldBounds(true);
    une_bombe.setVelocity(Phaser.Math.Between(-200, 200), 20);
    une_bombe.body.allowGravity = false;
  }
  this.physics.add.collider(groupe_bombes, groupe_plateformes);

  // @trou Créer la barre de vie avec add.graphics(), la fixer à l'écran avec setScrollFactor(0), puis appeler dessinerBarreVie() pour l'afficher une première fois
  barre_vie = this.add.graphics();
  // setScrollFactor(0) : la barre reste collée à l'écran même si la caméra
  // se déplace. C'est ce qui distingue un élément d'interface du décor.
  barre_vie.setScrollFactor(0);
  dessinerBarreVie();
  // @fin

  // @trou Appeler perdreVie() quand le joueur touche une bombe : overlap et non collider, pour qu'il ne rebondisse pas dessus
  this.physics.add.overlap(player, groupe_bombes, perdreVie, null, this);
  // @fin

  clavier = this.input.keyboard.createCursorKeys();
  boutonRestart = this.input.keyboard.addKey('R');

  this.add.text(16, 52, 'Evite les bombes !     R : recommencer', {
    fontSize: '18px',
    fill: '#000'
  });
}

// @trou Écrire dessinerBarreVie() : effacer le tracé précédent, dessiner un fond rouge de 200 px de large, puis par-dessus un rectangle vert dont la largeur vaut 2 fois pointsDeVie
function dessinerBarreVie() {
  // clear() efface le tracé précédent. Sans lui, les rectangles
  // s'empileraient les uns sur les autres à chaque redessin.
  barre_vie.clear();

  // Le fond, toujours à sa largeur maximale : c'est la vie manquante.
  barre_vie.fillStyle(0xaa0000, 1);
  barre_vie.fillRect(16, 16, 200, 24);

  // La partie pleine : 100 points de vie pour 200 px, donc 2 px par point.
  barre_vie.fillStyle(0x00cc00, 1);
  barre_vie.fillRect(16, 16, pointsDeVie * 2, 24);
}
// @fin

// @trou Écrire perdreVie() : ne rien faire si le joueur est déjà invincible ; sinon lui retirer 20 points de vie et redessiner la barre, terminer la partie si la vie tombe à zéro, et sinon le rendre invincible 1500 ms en le faisant clignoter
function perdreVie(un_player, une_bombe) {
  // Sans ce garde-fou, l'overlap se déclencherait à chaque frame de contact
  // et la vie tomberait à zéro en une fraction de seconde.
  if (invincible === true) {
    return;
  }

  pointsDeVie -= 20;
  dessinerBarreVie();

  if (pointsDeVie <= 0) {
    this.physics.pause();
    player.setTint(0xff0000);
    player.anims.play('anim_face');
    gameOver = true;
    console.log('Game over — appuie sur R pour recommencer.');
    return;
  }

  // Fenêtre d'invulnérabilité. Le clignotement la rend visible au joueur :
  // sans lui, il ne comprendrait pas pourquoi les bombes ne font plus rien.
  invincible = true;
  this.tweens.add({
    targets: player,
    alpha: 0.2,
    duration: 120,
    yoyo: true,
    repeat: 5
  });
  this.time.delayedCall(1500, function () {
    invincible = false;
    player.setAlpha(1);
  });
}
// @fin

function update() {
  if (Phaser.Input.Keyboard.JustDown(boutonRestart)) {
    this.scene.restart();
    return;
  }

  if (gameOver) {
    return;
  }

  if (clavier.left.isDown) {
    player.setVelocityX(-160);
    player.anims.play('anim_tourne_gauche', true);
  } else if (clavier.right.isDown) {
    player.setVelocityX(160);
    player.anims.play('anim_tourne_droite', true);
  } else {
    player.setVelocityX(0);
    player.anims.play('anim_face', true);
  }

  if (clavier.up.isDown && player.body.touching.down) {
    player.setVelocityY(-330);
  }
}

new Phaser.Game(config);`,
  },
  {
    id: "tuto-record",
    group: "Tutoriels",
    label: "T13 · Meilleur score sauvegardé",
    description:
      "Retenir le record d'une partie à l'autre avec localStorage : lire, convertir, comparer, enregistrer. Le score survit au rechargement de la page.",
    code: `/* Tutoriel : retenir le meilleur score d'une partie à l'autre avec
   localStorage.

   Ramasse les étoiles ; la bombe qui rebondit met fin à la partie. Le record
   est enregistré dans le navigateur : il survit au rechargement de la page,
   et même à la fermeture du navigateur. R pour rejouer, E pour effacer le
   record.

   Le piège à connaître : localStorage ne stocke que du TEXTE. getItem()
   renvoie donc une chaîne, ou null si la clé n'existe pas encore. Sans
   conversion, la comparaison porterait sur des chaînes et '9' > '10'
   serait vrai. */

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 300 }, debug: false }
  },
  scene: { preload: preload, create: create, update: update }
};

// La clé sous laquelle le record est rangé. Le navigateur garde les données
// de tous les sites au même endroit : un nom précis évite les collisions.
const CLE_RECORD = 'ccjs.phaser.record';

let groupe_plateformes;
let player;
let clavier;
let groupe_etoiles;
let groupe_bombes;
let zone_texte_score;
let zone_texte_record;
let boutonRestart;
let boutonEffacer;
let score = 0;
let record = 0;
let gameOver = false;

function preload() {
  this.load.image('img_ciel', 'assets/sky.png');
  this.load.image('img_plateforme', 'assets/platform.png');
  this.load.image('img_etoile', 'assets/star.png');
  this.load.image('img_bombe', 'assets/bomb.png');
  this.load.spritesheet('img_perso', 'assets/dude.png', {
    frameWidth: 32,
    frameHeight: 48
  });
}

function create() {
  score = 0;
  gameOver = false;

  // @trou Lire le record enregistré : getItem() renvoie une chaîne ou null, il faut donc le convertir en nombre et retomber sur 0 quand rien n'a encore été enregistré
  // Number(null) vaut 0, mais Number('abc') vaut NaN : le || 0 couvre les
  // deux cas d'un coup, y compris une valeur abîmée à la main.
  record = Number(localStorage.getItem(CLE_RECORD)) || 0;
  // @fin

  this.add.image(400, 300, 'img_ciel');

  groupe_plateformes = this.physics.add.staticGroup();
  groupe_plateformes.create(400, 584, 'img_plateforme').setScale(2).refreshBody();
  groupe_plateformes.create(600, 400, 'img_plateforme');
  groupe_plateformes.create(50, 250, 'img_plateforme');
  groupe_plateformes.create(750, 220, 'img_plateforme');

  this.anims.create({
    key: 'anim_tourne_gauche',
    frames: this.anims.generateFrameNumbers('img_perso', { start: 0, end: 3 }),
    frameRate: 10,
    repeat: -1
  });
  this.anims.create({
    key: 'anim_tourne_droite',
    frames: this.anims.generateFrameNumbers('img_perso', { start: 5, end: 8 }),
    frameRate: 10,
    repeat: -1
  });
  this.anims.create({
    key: 'anim_face',
    frames: [{ key: 'img_perso', frame: 4 }],
    frameRate: 20
  });

  player = this.physics.add.sprite(100, 450, 'img_perso');
  player.setBounce(0.2);
  player.setCollideWorldBounds(true);
  this.physics.add.collider(player, groupe_plateformes);

  groupe_etoiles = this.physics.add.group();
  for (let i = 0; i < 10; i++) {
    groupe_etoiles.create(70 + 70 * i, 10, 'img_etoile');
  }
  this.physics.add.collider(groupe_etoiles, groupe_plateformes);
  groupe_etoiles.children.iterate(function (etoile_i) {
    etoile_i.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
  });
  this.physics.add.overlap(player, groupe_etoiles, ramasserEtoile, null, this);

  // Une bombe dès le départ : la partie peut se terminer à tout moment,
  // donc le record se joue sur ce qu'on a eu le temps de ramasser.
  groupe_bombes = this.physics.add.group();
  const une_bombe = groupe_bombes.create(400, 16, 'img_bombe');
  une_bombe.setBounce(1);
  une_bombe.setCollideWorldBounds(true);
  une_bombe.setVelocity(Phaser.Math.Between(-200, 200), 20);
  une_bombe.body.allowGravity = false;
  this.physics.add.collider(groupe_bombes, groupe_plateformes);
  this.physics.add.collider(player, groupe_bombes, chocAvecBombe, null, this);

  zone_texte_score = this.add.text(16, 16, 'Score : 0', {
    fontSize: '28px',
    fill: '#000'
  });

  // @trou Afficher le record juste sous le score, sous la forme 'Record : ' suivi de sa valeur
  zone_texte_record = this.add.text(16, 52, 'Record : ' + record, {
    fontSize: '24px',
    fill: '#004400'
  });
  // @fin

  clavier = this.input.keyboard.createCursorKeys();
  boutonRestart = this.input.keyboard.addKey('R');
  boutonEffacer = this.input.keyboard.addKey('E');

  this.add.text(16, 84, 'R : rejouer     E : effacer le record', {
    fontSize: '16px',
    fill: '#000'
  });
}

function update() {
  if (Phaser.Input.Keyboard.JustDown(boutonRestart)) {
    this.scene.restart();
    return;
  }

  // @trou Sur la touche E, supprimer la clé du localStorage avec removeItem(), remettre record à 0 et rafraîchir le texte affiché
  if (Phaser.Input.Keyboard.JustDown(boutonEffacer)) {
    // removeItem() supprime la clé. Mettre une chaîne vide ne suffirait pas :
    // la clé existerait toujours, avec une valeur vide.
    localStorage.removeItem(CLE_RECORD);
    record = 0;
    zone_texte_record.setText('Record : 0');
    console.log('Record effacé.');
  }
  // @fin

  if (gameOver) {
    return;
  }

  if (clavier.left.isDown) {
    player.setVelocityX(-160);
    player.anims.play('anim_tourne_gauche', true);
  } else if (clavier.right.isDown) {
    player.setVelocityX(160);
    player.anims.play('anim_tourne_droite', true);
  } else {
    player.setVelocityX(0);
    player.anims.play('anim_face', true);
  }

  if (clavier.up.isDown && player.body.touching.down) {
    player.setVelocityY(-330);
  }
}

function ramasserEtoile(un_player, une_etoile) {
  une_etoile.disableBody(true, true);
  score += 10;
  zone_texte_score.setText('Score : ' + score);

  // Toutes les étoiles ramassées : on les remet en jeu pour continuer à
  // faire monter le score.
  if (groupe_etoiles.countActive(true) === 0) {
    groupe_etoiles.children.iterate(function (etoile_i) {
      etoile_i.enableBody(true, etoile_i.x, 0, true, true);
    });
  }
}

function chocAvecBombe(un_player, une_bombe) {
  this.physics.pause();
  player.setTint(0xff0000);
  player.anims.play('anim_face');
  gameOver = true;

  // @trou Comparer le score au record : s'il est meilleur, l'enregistrer avec setItem() en le convertissant en texte, mettre record à jour et rafraîchir l'affichage
  if (score > record) {
    record = score;
    // setItem() ne stocke que du texte. String() rend la conversion
    // explicite au lieu de la laisser faire en douce par le navigateur.
    localStorage.setItem(CLE_RECORD, String(record));
    zone_texte_record.setText('Record : ' + record + ' (nouveau !)');
    console.log('Nouveau record : ' + record);
  } else {
    console.log('Score : ' + score + ' — record inchangé (' + record + ').');
  }
  // @fin
}

new Phaser.Game(config);`,
  },
  {
    id: "tuto-ennemi",
    group: "Tutoriels",
    label: "T14 · Ennemi qui patrouille",
    description:
      "Un ennemi qui fait ses allers-retours tout seul et qu'on élimine en lui sautant dessus : demi-tour sur body.blocked, et règle du qui-tue-qui au contact.",
    code: `/* Tutoriel : un ennemi qui patrouille tout seul, et qu'on élimine en lui
   sautant dessus.

   Flèches pour se déplacer, flèche haut pour sauter. L'ennemi rouge fait des
   allers-retours : le toucher par le côté est fatal, mais lui retomber dessus
   l'élimine et rapporte 50 points. R pour recommencer.

   Tout se joue dans la fonction de contact : c'est la position du joueur par
   rapport à l'ennemi, au moment du choc, qui décide lequel des deux meurt. */

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 300 }, debug: false }
  },
  scene: { preload: preload, create: create, update: update }
};

let groupe_plateformes;
let player;
let clavier;
let boutonRestart;
let ennemi;
let zone_texte_score;
let score = 0;
let gameOver = false;

// Vitesse de patrouille, dans les deux sens : on la range dans une constante
// pour ne pas répéter le nombre à chaque demi-tour.
const VITESSE_ENNEMI = 100;

function preload() {
  this.load.image('img_ciel', 'assets/sky.png');
  this.load.image('img_plateforme', 'assets/platform.png');
  this.load.spritesheet('img_perso', 'assets/dude.png', {
    frameWidth: 32,
    frameHeight: 48
  });
}

function create() {
  score = 0;
  gameOver = false;

  this.add.image(400, 300, 'img_ciel');

  groupe_plateformes = this.physics.add.staticGroup();
  groupe_plateformes.create(400, 584, 'img_plateforme').setScale(2).refreshBody();
  groupe_plateformes.create(120, 380, 'img_plateforme');
  groupe_plateformes.create(680, 380, 'img_plateforme');

  this.anims.create({
    key: 'anim_tourne_gauche',
    frames: this.anims.generateFrameNumbers('img_perso', { start: 0, end: 3 }),
    frameRate: 10,
    repeat: -1
  });
  this.anims.create({
    key: 'anim_tourne_droite',
    frames: this.anims.generateFrameNumbers('img_perso', { start: 5, end: 8 }),
    frameRate: 10,
    repeat: -1
  });
  this.anims.create({
    key: 'anim_face',
    frames: [{ key: 'img_perso', frame: 4 }],
    frameRate: 20
  });

  player = this.physics.add.sprite(100, 450, 'img_perso');
  player.setBounce(0.2);
  player.setCollideWorldBounds(true);
  this.physics.add.collider(player, groupe_plateformes);

  // @trou Créer l'ennemi : un sprite 'img_perso' teinté en rouge, posé vers x = 650, qui se cogne aux bords du monde, entre en collision avec les plates-formes, et démarre vers la droite à VITESSE_ENNEMI
  ennemi = this.physics.add.sprite(650, 450, 'img_perso');
  ennemi.setTint(0xff5555);
  // Il rebondit sur les bords de l'écran : c'est ce qui borne sa patrouille.
  ennemi.setCollideWorldBounds(true);
  this.physics.add.collider(ennemi, groupe_plateformes);
  ennemi.setVelocityX(VITESSE_ENNEMI);
  ennemi.anims.play('anim_tourne_droite', true);
  // @fin

  // @trou Appeler toucherEnnemi() quand le joueur et l'ennemi se superposent : overlap, car un collider les ferait rebondir avant qu'on ait pu décider quoi que ce soit
  this.physics.add.overlap(player, ennemi, toucherEnnemi, null, this);
  // @fin

  clavier = this.input.keyboard.createCursorKeys();
  boutonRestart = this.input.keyboard.addKey('R');

  zone_texte_score = this.add.text(16, 16, 'Score : 0', {
    fontSize: '28px',
    fill: '#000'
  });
  this.add.text(16, 52, 'Saute sur l ennemi !     R : recommencer', {
    fontSize: '16px',
    fill: '#000'
  });
}

function update() {
  if (Phaser.Input.Keyboard.JustDown(boutonRestart)) {
    this.scene.restart();
    return;
  }

  if (gameOver) {
    return;
  }

  // @trou Faire faire demi-tour à l'ennemi : s'il est bloqué à droite, le renvoyer vers la gauche, et inversement, en changeant aussi son animation. Ne rien faire s'il a été éliminé
  // body.blocked.right est vrai quand la hitbox bute contre quelque chose à
  // sa droite : ici, le bord du monde. À ne pas confondre avec touching,
  // qui parle des contacts entre deux corps mobiles.
  if (ennemi.active === true) {
    if (ennemi.body.blocked.right) {
      ennemi.setVelocityX(-VITESSE_ENNEMI);
      ennemi.anims.play('anim_tourne_gauche', true);
    } else if (ennemi.body.blocked.left) {
      ennemi.setVelocityX(VITESSE_ENNEMI);
      ennemi.anims.play('anim_tourne_droite', true);
    }
  }
  // @fin

  if (clavier.left.isDown) {
    player.setVelocityX(-160);
    player.anims.play('anim_tourne_gauche', true);
  } else if (clavier.right.isDown) {
    player.setVelocityX(160);
    player.anims.play('anim_tourne_droite', true);
  } else {
    player.setVelocityX(0);
    player.anims.play('anim_face', true);
  }

  if (clavier.up.isDown && player.body.touching.down) {
    player.setVelocityY(-330);
  }
}

// @trou Écrire toucherEnnemi() : si le joueur retombe sur l'ennemi (il descend ET son centre est au-dessus de celui de l'ennemi), éliminer l'ennemi avec disableBody(), faire rebondir le joueur et marquer 50 points ; dans tous les autres cas, c'est le joueur qui meurt
function toucherEnnemi(un_player, un_ennemi) {
  // Deux conditions, et il faut les deux réunies :
  // - le joueur descend (velocity.y > 0), donc il ne remonte pas dans
  //   l'ennemi par en dessous ;
  // - il est encore nettement au-dessus de lui au moment du choc.
  const tombeDessus =
    un_player.body.velocity.y > 0 && un_player.y < un_ennemi.y - 16;

  if (tombeDessus) {
    // disableBody(true, true) : corps physique désactivé, sprite masqué.
    un_ennemi.disableBody(true, true);
    // Petit rebond : la récompense se voit tout de suite.
    un_player.setVelocityY(-200);
    score += 50;
    zone_texte_score.setText('Score : ' + score);
    console.log('Ennemi éliminé !');
  } else {
    this.physics.pause();
    un_player.setTint(0xff0000);
    un_player.anims.play('anim_face');
    gameOver = true;
    console.log('Touché par le côté — appuie sur R pour recommencer.');
  }
}
// @fin

new Phaser.Game(config);`,
  },
];
