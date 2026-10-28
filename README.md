# SwingLab – Golf Swing Analyzer

A site for reviewing full swing and putting videos.

## Phase 1 (done)

- Upload a video, or record one with the phone camera
- Custom player: play/pause, scrubber, 1x / 0.5x / 0.25x / ⅛x, frame-by-frame
- Drawing layer: line, freehand, circle, box, angle (shows degrees), colors, undo, delete, clear
- **Automatic aids from pose detection (MediaPipe Pose Landmarker, runs in the browser):**
  finds the address frame (last still moment before the swing), then places a head circle,
  spine angle line, and either a stance line + hip lines (Face On) or a swing plane line
  (Down the Line). Aids stay fixed at address while the video plays.
- Live pose skeleton toggle to compare the moving body against the fixed aids
- **Swing analysis:** detects Address, Top and Impact (ticks on the scrubber, plus chips
  below it with ‹ › one-frame nudges). Results are sorted biggest issue first, with a
  Minor/Major severity, a plain-language explanation and the usual ball flight.
  - Full Swing, Down the Line: tempo, posture at address, takeaway, over the top / stuck,
    lead arm at the top (only when clearly visible), early extension, hip depth, head dip/lift
  - Full Swing, Face On: tempo, hip sway, shoulder turn, reverse spine tilt, weight shift,
    lateral head movement
  - Putt: tempo (about 2:1), head and lower-body stillness, plus (Face On) wrist breakdown
    and follow-through vs backstroke
  - Checks are skipped when the pose confidence is low. All thresholds are in
    `src/config/analysisConfig.ts`.
- **Training aids card:** choose which aids show and when (whole swing, address only,
  address to top, top to impact), plus a Labels toggle. Choices are remembered.
- If the golfer can't be found clearly: filming tips, plus manual placement as a fallback
- Manual training aids (fallback) placed by clicking the video: swing plane (ball, then hands), alignment
  (two ends), head circle (center of head), spine angle (hips, then neck; shows tilt)
- Every drawing can be adjusted: drag its dots (48px grab areas), the line itself, or its label
- Mode selector: Full Swing / Putt
- Wide layout on computers (video left, tools right); stacked layout on phones

### Keyboard shortcuts (computer)

| Key | Action |
| --- | --- |
| Delete / Backspace | Delete the selected drawing |
| Esc | Cancel placing an aid, or deselect |
| Ctrl+Z / ⌘+Z | Undo |

Videos never leave the device. They play from a temporary local URL.

## Run it

```bash
npm install
npm run dev -- -H 0.0.0.0
```

Open http://localhost:3000 on the computer, or `http://<your-computer-ip>:3000` on a
phone on the same Wi-Fi (find the IP on a Mac with `ipconfig getifaddr en0`).

## Code layout

| Path | What it does |
| --- | --- |
| `src/app/page.tsx` | Main screen: header, mode selector, upload or analyzer |
| `src/components/VideoUpload.tsx` | Upload / record buttons |
| `src/components/VideoAnalyzer.tsx` | Video + drawing canvas + all panels |
| `src/components/PlayerControls.tsx` | Play, scrubber, speed, frame step |
| `src/components/DrawingCanvas.tsx` | Turns touches into shapes |
| `src/components/DrawingToolbar.tsx` | Tools, colors, undo / delete / clear |
| `src/components/TrainingAidsMenu.tsx` | Preset aid buttons |
| `src/hooks/useDrawing.ts` | Drawing state and undo history (a reducer) |
| `src/lib/shapes.ts` | Shape types, drawing, hit testing, angle math |
| `src/lib/presets.ts` | Manual training aid definitions |
| `src/lib/pose/analyze.ts` | Runs pose detection across the video |
| `src/lib/pose/address.ts` | Finds the address frame, checks detection quality |
| `src/lib/pose/autoAids.ts` | Builds aids from the address pose |
| `src/lib/pose/skeleton.ts` | Live skeleton drawing |
| `src/lib/analysis/keyMoments.ts` | Finds top of backswing, impact and takeaway |
| `src/lib/analysis/metrics.ts` | Computes metrics and writes the feedback |
| `src/config/analysisConfig.ts` | All thresholds for Strengths vs Areas to improve |
| `src/hooks/usePoseAnalysis.ts` | Runs the analysis when a video loads |
| `public/models/` | Pose model file (`public/mediapipe/` is copied from node_modules on dev/build) |

Shape points are stored as fractions (0–1) of the video size, so drawings stay
on the golfer when the screen resizes or rotates.
