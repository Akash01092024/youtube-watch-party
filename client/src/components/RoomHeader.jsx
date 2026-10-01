import { useState } from "react";
import { Play, Copy, LogOut } from "lucide-react";

export default function RoomHeader({
  code,
  participant,
  status,
  onLeave,
}) {
  const [message, setMessage] = useState("");

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setMessage("Copied!");
    } catch {
      setMessage(`Code: ${code}`);
    }
  }

  return (
    <header className="watch-header">
      <div className="header-left">
        <span className="brand">
          <span className="brand-icon">
            <Play size={24} fill="currentColor" />
          </span>
          Watch Party
        </span>

        <div className="invite-group">
          <span className="code-label">
            Room: <strong>{code}</strong>
          </span>

          <button
            className="copy-button"
            type="button"
            onClick={copyCode}
          >
            <Copy size={16} />
            {message || "Copy Code"}
          </button>
        </div>
      </div>

      <div className="header-right">
        <span className="connection-label">
          <span
            className={
              status === "Connected"
                ? "connection-dot online"
                : "connection-dot"
            }
          />
          {status}
        </span>

        <div className="current-user">
          <span className="avatar">
            {participant.username.charAt(0).toUpperCase()}
          </span>

          <span>
            {participant.username}
            <span className="user-role"> · {participant.role}</span>
          </span>
        </div>

        <button
          className="leave-button"
          type="button"
          onClick={onLeave}
        >
          <LogOut size={17} />
          Leave Room
        </button>
      </div>
    </header>
  );
}