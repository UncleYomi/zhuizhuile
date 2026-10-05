(function attachPlayerData(globalObject) {
  const BEST_SCORE_KEY = "animal-chase-best-scores";
  const AVATAR_KEY_PREFIX = "animal-chase-custom-avatar-";
  const DIFFICULTIES = Object.freeze(["easy", "medium", "hard"]);

  function findStorage() {
    try {
      return globalObject.localStorage ?? null;
    } catch {
      return null;
    }
  }

  class BestScoreStore {
    constructor(options = {}) {
      this.storage = options.storage ?? findStorage();
      this.scores = this.readScores();
    }

    readScores() {
      const emptyScores = { easy: 0, medium: 0, hard: 0 };

      try {
        const stored = JSON.parse(this.storage?.getItem(BEST_SCORE_KEY) ?? "null");
        if (!stored || typeof stored !== "object") return emptyScores;

        DIFFICULTIES.forEach((difficulty) => {
          const score = Number(stored[difficulty]);
          if (Number.isInteger(score) && score >= 0) {
            emptyScores[difficulty] = score;
          }
        });
      } catch {
        return emptyScores;
      }

      return emptyScores;
    }

    get(difficulty) {
      return this.scores[difficulty] ?? 0;
    }

    record(difficulty, score) {
      const normalizedScore = Number(score);
      if (!DIFFICULTIES.includes(difficulty) || !Number.isInteger(normalizedScore)) {
        return { best: this.get(difficulty), isNew: false };
      }

      const safeScore = Math.max(0, normalizedScore);
      const previousBest = this.get(difficulty);
      if (safeScore <= previousBest) {
        return { best: previousBest, isNew: false };
      }

      this.scores[difficulty] = safeScore;
      try {
        this.storage?.setItem(BEST_SCORE_KEY, JSON.stringify(this.scores));
      } catch {
        // 无法使用本地存储时，本次打开页面期间仍保留记录。
      }

      return { best: safeScore, isNew: true };
    }
  }

  class CustomAvatarStore {
    constructor(options = {}) {
      this.storage = options.storage ?? findStorage();
      this.memory = { character: null, target: null };
    }

    key(type) {
      return `${AVATAR_KEY_PREFIX}${type}`;
    }

    get(type) {
      if (!Object.prototype.hasOwnProperty.call(this.memory, type)) return null;
      if (this.memory[type]) return this.memory[type];

      try {
        this.memory[type] = this.storage?.getItem(this.key(type)) || null;
      } catch {
        return null;
      }

      return this.memory[type];
    }

    save(type, dataUrl) {
      if (!Object.prototype.hasOwnProperty.call(this.memory, type) || typeof dataUrl !== "string") {
        return false;
      }
      if (!dataUrl.startsWith("data:image/")) return false;

      this.memory[type] = dataUrl;
      try {
        this.storage?.setItem(this.key(type), dataUrl);
        return true;
      } catch {
        return false;
      }
    }
  }

  function loadImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("无法读取这张图片"));
      image.src = source;
    });
  }

  async function prepareAvatar(file, options = {}) {
    const size = options.size ?? 256;
    const maxBytes = options.maxBytes ?? 8 * 1024 * 1024;

    if (!file || !file.type?.startsWith("image/")) {
      throw new Error("请选择一张图片");
    }
    if (file.size > maxBytes) {
      throw new Error("图片太大了，请选择小于 8MB 的图片");
    }

    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await loadImage(objectUrl);
      const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
      const sourceX = (image.naturalWidth - sourceSize) / 2;
      const sourceY = (image.naturalHeight - sourceSize) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("当前浏览器无法处理这张图片");
      context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
      return canvas.toDataURL("image/webp", 0.84);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  const exported = {
    AVATAR_KEY_PREFIX,
    BEST_SCORE_KEY,
    BestScoreStore,
    CustomAvatarStore,
    prepareAvatar,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exported;
  } else {
    globalObject.AnimalChasePlayerData = exported;
  }
})(typeof window !== "undefined" ? window : globalThis);
