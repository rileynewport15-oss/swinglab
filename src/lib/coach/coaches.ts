// The three coaches: what the picker shows and how each one sounds.
// (What they say lives in src/data/coachLines.ts.)

export type CoachId = "sunny" | "sarge" | "caddie";

export type VoiceStyle = {
  // Browser voices to try, best first (macOS, Chrome and Windows names).
  // The first one installed on this device wins.
  prefer: string[];
  rate: number; // 1 = normal speed
  pitch: number; // 1 = normal pitch
};

export type Coach = {
  id: CoachId;
  name: string;
  tagline: string;
  avatar: string; // emoji used as the avatar icon
  voice: VoiceStyle;
};

export const COACHES: Coach[] = [
  {
    id: "sunny",
    name: "Coach Sunny",
    tagline: "Warm, patient, finds the good first",
    avatar: "🌞",
    voice: {
      prefer: ["Samantha", "Google US English", "Microsoft Aria", "Microsoft Jenny", "Karen", "Tessa", "Moira"],
      rate: 1.0,
      pitch: 1.15,
    },
  },
  {
    id: "sarge",
    name: "Sarge",
    tagline: "Drill sergeant. Will roast your swing",
    avatar: "🪖",
    voice: {
      prefer: ["Fred", "Rocko", "Microsoft Guy", "Microsoft David", "Google UK English Male", "Alex", "Daniel"],
      rate: 1.25,
      pitch: 0.75,
    },
  },
  {
    id: "caddie",
    name: "The Caddie",
    tagline: "Seen it all. Simple feels, dry wit",
    avatar: "🧢",
    voice: {
      prefer: ["Ralph", "Reed", "Daniel", "Google UK English Male", "Microsoft Ryan", "Microsoft Mark", "Alex"],
      rate: 0.85,
      pitch: 0.9,
    },
  },
];

export const DEFAULT_COACH: CoachId = "sunny";

export function isCoachId(value: unknown): value is CoachId {
  return COACHES.some((c) => c.id === value);
}

export function coachById(id: CoachId): Coach {
  return COACHES.find((c) => c.id === id)!;
}

