(function attachSnakeEngine(globalObject) {
  const DIRECTIONS = Object.freeze({
    up: Object.freeze({ x: 0, y: -1 }),
    down: Object.freeze({ x: 0, y: 1 }),
    left: Object.freeze({ x: -1, y: 0 }),
    right: Object.freeze({ x: 1, y: 0 }),
  });

  class SnakeGame {
    constructor(options = {}) {
      this.gridSize = options.gridSize || 20;
      this.random = options.random || Math.random;
      this.reset();
    }

    reset() {
      const middle = Math.floor(this.gridSize / 2);
      this.snake = [
        { x: middle, y: middle },
        { x: middle - 1, y: middle },
        { x: middle - 2, y: middle },
      ];
      this.direction = DIRECTIONS.right;
      this.pendingDirection = DIRECTIONS.right;
      this.canTurn = true;
      this.score = 0;
      this.status = "idle";
      this.food = this.createFood();
    }

    start() {
      this.reset();
      this.status = "running";
    }

    queueDirection(directionName) {
      const requested = DIRECTIONS[directionName];

      if (!requested || this.status !== "running" || !this.canTurn) {
        return false;
      }

      const reversesCurrentDirection =
        requested.x + this.direction.x === 0 && requested.y + this.direction.y === 0;

      if (reversesCurrentDirection) {
        return false;
      }

      this.pendingDirection = requested;
      this.canTurn = false;
      return true;
    }

    step() {
      if (this.status !== "running") {
        return { status: this.status, ateFood: false };
      }

      this.direction = this.pendingDirection;
      const currentHead = this.snake[0];
      const nextHead = {
        x: currentHead.x + this.direction.x,
        y: currentHead.y + this.direction.y,
      };
      const ateFood = nextHead.x === this.food.x && nextHead.y === this.food.y;
      const bodyToCheck = ateFood ? this.snake : this.snake.slice(0, -1);

      if (this.isOutsideBoard(nextHead) || this.occupies(nextHead, bodyToCheck)) {
        this.status = "over";
        return { status: this.status, ateFood: false };
      }

      this.snake.unshift(nextHead);

      if (ateFood) {
        this.score += 1;
        this.food = this.createFood();
      } else {
        this.snake.pop();
      }

      this.canTurn = true;
      return { status: this.status, ateFood };
    }

    createFood() {
      const freeCells = [];

      for (let y = 0; y < this.gridSize; y += 1) {
        for (let x = 0; x < this.gridSize; x += 1) {
          const cell = { x, y };
          if (!this.occupies(cell, this.snake)) {
            freeCells.push(cell);
          }
        }
      }

      if (freeCells.length === 0) {
        this.status = "won";
        return null;
      }

      return freeCells[Math.floor(this.random() * freeCells.length)];
    }

    occupies(cell, snakeParts) {
      return snakeParts.some((part) => part.x === cell.x && part.y === cell.y);
    }

    isOutsideBoard(cell) {
      return cell.x < 0 || cell.y < 0 || cell.x >= this.gridSize || cell.y >= this.gridSize;
    }
  }

  const exported = { SnakeGame, DIRECTIONS };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exported;
  } else {
    globalObject.SnakeGameEngine = exported;
  }
})(typeof window !== "undefined" ? window : globalThis);
