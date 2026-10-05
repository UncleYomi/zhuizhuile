const test = require("node:test");
const assert = require("node:assert/strict");
const {
  AVATAR_KEY_PREFIX,
  BEST_SCORE_KEY,
  BestScoreStore,
  CustomAvatarStore,
} = require("../src/player-data.js");

function createStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    values,
  };
}

test("不同难度分别保存最高分，并且低分不会覆盖记录", () => {
  const storage = createStorage();
  const scores = new BestScoreStore({ storage });

  assert.deepEqual(scores.record("easy", 3), { best: 3, isNew: true });
  assert.deepEqual(scores.record("easy", 2), { best: 3, isNew: false });
  assert.deepEqual(scores.record("hard", 1), { best: 1, isNew: true });

  const restoredScores = new BestScoreStore({ storage });
  assert.equal(restoredScores.get("easy"), 3);
  assert.equal(restoredScores.get("medium"), 0);
  assert.equal(restoredScores.get("hard"), 1);
  assert.ok(storage.values.has(BEST_SCORE_KEY));
});

test("自定义主角和目标图片分别保存在当前设备", () => {
  const storage = createStorage();
  const avatars = new CustomAvatarStore({ storage });
  const characterImage = "data:image/webp;base64,character";
  const targetImage = "data:image/webp;base64,target";

  assert.equal(avatars.save("character", characterImage), true);
  assert.equal(avatars.save("target", targetImage), true);

  const restoredAvatars = new CustomAvatarStore({ storage });
  assert.equal(restoredAvatars.get("character"), characterImage);
  assert.equal(restoredAvatars.get("target"), targetImage);
  assert.ok(storage.values.has(`${AVATAR_KEY_PREFIX}character`));
  assert.ok(storage.values.has(`${AVATAR_KEY_PREFIX}target`));
});
