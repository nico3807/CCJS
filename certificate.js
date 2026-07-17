/* ============================================================
 * Code Coach — Génération du certificat PDF (jsPDF)
 * Page 1 : certificat officiel avec les logos de part et
 * d'autre du titre (logo_um.png à gauche, logo mmi.jpg à
 * droite), identité de l'étudiant, statistiques de progression
 * et détail de l'avancement par thème.
 * Ensuite : l'historique complet des exercices de l'étudiant.
 * (Adapté du certificat de MMI Linux Quest.)
 * ============================================================ */

const Certificate = (() => {

  const LOGO_LEFT = 'logos/logo_um.png';
  const LOGO_RIGHT = 'logos/logo mmi.jpg';

  /** Charge une image et retourne { dataURL, ratio largeur/hauteur, format }. */
  function loadImage(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx2d = canvas.getContext('2d');
          const isJpeg = /\.jpe?g$/i.test(url);
          if (isJpeg) { ctx2d.fillStyle = '#ffffff'; ctx2d.fillRect(0, 0, canvas.width, canvas.height); }
          ctx2d.drawImage(img, 0, 0);
          resolve({
            dataURL: isJpeg ? canvas.toDataURL('image/jpeg', 0.9) : canvas.toDataURL('image/png'),
            ratio: img.naturalWidth / img.naturalHeight,
            format: isJpeg ? 'JPEG' : 'PNG',
          });
        } catch { resolve(null); /* canvas « tainted » (ouverture en file://) */ }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  /** Nettoie une chaîne pour les polices standard du PDF (latin-1). */
  function sanitize(s) {
    return String(s).replace(/[^\x20-\x7EÀ-ÿŒœ€«»'’‘…–—°]/g, '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Génère et télécharge le certificat.
   * opts = {
   *   prenom, nom,
   *   app: { title, langLabel, slug },
   *   stats: { duree, date, finished, topicsDone, topicsTotal, goal,
   *            correct, total, pct },
   *   topics: [{ label, correct, goal }],
   *   history: [{ date, topicLabel, difficulty, result }]
   * }
   * Si le parcours n'est pas terminé, le document porte la mention
   * « NON TERMINÉ » (filigrane + statut).
   */
  async function generate(opts) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210, H = 297;
    const MARGIN = 14;
    const finished = !!opts.stats.finished;
    const appTitle = sanitize(opts.app.title);

    const prenom = sanitize(opts.prenom);
    const nom = sanitize(opts.nom).toUpperCase();

    const [logoLeft, logoRight] = await Promise.all([loadImage(LOGO_LEFT), loadImage(LOGO_RIGHT)]);

    /* ---------- Filigrane « NON TERMINÉ » (avant le contenu) ---------- */
    if (!finished) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(52);
      try {
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.13 }));
        doc.setTextColor(200, 40, 40);
        doc.text('NON TERMINÉ', W / 2, H / 2 + 30, { angle: 45, align: 'center' });
        doc.restoreGraphicsState();
      } catch {
        doc.setTextColor(246, 214, 214);
        doc.text('NON TERMINÉ', W / 2, H / 2 + 30, { angle: 45, align: 'center' });
      }
    }

    /* ---------- Cadre décoratif ---------- */
    doc.setDrawColor(30, 58, 95);
    doc.setLineWidth(1.2);
    doc.roundedRect(7, 7, W - 14, H - 14, 4, 4);
    doc.setDrawColor(finished ? 22 : 255, finished ? 163 : 160, finished ? 74 : 100);
    doc.setLineWidth(0.4);
    doc.roundedRect(9.5, 9.5, W - 19, H - 19, 3, 3);

    /* ---------- Logos de part et d'autre du titre ---------- */
    const logoTop = 16, logoH = 20;
    if (logoLeft) {
      const w = Math.min(logoH * logoLeft.ratio, 38);
      doc.addImage(logoLeft.dataURL, logoLeft.format, MARGIN, logoTop + (logoH - w / logoLeft.ratio) / 2, w, w / logoLeft.ratio);
    }
    if (logoRight) {
      const w = Math.min(logoH * logoRight.ratio, 38);
      doc.addImage(logoRight.dataURL, logoRight.format, W - MARGIN - w, logoTop + (logoH - w / logoRight.ratio) / 2, w, w / logoRight.ratio);
    }

    /* ---------- Titre (entre les deux logos) ---------- */
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 60);
    doc.setFontSize(17);
    doc.text(finished ? 'CERTIFICAT DE RÉUSSITE' : 'ATTESTATION DE PARCOURS', W / 2, logoTop + 9, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 95);
    doc.text(appTitle, W / 2, logoTop + 16, { align: 'center' });

    doc.setDrawColor(180, 180, 200);
    doc.setLineWidth(0.3);
    doc.line(MARGIN + 6, 42, W - MARGIN - 6, 42);

    /* ---------- Corps du certificat ---------- */
    let y = 50;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 80);
    doc.setFontSize(11);
    doc.text('Le département MMI certifie que', W / 2, y, { align: 'center' });

    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(20, 20, 40);
    doc.text(`${prenom} ${nom}`, W / 2, y, { align: 'center' });

    y += 9;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 80);
    const intro = doc.splitTextToSize(
      finished
        ? `a terminé avec succès le parcours d'entraînement « ${appTitle} » (${sanitize(opts.app.langLabel)}) : `
          + `les ${opts.stats.topicsTotal} thèmes du parcours ont été validés, avec au moins `
          + `${opts.stats.goal} exercices réussis par thème, exercices générés et corrigés automatiquement.`
        : `a suivi le parcours d'entraînement « ${appTitle} » (${sanitize(opts.app.langLabel)}) et a validé `
          + `${opts.stats.topicsDone} thème${opts.stats.topicsDone > 1 ? 's' : ''} sur ${opts.stats.topicsTotal} `
          + `à la date d'édition de ce document. Le parcours pourra être repris et complété lors d'une prochaine séance.`,
      W - 2 * MARGIN - 20);
    doc.text(intro, W / 2, y, { align: 'center' });
    y += intro.length * 5 + 7;

    /* ---------- Statistiques ---------- */
    const stats = [
      ['Statut', finished ? 'Terminé' : 'NON TERMINÉ'],
      ['Date d\'édition', opts.stats.date],
      ['Durée du parcours', opts.stats.duree],
      ['Thèmes validés', `${opts.stats.topicsDone} / ${opts.stats.topicsTotal}`],
      ['Exercices réussis', `${opts.stats.correct} / ${opts.stats.total} (${opts.stats.pct}%)`],
    ];
    doc.setFontSize(10.5);
    for (const [label, value] of stats) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 110);
      doc.text(label + ' :', W / 2 - 4, y, { align: 'right' });
      doc.setFont('helvetica', label === 'Statut' ? 'bold' : 'normal');
      if (label === 'Statut') doc.setTextColor(finished ? 30 : 200, finished ? 140 : 40, finished ? 60 : 40);
      else doc.setTextColor(40, 40, 60);
      doc.text(sanitize(value), W / 2 + 2, y);
      y += 6.5;
    }

    /* ---------- État d'avancement par thème ---------- */
    y += 4;
    doc.setDrawColor(180, 180, 200);
    doc.line(MARGIN + 6, y, W - MARGIN - 6, y);
    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 30, 60);
    doc.text('État d\'avancement par thème', MARGIN, y);
    y += 6;

    const barX = MARGIN + 66, barW = 60, barH = 3.2;
    doc.setFontSize(9.5);
    for (const t of opts.topics) {
      const done = t.correct >= t.goal;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 60);
      doc.text(sanitize(t.label), MARGIN + 2, y);
      /* Barre de progression */
      doc.setDrawColor(200, 205, 220);
      doc.setFillColor(235, 238, 245);
      doc.roundedRect(barX, y - 2.6, barW, barH, 1.2, 1.2, 'FD');
      const fillW = Math.max(0, Math.min(1, t.correct / t.goal)) * barW;
      if (fillW > 0) {
        if (done) doc.setFillColor(22, 163, 74);
        else doc.setFillColor(30, 58, 95);
        doc.roundedRect(barX, y - 2.6, Math.max(fillW, 2.4), barH, 1.2, 1.2, 'F');
      }
      doc.setFont('helvetica', done ? 'bold' : 'normal');
      if (done) doc.setTextColor(22, 130, 60);
      else doc.setTextColor(80, 80, 110);
      doc.text(done ? `${t.correct}/${t.goal} — validé` : `${t.correct}/${t.goal}`, barX + barW + 4, y);
      y += 6.2;
    }

    /* ---------- Historique des exercices ---------- */
    y += 4;
    doc.setDrawColor(180, 180, 200);
    doc.line(MARGIN + 6, y, W - MARGIN - 6, y);
    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 30, 60);
    doc.text('Historique des exercices de l\'étudiant', MARGIN, y);
    y += 6;

    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    const lineH = 3.8;
    const bottom = H - 16;
    const numW = 11;

    if (!opts.history.length) {
      doc.setTextColor(120, 120, 140);
      doc.text('(aucun exercice tenté pour le moment)', MARGIN + numW, y);
      y += lineH;
    }

    opts.history.forEach((h, i) => {
      const line = `[${h.date}] ${h.topicLabel} (${h.difficulty}) : ${h.result === 'correct' ? 'réussi' : 'raté'}`;
      const wrapped = doc.splitTextToSize(sanitize(line), W - 2 * MARGIN - numW);
      if (y + wrapped.length * lineH > bottom) {
        doc.addPage();
        y = 18;
        doc.setFont('courier', 'normal');
        doc.setFontSize(8);
      }
      doc.setTextColor(150, 150, 170);
      doc.text(String(i + 1).padStart(3) + '.', MARGIN, y);
      if (h.result === 'correct') doc.setTextColor(30, 120, 60);
      else doc.setTextColor(170, 60, 60);
      doc.text(wrapped, MARGIN + numW, y);
      y += wrapped.length * lineH;
    });

    /* ---------- Pieds de page ---------- */
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 160);
      doc.text(`${appTitle} — document généré automatiquement par l'application${finished ? '' : ' (parcours en cours)'}`, MARGIN, H - 9);
      doc.text(`page ${p} / ${pages}`, W - MARGIN, H - 9, { align: 'right' });
    }

    const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'etudiant';
    const suffix = finished ? '' : '_non_termine';
    doc.save(`certificat_${opts.app.slug}_${slug(opts.nom)}_${slug(opts.prenom)}${suffix}.pdf`);
    return { pages, logosOk: !!(logoLeft && logoRight) };
  }

  return { generate };
})();

if (typeof module !== 'undefined') module.exports = Certificate;
