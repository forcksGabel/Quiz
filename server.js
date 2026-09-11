'use strict';

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { createGame } = require('./game-logic');

const DATA_FILE = path.join(__dirname, 'data.json');
const GM_PIN = process.env.GM_PIN || 'lolquiz';
const PORT = process.env.PORT || 3000;

const Game = createGame({ dataFile: DATA_FILE });

/* ============================== http app ============================== */

const app = express();
app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/export', (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="lol-jeopardy-fragen.json"');
  res.json({ categories: Game.exportCategories() });
});

app.post('/api/import', (req, res) => {
  if (req.headers['x-gm-pin'] !== GM_PIN) return res.status(403).json({ ok: false, error: 'Falsche GM-PIN.' });
  const body = req.body;
  if (!body || !Array.isArray(body.categories)) return res.status(400).json({ ok: false, error: 'Ungültiges Format.' });
  Game.importCategories(body.categories);
  broadcastState();
  res.json({ ok: true });
});

const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 8 * 1024 * 1024 });

function broadcastState() {
  io.to('gm').emit('state', Game.buildGmPayload());
  io.to('players').emit('state', Game.buildPublicPayload());
}

/* ============================== socket handling ============================== */

io.on('connection', (socket) => {
  socket.data.isGM = false;
  socket.data.playerId = null;

  function requireGM() {
    if (!socket.data.isGM) { socket.emit('errorMsg', 'Keine Gamemaster-Berechtigung.'); return false; }
    return true;
  }

  socket.on('identify', (payload) => {
    payload = payload || {};
    if (payload.role === 'gm') {
      if (payload.pin !== GM_PIN) {
        socket.emit('identified', { ok: false, error: 'Falsche PIN.' });
        return;
      }
      socket.data.isGM = true;
      socket.join('gm');
      socket.emit('identified', { ok: true, isGM: true });
      socket.emit('state', Game.buildGmPayload());
      return;
    }
    if (payload.role === 'player') {
      const result = Game.identifyPlayer(payload.playerId, payload.name);
      if (!result.ok) { socket.emit('identified', result); return; }
      socket.data.isGM = false;
      socket.data.playerId = result.playerId;
      socket.join('players');
      socket.emit('identified', { ok: true, isGM: false, playerId: result.playerId });
      broadcastState();
      return;
    }
    socket.emit('identified', { ok: false, error: 'Unbekannte Rolle.' });
  });

  socket.on('disconnect', () => {
    if (socket.data.playerId) {
      Game.markDisconnected(socket.data.playerId);
      broadcastState();
    }
  });

  socket.on('player:leave', () => {
    if (socket.data.playerId) {
      Game.removePlayer(socket.data.playerId);
      socket.data.playerId = null;
      broadcastState();
    }
  });

  socket.on('player:buzz', () => {
    if (Game.buzz(socket.data.playerId)) broadcastState();
  });

  socket.on('player:placePin', ({ x, y } = {}) => {
    if (Game.placePin(socket.data.playerId, x, y)) broadcastState();
  });

  socket.on('gm:openQuestion', ({ catId, qId } = {}) => {
    if (!requireGM()) return;
    if (Game.openQuestion(catId, qId)) broadcastState();
  });
  socket.on('gm:revealHint', () => { if (!requireGM()) return; if (Game.revealHint()) broadcastState(); });
  socket.on('gm:revealAnswer', () => { if (!requireGM()) return; if (Game.revealAnswer()) broadcastState(); });
  socket.on('gm:markWrong', ({ penaltyPoints } = {}) => { if (!requireGM()) return; if (Game.markWrong(penaltyPoints)) broadcastState(); });
  socket.on('gm:closeQuestion', ({ markUsed, awardWinnerId, points } = {}) => {
    if (!requireGM()) return;
    if (Game.closeQuestion(markUsed, awardWinnerId, points)) broadcastState();
  });
  socket.on('gm:setTurn', ({ playerId } = {}) => { if (!requireGM()) return; Game.setTurn(playerId); broadcastState(); });
  socket.on('gm:adjustScore', ({ playerId, delta } = {}) => {
    if (!requireGM()) return;
    if (Game.adjustScore(playerId, delta)) broadcastState();
  });
  socket.on('gm:toggleDoublePoints', () => { if (!requireGM()) return; Game.toggleDoublePoints(); broadcastState(); });
  socket.on('gm:resetQuestions', () => { if (!requireGM()) return; Game.resetQuestions(); broadcastState(); });
  socket.on('gm:resetScores', () => { if (!requireGM()) return; Game.resetScores(); broadcastState(); });
  socket.on('gm:newGame', () => { if (!requireGM()) return; Game.newGame(); broadcastState(); });

  socket.on('gm:addCategory', ({ name } = {}) => { if (!requireGM()) return; if (Game.addCategory(name)) broadcastState(); });
  socket.on('gm:renameCategory', ({ catId, name } = {}) => { if (!requireGM()) return; if (Game.renameCategory(catId, name)) broadcastState(); });
  socket.on('gm:deleteCategory', ({ catId } = {}) => { if (!requireGM()) return; Game.deleteCategory(catId); broadcastState(); });
  socket.on('gm:moveCategory', ({ catId, dir } = {}) => { if (!requireGM()) return; if (Game.moveCategory(catId, dir)) broadcastState(); });

  socket.on('gm:saveQuestion', (payload = {}) => {
    if (!requireGM()) return;
    const result = Game.saveQuestion(payload);
    if (!result.ok) { socket.emit('errorMsg', result.error); return; }
    broadcastState();
  });
  socket.on('gm:deleteQuestion', ({ catId, qId } = {}) => { if (!requireGM()) return; Game.deleteQuestion(catId, qId); broadcastState(); });
});

server.listen(PORT, () => {
  console.log('Hextech Jeopardy läuft auf Port ' + PORT);
  console.log('GM-PIN: ' + GM_PIN + (process.env.GM_PIN ? '' : '  (Standard-PIN! Bitte per GM_PIN Umgebungsvariable ändern.)'));
});
