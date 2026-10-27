# SwingLab – Golf Swing Analyzer

A mobile-first site for reviewing golf swing, chip, and putt videos.

## Phase 1 (done)

- Upload a video, or record one with the phone camera
- Custom player: play/pause, scrubber, 1x / 0.5x / 0.25x / ⅛x, frame-by-frame
- Drawing layer: line, freehand, circle, box, angle (shows degrees), colors, undo, delete, clear
- Preset training aids you can drag: swing plane, alignment, head circle, spine angle (shows tilt)
- Mode selector: Full Swing / Chip / Putt

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
| `src/lib/presets.ts` | Training aid definitions |

Shape points are stored as fractions (0–1) of the video size, so drawings stay
on the golfer when the screen resizes or rotates.
