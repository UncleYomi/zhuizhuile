(function startAnimalChaseGame() {
  const { ChaseGame, directionFromSwipe } = window.ChaseGameEngine;
  const { SoundController } = window.AnimalChaseSound;
  const { BestScoreStore, CustomAvatarStore, prepareAvatar } = window.AnimalChasePlayerData;
  const gameShell = document.querySelector(".game-shell");
  const canvas = document.querySelector("#game-canvas");
  const canvasWrap = document.querySelector(".canvas-wrap");
  const context = canvas.getContext("2d");
  const scoreElement = document.querySelector("#score");
  const bestScoreElement = document.querySelector("#best-score");
  const scoreCard = document.querySelector(".score-card");
  const soundButton = document.querySelector("#sound-button");
  const soundIcon = document.querySelector("#sound-icon");
  const pauseButton = document.querySelector("#pause-button");
  const pauseIcon = document.querySelector("#pause-icon");
  const pauseLabel = document.querySelector("#pause-label");
  const startButton = document.querySelector("#start-button");
  const messageAction = document.querySelector("#message-action");
  const message = document.querySelector("#game-message");
  const messageTitle = document.querySelector("#message-title");
  const messageDetail = document.querySelector("#message-detail");
  const characterPicker = document.querySelector("#character-picker");
  const targetPicker = document.querySelector("#target-picker");
  const characterIcon = document.querySelector("#character-icon");
  const characterImage = document.querySelector("#character-image");
  const characterName = document.querySelector("#character-name");
  const targetIcon = document.querySelector("#target-icon");
  const targetImage = document.querySelector("#target-image");
  const targetName = document.querySelector("#target-name");
  const difficultyButtons = document.querySelectorAll(".difficulty-option");
  const optionDialog = document.querySelector("#option-dialog");
  const dialogCard = document.querySelector(".dialog-card");
  const dialogTitle = document.querySelector("#dialog-title");
  const dialogOptions = document.querySelector("#dialog-options");
  const dialogClose = document.querySelector("#dialog-close");
  const customUploadButton = document.querySelector("#custom-upload-button");
  const customUploadHelp = document.querySelector("#custom-upload-help");
  const customUploadStatus = document.querySelector("#custom-upload-status");
  const customFileInput = document.querySelector("#custom-file-input");
  const game = new ChaseGame({ gridSize: 20 });
  const sound = new SoundController();
  const bestScores = new BestScoreStore();
  const customAvatars = new CustomAvatarStore();
  const logicalCanvasSize = 400;
  const cellSize = logicalCanvasSize / game.gridSize;
  const difficultySettings = Object.freeze({
    easy: 400,
    medium: 280,
    hard: 180,
  });
  const optionCatalog = Object.freeze({
    character: Object.freeze([
      Object.freeze({ id: "snake", name: "小蛇", icon: "🐍" }),
      Object.freeze({ id: "cat", name: "小猫", icon: "🐱" }),
      Object.freeze({ id: "chicken", name: "小鸡", icon: "🐥" }),
      Object.freeze({ id: "cheetah", name: "猎豹", icon: "🐆" }),
    ]),
    target: Object.freeze([
      Object.freeze({ id: "apple", name: "苹果", icon: "🍎" }),
      Object.freeze({ id: "mouse", name: "老鼠", icon: "🐭" }),
      Object.freeze({ id: "worm", name: "虫子", icon: "🐛" }),
      Object.freeze({ id: "deer", name: "鹿", icon: "🦌" }),
    ]),
  });
  const customAvatarData = {
    character: customAvatars.get("character"),
    target: customAvatars.get("target"),
  };
  const customAvatarImages = { character: null, target: null };
  let selectedCharacter = "snake";
  let selectedTarget = "apple";
  let selectedDifficulty = "easy";
  let newRecordThisRound = false;
  let activePicker = null;
  let activeTrigger = null;
  let resumeAfterPicker = false;
  let timer = null;
  let countdownTimer = null;
  let swipeStart = null;

  const keyDirections = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
  };

  function currentGameState() {
    return gameShell.dataset.gameState;
  }

  function showMessage(title, detail, actionLabel) {
    messageTitle.textContent = title;
    messageDetail.textContent = detail;
    messageAction.textContent = actionLabel;
    messageAction.hidden = false;
    message.classList.remove("hidden");
    message.setAttribute("aria-hidden", "false");
  }

  function hideMessage() {
    message.classList.add("hidden");
    message.setAttribute("aria-hidden", "true");
  }

  function updateSoundButton() {
    const enabled = sound.isEnabled();
    soundButton.setAttribute("aria-pressed", String(enabled));
    soundButton.setAttribute("aria-label", enabled ? "关闭音效" : "开启音效");
    soundIcon.textContent = enabled ? "🔊" : "🔇";
  }

  function updatePauseButton({ paused = false, disabled = false } = {}) {
    pauseButton.disabled = disabled;
    pauseButton.setAttribute("aria-label", paused ? "继续游戏" : "暂停游戏");
    pauseIcon.textContent = paused ? "▶" : "⏸";
    pauseLabel.textContent = paused ? "继续" : "暂停";
  }

  function clearCountdown() {
    window.clearInterval(countdownTimer);
    countdownTimer = null;
  }

  function selectedOption(type) {
    const selectedId = type === "character" ? selectedCharacter : selectedTarget;
    if (selectedId === "custom") {
      return {
        id: "custom",
        name: type === "character" ? "我的主角" : "我的目标",
        icon: "",
        imageData: customAvatarData[type],
      };
    }
    return optionCatalog[type].find((option) => option.id === selectedId);
  }

  function loadCustomAvatar(type, dataUrl) {
    if (!dataUrl) {
      customAvatarImages[type] = null;
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        customAvatarImages[type] = image;
        updatePickerTriggers();
        render();
        resolve(true);
      };
      image.onerror = () => {
        customAvatarImages[type] = null;
        resolve(false);
      };
      image.src = dataUrl;
    });
  }

  function updateBestScoreDisplay() {
    bestScoreElement.textContent = String(bestScores.get(selectedDifficulty));
  }

  function recordBestScore() {
    const result = bestScores.record(selectedDifficulty, game.score);
    bestScoreElement.textContent = String(result.best);

    if (result.isNew) {
      newRecordThisRound = true;
      scoreCard.classList.remove("new-record");
      void scoreCard.offsetWidth;
      scoreCard.classList.add("new-record");
    }
  }

  function drawBoard() {
    context.fillStyle = "#dff0d8";
    context.fillRect(0, 0, logicalCanvasSize, logicalCanvasSize);

    context.strokeStyle = "rgba(32, 53, 45, 0.08)";
    context.lineWidth = 1;

    for (let index = 1; index < game.gridSize; index += 1) {
      const position = index * cellSize;
      context.beginPath();
      context.moveTo(position, 0);
      context.lineTo(position, logicalCanvasSize);
      context.stroke();
      context.beginPath();
      context.moveTo(0, position);
      context.lineTo(logicalCanvasSize, position);
      context.stroke();
    }
  }

  function drawRoundedCell(x, y, color, inset = 2, radius = 6) {
    const left = x * cellSize + inset;
    const top = y * cellSize + inset;
    const size = cellSize - inset * 2;
    context.fillStyle = color;
    context.beginPath();
    context.roundRect(left, top, size, size, radius);
    context.fill();
  }

  function drawApple() {
    if (!game.target) return;

    const centerX = (game.target.x + 0.5) * cellSize;
    const centerY = (game.target.y + 0.55) * cellSize;
    context.fillStyle = "#e54b4b";
    context.beginPath();
    context.arc(centerX, centerY, cellSize * 0.34, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "#355c3a";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(centerX, centerY - cellSize * 0.3);
    context.quadraticCurveTo(
      centerX + cellSize * 0.12,
      centerY - cellSize * 0.5,
      centerX + cellSize * 0.28,
      centerY - cellSize * 0.4,
    );
    context.stroke();
  }

  function drawMouse() {
    if (!game.target) return;

    const centerX = (game.target.x + 0.5) * cellSize;
    const centerY = (game.target.y + 0.52) * cellSize;
    const unit = cellSize / 20;
    context.save();
    context.translate(centerX, centerY);
    context.scale(unit, unit);

    context.strokeStyle = "#9b6f76";
    context.lineWidth = 1.7;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(-6, 3);
    context.quadraticCurveTo(-11, 5, -8, 9);
    context.stroke();

    context.fillStyle = "#89939a";
    context.beginPath();
    context.ellipse(-1, 1, 7, 5.4, 0, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#9ca6ac";
    context.beginPath();
    context.arc(5, 0, 4.2, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#c1c8cc";
    context.beginPath();
    context.arc(3, -4, 2.6, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#26342f";
    context.beginPath();
    context.arc(6, -1.1, 0.8, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#e49aa5";
    context.beginPath();
    context.arc(9, 1, 1.2, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawWorm() {
    if (!game.target) return;

    const centerX = (game.target.x + 0.5) * cellSize;
    const centerY = (game.target.y + 0.5) * cellSize;
    const unit = cellSize / 20;
    context.save();
    context.translate(centerX, centerY);
    context.scale(unit, unit);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#79a84b";
    context.lineWidth = 5.2;
    context.beginPath();
    context.moveTo(-7, 4);
    context.bezierCurveTo(-4, -5, 1, 7, 6, -2);
    context.stroke();

    context.fillStyle = "#99c764";
    context.beginPath();
    context.arc(6, -2, 3.6, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#26342f";
    context.beginPath();
    context.arc(7.2, -3, 0.65, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawDeer() {
    if (!game.target) return;

    const centerX = (game.target.x + 0.5) * cellSize;
    const centerY = (game.target.y + 0.55) * cellSize;
    const unit = cellSize / 20;
    context.save();
    context.translate(centerX, centerY);
    context.scale(unit, unit);
    context.lineCap = "round";
    context.lineJoin = "round";

    context.strokeStyle = "#79513a";
    context.lineWidth = 1.5;
    [-1, 1].forEach((side) => {
      context.beginPath();
      context.moveTo(side * 3.4, -5.8);
      context.lineTo(side * 4.7, -10);
      context.moveTo(side * 4.3, -8.6);
      context.lineTo(side * 7, -10.5);
      context.moveTo(side * 4.8, -7.3);
      context.lineTo(side * 7.4, -7.8);
      context.stroke();
    });

    context.fillStyle = "#a86e43";
    context.beginPath();
    context.moveTo(-4.2, -4.7);
    context.lineTo(-9, -7.5);
    context.lineTo(-7.2, -1.8);
    context.closePath();
    context.fill();
    context.beginPath();
    context.moveTo(4.2, -4.7);
    context.lineTo(9, -7.5);
    context.lineTo(7.2, -1.8);
    context.closePath();
    context.fill();

    context.beginPath();
    context.ellipse(0, 0, 6.7, 8, 0, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#f1d2aa";
    context.beginPath();
    context.ellipse(0, 3.5, 3.7, 3, 0, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#26342f";
    context.beginPath();
    context.arc(-2.5, -1.1, 0.8, 0, Math.PI * 2);
    context.arc(2.5, -1.1, 0.8, 0, Math.PI * 2);
    context.arc(0, 3.2, 1.05, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawCustomImage(image, cell, inset = 1) {
    if (!image || !cell) return false;

    const left = cell.x * cellSize + inset;
    const top = cell.y * cellSize + inset;
    const size = cellSize - inset * 2;
    context.save();
    context.beginPath();
    context.arc(left + size / 2, top + size / 2, size / 2, 0, Math.PI * 2);
    context.clip();
    context.drawImage(image, left, top, size, size);
    context.restore();
    context.strokeStyle = "rgba(32, 53, 45, 0.45)";
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(left + size / 2, top + size / 2, size / 2 - 0.75, 0, Math.PI * 2);
    context.stroke();
    return true;
  }

  function drawTarget() {
    if (selectedTarget === "custom") {
      drawCustomImage(customAvatarImages.target, game.target);
    } else if (selectedTarget === "mouse") {
      drawMouse();
    } else if (selectedTarget === "worm") {
      drawWorm();
    } else if (selectedTarget === "deer") {
      drawDeer();
    } else {
      drawApple();
    }
  }

  function drawSnake() {
    game.segments.forEach((part, index) => {
      drawRoundedCell(part.x, part.y, index === 0 ? "#225c42" : "#3b8b61");
    });

    const head = game.segments[0];
    const eyeOffset = cellSize * 0.2;
    const headCenterX = (head.x + 0.5) * cellSize;
    const headCenterY = (head.y + 0.5) * cellSize;
    let firstEye = { x: headCenterX + eyeOffset, y: headCenterY - eyeOffset };
    let secondEye = { x: headCenterX + eyeOffset, y: headCenterY + eyeOffset };

    if (game.direction.x < 0) {
      firstEye = { x: headCenterX - eyeOffset, y: headCenterY - eyeOffset };
      secondEye = { x: headCenterX - eyeOffset, y: headCenterY + eyeOffset };
    } else if (game.direction.y < 0) {
      firstEye = { x: headCenterX - eyeOffset, y: headCenterY - eyeOffset };
      secondEye = { x: headCenterX + eyeOffset, y: headCenterY - eyeOffset };
    } else if (game.direction.y > 0) {
      firstEye = { x: headCenterX - eyeOffset, y: headCenterY + eyeOffset };
      secondEye = { x: headCenterX + eyeOffset, y: headCenterY + eyeOffset };
    }

    context.fillStyle = "#ffffff";
    [firstEye, secondEye].forEach((eye) => {
      context.beginPath();
      context.arc(eye.x, eye.y, cellSize * 0.09, 0, Math.PI * 2);
      context.fill();
    });
  }

  function catRotation() {
    if (game.direction.x > 0) return -Math.PI / 2;
    if (game.direction.x < 0) return Math.PI / 2;
    if (game.direction.y < 0) return Math.PI;
    return 0;
  }

  function drawCatHead(head) {
    const centerX = (head.x + 0.5) * cellSize;
    const centerY = (head.y + 0.5) * cellSize;
    const unit = cellSize / 20;
    context.save();
    context.translate(centerX, centerY);
    context.rotate(catRotation());
    context.scale(unit, unit);

    context.fillStyle = "#d9823d";
    context.beginPath();
    context.moveTo(-7, -5);
    context.lineTo(-6, -10);
    context.lineTo(-1, -7);
    context.closePath();
    context.fill();
    context.beginPath();
    context.moveTo(2, -7);
    context.lineTo(7, -10);
    context.lineTo(7, -4);
    context.closePath();
    context.fill();

    context.beginPath();
    context.arc(0, 0, 7.6, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#26342f";
    context.beginPath();
    context.arc(-2.7, -1, 1, 0, Math.PI * 2);
    context.arc(2.7, -1, 1, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#e88c93";
    context.beginPath();
    context.moveTo(0, 1.2);
    context.lineTo(-1.5, 3.2);
    context.lineTo(1.5, 3.2);
    context.closePath();
    context.fill();

    context.strokeStyle = "#6e472f";
    context.lineWidth = 0.8;
    context.lineCap = "round";
    [-1, 1].forEach((side) => {
      context.beginPath();
      context.moveTo(side * 1.3, 3.4);
      context.lineTo(side * 7.5, 2.3);
      context.moveTo(side * 1.2, 4.1);
      context.lineTo(side * 7, 5.1);
      context.stroke();
    });
    context.restore();
  }

  function drawCat() {
    game.segments.slice(1).forEach((part, bodyIndex) => {
      const isTailTip = bodyIndex === game.segments.length - 2;
      drawRoundedCell(part.x, part.y, isTailTip ? "#8e5734" : "#d9823d", 3, 7);
    });
    drawCatHead(game.segments[0]);
  }

  function drawChickenHead(head) {
    const centerX = (head.x + 0.5) * cellSize;
    const centerY = (head.y + 0.5) * cellSize;
    const unit = cellSize / 20;
    context.save();
    context.translate(centerX, centerY);
    context.rotate(catRotation());
    context.scale(unit, unit);

    context.fillStyle = "#f4bc3b";
    context.beginPath();
    context.arc(0, 0, 7.5, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#e85a48";
    [-3.4, 0, 3.4].forEach((x, index) => {
      context.beginPath();
      context.arc(x, -7.2 - (index === 1 ? 1 : 0), 2.3, 0, Math.PI * 2);
      context.fill();
    });

    context.fillStyle = "#f08d32";
    context.beginPath();
    context.moveTo(-2.8, 5.3);
    context.lineTo(0, 9.3);
    context.lineTo(2.8, 5.3);
    context.closePath();
    context.fill();

    context.fillStyle = "#26342f";
    context.beginPath();
    context.arc(-2.6, -1, 1, 0, Math.PI * 2);
    context.arc(2.6, -1, 1, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawChicken() {
    game.segments.slice(1).forEach((part, bodyIndex) => {
      const isTailTip = bodyIndex === game.segments.length - 2;
      drawRoundedCell(part.x, part.y, isTailTip ? "#df8630" : "#f4bc3b", 3, 8);
    });
    drawChickenHead(game.segments[0]);
  }

  function drawCheetahHead(head) {
    const centerX = (head.x + 0.5) * cellSize;
    const centerY = (head.y + 0.5) * cellSize;
    const unit = cellSize / 20;
    context.save();
    context.translate(centerX, centerY);
    context.rotate(catRotation());
    context.scale(unit, unit);

    context.fillStyle = "#e7a93d";
    context.beginPath();
    context.arc(-5.2, -5.7, 3.1, 0, Math.PI * 2);
    context.arc(5.2, -5.7, 3.1, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.ellipse(0, 0, 7.5, 8, 0, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#f3d291";
    context.beginPath();
    context.ellipse(0, 3.4, 4.3, 3.2, 0, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#26342f";
    context.beginPath();
    context.arc(-2.7, -1.3, 1, 0, Math.PI * 2);
    context.arc(2.7, -1.3, 1, 0, Math.PI * 2);
    context.arc(0, 2.5, 1.15, 0, Math.PI * 2);
    context.fill();

    [[-4.8, 1], [4.8, 1], [-3.8, -5], [3.8, -5]].forEach(([x, y]) => {
      context.beginPath();
      context.arc(x, y, 0.85, 0, Math.PI * 2);
      context.fill();
    });

    context.strokeStyle = "#26342f";
    context.lineWidth = 0.8;
    context.beginPath();
    context.moveTo(-2.3, -0.5);
    context.lineTo(-1.4, 2.1);
    context.moveTo(2.3, -0.5);
    context.lineTo(1.4, 2.1);
    context.stroke();
    context.restore();
  }

  function drawCheetah() {
    game.segments.slice(1).forEach((part, bodyIndex) => {
      const isTailTip = bodyIndex === game.segments.length - 2;
      drawRoundedCell(part.x, part.y, isTailTip ? "#26342f" : "#e7a93d", 3, 7);

      if (!isTailTip) {
        const centerX = (part.x + 0.5) * cellSize;
        const centerY = (part.y + 0.5) * cellSize;
        context.fillStyle = "#5d4933";
        context.beginPath();
        context.arc(centerX - cellSize * 0.2, centerY - cellSize * 0.13, cellSize * 0.065, 0, Math.PI * 2);
        context.arc(centerX + cellSize * 0.18, centerY + cellSize * 0.18, cellSize * 0.06, 0, Math.PI * 2);
        context.fill();
      }
    });
    drawCheetahHead(game.segments[0]);
  }

  function drawCustomCharacter() {
    game.segments.slice(1).forEach((part, bodyIndex) => {
      const isTailTip = bodyIndex === game.segments.length - 2;
      drawRoundedCell(part.x, part.y, isTailTip ? "#426b5a" : "#77ad8f", 3, 8);
    });

    if (!drawCustomImage(customAvatarImages.character, game.segments[0])) {
      drawRoundedCell(game.segments[0].x, game.segments[0].y, "#285c47", 2, 8);
    }
  }

  function drawCharacter() {
    if (selectedCharacter === "custom") {
      drawCustomCharacter();
    } else if (selectedCharacter === "cheetah") {
      drawCheetah();
    } else if (selectedCharacter === "chicken") {
      drawChicken();
    } else if (selectedCharacter === "cat") {
      drawCat();
    } else {
      drawSnake();
    }
  }

  function render() {
    drawBoard();
    drawTarget();
    drawCharacter();
    scoreElement.textContent = String(game.score);
  }

  function resizeCanvas() {
    const displaySize = canvas.getBoundingClientRect().width || logicalCanvasSize;
    const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
    const backingSize = Math.round(displaySize * pixelRatio);

    if (canvas.width !== backingSize || canvas.height !== backingSize) {
      canvas.width = backingSize;
      canvas.height = backingSize;
    }

    const scale = backingSize / logicalCanvasSize;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    render();
  }

  function showGameOver() {
    window.clearInterval(timer);
    timer = null;
    clearCountdown();
    const character = selectedOption("character");
    const target = selectedOption("target");
    const title = newRecordThisRound ? "新纪录！" : "游戏结束";
    const detail = newRecordThisRound
      ? `${character.name}抓到了 ${game.score} 个${target.name}，创造了新的最高分！`
      : `${character.name}抓到了 ${game.score} 个${target.name}，再试一次吧！`;
    showMessage(title, detail, "再玩一次");
    startButton.textContent = "再玩一次";
    gameShell.dataset.gameState = "over";
    updatePauseButton({ disabled: true });
    difficultyButtons.forEach((button) => {
      button.disabled = false;
    });
    sound.playGameOver();
  }

  function tick() {
    const result = game.step();
    render();

    if (result.reachedTarget) {
      recordBestScore();
      sound.playCatch();
    }

    if (result.status === "over") {
      showGameOver();
    }
  }

  function scheduleTicks() {
    window.clearInterval(timer);
    if (currentGameState() !== "running") {
      timer = null;
      return;
    }
    timer = window.setInterval(tick, difficultySettings[selectedDifficulty]);
  }

  function beginGame() {
    clearCountdown();
    window.clearInterval(timer);
    game.start();
    newRecordThisRound = false;
    scoreCard.classList.remove("new-record");
    hideMessage();
    startButton.textContent = "重新开始";
    messageAction.textContent = "重新开始";
    messageAction.hidden = false;
    gameShell.dataset.gameState = "running";
    difficultyButtons.forEach((button) => {
      button.disabled = true;
    });
    updatePauseButton();
    render();
    canvas.focus({ preventScroll: true });
    sound.playStart();
    scheduleTicks();
  }

  function pauseGame({ automatic = false } = {}) {
    if (game.status !== "running") return false;

    window.clearInterval(timer);
    timer = null;
    clearCountdown();
    swipeStart = null;
    resumeAfterPicker = false;
    gameShell.dataset.gameState = "paused";
    showMessage(
      "游戏已暂停",
      automatic ? "回到游戏后，点击继续再出发。" : `当前得分是 ${game.score}，准备好再继续。`,
      "继续游戏",
    );
    updatePauseButton({ paused: true });
    return true;
  }

  function resumeGame() {
    if (game.status !== "running") return;

    clearCountdown();
    hideMessage();
    gameShell.dataset.gameState = "running";
    updatePauseButton();
    canvas.focus({ preventScroll: true });
    sound.playResume();
    scheduleTicks();
  }

  function beginResumeCountdown() {
    if (currentGameState() !== "paused" || optionDialog.open) return;

    let remaining = 3;
    gameShell.dataset.gameState = "countdown";
    messageTitle.textContent = String(remaining);
    messageDetail.textContent = "准备继续……";
    messageAction.hidden = true;
    updatePauseButton({ disabled: true });
    clearCountdown();
    countdownTimer = window.setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        messageTitle.textContent = String(remaining);
        return;
      }

      resumeGame();
    }, 500);
  }

  function togglePause() {
    if (currentGameState() === "running") {
      pauseGame();
    } else if (currentGameState() === "paused") {
      beginResumeCountdown();
    }
  }

  function handleMessageAction() {
    if (currentGameState() === "paused") {
      beginResumeCountdown();
    } else {
      beginGame();
    }
  }

  function beginSwipe(event) {
    if (
      event.pointerType === "mouse" ||
      game.status !== "running" ||
      currentGameState() !== "running" ||
      optionDialog.open
    ) {
      return;
    }

    swipeStart = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    canvasWrap.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function trackSwipe(event) {
    if (!swipeStart || swipeStart.pointerId !== event.pointerId) return;
    event.preventDefault();
  }

  function finishSwipe(event) {
    if (!swipeStart || swipeStart.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - swipeStart.x;
    const deltaY = event.clientY - swipeStart.y;
    const boardSize = canvasWrap.getBoundingClientRect().width;
    const minimumDistance = Math.max(18, Math.min(30, boardSize * 0.07));
    const direction = directionFromSwipe(deltaX, deltaY, minimumDistance);
    swipeStart = null;

    if (direction) {
      game.queueDirection(direction);
    }

    event.preventDefault();
  }

  function cancelSwipe(event) {
    if (swipeStart?.pointerId === event.pointerId) {
      swipeStart = null;
    }
  }

  function updatePressedButton(buttons, selectedButton) {
    buttons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button === selectedButton));
    });
  }

  function updatePickerTriggers() {
    const character = selectedOption("character");
    const target = selectedOption("target");

    characterIcon.hidden = character.id === "custom";
    characterImage.hidden = character.id !== "custom";
    characterIcon.textContent = character.icon;
    characterImage.src = character.imageData || "";
    characterName.textContent = character.name;

    targetIcon.hidden = target.id === "custom";
    targetImage.hidden = target.id !== "custom";
    targetIcon.textContent = target.icon;
    targetImage.src = target.imageData || "";
    targetName.textContent = target.name;
  }

  function chooseOption(optionId) {
    if (activePicker === "character") {
      selectedCharacter = optionId;
    } else {
      selectedTarget = optionId;
    }

    updatePickerTriggers();
    render();
    closePicker();
  }

  function renderDialogOptions() {
    const selectedId = activePicker === "character" ? selectedCharacter : selectedTarget;
    dialogOptions.replaceChildren();
    const options = [...optionCatalog[activePicker]];

    if (customAvatarData[activePicker]) {
      options.push({
        id: "custom",
        name: activePicker === "character" ? "我的主角" : "我的目标",
        imageData: customAvatarData[activePicker],
      });
    }

    options.forEach((option) => {
      const button = document.createElement("button");
      const name = document.createElement("span");
      button.className = "dialog-option";
      button.type = "button";
      button.dataset.optionId = option.id;
      button.setAttribute("aria-pressed", String(option.id === selectedId));
      name.textContent = option.name;

      if (option.id === "custom") {
        const image = document.createElement("img");
        image.className = "dialog-option-image";
        image.alt = "";
        image.src = option.imageData;
        button.append(image, name);
      } else {
        const icon = document.createElement("span");
        icon.className = "dialog-option-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = option.icon;
        button.append(icon, name);
      }

      button.addEventListener("click", () => chooseOption(option.id));
      dialogOptions.append(button);
    });

    const kindName = activePicker === "character" ? "主角" : "目标";
    customUploadButton.textContent = `${customAvatarData[activePicker] ? "更换" : "＋ 添加"}自定义${kindName}`;
    customUploadHelp.textContent = "图片会自动裁成正方形，只保存在当前设备，不会上传。";
    customUploadStatus.textContent = "";
    customUploadStatus.classList.remove("error");
  }

  function openPicker(type, trigger) {
    activePicker = type;
    activeTrigger = trigger;
    resumeAfterPicker =
      game.status === "running" && currentGameState() === "running" && timer !== null;

    if (resumeAfterPicker) {
      window.clearInterval(timer);
      timer = null;
    }

    dialogTitle.textContent = type === "character" ? "选择主角" : "选择目标";
    dialogOptions.setAttribute("aria-label", dialogTitle.textContent);
    renderDialogOptions();
    optionDialog.showModal();
  }

  function closePicker() {
    if (optionDialog.open) {
      optionDialog.close();
    }
    finishPicker();
  }

  function finishPicker() {
    if (!activePicker) return;

    if (
      resumeAfterPicker &&
      game.status === "running" &&
      currentGameState() === "running" &&
      !document.hidden
    ) {
      scheduleTicks();
    }

    resumeAfterPicker = false;
    const triggerToFocus = activeTrigger;
    activePicker = null;
    activeTrigger = null;
    triggerToFocus?.focus();
  }

  startButton.addEventListener("click", beginGame);
  messageAction.addEventListener("click", handleMessageAction);
  soundButton.addEventListener("click", () => {
    sound.toggle();
    updateSoundButton();
  });
  pauseButton.addEventListener("click", togglePause);
  characterPicker.addEventListener("click", () => openPicker("character", characterPicker));
  targetPicker.addEventListener("click", () => openPicker("target", targetPicker));
  dialogClose.addEventListener("click", closePicker);
  customUploadButton.addEventListener("click", () => {
    customFileInput.value = "";
    customFileInput.click();
  });

  customFileInput.addEventListener("change", async () => {
    const file = customFileInput.files?.[0];
    const uploadType = activePicker;
    if (!file || !uploadType) return;

    customUploadButton.disabled = true;
    customUploadStatus.textContent = "正在处理图片……";
    customUploadStatus.classList.remove("error");

    try {
      const dataUrl = await prepareAvatar(file);
      const stored = customAvatars.save(uploadType, dataUrl);
      customAvatarData[uploadType] = dataUrl;
      const imageLoaded = await loadCustomAvatar(uploadType, dataUrl);
      if (!imageLoaded) throw new Error("无法读取这张图片");

      if (uploadType === "character") {
        selectedCharacter = "custom";
      } else {
        selectedTarget = "custom";
      }

      updatePickerTriggers();
      render();
      if (activePicker === uploadType) {
        if (!stored) {
          customUploadStatus.textContent = "图片已使用，但浏览器没有足够空间长期保存。";
          return;
        }
        closePicker();
      }
    } catch (error) {
      customUploadStatus.textContent = error.message || "图片处理失败，请换一张试试。";
      customUploadStatus.classList.add("error");
    } finally {
      customUploadButton.disabled = false;
    }
  });

  optionDialog.addEventListener("click", (event) => {
    if (event.target === optionDialog && !dialogCard.contains(event.target)) {
      closePicker();
    }
  });

  optionDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closePicker();
  });

  optionDialog.addEventListener("close", () => {
    finishPicker();
  });

  difficultyButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      selectedDifficulty = event.currentTarget.dataset.difficulty;
      updatePressedButton(difficultyButtons, event.currentTarget);
      updateBestScoreDisplay();
    });
  });

  document.addEventListener("keydown", (event) => {
    const interactiveTarget = event.target.closest?.("button, input, select, textarea, dialog");

    if (
      event.code === "Space" &&
      !interactiveTarget &&
      !optionDialog.open &&
      ["running", "paused"].includes(currentGameState())
    ) {
      event.preventDefault();
      togglePause();
      return;
    }

    const direction = keyDirections[event.key];
    if (
      !direction ||
      game.status !== "running" ||
      currentGameState() !== "running" ||
      optionDialog.open
    ) {
      return;
    }

    event.preventDefault();
    game.queueDirection(direction);
  });

  canvasWrap.addEventListener("pointerdown", beginSwipe);
  canvasWrap.addEventListener("pointermove", trackSwipe, { passive: false });
  canvasWrap.addEventListener("pointerup", finishSwipe);
  canvasWrap.addEventListener("pointercancel", cancelSwipe);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && ["running", "countdown"].includes(currentGameState())) {
      pauseGame({ automatic: true });
    }
  });

  updateSoundButton();
  updatePauseButton({ disabled: true });
  updateBestScoreDisplay();
  updatePickerTriggers();
  loadCustomAvatar("character", customAvatarData.character);
  loadCustomAvatar("target", customAvatarData.target);
  resizeCanvas();

  if (typeof ResizeObserver !== "undefined") {
    const canvasResizeObserver = new ResizeObserver(resizeCanvas);
    canvasResizeObserver.observe(canvas);
  }
  window.addEventListener("resize", resizeCanvas);
})();
