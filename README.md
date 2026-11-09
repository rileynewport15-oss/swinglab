# SwingLab: Golf Swing & Putting Analyzer

**Live site: https://swinglab-pink.vercel.app/**

Upload your swing. See what's working, what's not, and how to fix it.

SwingLab is a web app that analyzes a golf swing or putt from a single phone
video. It finds the golfer's body in every frame with pose detection, marks the
key moments of the swing, measures posture, tempo and movement, and turns the
numbers into plain-language feedback with drills to fix the biggest problem.
Everything runs in the browser: **videos are analyzed on the device and never
uploaded to a server.**

## Features

**Getting a video in**
- Upload a video, record one with the phone camera, or drag and drop a file onto
  the upload card (computers)
- "Try a sample swing" / "Try a sample putt" to demo the app without a video
- A "How to film" guide with camera position diagrams (Down the Line vs Face On)
  and filming tips
- A clear message if the browser can't play a video (e.g. an iPhone HEVC `.mov`
  in Firefox), suggesting Chrome or Safari

**Analysis**
- Two modes: **Full Swing** and **Putt**
- Pose detection (MediaPipe Pose Landmarker) on every frame, with smoothing and
  low-confidence frames ignored; a step-by-step progress display while it runs
- Camera angle (Face On or Down the Line) detected automatically, with a manual
  override
- Key moments found automatically and shown on the timeline: Address, Top and
  Impact for swings; Setup, End of backstroke, Impact and Finish for putts. Each
  can be nudged frame by frame
- Checks for each camera angle:
  - **Full Swing, Down the Line:** posture, takeaway, trail knee, lead arm at the
    top, swing plane (over the top / stuck), early extension, head height
  - **Full Swing, Face On:** hip sway, shoulder turn, reverse spine tilt,
    downswing sequence (hips before arms), weight shift, head position, lead arm
    release (chicken wing)
  - **Both angles:** tempo (backswing to downswing ratio), finish balance
  - **Putt:** tempo, stroke length, acceleration through impact, wrist breakdown,
    shoulder rock, head and lower body stillness (Face On); stroke path, eye line
    over the ball (Down the Line)

**Results**
- An overall score (0 to 100) with a one-sentence summary
- A short summary in plain golfer language, and a "Focus on this first" card
  with the one issue that will help most, why, and a feel to try
- Results grouped into Areas to improve (minor / major) and Strengths, each with
  the golfer's own numbers, a confidence level (high / medium / low), and a
  "See it at" button that jumps the video to that moment
- Related issues are connected (e.g. early extension causing the hands to get
  stuck), and a phase strip shows how each part of the swing went
- "How to fix it": drills with instructions and reps, plus training aid
  suggestions, for every issue
- A 7-day practice plan built from the results
- **Download report:** a one-page image with a key frame (aids drawn on it), the
  score, the top issues and recommended drills, to send to a coach

**Video tools**
- Custom player: play/pause, scrubber, 1x / 0.5x / 0.25x / ⅛x, frame by frame
- Automatic training aids drawn on the golfer (head circle, spine angle, swing
  plane, hip box, alignment; putting aids such as the eye line, hand path, stroke length and
  pendulum triangle). Choose which show and when (whole swing, address to top,
  etc.)
- Live pose skeleton overlay
- Drawing tools: line, freehand, circle, box, angle (shows degrees), colors,
  undo, delete. Every drawing can be dragged and adjusted
- Works on computers (three-column layout) and phones (video pinned at the top)

## Tech stack

| Part | Used |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org) (App Router) with React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Pose detection | [MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker) Pose Landmarker (WebAssembly, runs in the browser on the GPU, falling back to the CPU) |
| Drawing, overlays and the report image | HTML Canvas 2D |
| Hosting | Vercel (deploys automatically from the GitHub `main` branch) |

There is no backend, database or API key: the pose model and its WebAssembly
engine are served as static files from the site itself.

## Run it locally

Requirements: [Node.js](https://nodejs.org) 20.9 or newer (includes npm).

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

To try it on a phone on the same Wi-Fi, start the dev server on your network
address and open `http://<your-computer-ip>:3000` on the phone (on a Mac, find
the IP with `ipconfig getifaddr en0`):

```bash
npm run dev -- -H 0.0.0.0
```

Other commands:

| Command | What it does |
| --- | --- |
| `npm run build` then `npm start` | Production build and server |
| `npm run lint` | Check the code with ESLint |
| `npm run links` | List drill video and training aid links still to fill in |

`npm run dev` and `npm run build` first copy MediaPipe's WebAssembly files from
`node_modules` into `public/mediapipe/` (see `scripts/copy-mediapipe.mjs`).

## Settings you can tune

- `src/config/analysisConfig.ts`: every threshold that decides a strength vs a
  minor or major issue, the confidence rules, and the score weights
- `src/data/improvements.ts`: drills, training aids and the "feel" cue for each
  issue (drill video IDs and product links can be filled in here)

## Code layout

| Path | What it does |
| --- | --- |
| `src/app/page.tsx` | Main screen: header, mode selector, start page or analyzer |
| `src/components/Landing.tsx`, `VideoUpload.tsx`, `FilmingGuide.tsx` | Start page, upload / record / drag and drop, samples, filming guide |
| `src/components/VideoAnalyzer.tsx` | The review screen: video, overlays and all the panels |
| `src/components/ResultsPanel.tsx` | Score, summary, focus card, phases and results |
| `src/components/HowToFix.tsx`, `PracticePlanModal.tsx` | Drills, training aids and the practice plan |
| `src/components/PlayerControls.tsx`, `MomentMarkers.tsx` | Player controls and key moment markers |
| `src/components/DrawingCanvas.tsx`, `DrawingToolbar.tsx`, `AidsPanel.tsx` | Drawing tools and training aid settings |
| `src/hooks/usePoseAnalysis.ts` | Runs the analysis when a video loads |
| `src/lib/pose/` | Pose detection, smoothing, address frame, camera angle and camera motion |
| `src/lib/analysis/` | Key moments, full swing checks, the report (confidence, focus, score) and practice plan |
| `src/lib/putting/` | Putting moments, checks, aids and ball finding |
| `src/lib/reportImage.ts` | Builds the downloadable report image |
| `public/models/` | The pose model file |
| `public/samples/` | Sample swing and putt videos (H.264 MP4) |

## Limitations

- It measures body positions and timing from one video. It can't see the club
  face, club path, ball flight or contact.
- Accuracy depends on filming: a steady phone at hip height with the whole body
  in frame works best. Results the video doesn't show clearly are marked low
  confidence or hidden.
- Thresholds were calibrated on a small set of test clips; readings close to a
  limit can vary slightly between runs.
