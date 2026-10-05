const test = require("node:test");
const assert = require("node:assert/strict");
const { ChaseGame, directionFromSwipe } = require("../src/game-engine.js");

test("滑动距离和主要方向会转换成游戏方向", () => {
  assert.equal(directionFromSwipe(60, 12), "right");
  assert.equal(directionFromSwipe(-50, 8), "left");
  assert.equal(directionFromSwipe(9, -48), "up");
  assert.equal(directionFromSwipe(-10, 55), "down");
  assert.equal(directionFromSwipe(12, 10), null);
});

test("开始游戏后角色向右移动一格", () => {
  const game = new ChaseGame({ gridSize: 10, random: () => 0 });
  game.start();
  const oldHead = { ...game.segments[0] };

  game.step();

  assert.deepEqual(game.segments[0], { x: oldHead.x + 1, y: oldHead.y });
  assert.equal(game.score, 0);
});

test("不能直接反向，也不能在同一步中连续转向", () => {
  const game = new ChaseGame({ gridSize: 10 });
  game.start();

  assert.equal(game.queueDirection("left"), false);
  assert.equal(game.queueDirection("up"), true);
  assert.equal(game.queueDirection("left"), false);
  game.step();
  assert.equal(game.queueDirection("left"), true);
});

test("抓到目标后增加长度和分数", () => {
  const game = new ChaseGame({ gridSize: 10, random: () => 0 });
  game.start();
  const originalLength = game.segments.length;
  game.target = { x: game.segments[0].x + 1, y: game.segments[0].y };

  const result = game.step();

  assert.equal(result.reachedTarget, true);
  assert.equal(game.segments.length, originalLength + 1);
  assert.equal(game.score, 1);
});

test("目标不会生成在角色轨迹上", () => {
  const game = new ChaseGame({ gridSize: 10, random: () => 0 });

  assert.equal(game.occupies(game.target, game.segments), false);
});

test("撞墙后游戏结束", () => {
  const game = new ChaseGame({ gridSize: 5 });
  game.start();
  game.segments = [
    { x: 4, y: 2 },
    { x: 3, y: 2 },
    { x: 2, y: 2 },
  ];

  const result = game.step();

  assert.equal(result.status, "over");
  assert.equal(game.status, "over");
});

test("撞到自己的身体后游戏结束", () => {
  const game = new ChaseGame({ gridSize: 8 });
  game.start();
  game.segments = [
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

test("迷宫墙会阻挡角色，并且目标不会出现在墙上", () => {
  const game = new ChaseGame({
    gridSize: 8,
    random: () => 0,
    level: { blockedCells: [{ x: 4, y: 4 }] },
  });
  game.start();
  game.segments = [
    { x: 3, y: 4 },
    { x: 2, y: 4 },
    { x: 1, y: 4 },
  ];

  assert.equal(game.isBlocked(game.target), false);
  assert.equal(game.step().status, "over");
});

test("到达迷宫出口的固定目标后通关", () => {
  const game = new ChaseGame({
    gridSize: 8,
    level: {
      startSegments: [
        { x: 2, y: 4 },
        { x: 1, y: 4 },
        { x: 0, y: 4 },
      ],
      startDirection: "right",
      target: { x: 3, y: 4 },
      winOnTarget: true,
    },
  });
  game.start();

  const result = game.step();

  assert.equal(result.reachedTarget, true);
  assert.equal(result.status, "won");
  assert.equal(game.score, 1);
  assert.equal(game.target, null);
});
