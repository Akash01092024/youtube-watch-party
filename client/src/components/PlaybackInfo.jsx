export default function PlaybackInfo({ playback }) {
  return (
    <section>
      <h2>Playback state</h2>

      {playback ? (
        <>
          <p>Video: {playback.videoId || "No video selected"}</p>
          <p>Status: {playback.isPlaying ? "Playing" : "Paused"}</p>
          <p>
            Position at last sync:{" "}
            {playback.currentTime.toFixed(1)} seconds
          </p>
        </>
      ) : (
        <p className="hint">Waiting for playback state...</p>
      )}
    </section>
  );
}