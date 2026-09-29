```javascript
"use strict";

/*
  TABLE TENNIS ARCADE
  -------------------
  Features:
  - Character selection
  - Easy / Normal / Hard CPU
  - 1 Player vs CPU
  - Local 2 Player
  - Spin shots
  - Smash shots
  - Sound effects
  - Table + net rendering
  - Keyboard controls
  - Mobile touch controls
  - First to 7
*/

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const characterSelect = document.getElementById("character");
const difficultySelect = document.getElementById("difficulty");
const modeSelect = document.getElementById("mode");

const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const overlayStart = document.getElementById("overlayStart");

const playerOneScoreElement =
  document.getElementById("playerOneScore");

const playerTwoScoreElement =
  document.getElementById("playerTwoScore");

const playerOneNameElement =
  document.getElementById("playerOneName");

const playerTwoNameElement =
  document.getElementById("playerTwoName");

const statusElement =
  document.getElementById("status");

const gameMessage =
  document.getElementById("gameMessage");

const messageCard =
  gameMessage.querySelector(".message-card");

const messageTitle =
  messageCard.querySelector("h2");

const messageText =
  messageCard.querySelector("p");


/* =========================================================
   CANVAS
========================================================= */

const WIDTH = 1200;
const HEIGHT = 675;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();

  const pixelRatio =
    Math.min(window.devicePixelRatio || 1, 2);

  canvas.width =
    Math.max(1, Math.round(rect.width * pixelRatio));

  canvas.height =
    Math.max(1, Math.round(rect.height * pixelRatio));

  ctx.setTransform(
    canvas.width / WIDTH,
    0,
    0,
    canvas.height / HEIGHT,
    0,
    0
  );
}


/* =========================================================
   TABLE
========================================================= */

const table = {
  x: 135,
  y: 125,
  width: 930,
  height: 410,
  netX: 600
};


/* =========================================================
   GAME SETTINGS
========================================================= */

const WINNING_SCORE = 7;

const PADDLE_WIDTH = 22;
const PADDLE_HEIGHT = 110;

const BALL_RADIUS = 11;


/* =========================================================
   CHARACTERS
========================================================= */

const characters = {

  speed: {
    name: "ACE",
    speed: 470,
    spin: 1,
    power: 1
  },

  spin: {
    name: "RAFA",
    speed: 410,
    spin: 1.8,
    power: 0.9
  },

  power: {
    name: "TANK",
    speed: 350,
    spin: 0.8,
    power: 1.35
  }

};


/* =========================================================
   CPU SETTINGS
========================================================= */

const cpuSettings = {

  easy: {
    name: "ROOKIE",
    speed: 280,
    reaction: 210
  },

  normal: {
    name: "RIVAL",
    speed: 360,
    reaction: 360
  },

  hard: {
    name: "CHAMPION",
    speed: 450,
    reaction: 510
  }

};


/* =========================================================
   GAME STATE
========================================================= */

let playerOne = {
  score: 0,
  y: table.y + table.height / 2 - PADDLE_HEIGHT / 2
};

let playerTwo = {
  score: 0,
  y: table.y + table.height / 2 - PADDLE_HEIGHT / 2
};

let ball = {
  x: table.netX,
  y: table.y + table.height / 2,

  vx: 6,
  vy: -2,

  spin: 0,
  spinType: 0,

  trail: []
};

let currentCharacter =
  characters.speed;

let currentCPU =
  cpuSettings.normal;

let gameRunning = false;

let lastTime = 0;

let animationFrame = null;

let keys = new Set();

let dragging = false;

let audioContext = null;


/* =========================================================
   AUDIO
========================================================= */

function initializeAudio() {

  if (audioContext) {
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    return;
  }

  try {
    const AudioContext =
      window.AudioContext ||
      window.webkitAudioContext;

    audioContext = new AudioContext();

  } catch (error) {
    audioContext = null;
  }
}


function playSound(
  frequency,
  duration = 0.06,
  type = "sine",
  volume = 0.05
) {

  if (!audioContext) {
    return;
  }

  try {

    const oscillator =
      audioContext.createOscillator();

    const gain =
      audioContext.createGain();

    oscillator.type = type;

    oscillator.frequency.value =
      frequency;

    gain.gain.setValueAtTime(
      volume,
      audioContext.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();

    oscillator.stop(
      audioContext.currentTime + duration
    );

  } catch (error) {
    // Audio is optional.
  }
}


/* =========================================================
   UTILITY
========================================================= */

function clamp(value, minimum, maximum) {

  return Math.max(
    minimum,
    Math.min(maximum, value)
  );

}


function randomBetween(minimum, maximum) {

  return (
    Math.random() *
    (maximum - minimum)
  ) + minimum;

}


/* =========================================================
   UI
========================================================= */

function updateNames() {

  currentCharacter =
    characters[characterSelect.value];

  currentCPU =
    cpuSettings[difficultySelect.value];

  playerOneNameElement.textContent =
    currentCharacter.name;

  if (modeSelect.value === "two") {

    playerTwoNameElement.textContent =
      "PLAYER 2";

  } else {

    playerTwoNameElement.textContent =
      currentCPU.name;

  }

}


function updateScoreboard() {

  playerOneScoreElement.textContent =
    playerOne.score;

  playerTwoScoreElement.textContent =
    playerTwo.score;

}


function hideGameMessage() {

  gameMessage.classList.add("hidden");

}


function showGameMessage(
  title,
  text,
  buttonText = "Start Game"
) {

  messageTitle.textContent = title;
  messageText.textContent = text;

  overlayStart.textContent =
    buttonText;

  gameMessage.classList.remove("hidden");

}


/* =========================================================
   BALL
========================================================= */

function resetBall(direction) {

  ball = {

    x: table.netX,

    y:
      table.y +
      table.height / 2,

    vx:
      direction *
      randomBetween(5.5, 6.5),

    vy:
      randomBetween(-2.7, 2.7),

    spin: 0,

    spinType: 0,

    trail: []

  };

  playSound(180, 0.04);

}


function serveBall() {

  const direction =
    Math.random() < 0.5
      ? -1
      : 1;

  resetBall(direction);

}


/* =========================================================
   MATCH
========================================================= */

function startMatch() {

  initializeAudio();

  updateNames();

  playerOne.score = 0;
  playerTwo.score = 0;

  playerOne.y =
    table.y +
    table.height / 2 -
    PADDLE_HEIGHT / 2;

  playerTwo.y =
    table.y +
    table.height / 2 -
    PADDLE_HEIGHT / 2;

  gameRunning = true;

  updateScoreboard();

  statusElement.textContent =
    "Match on!";

  hideGameMessage();

  serveBall();
}


function restartMatch() {

  startMatch();

}


/* =========================================================
   SCORING
========================================================= */

function awardPoint(player) {

  if (player === 1) {

    playerOne.score++;

    playSound(
      700,
      0.13,
      "square",
      0.07
    );

  } else {

    playerTwo.score++;

    playSound(
      250,
      0.13,
      "square",
      0.07
    );

  }

  updateScoreboard();

  if (
    playerOne.score >= WINNING_SCORE ||
    playerTwo.score >= WINNING_SCORE
  ) {

    finishMatch();

    return;
  }

  if (player === 1) {

    statusElement.textContent =
      `${currentCharacter.name} scores!`;

  } else {

    statusElement.textContent =
      modeSelect.value === "two"
        ? "PLAYER 2 scores!"
        : `${currentCPU.name} scores!`;

  }

  resetBall(player === 1 ? 1 : -1);

}


function finishMatch() {

  gameRunning = false;

  const playerOneWon =
    playerOne.score >
    playerTwo.score;

  if (playerOneWon) {

    statusElement.textContent =
      "You win!";

    showGameMessage(
      "🏆 YOU WIN!",
      `${currentCharacter.name} wins the match.`,
      "Play Again"
    );

    playSound(
      900,
      0.25,
      "sawtooth",
      0.08
    );

  } else {

    statusElement.textContent =
      "Match over";

    const winner =
      modeSelect.value === "two"
        ? "PLAYER 2"
        : currentCPU.name;

    showGameMessage(
      "🏓 MATCH OVER",
      `${winner} wins the match.`,
      "Play Again"
    );

    playSound(
      180,
      0.25,
      "sawtooth",
      0.08
    );

  }

}


/* =========================================================
   PADDLE MOVEMENT
========================================================= */

function movePlayerOne(deltaTime) {

  let movement = 0;

  if (
    keys.has("w") ||
    keys.has("arrowup")
  ) {

    movement -= currentCharacter.speed;

  }

  if (
    keys.has("s") ||
    keys.has("arrowdown")
  ) {

    movement += currentCharacter.speed;

  }

  playerOne.y +=
    movement * deltaTime;

  playerOne.y =
    clamp(
      playerOne.y,
      table.y,
      table.y +
        table.height -
        PADDLE_HEIGHT
    );

}


function movePlayerTwo(deltaTime) {

  if (modeSelect.value === "two") {

    const speed = 470;

    if (keys.has("i")) {
      playerTwo.y -=
        speed * deltaTime;
    }

    if (keys.has("k")) {
      playerTwo.y +=
        speed * deltaTime;
    }

  } else {

    const target =
      ball.y -
      PADDLE_HEIGHT / 2;

    const difference =
      target -
      playerTwo.y;

    const maximumMovement =
      currentCPU.reaction *
      deltaTime;

    playerTwo.y +=
      clamp(
        difference,
        -maximumMovement,
        maximumMovement
      );

  }

  playerTwo.y =
    clamp(
      playerTwo.y,
      table.y,
      table.y +
        table.height -
        PADDLE_HEIGHT
    );

}


/* =========================================================
   PADDLE COLLISION
========================================================= */

function hitPaddle(isLeft) {

  const paddleY =
    isLeft
      ? playerOne.y
      : playerTwo.y;

  const paddleX =
    isLeft
      ? table.x
      : table.x +
        table.width -
        PADDLE_WIDTH;

  const movingTowardPaddle =
    isLeft
      ? ball.vx < 0
      : ball.vx > 0;

  if (!movingTowardPaddle) {
    return false;
  }

  const horizontalHit =
    isLeft
      ? ball.x - BALL_RADIUS <=
          paddleX + PADDLE_WIDTH
      : ball.x + BALL_RADIUS >=
          paddleX;

  const verticalHit =
    ball.y >= paddleY - 5 &&
    ball.y <=
      paddleY +
      PADDLE_HEIGHT +
      5;

  if (
    horizontalHit &&
    verticalHit
  ) {

    if (isLeft) {

      ball.x =
        paddleX +
        PADDLE_WIDTH +
        BALL_RADIUS;

    } else {

      ball.x =
        paddleX -
        BALL_RADIUS;

    }

    const relativePosition =
      (
        ball.y -
        (
          paddleY +
          PADDLE_HEIGHT / 2
        )
      ) /
      (PADDLE_HEIGHT / 2);

    const power =
      isLeft
        ? currentCharacter.power
        : currentCPU.speed / 360;

    ball.vx =
      (
        isLeft ? 1 : -1
      ) *
      Math.min(
        14,
        Math.abs(ball.vx) *
          1.04 *
          power +
          0.25
      );

    ball.vy +=
      relativePosition *
      2.6;

    ball.vy =
      clamp(
        ball.vy,
        -9,
        9
      );

    ball.spin *= 0.7;

    playSound(
      ball.spinType === 2
        ? 950
        : 620,
      0.055,
      "triangle"
    );

    return true;
  }

  return false;

}


/* =========================================================
   SPIN
========================================================= */

function applySpin(
  player,
  direction
) {

  if (!gameRunning) {
    return;
  }

  const nearPlayer =
    player === 1
      ? ball.x <
        table.netX
      : ball.x >
        table.netX;

  if (!nearPlayer) {
    return;
  }

  const spinStrength =
    player === 1
      ? currentCharacter.spin
      : 1;

  ball.spin +=
    direction *
    spinStrength;

  ball.spin =
    clamp(
      ball.spin,
      -4,
      4
    );

  ball.spinType =
    Math.abs(ball.spin) > 2
      ? 2
      : 1;

  playSound(
    direction > 0
      ? 760
      : 520,
    0.045,
    "sine"
  );

}


/* =========================================================
   SMASH
========================================================= */

function smash(player) {

  if (!gameRunning) {
    return;
  }

  const closeEnough =
    player === 1
      ? ball.x <
        table.x + 180
      : ball.x >
        table.x +
        table.width -
        180;

  if (!closeEnough) {
    return;
  }

  ball.vx +=
    player === 1
      ? 2.2
      : -2.2;

  ball.vy +=
    randomBetween(-2.5, 2.5);

  ball.vx =
    clamp(
      ball.vx,
      -14,
      14
    );

  playSound(
    1100,
    0.09,
    "square",
    0.07
  );

}


/* =========================================================
   BALL PHYSICS
========================================================= */

function updateBall(deltaTime) {

  ball.trail.push({
    x: ball.x,
    y: ball.y
  });

  if (ball.trail.length > 7) {
    ball.trail.shift();
  }

  ball.x +=
    ball.vx *
    deltaTime *
    60;

  ball.y +=
    ball.vy *
    deltaTime *
    60;

  ball.vy +=
    ball.spin *
    0.015;


  /* TABLE TOP */

  if (
    ball.y -
      BALL_RADIUS <
    table.y
  ) {

    ball.y =
      table.y +
      BALL_RADIUS;

    ball.vy =
      Math.abs(ball.vy);

    playSound(
      330,
      0.025
    );

  }


  /* TABLE BOTTOM */

  if (
    ball.y +
      BALL_RADIUS >
    table.y +
      table.height
  ) {

    ball.y =
      table.y +
      table.height -
      BALL_RADIUS;

    ball.vy =
      -Math.abs(ball.vy);

    playSound(
      330,
      0.025
    );

  }


  /* NET */

  if (
    ball.x >
      table.netX - 5 &&
    ball.x <
      table.netX + 5
  ) {

    ball.x +=
      ball.vx > 0
        ? 7
        : -7;

    ball.vx *= -0.98;

    ball.vy *= 0.99;

    playSound(
      440,
      0.035
    );

  }


  hitPaddle(true);
  hitPaddle(false);


  /* MISS */

  if (
    ball.x <
    table.x - 80
  ) {

    awardPoint(2);

  }

  if (
    ball.x >
    table.x +
      table.width +
      80
  ) {

    awardPoint(1);

  }

}


/* =========================================================
   UPDATE
========================================================= */

function update(deltaTime) {

  if (!gameRunning) {
    return;
  }

  movePlayerOne(deltaTime);
  movePlayerTwo(deltaTime);
  updateBall(deltaTime);

}


/* =========================================================
   DRAW BACKGROUND
========================================================= */

function drawBackground() {

  const gradient =
    ctx.createLinearGradient(
      0,
      0,
      0,
      HEIGHT
    );

  gradient.addColorStop(
    0,
    "#102d21"
  );

  gradient.addColorStop(
    1,
    "#020906"
  );

  ctx.fillStyle = gradient;

  ctx.fillRect(
    0,
    0,
    WIDTH,
    HEIGHT
  );

}


/* =========================================================
   DRAW TABLE
========================================================= */

function drawTable() {

  /* Shadow */

  ctx.fillStyle =
    "rgba(0,0,0,0.35)";

  ctx.fillRect(
    table.x + 20,
    table.y +
      table.height +
      22,
    table.width - 40,
    28
  );


  /* Legs */

  ctx.fillStyle =
    "#14251f";

  ctx.fillRect(
    table.x + 45,
    table.y + table.height,
    35,
    60
  );

  ctx.fillRect(
    table.x +
      table.width -
      80,
    table.y + table.height,
    35,
    60
  );


  /* Table */

  const gradient =
    ctx.createLinearGradient(
      table.x,
      table.y,
      table.x,
      table.y +
        table.height
    );

  gradient.addColorStop(
    0,
    "#176044"
  );

  gradient.addColorStop(
    1,
    "#0a3928"
  );

  ctx.fillStyle = gradient;

  ctx.fillRect(
    table.x,
    table.y,
    table.width,
    table.height
  );


  /* Outer lines */

  ctx.strokeStyle =
    "#f4f7f5";

  ctx.lineWidth = 5;

  ctx.strokeRect(
    table.x,
    table.y,
    table.width,
    table.height
  );


  /* Center line */

  ctx.lineWidth = 3;

  ctx.beginPath();

  ctx.moveTo(
    table.x,
    table.y +
      table.height / 2
  );

  ctx.lineTo(
    table.x +
      table.width,
    table.y +
      table.height / 2
  );

  ctx.stroke();

}


/* =========================================================
   DRAW NET
========================================================= */

function drawNet() {

  /* Posts */

  ctx.fillStyle =
    "#101714";

  ctx.fillRect(
    table.netX - 9,
    table.y - 18,
    9,
    table.height + 36
  );

  ctx.fillRect(
    table.netX,
    table.y - 18,
    9,
    table.height + 36
  );


  /* Net */

  ctx.fillStyle =
    "rgba(235,235,235,0.75)";

  ctx.fillRect(
    table.netX - 4,
    table.y - 12,
    8,
    table.height + 24
  );


  /* Net texture */

  ctx.strokeStyle =
    "rgba(255,255,255,0.18)";

  ctx.lineWidth = 1;

  for (
    let y = table.y;
    y < table.y + table.height;
    y += 12
  ) {

    ctx.beginPath();

    ctx.moveTo(
      table.netX - 4,
      y
    );

    ctx.lineTo(
      table.netX + 4,
      y
    );

    ctx.stroke();

  }

}


/* =========================================================
   DRAW PADDLES
========================================================= */

function drawPaddle(
  x,
  y,
  color,
  left
) {

  ctx.fillStyle = color;

  ctx.fillRect(
    x,
    y,
    PADDLE_WIDTH,
    PADDLE_HEIGHT
  );


  /* Handle */

  ctx.fillStyle =
    "#111";

  const handleX =
    left
      ? x + 10
      : x + 4;

  ctx.fillRect(
    handleX,
    y +
      PADDLE_HEIGHT -
      22,
    8,
    22
  );

}


/* =========================================================
   DRAW BALL
========================================================= */

function drawBall() {

  /* Trail */

  for (
    let i = 0;
    i < ball.trail.length;
    i++
  ) {

    const trail =
      ball.trail[i];

    const alpha =
      i /
      ball.trail.length /
      3;

    ctx.globalAlpha =
      alpha;

    ctx.beginPath();

    ctx.arc(
      trail.x,
      trail.y,
      BALL_RADIUS * 0.8,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      "#ffffff";

    ctx.fill();

  }

  ctx.globalAlpha = 1;


  /* Ball */

  ctx.beginPath();

  ctx.arc(
    ball.x,
    ball.y,
    BALL_RADIUS,
    0,
    Math.PI * 2
  );

  ctx.fillStyle =
    "#ffffff";

  ctx.fill();

  ctx.strokeStyle =
    "rgba(0,0,0,0.35)";

  ctx.lineWidth = 2;

  ctx.stroke();


  /* Spin indicator */

  if (
    Math.abs(ball.spin) > 1
  ) {

    ctx.strokeStyle =
      "#ffffff";

    ctx.lineWidth = 3;

    ctx.beginPath();

    if (ball.spin > 0) {

      ctx.arc(
        ball.x,
        ball.y,
        BALL_RADIUS + 7,
        -0.8,
        0.8
      );

    } else {

      ctx.arc(
        ball.x,
        ball.y,
        BALL_RADIUS + 7,
        Math.PI - 0.8,
        Math.PI + 0.8
      );

    }

    ctx.stroke();

  }

}


/* =========================================================
   DRAW EVERYTHING
========================================================= */

function draw() {

  ctx.clearRect(
    0,
    0,
    WIDTH,
    HEIGHT
  );

  drawBackground();

  drawTable();

  drawNet();


  drawPaddle(
    table.x - 40,
    playerOne.y,
    "#f4f7f5",
    true
  );


  drawPaddle(
    table.x +
      table.width +
      18,
    playerTwo.y,
    "#f4f7f5",
    false
  );


  drawBall();

}


/* =========================================================
   GAME LOOP
========================================================= */

function gameLoop(time) {

  const deltaTime =
    Math.min(
      (time - lastTime) / 1000 || 0,
      0.025
    );

  lastTime = time;

  update(deltaTime);

  draw();

  animationFrame =
    requestAnimationFrame(
      gameLoop
    );

}


/* =========================================================
   KEYBOARD
========================================================= */

window.addEventListener(
  "keydown",
  (event) => {

    const key =
      event.key.toLowerCase();

    const gameKeys = [
      "w",
      "s",
      "a",
      "d",
      "i",
      "k",
      "j",
      "l",
      " ",
      "enter",
      "arrowup",
      "arrowdown"
    ];

    if (
      gameKeys.includes(key)
    ) {

      event.preventDefault();

      keys.add(key);

    }


    /* Player 1 spin */

    if (key === "a") {
      applySpin(1, -1);
    }

    if (key === "d") {
      applySpin(1, 1);
    }


    /* Player 2 spin */

    if (key === "j") {
      applySpin(2, -1);
    }

    if (key === "l") {
      applySpin(2, 1);
    }


    /* Smash */

    if (key === " ") {
      smash(1);
    }

    if (key === "enter") {
      smash(2);
    }

  }
);


window.addEventListener(
  "keyup",
  (event) => {

    keys.delete(
      event.key.toLowerCase()
    );

  }
);


/* =========================================================
   MOBILE TOUCH
========================================================= */

function movePlayerWithTouch(event) {

  const rect =
    canvas.getBoundingClientRect();

  const relativeY =
    (
      event.clientY -
      rect.top
    ) /
    rect.height;

  const canvasY =
    relativeY *
    HEIGHT;

  playerOne.y =
    clamp(
      canvasY -
        PADDLE_HEIGHT / 2,
      table.y,
      table.y +
        table.height -
        PADDLE_HEIGHT
    );

}


canvas.addEventListener(
  "pointerdown",
  (event) => {

    dragging = true;

    canvas.setPointerCapture(
      event.pointerId
    );

    movePlayerWithTouch(event);

  }
);


canvas.addEventListener(
  "pointermove",
  (event) => {

    if (!dragging) {
      return;
    }

    movePlayerWithTouch(event);

  }
);


canvas.addEventListener(
  "pointerup",
  () => {

    dragging = false;

  }
);


canvas.addEventListener(
  "pointercancel",
  () => {

    dragging = false;

  }
);


/* =========================================================
   BUTTONS
========================================================= */

startButton.addEventListener(
  "click",
  startMatch
);

restartButton.addEventListener(
  "click",
  restartMatch
);

overlayStart.addEventListener(
  "click",
  startMatch
);


characterSelect.addEventListener(
  "change",
  updateNames
);

difficultySelect.addEventListener(
  "change",
  updateNames
);

modeSelect.addEventListener(
  "change",
  updateNames
);


/* =========================================================
   INITIALIZATION
========================================================= */

window.addEventListener(
  "resize",
  resizeCanvas
);

updateNames();

updateScoreboard();

resizeCanvas();

draw();

cancelAnimationFrame(
  animationFrame
);

animationFrame =
  requestAnimationFrame(
    gameLoop
);
```
