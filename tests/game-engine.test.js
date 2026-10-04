const test = require("node:test");
const assert = require("node:assert/strict");
const { SnakeGame } = require("../src/game-engine.js");

test("开始游戏后蛇向右移动一格", () => {
  const game = new SnakeGame({ gridSize: 10, random: () => 0 });
  game.start();
  const oldHead = { ...game.snake[0] };

  game.step();

  assert.deepEqual(game.snake[0], { x: oldHead.x + 1, y: oldHead.y });
  assert.equal(game.score, 0);
});

test("不能直接反向，也不能在同一步中连续转向", () => {
  const game = new SnakeGame({ gridSize: 10 });
  game.start();

  assert.equal(game.queueDirection("left"), false);
  assert.equal(game.queueDirection("up"), true);
  assert.equal(game.queueDirection("left"), false);
  game.step();
  assert.equal(game.queueDirection("left"), true);
});

test("吃到食物后增加长度和分数", () => {
  const game = new SnakeGame({ gridSize: 10, random: () => 0 });
  game.start();
  const originalLength = game.snake.length;
  game.food = { x: game.snake[0].x + 1, y: game.snake[0].y };

  const result = game.step();

  assert.equal(result.ateFood, true);
  assert.equal(game.snake.length, originalLength + 1);
  assert.equal(game.score, 1);
});

test("食物不会生成在蛇身上", () => {
  const game = new SnakeGame({ gridSize: 10, random: () => 0 });

  assert.equal(game.occupies(game.food, game.snake), false);
});

test("撞墙后游戏结束", () => {
  const game = new SnakeGame({ gridSize: 5 });
  game.start();
  game.snake = [
    { x: 4, y: 2 },
    { x: 3, y: 2 },
    { x: 2, y: 2 },
  ];

  const result = game.step();

  assert.equal(result.status, "over");
  assert.equal(game.status, "over");
});

test("撞到自己的身体后游戏结束", () => {
  const game = new SnakeGame({ gridSize: 8 });
  game.start();
  game.snake = [
    { x: 3, y: 3 },
    { x: 3, y: 2 },
    { x: 2, y: 2 },
    { x: 2, y: 3 },
    { x: 2, y: 4 },
    { x: 3, y: 4 },
  ];
  game.direction = { x: -1, y: 0 };
  game.pendingDirection = { x: -1, y: 0 };

  const result = game.step();

  assert.equal(result.status, "over");
});
