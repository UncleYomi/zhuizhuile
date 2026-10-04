(function startSnakeGame() {
  const { SnakeGame } = window.SnakeGameEngine;
  const canvas = document.querySelector("#game-canvas");
  const context = canvas.getContext("2d");
  const scoreElement = document.querySelector("#score");
  const startButton = document.querySelector("#start-button");
  const message = document.querySelector("#game-message");
  const messageTitle = document.querySelector("#message-title");
  const messageDetail = document.querySelector("#message-detail");
  const game = new SnakeGame({ gridSize: 20 });
  const cellSize = canvas.width / game.gridSize;
  const tickLength = 145;
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

  function drawFood() {
    if (!game.food) return;

    const centerX = (game.food.x + 0.5) * cellSize;
    const centerY = (game.food.y + 0.55) * cellSize;
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

  function drawSnake() {
    game.snake.forEach((part, index) => {
      drawRoundedCell(part.x, part.y, index === 0 ? "#225c42" : "#3b8b61");
    });

    const head = game.snake[0];
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

  function render() {
    drawBoard();
    drawFood();
    drawSnake();
    scoreElement.textContent = String(game.score);
  }

  function showGameOver() {
    window.clearInterval(timer);
    timer = null;
    messageTitle.textContent = "游戏结束";
    messageDetail.textContent = `这次得了 ${game.score} 分，再试一次吧！`;
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

  function beginGame() {
    window.clearInterval(timer);
    game.start();
    message.classList.add("hidden");
    message.setAttribute("aria-hidden", "true");
    startButton.textContent = "重新开始";
    render();
    timer = window.setInterval(tick, tickLength);
  }

  startButton.addEventListener("click", beginGame);

  document.addEventListener("keydown", (event) => {
    const direction = keyDirections[event.key];
    if (!direction) return;

    event.preventDefault();
    game.queueDirection(direction);
  });

  render();
})();
