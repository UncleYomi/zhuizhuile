const test = require("node:test");
const assert = require("node:assert/strict");
const { SoundController, STORAGE_KEY } = require("../src/sound.js");

function createStorage(initialValue = null) {
  const values = new Map();
  if (initialValue !== null) values.set(STORAGE_KEY, initialValue);

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

test("音效默认开启，并会记住关闭状态", () => {
  const storage = createStorage();
  const sound = new SoundController({ storage, AudioContextClass: null });

  assert.equal(sound.isEnabled(), true);
  sound.setEnabled(false);
  assert.equal(sound.isEnabled(), false);

  const restoredSound = new SoundController({ storage, AudioContextClass: null });
  assert.equal(restoredSound.isEnabled(), false);
});

test("不支持音频接口时播放函数会安全跳过", () => {
  const sound = new SoundController({ storage: createStorage(), AudioContextClass: null });

  assert.equal(sound.playStart(), false);
  assert.equal(sound.playCatch(), false);
  assert.equal(sound.playGameOver(), false);
  assert.equal(sound.playResume(), false);
});
