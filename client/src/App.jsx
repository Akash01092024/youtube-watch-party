import { useState } from "react";
import {
  createRoom,
  joinRoom,
  getErrorMessage,
} from "./lib/api";
import Room from "./components/Room";
import "./App.css";

export default function App() {
  const [mode, setMode] = useState("create");
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");

  const [session, setSession] = useState(() => {
    try {
      const saved = sessionStorage.getItem("watch-party-session");
      return saved ? JSON.parse(saved) : null;
    } catch {
      sessionStorage.removeItem("watch-party-session");
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result =
        mode === "create"
          ? await createRoom(username)
          : await joinRoom(code, username);

      sessionStorage.setItem(
        "watch-party-session",
        JSON.stringify(result)
      );

      setSession(result);
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  if (session) {
    return <Room session={session} />;
  }

  return (
    <main className="page">
      <section className="card">
        <span className="badge">Watch Party</span>
        <h1>Watch together.</h1>

        <p className="subtitle">
          Create a room or join your friends.
        </p>

        <div className="tabs">
          <button
            type="button"
            className={mode === "create" ? "active" : ""}
            disabled={loading}
            onClick={() => {
              setMode("create");
              setError("");
            }}
          >
            Create Room
          </button>

          <button
            type="button"
            className={mode === "join" ? "active" : ""}
            disabled={loading}
            onClick={() => {
              setMode("join");
              setError("");
            }}
          >
            Join Room
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="username">Your name</label>

          <input
            id="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Enter your name"
            maxLength={50}
            required
            disabled={loading}
          />

          {mode === "join" && (
            <>
              <label htmlFor="code">Room code</label>

              <input
                id="code"
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.toUpperCase())
                }
                placeholder="Enter 8-character code"
                maxLength={8}
                minLength={8}
                pattern="[A-Za-z0-9]{8}"
                required
                disabled={loading}
              />
            </>
          )}

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <button
            className="primary"
            type="submit"
            disabled={loading || !username.trim()}
          >
            {loading
              ? "Please wait..."
              : mode === "create"
                ? "Create Room"
                : "Join Room"}
          </button>
        </form>
      </section>
    </main>
  );
}