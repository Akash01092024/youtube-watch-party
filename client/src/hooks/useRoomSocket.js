import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { API_URL } from "../lib/api";

export default function useRoomSocket(session) {
  const socketRef = useRef(null);

  const [status, setStatus] = useState("Connecting...");
  const [participants, setParticipants] = useState([]);
  const [participant, setParticipant] = useState(session.participant);
  const [playback, setPlayback] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const connected = status === "Connected";
  const canControl = ["host", "moderator"].includes(participant.role);

  useEffect(() => {
    const socket = io(API_URL, {
      transports: ["websocket"],
      autoConnect: false,
    });

    socketRef.current = socket;
    let removed = false;

    socket.on("connect", () => {
      setStatus("Joining room...");
      setError("");
      setPendingRequests([]);

      socket.emit("join_room", {
        code: session.room.code,
        sessionToken: session.sessionToken,
      });
    });

    socket.on("room_joined", (data) => {
      setParticipant(data.participant);
      setStatus("Connected");
    });

    socket.on("participants_updated", ({ participants }) => {
      setParticipants(participants);
    });

    socket.on("sync_state", (data) => {
      setPlayback(data);
    });

    socket.on("role_assigned", ({ participant }) => {
      if (participant.id === session.participant.id) {
        setParticipant(participant);

        if (participant.role === "participant") {
          setPendingRequests([]);
        }
      }
    });

    socket.on("request_submitted", () => {
      setError("");
      setNotice("Request sent. Waiting for Host/Moderator review.");
    });

    socket.on("pending_requests", ({ requests }) => {
      setPendingRequests(requests);
    });

    socket.on("change_requested", (entry) => {
      setPendingRequests((previous) => {
        if (
          previous.some(
            (item) => item.request.id === entry.request.id
          )
        ) {
          return previous;
        }

        return [...previous, entry];
      });
    });

    socket.on("request_reviewed", ({ request }) => {
      setPendingRequests((previous) =>
        previous.filter((item) => item.request.id !== request.id)
      );

      if (request.requesterId === session.participant.id) {
        setNotice(`Your request was ${request.status}.`);
      }
    });

    socket.on("participant_removed", ({ userId }) => {
      setPendingRequests((previous) =>
        previous.filter(
          (item) => item.request.requesterId !== userId
        )
      );

      if (userId === session.participant.id) {
        removed = true;
        sessionStorage.removeItem("watch-party-session");
        setPlayback(null);
        setPendingRequests([]);
        setError("The Host removed you from this room.");
        setStatus("Removed");
        socket.disconnect();
      }
    });

    socket.on("app_error", ({ message }) => {
      setNotice("");
      setError(message);
    });

    socket.on("connect_error", () => {
      setStatus("Connection failed");
      setError("Could not connect. Check that the backend is running.");
    });

    socket.on("disconnect", () => {
      setParticipants([]);
      setPendingRequests([]);
      setPlayback(null);

      if (!removed) {
        setStatus("Disconnected");
      }
    });

    socket.connect();

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [session]);

  function sendControl(eventName, payload = {}) {
    if (!connected || !socketRef.current?.connected) {
      setError("Join the room before using controls.");
      return;
    }

    if (!canControl) {
      setError("Host or Moderator permission required.");
      return;
    }

    setError("");
    socketRef.current.emit(eventName, payload);
  }

  return {
    socketRef,
    status,
    connected,
    canControl,
    participants,
    participant,
    playback,
    pendingRequests,
    error,
    notice,
    sendControl,
  };
}