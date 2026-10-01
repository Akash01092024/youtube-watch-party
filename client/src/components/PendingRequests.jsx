export default function PendingRequests({
  requests,
  connected,
  sendControl,
}) {
  function describe(request) {
    switch (request.action) {
      case "seek":
        return `seek to ${request.payload.time}s`;
      case "change_video":
        return `change video to ${request.payload.videoId}`;
      case "play":
        return "play";
      case "pause":
        return "pause";
      default:
        return request.action;
    }
  }

  return (
    <section>
      <h2 className="panel-heading">
        Pending Requests <span>({requests.length})</span>
      </h2>

      <div className="request-list">
        {requests.length === 0 ? (
          <p className="hint">No pending requests.</p>
        ) : (
          requests.map(({ request, requester }) => {
            const name = requester?.username || "Participant";

            return (
              <div className="request-item" key={request.id}>
                <div className="request-description">
                  <span className="avatar avatar-purple">
                    {name.charAt(0).toUpperCase()}
                  </span>

                  <div>
                    <p>
                      <strong>{name}</strong> requested{" "}
                      <strong>{describe(request)}</strong>
                    </p>
                    <small className="hint">
                      Awaiting review
                    </small>
                  </div>
                </div>

                <div className="request-buttons">
                  <button
                    className="approve-button"
                    type="button"
                    disabled={!connected}
                    onClick={() =>
                      sendControl("review_request", {
                        requestId: request.id,
                        decision: "approve",
                      })
                    }
                  >
                    Approve
                  </button>

                  <button
                    className="reject-button"
                    type="button"
                    disabled={!connected}
                    onClick={() =>
                      sendControl("review_request", {
                        requestId: request.id,
                        decision: "reject",
                      })
                    }
                  >
                    Reject
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}