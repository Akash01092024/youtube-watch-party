import useRoomSocket from "../hooks/useRoomSocket";
import RoomHeader from "./RoomHeader";
import ParticipantsList from "./ParticipantsList";
import YouTubePlayer from "./YouTubePlayer";
import PendingRequests from "./PendingRequests";
import PlaybackControls from "./PlaybackControls";
import RequestForm from "./RequestForm";

export default function Room({ session }) {
  const room = useRoomSocket(session);

  function leaveRoom() {
    room.socketRef.current?.disconnect();
    sessionStorage.removeItem("watch-party-session");
    window.location.reload();
  }

  return (
    <main className="watch-page">
      <RoomHeader
        code={session.room.code}
        participant={room.participant}
        status={room.status}
        onLeave={leaveRoom}
      />

      <div className="watch-content">
        {room.error && (
          <p className="room-message error" role="alert">
            {room.error}
          </p>
        )}

        {room.notice && (
          <p className="room-message hint" role="status">
            {room.notice}
          </p>
        )}

        <div className="watch-grid">
          <div className="watch-main">
            <section className="watch-panel watch-player">
              {room.playback?.videoId ? (
                <YouTubePlayer
                  key={room.playback.videoId}
                  playback={room.playback}
                />
              ) : (
                <div className="empty-player">
                  <h2>Ready to watch together?</h2>
                  <p className="hint">
                    {room.connected
                      ? "Select a YouTube video to begin."
                      : "Connecting to your room..."}
                  </p>
                </div>
              )}
            </section>

            <section className="watch-panel controls-panel">
              {room.canControl ? (
                <PlaybackControls
                  connected={room.connected}
                  playback={room.playback}
                  sendControl={room.sendControl}
                  role={room.participant.role}
                />
              ) : (
                <RequestForm
                  socketRef={room.socketRef}
                  connected={room.connected}
                />
              )}
            </section>
          </div>

          <aside className="watch-sidebar">
            <section className="watch-panel">
              <ParticipantsList
                participants={room.participants}
                currentUserId={room.participant.id}
                isHost={room.participant.role === "host"}
                connected={room.connected}
                sendControl={room.sendControl}
              />
            </section>

            {room.canControl && (
              <section className="watch-panel">
                <PendingRequests
                  requests={room.pendingRequests}
                  connected={room.connected}
                  sendControl={room.sendControl}
                />
              </section>
            )}
          </aside>
        </div>

        <footer className="watch-footer">
          Everyone watches together, in sync.
        </footer>
      </div>
    </main>
  );
}