import { Trash2 } from "lucide-react";

export default function ParticipantsList({
  participants,
  currentUserId,
  isHost,
  connected,
  sendControl,
}) {
  function removeUser(user) {
    if (window.confirm(`Remove ${user.username} from this room?`)) {
      sendControl("remove_participant", {
        userId: user.id,
      });
    }
  }

  return (
    <section>
      <h2 className="panel-heading">
        Participants <span>({participants.length})</span>
      </h2>

      <div className="participant-list">
        {participants.length === 0 && (
          <p className="hint">Waiting for participants...</p>
        )}

        {participants.map((user) => (
          <div className="member" key={user.id}>
            <span
              className={`avatar ${
                user.role === "host" ? "" : "avatar-purple"
              }`}
            >
              {user.username.charAt(0).toUpperCase()}
            </span>

            <div className="member-body">
              <div className="member-top">
                <strong className="member-name">
                  {user.username}
                  {user.id === currentUserId && (
                    <small> (You)</small>
                  )}
                </strong>

                {isHost && user.role !== "host" ? (
                  <div className="member-actions">
                    <select
                      aria-label={`Role for ${user.username}`}
                      value={user.role}
                      disabled={!connected}
                      onChange={(event) =>
                        sendControl("assign_role", {
                          userId: user.id,
                          role: event.target.value,
                        })
                      }
                    >
                      <option value="participant">
                        Participant
                      </option>
                      <option value="moderator">
                        Moderator
                      </option>
                    </select>

                    <button
                      className="delete-button"
                      type="button"
                      title={`Remove ${user.username}`}
                      aria-label={`Remove ${user.username}`}
                      disabled={!connected}
                      onClick={() => removeUser(user)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ) : (
                  <span className={`role-badge ${user.role}`}>
                    {user.role}
                  </span>
                )}
              </div>

              <span className="member-online">
                <span className="connection-dot online" />
                Online
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}