/* Exemples Phaser du module Code Coach Phaser.
   Aucune image externe : les textures sont générées à la volée avec Graphics,
   les exemples fonctionnent donc même sans accès au CDN d'assets. */

const PHASER_EXAMPLES = [
  {
    id: "bienvenue",
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
];
