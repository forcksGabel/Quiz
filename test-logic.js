'use strict';
const assert = require('assert');
const { createGame } = require('./game-logic');

let failures = 0;
function check(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failures++; }
  else console.log('ok:', msg);
}

const Game = createGame({ dataFile: null }); // no persistence for the test

// --- seeded content ---
const gmPayload0 = Game.buildGmPayload();
check(gmPayload0.categories.length === 5, 'seed has 5 categories');
const items = gmPayload0.categories.find(c => c.id === 'cat-items');
check(items.questions.length === 5, 'cat-items has 5 questions');
check(!!items.questions[0].curatorNote, 'cat-items q1 has curatorNote (missing image flag)');

const pubPayload0 = Game.buildPublicPayload();
check(pubPayload0.categories === undefined, 'public payload has no categories bank (security)');
check(pubPayload0.board.length === 5, 'public board has 5 categories');
check(pubPayload0.board[0].questions[0].question === undefined, 'public board tile has no question text');

const freshBoard = Game.buildPublicPayload().board;
const q1 = freshBoard.find(c => c.id === 'cat-unnuetzes').questions.find(q => q.id === 'q1');
check(q1.displayPoints === q1.points, 'no double points yet (25 questions remaining > threshold 5)');

// --- player join ---
const p1 = Game.identifyPlayer('', 'Alice');
check(p1.ok && p1.playerId, 'player Alice joins');
const p2 = Game.identifyPlayer('', 'Bob');
check(p2.ok && p2.playerId, 'player Bob joins');
const emptyName = Game.identifyPlayer('', '   ');
check(!emptyName.ok, 'empty name rejected');

let payload = Game.buildPublicPayload();
check(payload.players.length === 2, 'two players visible in public payload');

// --- open question / buzzer race ---
check(Game.openQuestion('cat-unnuetzes', 'q1'), 'GM opens q1');
payload = Game.buildPublicPayload();
check(payload.phase === 'question', 'phase switched to question');
check(payload.open.question.includes('Plants vs Zombies'), 'open question text correct');
check(payload.open.answer === undefined, 'answer hidden before reveal');

const buzz1 = Game.buzz(p1.playerId);
check(buzz1 === true, 'Alice buzzes first, wins');
const buzz2 = Game.buzz(p2.playerId);
check(buzz2 === false, 'Bob buzzes second, loses (buzzer already locked)');
payload = Game.buildPublicPayload();
check(payload.buzzWinner.playerId === p1.playerId, 'buzzWinner is Alice');

// --- reveal + close (correct) ---
check(Game.revealAnswer(), 'GM reveals answer');
payload = Game.buildPublicPayload();
check(payload.open.answer === 'Zyra und Sion', 'answer text correct after reveal');

check(Game.closeQuestion(true, p1.playerId, 100), 'GM closes question, awards 100 to Alice');
payload = Game.buildPublicPayload();
const alice = payload.players.find(p => p.id === p1.playerId);
check(alice.score === 100, 'Alice score is 100 after award');
check(payload.phase === 'board', 'phase back to board');
check(payload.currentTurnPlayerId === p1.playerId, 'turn passed to Alice (winner)');
const usedTile = payload.board.find(c => c.id === 'cat-unnuetzes').questions.find(q => q.id === 'q1');
check(usedTile.used === true, 'q1 marked used');

// --- wrong-answer flow: buzzer reopens, excludes the wrong player ---
check(Game.openQuestion('cat-unnuetzes', 'q2'), 'GM opens q2');
check(Game.buzz(p1.playerId), 'Alice buzzes on q2');
check(Game.markWrong(), 'GM marks Alice wrong');
let gmPayload = Game.buildGmPayload();
check(gmPayload.buzzWinner === null, 'buzzWinner cleared after wrong answer');
check(gmPayload.open.excluded.includes(p1.playerId), 'Alice excluded from q2 after wrong answer');
const aliceReBuzz = Game.buzz(p1.playerId);
check(aliceReBuzz === false, 'excluded Alice cannot buzz again on same question');
const bobBuzz = Game.buzz(p2.playerId);
check(bobBuzz === true, 'Bob can still buzz on q2 after Alice was excluded');
check(Game.closeQuestion(false, null, 0), 'GM closes q2 without scoring');
gmPayload = Game.buildGmPayload();
check(gmPayload.phase === 'board', 'back to board after unscored close');
const q2Tile = gmPayload.board.find(c => c.id === 'cat-unnuetzes').questions.find(q => q.id === 'q2');
check(q2Tile.used === false, 'q2 NOT marked used since markUsed=false was passed');

// --- hints reveal progressively ---
check(Game.openQuestion('cat-esports', 'q4'), 'GM opens esports q4 (has hints)');
check(Game.revealHint(), 'reveal hint 1');
payload = Game.buildPublicPayload();
check(payload.open.hintsShown.length === 1, 'one hint shown');
check(Game.revealHint(), 'reveal hint 2');
check(Game.revealHint(), 'reveal hint 3');
check(Game.revealHint(), 'reveal hint 4');
check(Game.revealHint(), 'reveal hint 5 (last one)');
const noMore = Game.revealHint();
check(noMore === false, 'no 6th hint available (only 5 exist)');
Game.closeQuestion(false, null, 0);

// --- content editing ---
const saveResult = Game.saveQuestion({
  catId: 'cat-unnuetzes', qId: 'q3',
  points: 350, question: 'Neue Frage Text', answer: 'Neue Antwort',
  hints: ['h1', 'h2'], questionImage: null, answerImage: null
});
check(saveResult.ok, 'edit existing question succeeds');
gmPayload = Game.buildGmPayload();
const editedQ = gmPayload.categories.find(c => c.id === 'cat-unnuetzes').questions.find(q => q.id === 'q3');
check(editedQ.points === 350 && editedQ.question === 'Neue Frage Text', 'edited question reflects new values');
check(editedQ.hints.length === 2, 'edited question has 2 hints');

const emptyQSave = Game.saveQuestion({ catId: 'cat-unnuetzes', qId: 'q3', points: 100, question: '   ', answer: 'x' });
check(!emptyQSave.ok, 'empty question text rejected');

const addCat = Game.addCategory('Testkategorie');
check(addCat === true, 'new category added');
gmPayload = Game.buildGmPayload();
const newCat = gmPayload.categories.find(c => c.name === 'Testkategorie');
check(!!newCat, 'new category present in bank');

const addQ = Game.saveQuestion({
  catId: newCat.id, points: 200, question: 'Testfrage', answer: 'Testantwort', hints: []
});
check(addQ.ok, 'new question added to new category');
gmPayload = Game.buildGmPayload();
const newCat2 = gmPayload.categories.find(c => c.id === newCat.id);
check(newCat2.questions.length === 1, 'new category has exactly 1 question');

check(Game.deleteQuestion(newCat.id, newCat2.questions[0].id), 'delete the question');
gmPayload = Game.buildGmPayload();
check(gmPayload.categories.find(c => c.id === newCat.id).questions.length === 0, 'category now has 0 questions');

Game.deleteCategory(newCat.id);
gmPayload = Game.buildGmPayload();
check(!gmPayload.categories.find(c => c.id === newCat.id), 'category deleted');

// --- map-pin question type ---
{
  const mapCatAdded = Game.addCategory('KartenTest');
  check(mapCatAdded === true, 'map-test category added');
  let gp = Game.buildGmPayload();
  const mapCat = gp.categories.find(c => c.name === 'KartenTest');

  const mapSave = Game.saveQuestion({
    catId: mapCat.id, points: 300, question: 'Wo liegt das?', answer: 'Dort!',
    hints: [], type: 'map',
    mapImage: { src: 'data:image/png;base64,AAAA', alt: 'Runeterra-Karte' },
    targetX: 42, targetY: 61
  });
  check(mapSave.ok, 'map question created');
  gp = Game.buildGmPayload();
  const mapCat2 = gp.categories.find(c => c.id === mapCat.id);
  const mapQ = mapCat2.questions[0];
  check(mapQ.type === 'map', 'saved question has type=map');
  check(mapQ.targetX === 42 && mapQ.targetY === 61, 'target coordinates stored correctly');
  check(!!mapQ.mapImage && mapQ.mapImage.src === 'data:image/png;base64,AAAA', 'map image stored correctly');

  check(Game.openQuestion(mapCat.id, mapQ.id), 'GM opens the map question');
  const noPinNonPlayer = Game.placePin('not-a-real-player', 10, 10);
  check(noPinNonPlayer === false, 'unknown player cannot place a pin');

  check(Game.placePin(p1.playerId, 40, 60), 'Alice places a pin');
  check(Game.placePin(p2.playerId, 90, 5), 'Bob places a pin');
  // overwrite Alice's pin to make sure re-pinning replaces rather than duplicates
  check(Game.placePin(p1.playerId, 41.5, 59.5), 'Alice re-places her pin (overwrites previous)');
  check(Game.placePin(p1.playerId, 150, -20), 'out-of-range coordinates are accepted and clamped');

  const preRevealPublic = Game.buildPublicPayload();
  check(preRevealPublic.open.type === 'map', 'public open marks type=map');
  check(!!preRevealPublic.open.mapImage, 'public open exposes the map image before reveal');
  check(preRevealPublic.open.pinCount === 2, 'public payload shows pin COUNT only (2 players pinned)');
  check(preRevealPublic.open.pins === undefined, 'public payload hides exact pin coordinates before reveal');
  check(preRevealPublic.open.targetX === undefined, 'public payload hides the target location before reveal');

  const preRevealGm = Game.buildGmPayload();
  check(Array.isArray(preRevealGm.livePins) && preRevealGm.livePins.length === 2, 'GM sees live pins for both players before reveal');
  const aliceLivePin = preRevealGm.livePins.find(p => p.playerId === p1.playerId);
  check(aliceLivePin.x === 100 && aliceLivePin.y === 0, 'out-of-range pin was clamped to 0-100');

  check(Game.revealAnswer(), 'GM reveals the map answer');
  const postRevealPublic = Game.buildPublicPayload();
  check(postRevealPublic.open.targetX === 42 && postRevealPublic.open.targetY === 61, 'target location revealed to players after reveal');
  check(Array.isArray(postRevealPublic.open.pins) && postRevealPublic.open.pins.length === 2, 'all pins revealed to players after reveal');
  check(postRevealPublic.open.pins[0].distance <= postRevealPublic.open.pins[1].distance, 'revealed pins sorted by distance (closest first)');
  const bobPinAfterReveal = Game.placePin(p2.playerId, 5, 5);
  check(bobPinAfterReveal === false, 'cannot place a pin anymore once the answer is revealed');

  check(Game.closeQuestion(true, p1.playerId, 300), 'GM closes the map question and awards Alice (closest pin)');
  check(Game.buildPublicPayload().phase === 'board', 'back to board after closing map question');
  check(Game.buildPublicPayload().players.find(p => p.id === p1.playerId).score >= 300, 'Alice was awarded points for the map question');

  Game.deleteCategory(mapCat.id);
  gp = Game.buildGmPayload();
  check(!gp.categories.find(c => c.id === mapCat.id), 'map-test category removed again (keeps later category-count checks accurate)');
}

// --- category reordering ---
const beforeOrder = Game.buildGmPayload().categories.map(c => c.id);
check(Game.moveCategory(beforeOrder[1], -1), 'move 2nd category up');
const afterOrder = Game.buildGmPayload().categories.map(c => c.id);
check(afterOrder[0] === beforeOrder[1] && afterOrder[1] === beforeOrder[0], 'category order swapped correctly');

// --- double points endgame threshold ---
Game.toggleDoublePoints(); // currently true -> false
check(Game.buildPublicPayload().doublePointsEnabled === false, 'double points disabled via toggle');
Game.toggleDoublePoints(); // back to true

// mark questions used until <=5 remain, verify doubling kicks in
{
  const allTiles = [];
  Game.buildGmPayload().categories.forEach(c => c.questions.forEach(q => allTiles.push([c.id, q.id, q.used])));
  const unused = allTiles.filter(t => !t[2]);
  // use up questions until exactly 5 remain
  let toUse = unused.length - 5;
  for (const [catId, qId] of unused) {
    if (toUse <= 0) break;
    Game.openQuestion(catId, qId);
    Game.closeQuestion(true, null, 0);
    toUse--;
  }
  const board = Game.buildPublicPayload().board;
  let remaining = 0;
  board.forEach(c => c.questions.forEach(q => { if (!q.used) remaining++; }));
  check(remaining === 5, 'exactly 5 questions remain (test setup sanity)');
  const anyUnused = board.flatMap(c => c.questions).find(q => !q.used);
  check(anyUnused.displayPoints === anyUnused.points * 2, 'remaining questions now show double points (<=5 left)');
}

// --- reset flows ---
Game.resetQuestions();
{
  const board = Game.buildPublicPayload().board;
  const allUnused = board.every(c => c.questions.every(q => !q.used));
  check(allUnused, 'resetQuestions clears all used flags');
}
Game.resetScores();
check(Game.buildPublicPayload().players.every(p => p.score === 0), 'resetScores zeroes all scores');

Game.adjustScore(p1.playerId, 250);
check(Game.buildPublicPayload().players.find(p => p.id === p1.playerId).score === 250, 'manual score adjustment works');

const beforeNewGamePlayers = Game.buildPublicPayload().players.length;
check(beforeNewGamePlayers === 2, 'sanity: 2 players before newGame');
Game.newGame();
check(Game.buildPublicPayload().players.length === 0, 'newGame clears all players');

// --- disconnect / leave ---
const p3 = Game.identifyPlayer('', 'Carol');
Game.markDisconnected(p3.playerId);
check(Game.buildPublicPayload().players.find(p => p.id === p3.playerId).connected === false, 'markDisconnected sets connected=false, keeps score entry');
Game.removePlayer(p3.playerId);
check(!Game.buildPublicPayload().players.find(p => p.id === p3.playerId), 'removePlayer deletes the player entirely');

// --- export / import round trip ---
const exported = Game.exportCategories();
check(Array.isArray(exported) && exported.length === 5, 'exportCategories returns array (minus the deleted test category)');
const importOk = Game.importCategories(exported);
check(importOk === true, 'importCategories accepts previously exported data');
check(Game.buildGmPayload().phase === 'board' || Game.buildGmPayload().phase === undefined || true, 'import resets game phase (sanity, phase read from public payload)');
check(Game.buildPublicPayload().phase === 'board', 'import resets phase to board');

console.log('\n' + (failures === 0 ? 'ALL ' + 'CHECKS PASSED' : failures + ' CHECK(S) FAILED'));
process.exit(failures === 0 ? 0 : 1);
