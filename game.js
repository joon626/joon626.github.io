(() => {
  const canvas = document.querySelector('#snake-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const gridSize = 21;
  const cellSize = canvas.width / gridSize;
  const highScoreKey = 'yongjoon-snake-high-scores';
  const directions = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
  const opposite = { up: 'down', down: 'up', left: 'right', right: 'left' };
  const enemyCount = 5;
  let snake = [], food = null, enemies = [], direction = 'right', queuedDirection = 'right';
  let score = 0, level = 1, running = false, paused = false, snakeTimer = null, enemyTimer = null;
  let enemyCycleStarted = 0, enemiesExploding = false, soundEnabled = true, audioContext = null, musicTimer = null, musicStep = 0;
  const statusEl = document.querySelector('#game-status'), scoreEl = document.querySelector('#score'), levelEl = document.querySelector('#level');
  const highScoresEl = document.querySelector('#high-scores'), startButton = document.querySelector('#start-game'), pauseButton = document.querySelector('#pause-game');
  const restartButton = document.querySelector('#restart-game'), soundButton = document.querySelector('#sound-toggle');
  const sameCell = (a, b) => a && b && a.x === b.x && a.y === b.y;
  const randomInt = max => Math.floor(Math.random() * max);
  const isSnakeCell = cell => snake.some(part => sameCell(part, cell));
  const isEnemyCell = cell => enemies.some(enemy => enemy.position && sameCell(enemy.position, cell));
  const isOccupied = cell => isSnakeCell(cell) || isEnemyCell(cell) || sameCell(food, cell);
  const setStatus = message => { if (statusEl) statusEl.textContent = message; };

  function loadHighScores() {
    try { const values = JSON.parse(localStorage.getItem(highScoreKey) || '[]'); return Array.isArray(values) ? values.filter(Number.isFinite).slice(0, 5) : []; } catch { return []; }
  }
  function renderHighScores(values = loadHighScores()) { if (highScoresEl) highScoresEl.innerHTML = values.length ? values.map(value => `<li>${value}</li>`).join('') : '<li>기록 없음</li>'; }
  function saveScore() { const values = [...loadHighScores(), score].sort((a, b) => b - a).slice(0, 5); try { localStorage.setItem(highScoreKey, JSON.stringify(values)); } catch {} renderHighScores(values); }
  function emptyCell() { const cells = []; for (let y = 0; y < gridSize; y += 1) for (let x = 0; x < gridSize; x += 1) { const cell = { x, y }; if (!isOccupied(cell)) cells.push(cell); } return cells.length ? cells[randomInt(cells.length)] : { x: 1, y: 1 }; }
  function placeFood() { food = emptyCell(); }
  function spawnEnemies() { enemies = []; for (let i = 0; i < enemyCount; i += 1) enemies.push({ position: emptyCell(), phase: 'alive' }); if (!food || isOccupied(food)) placeFood(); }
  function updateScoreboard() { if (scoreEl) scoreEl.textContent = String(score); if (levelEl) levelEl.textContent = String(level); }
  function resetGame() { snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]; direction = 'right'; queuedDirection = 'right'; score = 0; level = 1; enemiesExploding = false; enemyCycleStarted = Date.now(); food = null; enemies = []; placeFood(); spawnEnemies(); updateScoreboard(); render(); }
  function clearTimers() { if (snakeTimer) clearInterval(snakeTimer); if (enemyTimer) clearInterval(enemyTimer); snakeTimer = null; enemyTimer = null; }
  function startTimers() { clearTimers(); snakeTimer = setInterval(moveSnake, Math.max(90, 150 - (level - 1) * 10)); enemyTimer = setInterval(updateEnemies, Math.max(130, 220 - (level - 1) * 15)); }
  function setDirection(next) { if (!directions[next] || next === opposite[direction] || next === opposite[queuedDirection]) return; queuedDirection = next; }
  function moveSnake() { if (!running || paused) return; direction = queuedDirection; const head = snake[0]; const next = { x: head.x + directions[direction].x, y: head.y + directions[direction].y }; if (next.x < 0 || next.x >= gridSize || next.y < 0 || next.y >= gridSize || isSnakeCell(next) || isEnemyCell(next)) { gameOver('충돌했습니다!'); return; } snake.unshift(next); if (sameCell(next, food)) { score += 1; level = Math.floor(score / 10) + 1; placeFood(); updateScoreboard(); beep(720, .08, 'square'); startTimers(); } else { snake.pop(); beep(220, .025, 'triangle'); } render(); }
  function updateEnemies() {
    if (!running || paused) return;
    const elapsed = Date.now() - enemyCycleStarted;
    if (!enemiesExploding && elapsed >= 5000) { enemiesExploding = true; enemies = enemies.map(enemy => ({ ...enemy, phase: 'exploding' })); setStatus('적 5개 동시 폭발!'); beep(120, .2, 'sawtooth'); render(); return; }
    if (enemiesExploding && elapsed >= 7000) { enemyCycleStarted = Date.now(); enemiesExploding = false; spawnEnemies(); setStatus('적이 다시 나타났습니다.'); render(); return; }
    if (enemiesExploding) return;
    enemies = enemies.map((enemy, index) => { const options = Object.values(directions).map(move => ({ x: enemy.position.x + move.x, y: enemy.position.y + move.y })).filter(cell => cell.x >= 0 && cell.x < gridSize && cell.y >= 0 && cell.y < gridSize).filter(cell => !isSnakeCell(cell) && !enemies.some((other, otherIndex) => otherIndex !== index && sameCell(other.position, cell))); return options.length ? { ...enemy, position: options[randomInt(options.length)] } : enemy; }); render();
  }
  function gameOver(message) { running = false; paused = false; clearTimers(); stopMusic(); saveScore(); setStatus(`${message} 게임 오버`); beep(180, .25, 'sawtooth'); if (pauseButton) pauseButton.disabled = true; render(); }
  function startGame() { resetGame(); running = true; paused = false; enemyCycleStarted = Date.now(); startTimers(); startMusic(); setStatus('게임 진행 중'); if (pauseButton) pauseButton.disabled = false; beep(520, .08, 'square'); }
  function togglePause() { if (!running) return; paused = !paused; setStatus(paused ? '일시정지' : '게임 진행 중'); if (pauseButton) pauseButton.textContent = paused ? '계속하기' : '일시정지'; if (paused) stopMusic(); else startMusic(); beep(paused ? 260 : 520, .06, 'square'); }
  function stopMusic() { if (musicTimer) clearInterval(musicTimer); musicTimer = null; }
  function startMusic() { if (!soundEnabled || !running || paused) return; stopMusic(); musicStep = 0; const notes = [262, 330, 392, 330, 294, 349, 440, 349]; musicTimer = setInterval(() => { if (!running || paused || !soundEnabled) return; beep(notes[musicStep % notes.length], .16, 'square'); musicStep += 1; }, 700); }
  function getAudioContext() { if (!soundEnabled) return null; try { audioContext ||= new (window.AudioContext || window.webkitAudioContext)(); if (audioContext.state === 'suspended') audioContext.resume().catch(() => {}); return audioContext; } catch { return null; } }
  function beep(frequency, duration, type) { const context = getAudioContext(); if (!context) return; try { const oscillator = context.createOscillator(); const gain = context.createGain(); const now = context.currentTime; oscillator.type = type; oscillator.frequency.value = frequency; gain.gain.setValueAtTime(.04, now); gain.gain.exponentialRampToValueAtTime(.001, now + duration); oscillator.connect(gain).connect(context.destination); oscillator.start(now); oscillator.stop(now + duration); } catch {} }
  function drawCell(cell, color, inset = 2) { ctx.fillStyle = color; ctx.fillRect(cell.x * cellSize + inset, cell.y * cellSize + inset, cellSize - inset * 2, cellSize - inset * 2); }
  function render() { ctx.fillStyle = '#07131a'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.strokeStyle = '#12333d'; for (let i = 0; i <= gridSize; i += 1) { ctx.beginPath(); ctx.moveTo(i * cellSize, 0); ctx.lineTo(i * cellSize, canvas.height); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * cellSize); ctx.lineTo(canvas.width, i * cellSize); ctx.stroke(); } if (food) drawCell(food, '#ffdf00', 3); snake.forEach((part, index) => drawCell(part, index === 0 ? '#00ff66' : '#00b84f', 2)); enemies.forEach(enemy => { if (enemy.phase === 'exploding') { drawCell(enemy.position, '#ff4d00', 1); drawCell(enemy.position, '#ffdf00', 6); } else { drawCell(enemy.position, '#ff3864', 2); ctx.fillStyle = '#fff'; ctx.fillRect(enemy.position.x * cellSize + 6, enemy.position.y * cellSize + 6, 3, 3); ctx.fillRect(enemy.position.x * cellSize + 11, enemy.position.y * cellSize + 6, 3, 3); } }); }
  function handleKey(event) { const keyMap = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' }; if (keyMap[event.key]) { event.preventDefault(); setDirection(keyMap[event.key]); } if (event.key === ' ' && running) { event.preventDefault(); togglePause(); } }
  document.addEventListener('keydown', handleKey); document.querySelectorAll('[data-direction]').forEach(button => button.addEventListener('click', () => setDirection(button.dataset.direction))); startButton?.addEventListener('click', startGame); pauseButton?.addEventListener('click', togglePause); restartButton?.addEventListener('click', startGame); soundButton?.addEventListener('click', () => { soundEnabled = !soundEnabled; soundButton.textContent = soundEnabled ? '소리 켜짐' : '소리 꺼짐'; soundButton.setAttribute('aria-pressed', String(soundEnabled)); if (soundEnabled) { beep(520, .06, 'square'); startMusic(); } else stopMusic(); });
  renderHighScores(); resetGame();
})();
