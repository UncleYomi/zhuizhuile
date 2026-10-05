(function attachSoundController(globalObject) {
  const STORAGE_KEY = "animal-chase-sound-enabled";

  class SoundController {
    constructor(options = {}) {
      this.storage = options.storage ?? this.findStorage();
      this.AudioContextClass =
        options.AudioContextClass ?? globalObject.AudioContext ?? globalObject.webkitAudioContext;
      this.audioContext = null;
      this.enabled = this.readPreference();
    }

    findStorage() {
      try {
        return globalObject.localStorage ?? null;
      } catch {
        return null;
      }
    }

    readPreference() {
      try {
        return this.storage?.getItem(STORAGE_KEY) !== "false";
      } catch {
        return true;
      }
    }

    isEnabled() {
      return this.enabled;
    }

    setEnabled(enabled, { preview = false } = {}) {
      this.enabled = Boolean(enabled);

      try {
        this.storage?.setItem(STORAGE_KEY, String(this.enabled));
      } catch {
        // 浏览器禁止本地存储时，当前页面内仍然可以正常切换。
      }

      if (this.enabled && preview) {
        this.playPreview();
      }

      return this.enabled;
    }

    toggle() {
      return this.setEnabled(!this.enabled, { preview: !this.enabled });
    }

    ensureContext() {
      if (!this.enabled || !this.AudioContextClass) return null;

      try {
        if (!this.audioContext) {
          this.audioContext = new this.AudioContextClass();
        }

        if (this.audioContext.state === "suspended") {
          this.audioContext.resume?.();
        }
      } catch {
        return null;
      }

      return this.audioContext;
    }

    playSequence(notes, oscillatorType = "sine") {
      const audioContext = this.ensureContext();
      if (!audioContext) return false;

      let offset = 0;
      notes.forEach(({ frequency, duration = 0.1, gap = 0.025, volume = 0.055 }) => {
        const startAt = audioContext.currentTime + offset;
        const stopAt = startAt + duration;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = oscillatorType;
        oscillator.frequency.setValueAtTime(frequency, startAt);
        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(startAt);
        oscillator.stop(stopAt + 0.01);
        offset += duration + gap;
      });

      return true;
    }

    playPreview() {
      return this.playSequence([{ frequency: 659, duration: 0.09, volume: 0.045 }], "sine");
    }

    playStart() {
      return this.playSequence(
        [
          { frequency: 523, duration: 0.09 },
          { frequency: 659, duration: 0.12 },
        ],
        "triangle",
      );
    }

    playCatch() {
      return this.playSequence(
        [
          { frequency: 784, duration: 0.07, volume: 0.06 },
          { frequency: 1047, duration: 0.12, volume: 0.055 },
        ],
        "sine",
      );
    }

    playGameOver() {
      return this.playSequence(
        [
          { frequency: 440, duration: 0.12, volume: 0.045 },
          { frequency: 349, duration: 0.16, volume: 0.04 },
        ],
        "triangle",
      );
    }

    playResume() {
      return this.playSequence([{ frequency: 659, duration: 0.1, volume: 0.045 }], "sine");
    }
  }

  const exported = { SoundController, STORAGE_KEY };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exported;
  } else {
    globalObject.AnimalChaseSound = exported;
  }
})(typeof window !== "undefined" ? window : globalThis);
