// ─────────────────────────────────────────────────────────────────────────────
// Drills and training aids for every issue the swing analysis can flag.
//
// To finish this file, replace the placeholders:
//   - youtubeId: the ID from a YouTube link. For
//     https://www.youtube.com/watch?v=abc123XYZ00 the ID is "abc123XYZ00".
//     While it's empty, the site shows a "Find this drill on YouTube" search
//     link (using searchQuery) instead of an embedded video.
//   - url: the product page for a training aid. While it's empty, the site
//     links to a web search for the aid (using searchQuery).
// Run `npm run links` to list everything still empty.
// ─────────────────────────────────────────────────────────────────────────────

export type IssueKey =
  // Full swing
  | "tempo-rushed"
  | "tempo-slow"
  | "over-the-top"
  | "under-plane"
  | "takeaway-inside"
  | "takeaway-outside"
  | "lead-arm"
  | "posture"
  | "early-extension"
  | "head-height"
  | "head-lateral"
  | "hip-sway"
  | "weight-shift"
  | "reverse-tilt"
  | "shoulder-turn"
  // Putting
  | "putt-tempo"
  | "putt-stillness"
  | "wrist-breakdown"
  | "putt-length"
  | "shoulder-rock"
  | "putt-path"
  | "eye-line";

export type Drill = {
  name: string;
  how: string; // one or two sentences on how to do it
  reps: string; // e.g. "3 sets of 10 swings"
  minutes: number; // time it takes, used by the practice plan
  youtubeId: string; // "" = placeholder
  searchQuery: string; // YouTube search used until youtubeId is filled in
};

export type TrainingAid = {
  name: string;
  howItHelps: string; // one line
  url: string; // "" = placeholder
  searchQuery: string; // web search used until url is filled in
};

export type Improvement = {
  issue: string; // plain name of the issue, used in the practice plan
  drills: Drill[];
  aids: TrainingAid[];
};

// Shared training aids (several issues use the same one).
const alignmentSticks: TrainingAid = {
  name: "Alignment sticks",
  howItHelps: "Set up visual guides for your stance, swing path and body position.",
  url: "",
  searchQuery: "golf alignment sticks",
};
const impactBag: TrainingAid = {
  name: "Impact bag",
  howItHelps: "Lets you feel a solid, forward-leaning impact position without hitting balls.",
  url: "",
  searchQuery: "golf impact bag",
};
const tempoTrainer: TrainingAid = {
  name: "Flexible tempo trainer",
  howItHelps: "A whippy shaft that only loads properly when your rhythm is smooth.",
  url: "",
  searchQuery: "golf swing tempo trainer flexible shaft",
};
const metronome: TrainingAid = {
  name: "Golf tempo metronome",
  howItHelps: "Beeps a steady beat so you can match your swing or stroke to it.",
  url: "",
  searchQuery: "golf tempo metronome",
};
const swingPlaneTrainer: TrainingAid = {
  name: "Swing path gate trainer",
  howItHelps: "Gives you an obstacle to swing around so you learn an inside path.",
  url: "",
  searchQuery: "golf swing path trainer gate",
};
const armBand: TrainingAid = {
  name: "Arm connection band",
  howItHelps: "Keeps your arms connected to your body so they work with your turn.",
  url: "",
  searchQuery: "golf swing arm connection band",
};
const puttingMirror: TrainingAid = {
  name: "Putting mirror",
  howItHelps: "Shows where your eyes, shoulders and putter are at address and during the stroke.",
  url: "",
  searchQuery: "golf putting alignment mirror",
};
const puttingGate: TrainingAid = {
  name: "Putting gate",
  howItHelps: "Two pegs to roll the putter through, so you see when the face or path drifts.",
  url: "",
  searchQuery: "golf putting gate trainer",
};

// Shared drills (used for more than one issue).
const stickTakeaway: Drill = {
  name: "Stick-parallel takeaway",
  how: "Lay a stick along your toe line. Take the club back to hip height so the shaft is parallel to the stick, with the toe up.",
  reps: "20 slow takeaways",
  minutes: 10,
  youtubeId: "",
  searchQuery: "golf takeaway drill alignment stick parallel toe up",
};

export const IMPROVEMENTS: Record<IssueKey, Improvement> = {
  "tempo-rushed": {
    issue: "Rushed backswing tempo",
    drills: [
      {
        name: "Count 1-2-3, hit on 4",
        how: "Count \"one, two, three\" slowly to the top of your backswing, then swing through on \"four\".",
        reps: "3 sets of 10 swings",
        minutes: 15,
        youtubeId: "",
        searchQuery: "golf tempo drill count 3 to 1 backswing",
      },
      {
        name: "Pause at the top",
        how: "Swing to the top, hold for a full second, then swing through. It trains a smooth, unhurried backswing.",
        reps: "20 half-speed swings",
        minutes: 10,
        youtubeId: "",
        searchQuery: "pause at the top golf drill tempo",
      },
      {
        name: "Feet-together swings",
        how: "Hit easy shots with your feet touching. Rushing makes you lose balance, so it forces a smooth rhythm.",
        reps: "20 balls",
        minutes: 15,
        youtubeId: "",
        searchQuery: "feet together golf drill tempo balance",
      },
    ],
    aids: [tempoTrainer, metronome],
  },
  "tempo-slow": {
    issue: "Slow, guided downswing",
    drills: [
      {
        name: "Whoosh drill",
        how: "Hold the club upside down by the head and swing so the \"whoosh\" is loudest just past where the ball would be.",
        reps: "3 sets of 5 swings",
        minutes: 10,
        youtubeId: "",
        searchQuery: "golf whoosh drill speed release",
      },
      {
        name: "Step-through swings",
        how: "Swing and let your trail foot step toward the target after impact, like a baseball swing. It frees up speed.",
        reps: "15 swings",
        minutes: 10,
        youtubeId: "",
        searchQuery: "step through drill golf speed",
      },
    ],
    aids: [tempoTrainer],
  },
  "over-the-top": {
    issue: "Over the top downswing",
    drills: [
      {
        name: "Headcover gate",
        how: "Place a headcover just outside and behind the ball. Swing without hitting it, which forces the club to come from inside.",
        reps: "3 sets of 10 balls",
        minutes: 20,
        youtubeId: "",
        searchQuery: "headcover drill over the top golf",
      },
      {
        name: "Pump drill",
        how: "From the top, pump the hands halfway down twice, feeling them drop toward your trail pocket, then swing through.",
        reps: "15 swings",
        minutes: 10,
        youtubeId: "",
        searchQuery: "pump drill golf drop the club inside",
      },
      {
        name: "Split-hand swings",
        how: "Grip with your hands a few inches apart. It exaggerates the feel of the trail elbow staying close to your body.",
        reps: "20 half swings",
        minutes: 10,
        youtubeId: "",
        searchQuery: "split hand drill golf over the top",
      },
    ],
    aids: [swingPlaneTrainer, alignmentSticks],
  },
  "under-plane": {
    issue: "Getting stuck under the plane",
    drills: [
      {
        name: "Hands in front of your chest",
        how: "Make half swings keeping your hands in front of your chest as you turn, so the club doesn't fall behind you.",
        reps: "3 sets of 10 swings",
        minutes: 15,
        youtubeId: "",
        searchQuery: "golf drill getting stuck hands in front of chest",
      },
      {
        name: "Lead-arm-only swings",
        how: "Swing with just your lead arm to feel the club staying in front of you and the body turning through.",
        reps: "20 slow swings",
        minutes: 10,
        youtubeId: "",
        searchQuery: "lead arm only drill golf getting stuck",
      },
    ],
    aids: [armBand, alignmentSticks],
  },
  "takeaway-inside": {
    issue: "Takeaway too far inside",
    drills: [
      stickTakeaway,
      {
        name: "One-piece takeaway",
        how: "Rest the grip end against your belly button and turn back together, so the hands don't whip the club inside.",
        reps: "20 reps",
        minutes: 10,
        youtubeId: "",
        searchQuery: "one piece takeaway drill golf",
      },
    ],
    aids: [alignmentSticks],
  },
  "takeaway-outside": {
    issue: "Takeaway too far outside",
    drills: [
      stickTakeaway,
      {
        name: "Turn, don't lift",
        how: "Start the backswing by turning your chest instead of pushing the hands out, so the club stays on your body line.",
        reps: "20 slow swings",
        minutes: 10,
        youtubeId: "",
        searchQuery: "golf takeaway turn chest drill",
      },
    ],
    aids: [alignmentSticks],
  },
  "lead-arm": {
    issue: "Bent lead arm at the top",
    drills: [
      {
        name: "Wide takeaway",
        how: "Push the club straight back low and wide for the first two feet, keeping the lead arm long.",
        reps: "20 slow swings",
        minutes: 10,
        youtubeId: "",
        searchQuery: "golf width drill straight lead arm wide takeaway",
      },
      {
        name: "Three-quarter swings",
        how: "Hit shots stopping the backswing where your lead arm is still straight. Learn that length first, then build up.",
        reps: "20 balls",
        minutes: 15,
        youtubeId: "",
        searchQuery: "three quarter swing drill straight lead arm",
      },
    ],
    aids: [armBand],
  },
  posture: {
    issue: "Posture at address",
    drills: [
      {
        name: "Club-on-spine hinge",
        how: "Hold a club along your back touching your head, upper back and tailbone. Hinge from the hips until you're in posture, keeping all three touching.",
        reps: "10 setups",
        minutes: 5,
        youtubeId: "",
        searchQuery: "golf posture drill club on spine hip hinge",
      },
      {
        name: "Mirror setup check",
        how: "Set up side-on to a mirror and match a good posture: flat back, slight knee flex, arms hanging under your shoulders.",
        reps: "10 setups",
        minutes: 5,
        youtubeId: "",
        searchQuery: "golf setup posture mirror drill",
      },
    ],
    aids: [alignmentSticks],
  },
  "early-extension": {
    issue: "Early extension (standing up)",
    drills: [
      {
        name: "Wall / chair butt drill",
        how: "Set up with your backside just touching a wall or chair. Swing so it stays in contact through impact.",
        reps: "3 sets of 10 slow swings",
        minutes: 15,
        youtubeId: "",
        searchQuery: "early extension drill wall chair golf",
      },
      {
        name: "Stick behind the hips",
        how: "Push an alignment stick into the ground just behind your trail hip and feel your lead hip move back toward it on the downswing.",
        reps: "20 swings",
        minutes: 10,
        youtubeId: "",
        searchQuery: "early extension alignment stick drill",
      },
      {
        name: "Impact bag posture holds",
        how: "Swing into an impact bag and freeze, checking your chest is still over the ball and your hips haven't moved toward it.",
        reps: "15 reps",
        minutes: 10,
        youtubeId: "",
        searchQuery: "impact bag drill keep posture golf",
      },
    ],
    aids: [impactBag, alignmentSticks],
  },
  "head-height": {
    issue: "Head dipping or lifting",
    drills: [
      {
        name: "Shadow drill",
        how: "Swing with the sun behind you and watch your head's shadow. Keep it at the same height through impact.",
        reps: "20 swings",
        minutes: 10,
        youtubeId: "",
        searchQuery: "golf shadow drill keep head steady",
      },
      {
        name: "Brush the grass",
        how: "Make swings that brush the grass in the same spot every time. Dipping or lifting shows up straight away.",
        reps: "3 sets of 10",
        minutes: 10,
        youtubeId: "",
        searchQuery: "brush the grass drill golf low point",
      },
    ],
    aids: [alignmentSticks],
  },
  "head-lateral": {
    issue: "Head sliding sideways",
    drills: [
      {
        name: "Stick at the head",
        how: "Push an alignment stick into the ground so its top sits just in front of your head. Swing without touching it.",
        reps: "20 swings",
        minutes: 10,
        youtubeId: "",
        searchQuery: "golf drill head behind the ball alignment stick",
      },
      {
        name: "Stay behind the ball",
        how: "Hit easy shots feeling your head stay behind the ball until after impact.",
        reps: "20 balls",
        minutes: 15,
        youtubeId: "",
        searchQuery: "stay behind the ball golf drill",
      },
    ],
    aids: [alignmentSticks],
  },
  "hip-sway": {
    issue: "Hip sway",
    drills: [
      {
        name: "Stick outside the trail hip",
        how: "Place an alignment stick upright just outside your trail hip. Turn back without bumping it.",
        reps: "3 sets of 10 swings",
        minutes: 15,
        youtubeId: "",
        searchQuery: "hip sway drill alignment stick golf",
      },
      {
        name: "Trail knee flex hold",
        how: "Keep the flex in your trail knee as you turn back, feeling pressure in your trail heel instead of sliding.",
        reps: "20 slow backswings",
        minutes: 10,
        youtubeId: "",
        searchQuery: "golf drill stop swaying trail knee flex",
      },
    ],
    aids: [alignmentSticks],
  },
  "weight-shift": {
    issue: "Weight staying back",
    drills: [
      {
        name: "Step drill",
        how: "Start with your feet together, step toward the target with your lead foot as you start down, then swing through.",
        reps: "20 swings",
        minutes: 15,
        youtubeId: "",
        searchQuery: "step drill golf weight shift",
      },
      {
        name: "Hold the finish on your lead leg",
        how: "Hit shots and hold your finish for three seconds with your trail toe barely touching the ground.",
        reps: "20 balls",
        minutes: 15,
        youtubeId: "",
        searchQuery: "golf weight shift drill hold finish lead leg",
      },
    ],
    aids: [impactBag],
  },
  "reverse-tilt": {
    issue: "Reverse spine tilt",
    drills: [
      {
        name: "Trail shoulder lower at setup",
        how: "At address, tilt so your trail shoulder sits a little lower than your lead. Keep that tilt as you turn back.",
        reps: "10 setups, 20 slow backswings",
        minutes: 10,
        youtubeId: "",
        searchQuery: "reverse pivot fix golf drill spine tilt",
      },
      {
        name: "Club across the shoulders",
        how: "Hold a club across your chest and turn back, keeping your chest behind the ball rather than leaning toward the target.",
        reps: "20 turns",
        minutes: 5,
        youtubeId: "",
        searchQuery: "club across shoulders turn drill golf",
      },
    ],
    aids: [alignmentSticks],
  },
  "shoulder-turn": {
    issue: "Limited shoulder turn",
    drills: [
      {
        name: "Back to the target",
        how: "Turn back until your back faces the target, with the club across your chest. Let your lead heel lift slightly if you need to.",
        reps: "20 turns",
        minutes: 5,
        youtubeId: "",
        searchQuery: "golf shoulder turn drill back to target",
      },
      {
        name: "Turn-and-hold swings",
        how: "Swing to the top, check your shoulders turned fully, then swing through. Builds the habit of a complete turn.",
        reps: "15 swings",
        minutes: 10,
        youtubeId: "",
        searchQuery: "full shoulder turn golf drill",
      },
    ],
    aids: [armBand],
  },
  "putt-tempo": {
    issue: "Putting tempo",
    drills: [
      {
        name: "Metronome putting",
        how: "Set a metronome to about 75 beats per minute. Start back on one beat and strike the ball on the next.",
        reps: "3 sets of 10 putts",
        minutes: 15,
        youtubeId: "",
        searchQuery: "metronome putting drill tempo",
      },
      {
        name: "Say \"one-and-two\"",
        how: "Say \"one-and\" during the backstroke and \"two\" at impact to keep a steady 2-to-1 rhythm.",
        reps: "20 putts",
        minutes: 10,
        youtubeId: "",
        searchQuery: "putting tempo drill one and two",
      },
    ],
    aids: [metronome],
  },
  "putt-stillness": {
    issue: "Head or body movement in the stroke",
    drills: [
      {
        name: "Listen, don't look",
        how: "On short putts, keep your eyes on the spot where the ball was and listen for it to drop.",
        reps: "20 putts from 4 feet",
        minutes: 10,
        youtubeId: "",
        searchQuery: "putting drill listen dont look keep head still",
      },
      {
        name: "Coin under the ball",
        how: "Putt a ball sitting on a coin and keep looking at the coin until after the ball has rolled away.",
        reps: "20 putts",
        minutes: 10,
        youtubeId: "",
        searchQuery: "coin drill putting head still",
      },
    ],
    aids: [puttingMirror],
  },
  "wrist-breakdown": {
    issue: "Wrist breakdown in the stroke",
    drills: [
      {
        name: "Stick along the lead forearm",
        how: "Hold an alignment stick against the grip so it runs up your lead forearm. Putt without the stick moving off your arm.",
        reps: "20 putts",
        minutes: 10,
        youtubeId: "",
        searchQuery: "putting drill alignment stick lead forearm wrist",
      },
      {
        name: "Rock the shoulders",
        how: "Put a club across your chest under your armpits and rock your shoulders to feel a stroke with quiet wrists.",
        reps: "20 practice strokes, then 20 putts",
        minutes: 10,
        youtubeId: "",
        searchQuery: "putting shoulder rock drill quiet wrists",
      },
    ],
    aids: [puttingGate, puttingMirror],
  },
  "putt-length": {
    issue: "Short follow-through (decelerating)",
    drills: [
      {
        name: "Equal tees",
        how: "Place one tee behind the ball and one the same distance in front. Stroke back to the first and through to the second.",
        reps: "3 sets of 10 putts",
        minutes: 15,
        youtubeId: "",
        searchQuery: "putting drill tees equal backstroke follow through",
      },
      {
        name: "Short backstroke, accelerate",
        how: "Putt to a hole 10 feet away using a backstroke that feels too short, so you have to accelerate through the ball.",
        reps: "20 putts",
        minutes: 10,
        youtubeId: "",
        searchQuery: "putting accelerate through the ball drill",
      },
    ],
    aids: [puttingGate],
  },
  "shoulder-rock": {
    issue: "Arms and hands driving the stroke",
    drills: [
      {
        name: "Club across the chest",
        how: "Hold a club across your chest with both arms crossed over it. Rock your shoulders so the club tilts like a seesaw, then copy that feel with the putter.",
        reps: "20 practice rocks, then 20 putts",
        minutes: 10,
        youtubeId: "",
        searchQuery: "putting drill club across chest shoulder rock",
      },
      {
        name: "Armpit squeeze",
        how: "Tuck a headcover or glove under each armpit and putt without letting either drop, so the arms can't swing on their own.",
        reps: "20 putts from 6 feet",
        minutes: 10,
        youtubeId: "",
        searchQuery: "putting drill headcover under arms",
      },
    ],
    aids: [puttingMirror],
  },
  "putt-path": {
    issue: "Putting stroke path",
    drills: [
      {
        name: "Two-stick track",
        how: "Lay two alignment sticks on the green just wider than your putter head and stroke putts without touching either stick.",
        reps: "3 sets of 10 putts",
        minutes: 15,
        youtubeId: "",
        searchQuery: "putting drill two alignment sticks path",
      },
      {
        name: "Gate at the ball",
        how: "Push two tees into the green either side of the putter head at the ball, a few millimeters wider than the head, and putt through the gate.",
        reps: "20 putts",
        minutes: 10,
        youtubeId: "",
        searchQuery: "putting gate drill tees path",
      },
    ],
    aids: [alignmentSticks, puttingGate],
  },
  "eye-line": {
    issue: "Eyes not over the ball",
    drills: [
      {
        name: "Drop a ball from your eyes",
        how: "Set up, hold a ball against the bridge of your nose and let it drop. It should land on (or just inside) the ball you're putting. Adjust how far you stand from the ball until it does.",
        reps: "10 setups, then 20 putts",
        minutes: 10,
        youtubeId: "",
        searchQuery: "putting eyes over the ball drop test",
      },
      {
        name: "Mirror setups",
        how: "Set up over a putting mirror and move until your eyes are over the line on the mirror, then make putts keeping that setup.",
        reps: "10 setups, then 20 putts",
        minutes: 10,
        youtubeId: "",
        searchQuery: "putting mirror eye line setup drill",
      },
    ],
    aids: [puttingMirror],
  },
};
