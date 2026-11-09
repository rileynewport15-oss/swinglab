import type { VoiceStyle } from "./coaches";

// All the coach's speaking lives here, so the free browser voices could later
// be swapped for another voice service by writing another SpeechOutput.

export type SpeechOutput = {
  supported: boolean;
  /** Speak the text in this voice; onEnd runs when it finishes or is stopped. */
  speak(text: string, voice: VoiceStyle, onEnd: () => void): void;
  stop(): void;
};

// ---------- Speaking: the browser's built-in voices ----------

function pickVoice(style: VoiceStyle): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
  for (const name of style.prefer) {
    const match = voices.find((v) => v.name === name) ?? voices.find((v) => v.name.startsWith(`${name} `));
    if (match) return match;
  }
  return voices.find((v) => v.default) ?? voices[0] ?? null;
}

function browserSpeech(): SpeechOutput {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  let onEndCurrent: (() => void) | null = null;
  if (supported) speechSynthesis.getVoices(); // starts loading the voice list

  function finish() {
    const done = onEndCurrent;
    onEndCurrent = null;
    done?.();
  }

  return {
    supported,
    speak(text, style, onEnd) {
      if (!supported) return onEnd();
      this.stop();
      onEndCurrent = onEnd;
      // One utterance per sentence: long utterances get cut off in some
      // browsers, and stop() then takes effect between words, not paragraphs.
      const sentences = text.match(/[^.!?]+[.!?]*["')\]]*\s*/g) ?? [text];
      const voice = pickVoice(style);
      sentences.forEach((sentence, i) => {
        const u = new SpeechSynthesisUtterance(sentence.trim());
        if (voice) u.voice = voice;
        u.rate = style.rate;
        u.pitch = style.pitch;
        if (i === sentences.length - 1) {
          u.onend = finish;
          u.onerror = finish;
        }
        speechSynthesis.speak(u);
      });
    },
    stop() {
      if (!supported) return;
      speechSynthesis.cancel();
      finish();
    },
  };
}

let output: SpeechOutput | null = null;

/** The voice output used by the coach (created once, in the browser). */
export function speech(): SpeechOutput {
  output ??= browserSpeech();
  return output;
}
