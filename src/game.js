(function startAnimalChaseGame() {
  const { ChaseGame } = window.ChaseGameEngine;
  const canvas = document.querySelector("#game-canvas");
  const context = canvas.getContext("2d");
  const scoreElement = document.querySelector("#score");
  const startButton = document.querySelector("#start-button");
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

  const keyDirections = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
  };

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
    const character = selectedOption("character");
    const target = selectedOption("target");
    messageTitle.textContent = "游戏结束";
    messageDetail.textContent = `${character.name}抓到了 ${game.score} 个${target.name}，再试一次吧！`;
    message.classList.remove("hidden");
    message.setAttribute("aria-hidden", "false");
    startButton.textContent = "再玩一次";
  }

  function tick() {
    const result = game.step();
    render();

    if (result.status === "over") {
      showGameOver();
    }
  }

  function scheduleTicks() {
    window.clearInterval(timer);
    timer = window.setInterval(tick, difficultySettings[selectedDifficulty]);
  }

  function beginGame() {
    game.start();
    message.classList.add("hidden");
    message.setAttribute("aria-hidden", "true");
    startButton.textContent = "重新开始";
    render();
    scheduleTicks();
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
    resumeAfterPicker = game.status === "running" && timer !== null;

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

    if (resumeAfterPicker && game.status === "running") {
      scheduleTicks();
    }

    resumeAfterPicker = false;
    const triggerToFocus = activeTrigger;
    activePicker = null;
    activeTrigger = null;
    triggerToFocus?.focus();
  }

  startButton.addEventListener("click", beginGame);
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
    const direction = keyDirections[event.key];
    if (!direction || game.status !== "running" || optionDialog.open) return;

    event.preventDefault();
    game.queueDirection(direction);
  });

  updatePickerTriggers();
  resizeCanvas();

  if (typeof ResizeObserver !== "undefined") {
    const canvasResizeObserver = new ResizeObserver(resizeCanvas);
    canvasResizeObserver.observe(canvas);
  }
  window.addEventListener("resize", resizeCanvas);
})();
