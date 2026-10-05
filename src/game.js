(function startAnimalChaseGame() {
  const { ChaseGame, directionFromSwipe } = window.ChaseGameEngine;
  const { SoundController } = window.AnimalChaseSound;
  const gameShell = document.querySelector(".game-shell");
  const canvas = document.querySelector("#game-canvas");
  const canvasWrap = document.querySelector(".canvas-wrap");
  const context = canvas.getContext("2d");
  const scoreElement = document.querySelector("#score");
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
  const characterName = document.querySelector("#character-name");
  const targetIcon = document.querySelector("#target-icon");
  const targetName = document.querySelector("#target-name");
  const difficultyButtons = document.querySelectorAll(".difficulty-option");
  const optionDialog = document.querySelector("#option-dialog");
  const dialogCard = document.querySelector(".dialog-card");
  const dialogTitle = document.querySelector("#dialog-title");
  const dialogOptions = document.querySelector("#dialog-options");
  const dialogClose = document.querySelector("#dialog-close");
  const game = new ChaseGame({ gridSize: 20 });
  const sound = new SoundController();
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
    ]),
    target: Object.freeze([
      Object.freeze({ id: "apple", name: "苹果", icon: "🍎" }),
      Object.freeze({ id: "mouse", name: "老鼠", icon: "🐭" }),
    ]),
  });
  let selectedCharacter = "snake";
  let selectedTarget = "apple";
  let selectedDifficulty = "easy";
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
    return optionCatalog[type].find((option) => option.id === selectedId);
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

  function drawTarget() {
    if (selectedTarget === "mouse") {
      drawMouse();
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

  function drawCharacter() {
    if (selectedCharacter === "cat") {
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
    showMessage(
      "游戏结束",
      `${character.name}抓到了 ${game.score} 个${target.name}，再试一次吧！`,
      "再玩一次",
    );
    startButton.textContent = "再玩一次";
    gameShell.dataset.gameState = "over";
    updatePauseButton({ disabled: true });
    sound.playGameOver();
  }

  function tick() {
    const result = game.step();
    render();

    if (result.reachedTarget) {
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
    hideMessage();
    startButton.textContent = "重新开始";
    messageAction.textContent = "重新开始";
    messageAction.hidden = false;
    gameShell.dataset.gameState = "running";
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
    characterIcon.textContent = character.icon;
    characterName.textContent = character.name;
    targetIcon.textContent = target.icon;
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

    optionCatalog[activePicker].forEach((option) => {
      const button = document.createElement("button");
      const icon = document.createElement("span");
      const name = document.createElement("span");
      button.className = "dialog-option";
      button.type = "button";
      button.dataset.optionId = option.id;
      button.setAttribute("aria-pressed", String(option.id === selectedId));
      icon.className = "dialog-option-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = option.icon;
      name.textContent = option.name;
      button.append(icon, name);
      button.addEventListener("click", () => chooseOption(option.id));
      dialogOptions.append(button);
    });
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

      if (game.status === "running" && timer !== null) {
        scheduleTicks();
      }
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
  updatePickerTriggers();
  resizeCanvas();

  if (typeof ResizeObserver !== "undefined") {
    const canvasResizeObserver = new ResizeObserver(resizeCanvas);
    canvasResizeObserver.observe(canvas);
  }
  window.addEventListener("resize", resizeCanvas);
})();
