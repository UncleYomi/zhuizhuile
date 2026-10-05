(function attachChaseEngine(globalObject) {
  const DIRECTIONS = Object.freeze({
    up: Object.freeze({ x: 0, y: -1 }),
    down: Object.freeze({ x: 0, y: 1 }),
    left: Object.freeze({ x: -1, y: 0 }),
    right: Object.freeze({ x: 1, y: 0 }),
  });

  function directionFromSwipe(deltaX, deltaY, minimumDistance = 24) {
    if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) {
      return null;
    }

    const horizontalDistance = Math.abs(deltaX);
    const verticalDistance = Math.abs(deltaY);

    if (Math.max(horizontalDistance, verticalDistance) < minimumDistance) {
      return null;
    }

    if (horizontalDistance >= verticalDistance) {
      return deltaX >= 0 ? "right" : "left";
    }

    return deltaY >= 0 ? "down" : "up";
  }

  class ChaseGame {
    constructor(options = {}) {
      this.gridSize = options.gridSize || 20;
      this.random = options.random || Math.random;
      this.reset();
    }

    reset() {
      const middle = Math.floor(this.gridSize / 2);
      this.segments = [
        { x: middle, y: middle },
        { x: middle - 1, y: middle },
        { x: middle - 2, y: middle },
      ];
      this.direction = DIRECTIONS.right;
      this.pendingDirection = DIRECTIONS.right;
      this.canTurn = true;
      this.score = 0;
      this.status = "idle";
      this.target = this.createTarget();
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
        return { status: this.status, reachedTarget: false };
      }

      this.direction = this.pendingDirection;
      const currentHead = this.segments[0];
      const nextHead = {
        x: currentHead.x + this.direction.x,
        y: currentHead.y + this.direction.y,
      };
      const reachedTarget = nextHead.x === this.target.x && nextHead.y === this.target.y;
      const bodyToCheck = reachedTarget ? this.segments : this.segments.slice(0, -1);

      if (this.isOutsideBoard(nextHead) || this.occupies(nextHead, bodyToCheck)) {
        this.status = "over";
        return { status: this.status, reachedTarget: false };
      }

      this.segments.unshift(nextHead);

      if (reachedTarget) {
        this.score += 1;
        this.target = this.createTarget();
      } else {
        this.segments.pop();
      }

      this.canTurn = true;
      return { status: this.status, reachedTarget };
    }

    createTarget() {
      const freeCells = [];

      for (let y = 0; y < this.gridSize; y += 1) {
        for (let x = 0; x < this.gridSize; x += 1) {
          const cell = { x, y };
          if (!this.occupies(cell, this.segments)) {
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

    occupies(cell, segments) {
      return segments.some((part) => part.x === cell.x && part.y === cell.y);
    }

    isOutsideBoard(cell) {
      return cell.x < 0 || cell.y < 0 || cell.x >= this.gridSize || cell.y >= this.gridSize;
    }
  }

  const exported = { ChaseGame, DIRECTIONS, directionFromSwipe };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exported;
  } else {
    globalObject.ChaseGameEngine = exported;
  }
})(typeof window !== "undefined" ? window : globalThis);
