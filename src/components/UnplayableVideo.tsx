"use client";

// Shown instead of the analyzer when the browser can't play the video. The
// usual cause: iPhones record in HEVC (.mov), which Chrome, Safari and Edge
// play but some browsers (like Firefox on Windows) can't.
export default function UnplayableVideo({ onChangeVideo }: { onChangeVideo: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 rounded-3xl bg-white p-6 text-center shadow-sm" role="alert">
      <div aria-hidden className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl">
        🎞️
      </div>
      <div>
        <h2 className="text-xl font-bold text-fairway-900">This browser can&apos;t play that video</h2>
        <p className="mt-2 text-sm text-fairway-800">
          iPhone videos (.mov) are usually saved in a format called HEVC, which some browsers, like Firefox, can&apos;t open.
        </p>
        <p className="mt-2 text-sm text-fairway-800">
          Open SwingLab in <span className="font-semibold">Chrome</span> or <span className="font-semibold">Safari</span> and try again, or
          use a video saved as MP4. On iPhone you can set Settings → Camera → Formats to &ldquo;Most Compatible&rdquo;.
        </p>
      </div>
      <button
        onClick={onChangeVideo}
        className="min-h-12 w-full rounded-2xl bg-fairway-600 text-base font-semibold text-white shadow hover:bg-fairway-700"
      >
        Choose a different video
      </button>
      <p className="text-xs text-fairway-600">You can also try the sample swing or putt on the start page.</p>
    </div>
  );
}
