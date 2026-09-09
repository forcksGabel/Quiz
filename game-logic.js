'use strict';
/* Reine Spiellogik, ohne externe Abhängigkeiten (nur Node core-Module).
   server.js verdrahtet das nur noch mit Socket.IO/Express; diese Datei
   lässt sich daher mit einfachem `node` unit-testen, auch ohne npm install. */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function uid() { return crypto.randomBytes(8).toString('hex'); }

function seedCategories() {
  const mk = (id, points, order, question, answer, extra) => Object.assign({
    id, points, order, question, answer, hints: [], questionImage: null, answerImage: null, used: false
  }, extra || {});

  return [
    {
      id: 'cat-unnuetzes', name: 'Unnützes Wissen', order: 0,
      questions: [
        mk('q1', 100, 0, 'Welche zwei Champions sind in dem Plants vs Zombies Easteregg involviert?', 'Zyra und Sion'),
        mk('q2', 200, 1, 'Welcher Champion gibt Thresh zwei Seelen statt einer, wenn er stirbt?', 'Nunu & Willump'),
        mk('q3', 300, 2, 'Was passiert, wenn Fizz mit seiner Ult einen Yordle tötet?', 'Die Leiche verschwindet, weil die Ult sie aufisst.'),
        mk('q4', 400, 3, 'Ein Tier: Welche Tierart wurde nach dem Charakter Teemo benannt?', 'Eine Krabbe (Gothus teemo)', { curatorNote: 'Bild aus dem alten Board (Teemo.png) fehlt – bitte als Antwort-Bild neu hochladen.' }),
        mk('q5', 500, 4, 'Aufgrund welcher drei Mechaniken machen Azirs Sandsoldaten ihn zu einem der komplexesten Codes im Spiel?', 'Champion-Autoattack, Spell-Effekt und Minion-Entity.')
      ]
    },
    {
      id: 'cat-items', name: 'Items', order: 1,
      questions: [
        mk('q1', 100, 0, 'Finde den Fehler.', '', { curatorNote: 'Bilder aus dem alten Board (Mejais.png / MejaisL.png) fehlen – bitte Frage- und Lösungsbild neu hochladen.' }),
        mk('q2', 200, 1, 'Finde den Fehler.', '', { curatorNote: 'Bilder aus dem alten Board (Cowl.png / CowlL.png) fehlen – bitte Frage- und Lösungsbild neu hochladen.' }),
        mk('q3', 300, 2, 'Finde den Fehler.', '', { curatorNote: 'Bilder aus dem alten Board (Yuntal.png / YuntalL.png) fehlen – bitte Frage- und Lösungsbild neu hochladen.' }),
        mk('q4', 400, 3, 'Finde den Fehler.', '', { curatorNote: 'Bilder aus dem alten Board (Fiend.png / FiendL.png) fehlen – bitte Frage- und Lösungsbild neu hochladen.' }),
        mk('q5', 500, 4, 'Finde den Fehler.', '', { curatorNote: 'Bilder aus dem alten Board (Maw.png / MawL.png) fehlen – bitte Frage- und Lösungsbild neu hochladen.' })
      ]
    },
    {
      id: 'cat-esports', name: 'Esports', order: 2,
      questions: [
        mk('q1', 100, 0, 'Nenne das derzeitige T1-Lineup.', 'Doran, Oner, Faker, Peyz, Keria'),
        mk('q2', 200, 1, 'Nenne drei der fünf Hauptregionsligen und die dazugehörige Hauptregion.', 'LCK -> Südkorea, LPL -> China, LEC -> EMEA (Europa), LTA -> Amerika, LCP -> Asia-Pacific (Ozeanien)'),
        mk('q3', 300, 2, 'Nenne 5 Worlds-Songs.', "Warriors, Worlds Collide, Ignite, Legends Never Die, RISE, Phoenix, Take Over, Burn It All Down, STAR WALKIN', GODS, Heavy Is The Crown, Sacrifice"),
        mk('q4', 400, 3, 'Nenne das gesuchte Team und weise die Namen den Spielern zu (300 Punkte für das Team, 100 Punkte für das Zuweisen der Spieler).',
          'Team: Los Ratones. Spieler: Baus -> Simon Hofverberg, Velja -> Veljko Čamdžić, Nemesis -> Tim Lipovšek, Crownie -> Juš Marušič, Rekkles -> Carl Martin Erik Larsson',
          { hints: ['Juš Marušič', 'Tim Lipovšek', 'Veljko Čamdžić', 'Simon Hofverberg', 'Carl Martin Erik Larsson'] }),
        mk('q5', 500, 4, 'Welches Team wird hier gesucht?', 'Eintracht Spandau',
          { hints: ['Titus Kippe', 'Isa Arda Dagil', 'Janik Bartels', 'Tim Willers', 'Daniel Binderhofer'] })
      ]
    },
    {
      id: 'cat-region', name: 'Region', order: 3,
      questions: [
        mk('q1', 100, 0, 'Nenne mir 3 Champions aus Ixtal.', 'Malphite, Milio, Neeko, Nidalee, Qiyana, Rengar, Skarner, Zyra'),
        mk('q2', 200, 1, 'Zu welcher Region gehört Zaahen?', 'Runeterra'),
        mk('q3', 300, 2, 'Nenne ein Mitglied von Bandle City, welches kein Yordle ist.', 'Yuumi'),
        mk('q4', 400, 3, 'Nenne alle Regionen der hier zu sehenden Champions.',
          "Illaoi -> Bilgewater, Voli -> Freljord, Ahri -> Ionia, Cait -> Piltover, Rell -> Noxus, Mundo -> Zaun, Xin -> Demacia, Taliyah -> Shurima, Kai'Sa -> Void, Naut -> Bilgewater",
          { curatorNote: 'Bild aus dem alten Board (Region.png) fehlt – bitte als Frage-Bild neu hochladen.' }),
        mk('q5', 500, 4, 'Nenne 10 Champions aus Shurima (es gibt 11).', 'Akshan, Amumu, Azir, Ksante, Naafiri, Nasus, Rammus, Renekton, Sivir, Taliyah, Xerath')
      ]
    },
    {
      id: 'cat-abilities', name: 'Abilities', order: 4,
      questions: [
        mk('q1', 100, 0, 'Wessen Ability ist das?', 'Camille Q', { curatorNote: 'Bild aus dem alten Board (Camille.png) fehlt – bitte als Frage-Bild neu hochladen.' }),
        mk('q2', 200, 1, 'Welche Ability ist das?', 'Sett Q', { curatorNote: 'Bild aus dem alten Board (Sett.png) fehlt – bitte als Frage-Bild neu hochladen.' }),
        mk('q3', 300, 2, 'Welche Ability ist das?', 'Aphelios W', { curatorNote: 'Bild aus dem alten Board (Aphelios.png) fehlt – bitte als Frage-Bild neu hochladen.' }),
        mk('q4', 400, 3, 'Welche Ability ist hier gesucht?', 'Neeko W', { hints: [
          'Die Passive dieser Ability erzeugt bei On-Hit einen Stack. Dieser lässt sich bis auf maximal 2 stacken.',
          'Bei Aktivieren der Ability wird der Champion für 0,5 Sekunden untargetable und bekommt für 3 Sekunden Movement Speed.',
          'Die Ability hält 3 Sekunden, kann allerdings vom Spieler durch gewisse Aktionen verlängert werden.'
        ] }),
        mk('q5', 500, 4, 'Welche Ability ist hier gesucht?', 'Jayce E', { hints: [
          'Unter gewissen Umständen rootet die Ability den Gegner und macht magischen Schaden.',
          'Unter gewissen Umständen verleiht die Ability bei einer Aktion des Champions Movement Speed und bleibt für 4 Sekunden aktiv.',
          'Die Ability macht unter gewissen Umständen einen Knockback von 600 Units auf den Gegner.'
        ] })
      ]
    }
  ];
}

function createGame(options) {
  options = options || {};
  const dataFile = options.dataFile || null; // null => no persistence (used by tests)

  function loadCategories() {
    if (dataFile) {
      try {
        if (fs.existsSync(dataFile)) {
          const raw = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
          if (Array.isArray(raw.categories)) return raw.categories;
        }
      } catch (e) {
        console.warn('Konnte data.json nicht lesen, starte mit Seed-Daten:', e.message);
      }
    }
    return seedCategories();
  }

  let categories = loadCategories();

  let saveTimer = null;
  function saveCategoriesDebounced() {
    if (!dataFile) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      fs.writeFile(dataFile, JSON.stringify({ categories }, null, 2), (err) => {
        if (err) console.warn('Speichern fehlgeschlagen:', err.message);
      });
    }, 400);
  }

  function defaultGame() {
    return {
      phase: 'board',
      openCatId: null,
      openQId: null,
      hintsShown: [],
      answerRevealed: false,
      excluded: [],
      buzzWinner: null,
      currentTurnPlayerId: null,
      doublePointsEnabled: true,
      doublePointsThreshold: 5
    };
  }
  let game = defaultGame();
  let players = {}; // id -> { id, name, score, connected }

  function findCategory(catId) { return categories.find(c => c.id === catId); }
  function findQuestion(catId, qId) {
    const cat = findCategory(catId);
    return cat ? cat.questions.find(q => q.id === qId) : null;
  }
  function remainingCount() {
    let n = 0;
    categories.forEach(c => c.questions.forEach(q => { if (!q.used) n++; }));
    return n;
  }
  function displayPoints(basePoints) {
    if (game.doublePointsEnabled && remainingCount() <= game.doublePointsThreshold) return basePoints * 2;
    return basePoints;
  }
  function publicBoard() {
    return [...categories].sort((a, b) => a.order - b.order).map(c => ({
      id: c.id, name: c.name, order: c.order,
      questions: [...c.questions].sort((a, b) => a.order - b.order).map(q => ({
        id: q.id, order: q.order, used: q.used,
        points: q.points,
        displayPoints: q.used ? q.points : displayPoints(q.points)
      }))
    }));
  }
  function publicOpen() {
    if (game.phase !== 'question') return null;
    const cat = findCategory(game.openCatId);
    const q = findQuestion(game.openCatId, game.openQId);
    if (!cat || !q) return null;
    const out = {
      catId: cat.id, qId: q.id,
      categoryName: cat.name,
      points: q.points,
      displayPoints: q.used ? q.points : displayPoints(q.points),
      question: q.question,
      questionImage: q.questionImage || null,
      hintsAll: (q.hints || []).length,
      hintsShown: game.hintsShown,
      excluded: game.excluded,
      answerRevealed: game.answerRevealed
    };
    if (game.answerRevealed) {
      out.answer = q.answer || '';
      out.answerImage = q.answerImage || null;
    }
    return out;
  }
  function playerList() {
    return Object.values(players).sort((a, b) => b.score - a.score);
  }
  function buildPublicPayload() {
    return {
      isGM: false,
      phase: game.phase,
      board: publicBoard(),
      open: publicOpen(),
      buzzWinner: game.buzzWinner,
      currentTurnPlayerId: game.currentTurnPlayerId,
      doublePointsEnabled: game.doublePointsEnabled,
      doublePointsThreshold: game.doublePointsThreshold,
      players: playerList()
    };
  }
  function buildGmPayload() {
    const base = buildPublicPayload();
    base.isGM = true;
    base.categories = [...categories].sort((a, b) => a.order - b.order).map(c => ({
      ...c, questions: [...c.questions].sort((a, b) => a.order - b.order)
    }));
    return base;
  }

  /* ---------- player-facing actions ---------- */

  function identifyPlayer(playerId, name) {
    name = String(name || '').trim().slice(0, 24);
    if (!name) return { ok: false, error: 'Name fehlt.' };
    const id = String(playerId || '').trim() || uid();
    const existing = players[id];
    players[id] = { id, name, score: existing ? existing.score : 0, connected: true };
    return { ok: true, playerId: id };
  }
  function markDisconnected(playerId) {
    if (playerId && players[playerId]) players[playerId].connected = false;
  }
  function removePlayer(playerId) {
    if (playerId) delete players[playerId];
  }
  function buzz(playerId) {
    if (!playerId || !players[playerId]) return false;
    if (game.phase !== 'question') return false;
    if (game.buzzWinner) return false;
    if (game.excluded.includes(playerId)) return false;
    game.buzzWinner = { playerId, name: players[playerId].name, at: Date.now() };
    return true;
  }

  /* ---------- GM actions ---------- */

  function openQuestion(catId, qId) {
    const q = findQuestion(catId, qId);
    if (!q) return false;
    const dp = game.doublePointsEnabled, dt = game.doublePointsThreshold, turn = game.currentTurnPlayerId;
    game = defaultGame();
    game.phase = 'question'; game.openCatId = catId; game.openQId = qId;
    game.doublePointsEnabled = dp; game.doublePointsThreshold = dt; game.currentTurnPlayerId = turn;
    return true;
  }
  function revealHint() {
    if (game.phase !== 'question') return false;
    const q = findQuestion(game.openCatId, game.openQId);
    if (!q || !q.hints || game.hintsShown.length >= q.hints.length) return false;
    game.hintsShown = [...game.hintsShown, q.hints[game.hintsShown.length]];
    return true;
  }
  function revealAnswer() {
    if (game.phase !== 'question') return false;
    game.answerRevealed = true;
    return true;
  }
  function markWrong() {
    if (game.phase !== 'question' || !game.buzzWinner) return false;
    game.excluded = [...game.excluded, game.buzzWinner.playerId];
    game.buzzWinner = null;
    return true;
  }
  function closeQuestion(markUsed, awardWinnerId, points) {
    if (game.phase !== 'question') return false;
    const q = findQuestion(game.openCatId, game.openQId);
    if (awardWinnerId && points && players[awardWinnerId]) {
      players[awardWinnerId].score += points;
    }
    if (markUsed && q) {
      q.used = true;
      saveCategoriesDebounced();
    }
    const nextTurn = (markUsed && awardWinnerId) ? awardWinnerId : game.currentTurnPlayerId;
    const dp = game.doublePointsEnabled, dt = game.doublePointsThreshold;
    game = defaultGame();
    game.doublePointsEnabled = dp; game.doublePointsThreshold = dt;
    game.currentTurnPlayerId = nextTurn;
    return true;
  }
  function setTurn(playerId) { game.currentTurnPlayerId = playerId || null; }
  function adjustScore(playerId, delta) {
    if (!players[playerId]) return false;
    players[playerId].score += Number(delta) || 0;
    return true;
  }
  function toggleDoublePoints() { game.doublePointsEnabled = !game.doublePointsEnabled; }
  function resetQuestions() {
    categories.forEach(c => c.questions.forEach(q => { q.used = false; }));
    const dp = game.doublePointsEnabled, dt = game.doublePointsThreshold;
    game = defaultGame();
    game.doublePointsEnabled = dp; game.doublePointsThreshold = dt;
    saveCategoriesDebounced();
  }
  function resetScores() { Object.values(players).forEach(p => { p.score = 0; }); }
  function newGame() {
    players = {};
    categories.forEach(c => c.questions.forEach(q => { q.used = false; }));
    game = defaultGame();
    saveCategoriesDebounced();
  }
  function addCategory(name) {
    name = String(name || '').trim().slice(0, 60);
    if (!name) return false;
    const order = categories.reduce((m, c) => Math.max(m, c.order), -1) + 1;
    categories.push({ id: uid(), name, order, questions: [] });
    saveCategoriesDebounced();
    return true;
  }
  function renameCategory(catId, name) {
    const cat = findCategory(catId);
    name = String(name || '').trim().slice(0, 60);
    if (!cat || !name) return false;
    cat.name = name;
    saveCategoriesDebounced();
    return true;
  }
  function deleteCategory(catId) {
    categories = categories.filter(c => c.id !== catId);
    saveCategoriesDebounced();
  }
  function moveCategory(catId, dir) {
    const sorted = [...categories].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(c => c.id === catId);
    const swapIdx = idx + (dir < 0 ? -1 : 1);
    if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return false;
    const a = sorted[idx], b = sorted[swapIdx];
    const tmp = a.order; a.order = b.order; b.order = tmp;
    saveCategoriesDebounced();
    return true;
  }
  function saveQuestion(payload) {
    const cat = findCategory(payload.catId);
    if (!cat) return { ok: false, error: 'Kategorie nicht gefunden.' };
    const points = Math.max(0, parseInt(payload.points, 10) || 0);
    const question = String(payload.question || '').trim().slice(0, 2000);
    const answer = String(payload.answer || '').trim().slice(0, 2000);
    const hints = Array.isArray(payload.hints) ? payload.hints.map(x => String(x).trim().slice(0, 400)).filter(Boolean).slice(0, 10) : [];
    if (!question) return { ok: false, error: 'Frage darf nicht leer sein.' };

    const clip = (img) => {
      if (!img || !img.src) return null;
      if (typeof img.src === 'string' && img.src.length > 6_000_000) return { __tooBig: true };
      return { src: img.src, alt: String(img.alt || '').slice(0, 200) };
    };

    if (payload.qId) {
      const q = findQuestion(payload.catId, payload.qId);
      if (!q) return { ok: false, error: 'Frage nicht gefunden.' };
      q.points = points; q.question = question; q.answer = answer; q.hints = hints;
      if (payload.questionImage !== undefined) {
        const img = clip(payload.questionImage);
        if (img && img.__tooBig) return { ok: false, error: 'Frage-Bild ist zu groß.' };
        q.questionImage = img;
      }
      if (payload.answerImage !== undefined) {
        const img = clip(payload.answerImage);
        if (img && img.__tooBig) return { ok: false, error: 'Antwort-Bild ist zu groß.' };
        q.answerImage = img;
      }
      if (q.questionImage || q.answerImage) delete q.curatorNote;
    } else {
      const order = cat.questions.reduce((m, q) => Math.max(m, q.order), -1) + 1;
      const qImg = clip(payload.questionImage);
      const aImg = clip(payload.answerImage);
      if ((qImg && qImg.__tooBig) || (aImg && aImg.__tooBig)) return { ok: false, error: 'Bild ist zu groß.' };
      cat.questions.push({
        id: uid(), points, order, question, answer, hints, used: false,
        questionImage: qImg, answerImage: aImg
      });
    }
    saveCategoriesDebounced();
    return { ok: true };
  }
  function deleteQuestion(catId, qId) {
    const cat = findCategory(catId);
    if (!cat) return false;
    cat.questions = cat.questions.filter(q => q.id !== qId);
    saveCategoriesDebounced();
    return true;
  }
  function importCategories(newCategories) {
    if (!Array.isArray(newCategories)) return false;
    categories = newCategories;
    game = defaultGame();
    saveCategoriesDebounced();
    return true;
  }
  function exportCategories() { return categories; }

  return {
    buildPublicPayload, buildGmPayload,
    identifyPlayer, markDisconnected, removePlayer, buzz,
    openQuestion, revealHint, revealAnswer, markWrong, closeQuestion,
    setTurn, adjustScore, toggleDoublePoints, resetQuestions, resetScores, newGame,
    addCategory, renameCategory, deleteCategory, moveCategory, saveQuestion, deleteQuestion,
    importCategories, exportCategories,
    _debug: { findCategory, findQuestion, remainingCount, displayPoints }
  };
}

module.exports = { createGame, seedCategories };
