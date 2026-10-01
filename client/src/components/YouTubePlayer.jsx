import { useEffect, useRef, useState } from "react";
import { loadYouTubeAPI } from "../lib/youtube";

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = String(total % 60).padStart(2, "0");

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${remainingSeconds}`
    : `${minutes}:${remainingSeconds}`;
}

function getTargetTime(playback) {
  const elapsed = playback.isPlaying
    ? Math.max(
        0,
        (Date.now() - new Date(playback.stateUpdatedAt).getTime()) /
          1000
      )
    : 0;

  return Math.max(0, playback.currentTime + elapsed);
}

function syncPlayer(player, playback) {
  let target = getTargetTime(playback);
  const duration = player.getDuration() || 0;

  if (duration > 0) {
    target = Math.min(target, duration);
  }

  const currentTime = player.getCurrentTime() || 0;

  if (Math.abs(currentTime - target) > 1.5) {
    player.seekTo(target, true);
  }

  const state = player.getPlayerState();

  if (playback.isPlaying) {
    if (duration > 0 && target >= duration) {
      player.pauseVideo();
    } else if (state !== 1 && state !== 3) {
      player.playVideo();
    }
  } else if (state === 1 || state === 3) {
    player.pauseVideo();
  }
}

export default function YouTubePlayer({ playback }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const fullscreenRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const videoId = playback.videoId;

  // Create the YouTube player
  useEffect(() => {
    let cancelled = false;
    let player;

    const container = containerRef.current;

    loadYouTubeAPI()
      .then((YT) => {
        if (cancelled || !container) {
          return;
        }

        const mount = document.createElement("div");
        container.appendChild(mount);

        player = new YT.Player(mount, {
          width: "100%",
          height: "100%",
          videoId,
          playerVars: {
            controls: 0,
            disablekb: 1,
            playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (cancelled) {
                return;
              }

              event.target.mute();
              playerRef.current = event.target;
              setReady(true);
            },

            onAutoplayBlocked: () => {
              if (!cancelled) {
                setBlocked(true);
              }
            },

            onError: (event) => {
              if (!cancelled) {
                setError(
                  `YouTube error ${event.data}. Try another embeddable video.`
                );
              }
            },
          },
        });
      })
      .catch((error) => {
        if (!cancelled) {
          setError(error.message);
        }
      });

    return () => {
      cancelled = true;
      playerRef.current = null;
      player?.destroy();
      container?.replaceChildren();
    };
  }, [videoId]);

  // Apply server playback state and correct drift
  useEffect(() => {
    if (!ready || !playerRef.current) {
      return;
    }

    function applyState() {
      const player = playerRef.current;

      if (player) {
        syncPlayer(player, playback);
      }
    }

    applyState();

    const timer = window.setInterval(applyState, 2000);

    return () => {
      window.clearInterval(timer);
    };
  }, [ready, playback]);

  // Update the visible time and progress bar
  useEffect(() => {
    if (!ready) {
      return;
    }

    const timer = window.setInterval(() => {
      const player = playerRef.current;

      if (!player) {
        return;
      }

      setCurrentTime(player.getCurrentTime() || 0);
      setDuration(player.getDuration() || 0);
    }, 500);

    return () => {
      window.clearInterval(timer);
    };
  }, [ready, videoId]);

  // Track fullscreen, including exiting with Escape
  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(
        document.fullscreenElement === fullscreenRef.current
      );
    }

    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange
    );

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange
      );
    };
  }, []);

  function enablePlayback() {
    const player = playerRef.current;

    if (!player) {
      return;
    }

    player.unMute();
    setMuted(false);
    setBlocked(false);
    syncPlayer(player, playback);
  }

  function mutePlayback() {
    playerRef.current?.mute();
    setMuted(true);
  }

  async function toggleFullscreen() {
    try {
      const element = fullscreenRef.current;

      if (!element) {
        return;
      }

      if (document.fullscreenElement === element) {
        await document.exitFullscreen();
      } else if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else {
        setError("Full screen is not supported in this browser.");
      }
    } catch {
      setError("Could not open full screen. Try again.");
    }
  }

  return (
    <section className="youtube-player" ref={fullscreenRef}>
      <div className="video-frame" ref={containerRef} />

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="player-timeline">
        <progress
          className="video-progress"
          value={Math.min(currentTime, duration)}
          max={duration || 1}
          aria-label="Video progress"
        />

        <span className="video-time">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      <div className="tabs">
        <button
          type="button"
          disabled={!ready}
          onClick={muted ? enablePlayback : mutePlayback}
        >
          {muted ? "Enable sound" : "Mute"}
        </button>

        {blocked && (
          <button
            type="button"
            disabled={!ready}
            onClick={enablePlayback}
          >
            Enable playback
          </button>
        )}

        <button
          className="fullscreen-button"
          type="button"
          onClick={toggleFullscreen}
        >
          {isFullscreen ? "Exit Full Screen" : "Full Screen"}
        </button>
      </div>
    </section>
  );
}