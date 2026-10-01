import { useState } from "react";

export default function RequestForm({ socketRef, connected }) {
  const [action, setAction] = useState("seek");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!connected || !socketRef.current?.connected) {
      setError("Connect to the room first.");
      return;
    }

    let payload = {};

    if (action === "seek") {
      const time = Number(value);

      if (!value.trim() || !Number.isFinite(time) || time < 0) {
        setError("Enter a valid time in seconds.");
        return;
      }

      payload = { time };
    }

    if (action === "change_video") {
      const videoId = value.trim();

      if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
        setError("Enter an 11-character YouTube video ID.");
        return;
      }

      payload = { videoId };
    }

    socketRef.current.emit("request_change", {
      action,
      payload,
    });
  }

  return (
    <section>
      <h2>Request a change</h2>

      <form className="request-form" onSubmit={handleSubmit}>
        <label htmlFor="request-action">Action</label>

        <select
          id="request-action"
          value={action}
          disabled={!connected}
          onChange={(event) => {
            setAction(event.target.value);
            setValue("");
            setError("");
          }}
        >
          <option value="seek">Seek</option>
          <option value="play">Play</option>
          <option value="pause">Pause</option>
          <option value="change_video">Change Video</option>
        </select>

        {["seek", "change_video"].includes(action) && (
          <>
            <label htmlFor="request-value">
              {action === "seek" ? "Time in seconds" : "Video ID"}
            </label>

            <input
              id="request-value"
              type={action === "seek" ? "number" : "text"}
              min={action === "seek" ? "0" : undefined}
              step={action === "seek" ? "any" : undefined}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              required
              disabled={!connected}
            />
          </>
        )}

        {error && <p className="error">{error}</p>}

        <button
          className="primary"
          type="submit"
          disabled={!connected}
        >
          Send Request
        </button>
      </form>
    </section>
  );
}