export function broadcastParticipants(io, roomId) {
  const roomChannel = `room:${roomId}`;
  const uniqueParticipants = new Map();

  for (const socket of io.of("/").sockets.values()) {
    const participant = socket.data.participant;

    if (socket.rooms.has(roomChannel) && participant) {
      uniqueParticipants.set(participant.id, {
        id: participant.id,
        username: participant.username,
        role: participant.role,
      });
    }
  }

  io.to(roomChannel).emit("participants_updated", {
    participants: [...uniqueParticipants.values()],
  });
}