(function startAnimalChaseGame() {
  const { ChaseGame } = window.ChaseGameEngine;
  const canvas = document.querySelector("#game-canvas");
  const context = canvas.getContext("2d");
  const scoreElement = document.querySelector("#score");
  const startButton = document.querySelector("#start-button");
  const message = document.querySelector("#game-message");
  const messageTitle = document.querySelector("#message-title");
  const messageDetail = document.querySelector("#message-detail");
  const characterButtons = document.querySelectorAll(".character-option");
  const targetButtons = document.querySelectorAll(".target-option");
  const difficultyButtons = document.querySelectorAll(".difficulty-option");
  const difficultyNote = document.querySelector("#difficulty-note");
  const game = new ChaseGame({ gridSize: 20 });
  const cellSize = canvas.width / game.gridSize;
  const difficultySettings = Object.freeze({
    easy: {
      tickLength: 230,
      note: "简单模式速度较慢，适合先熟悉玩法。",
    },
    medium: {
      tickLength: 145,
      note: "中等模式就是原来的速度。",
    },
    hard: {
      tickLength: 90,
      note: "困难模式速度较快，要更早转弯。",
    },
  });
  const characterNames = Object.freeze({ snake: "小蛇", cat: "小猫" });
  const targetNames = Object.freeze({ apple: "苹果", mouse: "老鼠" });
  let selectedCharacter = "snake";
  let selectedTarget = "apple";
  let selectedDifficulty = "easy";
  let timer = null;

  const keyDirections = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    W: "up",
    s: "down",
    S: "down",
    a: "left",
    A: "left",
    d: "right",
    D: "right",
  };

  function drawBoard() {
    context.fillStyle = "#dff0d8";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = "rgba(32, 53, 45, 0.08)";
    context.lineWidth = 1;

    for (let index = 1; index < game.gridSize; index += 1) {
      const position = index * cellSize;
      context.beginPath();
      context.moveTo(position, 0);
      context.lineTo(position, canvas.height);
      context.stroke();
      context.beginPath();
      context.moveTo(0, position);
      context.lineTo(canvas.width, position);
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

  function showGameOver() {
    window.clearInterval(timer);
    timer = null;
    messageTitle.textContent = "游戏结束";
    messageDetail.textContent = `${characterNames[selectedCharacter]}抓到了 ${game.score} 个${targetNames[selectedTarget]}，再试一次吧！`;
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
    timer = window.setInterval(tick, difficultySettings[selectedDifficulty].tickLength);
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

  startButton.addEventListener("click", beginGame);

  characterButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      selectedCharacter = event.currentTarget.dataset.character;
      updatePressedButton(characterButtons, event.currentTarget);
      render();
    });
  });

  targetButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      selectedTarget = event.currentTarget.dataset.target;
      updatePressedButton(targetButtons, event.currentTarget);
      render();
    });
  });

  difficultyButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      selectedDifficulty = event.currentTarget.dataset.difficulty;
      updatePressedButton(difficultyButtons, event.currentTarget);
      difficultyNote.textContent = difficultySettings[selectedDifficulty].note;

      if (game.status === "running") {
        scheduleTicks();
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    const direction = keyDirections[event.key];
    if (!direction || game.status !== "running") return;

    event.preventDefault();
    game.queueDirection(direction);
  });

  render();
})();
