import { useState } from "react";
import { Play, Pause, Info } from "lucide-react";

function extractVideoId(value) {
  const input = value.trim();

  if (/^[A-Za-z0-9_-]{11}$/.test(input)) {
    return input;
  }

  try {
    const url = new URL(input);
    const hostname = url.hostname.toLowerCase();
    const parts = url.pathname.split("/").filter(Boolean);

    let id = null;

    if (hostname === "youtu.be") {
      id = parts[0];
    } else if (
      ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(
        hostname
      )
    ) {
      if (url.pathname === "/watch") {
        id = url.searchParams.get("v");
      } else if (["shorts", "embed", "live"].includes(parts[0])) {
        id = parts[1];
      }
    }

    return /^[A-Za-z0-9_-]{11}$/.test(id || "") ? id : null;
  } catch {
    return null;
  }
}

export default function PlaybackControls({
  connected,
  playback,
  sendControl,
  role,
}) {
  const [videoInput, setVideoInput] = useState("");
  const [seekTime, setSeekTime] = useState("");
  const [error, setError] = useState("");

  const disabled = !connected || !playback?.videoId;

  function handleChangeVideo(event) {
    event.preventDefault();
    setError("");

    const videoId = extractVideoId(videoInput);

    if (!videoId) {
      setError("Enter a valid YouTube URL or 11-character video ID.");
      return;
    }

    sendControl("change_video", { videoId });
  }

  function handleSeek(event) {
    event.preventDefault();
    setError("");

    const time = Number(seekTime);

    if (!seekTime.trim() || !Number.isFinite(time) || time < 0) {
      setError("Enter a valid time in seconds.");
      return;
    }

    sendControl("seek", { time });
  }

  return (
    <section className="controls">
      <div className="controls-heading">
        <h2>
          {role === "host" ? "Host Controls" : "Moderator Controls"}
        </h2>

        <span className="control-help">
          <Info size={15} />
          Only Host and Moderators can control playback.
        </span>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="transport-row">
        <div className="play-buttons">
          <button
            className="primary"
            type="button"
            disabled={disabled}
            onClick={() => sendControl("play")}
          >
            <Play size={18} fill="currentColor" />
            Play
          </button>

          <button
            className="secondary-button"
            type="button"
            disabled={disabled}
            onClick={() => sendControl("pause")}
          >
            <Pause size={18} fill="currentColor" />
            Pause
          </button>
        </div>

        <form className="seek-form" onSubmit={handleSeek}>
          <label htmlFor="seekTime">Seek to (seconds)</label>

          <div className="seek-fields">
            <input
              id="seekTime"
              type="number"
              min="0"
              step="any"
              value={seekTime}
              onChange={(event) => setSeekTime(event.target.value)}
              placeholder="100"
              required
              disabled={disabled}
            />

            <button
              className="primary"
              type="submit"
              disabled={disabled}
            >
              Seek
            </button>
          </div>
        </form>
      </div>

      <form
        className="change-video-form"
        onSubmit={handleChangeVideo}
      >
        <label htmlFor="videoInput">YouTube URL or Video ID</label>

        <div className="video-fields">
          <input
            id="videoInput"
            value={videoInput}
            onChange={(event) => setVideoInput(event.target.value)}
            placeholder="Paste a YouTube link or video ID"
            required
            disabled={!connected}
          />

          <button
            className="primary"
            type="submit"
            disabled={!connected}
          >
            <Play size={20} fill="currentColor" />
            Change Video
          </button>
        </div>
      </form>
    </section>
  );
}