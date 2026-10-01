import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";

// Local tests never access the database. Integration tests use an explicitly supplied URL.
process.env.DATABASE_URL ||= "postgresql://unused:unused@127.0.0.1:1/unused";
const { setupSocketIO } = await import("../src/websocket/index.js");
const { assignRole } = await import("../src/services/role.service.js");
const { playbackRequestSchema } = await import("../src/validators/playbackRequest.schema.js");

async function connect(baseUrl) {
  const url = new URL("/socket.io/?EIO=4&transport=websocket", baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(url);
  const messages = [];
  const waiters = [];
  ws.addEventListener("message", ({ data }) => {
    const text = String(data);
    if (text.startsWith("0")) ws.send("40");
    if (text === "2") ws.send("3");
    if (text.startsWith("42")) {
      const [event, payload] = JSON.parse(text.slice(2));
      const index = waiters.findIndex((entry) => entry.event === event);
      if (index >= 0) {
        const [entry] = waiters.splice(index, 1);
        clearTimeout(entry.timer);
        entry.resolve(payload);
      } else messages.push({ event, payload });
    }
  });
  const client = {
    emit(event, payload = {}) { ws.send(`42${JSON.stringify([event, payload])}`); },
    next(event) {
      const index = messages.findIndex((entry) => entry.event === event);
      if (index >= 0) return Promise.resolve(messages.splice(index, 1)[0].payload);
      return new Promise((resolve, reject) => {
        const entry = { event, resolve };
        entry.timer = setTimeout(() => {
          const index = waiters.indexOf(entry);
          if (index >= 0) waiters.splice(index, 1);
          reject(new Error(`Timed out waiting for ${event}`));
        }, 5000);
        waiters.push(entry);
      });
    },
    clear() { messages.length = 0; },
    close() { ws.close(); },
  };
  await client.next("connected");
  return client;
}

const forbidden = [
  ["play", {}], ["pause", {}], ["seek", { time: 30 }],
  ["change_video", { videoId: "dQw4w9WgXcQ" }],
  ["assign_role", { userId: "00000000-0000-4000-8000-000000000001", role: "moderator" }],
  ["remove_participant", { userId: "00000000-0000-4000-8000-000000000001" }],
  ["request_change", { action: "play", payload: {} }],
  ["review_request", { requestId: "00000000-0000-4000-8000-000000000001", decision: "approve" }],
];

test("unauthenticated sockets cannot perform any room action", async (t) => {
  const server = createServer();
  const io = setupSocketIO(server);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const client = await connect(`http://127.0.0.1:${server.address().port}`);
  try {
    for (const [event, payload] of forbidden) {
      await t.test(event, async () => {
        client.emit(event, payload);
        assert.equal((await client.next("app_error")).message, "Join a room first");
      });
    }
    client.emit("join_room", { code: "BAD", sessionToken: "forged" });
    assert.equal((await client.next("app_error")).message, "Invalid room code or session token");
  } finally {
    client.close();
    await new Promise((resolve) => io.close(resolve));
  }
});

test("request payloads reject invalid values and extra payload fields", () => {
  for (const payload of [
    { action: "seek", payload: { time: -1 } },
    { action: "seek", payload: { time: "30" } },
    { action: "seek", payload: { time: Infinity } },
    { action: "change_video", payload: { videoId: "bad" } },
    { action: "play", payload: { role: "host" } },
  ]) assert.equal(playbackRequestSchema.safeParse(payload).success, false);
});

test("role service cannot create a host role through assignRole", async () => {
  assert.equal(await assignRole("unused", "unused", "unused", "host"), null);
});

test("live backend role and room isolation", {
  skip: !process.env.WATCH_PARTY_TEST_URL,
}, async () => {
  const baseUrl = process.env.WATCH_PARTY_TEST_URL;
  const clients = [];
  async function api(path, body) {
    const response = await fetch(new URL(path, baseUrl), {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    assert.ok(response.ok, `HTTP ${response.status}`);
    return (await response.json()).data;
  }
  async function join(session) {
    const client = await connect(baseUrl);
    clients.push(client);
    client.emit("join_room", { code: session.room.code, sessionToken: session.sessionToken });
    await client.next("room_joined");
    await client.next("sync_state");
    client.clear();
    return client;
  }
  async function deny(client, event, payload) {
    client.emit(event, payload);
    assert.ok((await client.next("app_error")).message);
  }
  try {
    const hostSession = await api("/api/rooms", { username: "Permission test host" });
    const participantSession = await api(`/api/rooms/${hostSession.room.code}/join`, { username: "Permission test participant" });
    const otherSession = await api("/api/rooms", { username: "Permission test other room" });
    const host = await join(hostSession);
    const participant = await join(participantSession);
    const other = await join(otherSession);
    host.emit("change_video", { videoId: "dQw4w9WgXcQ" });
    assert.equal((await host.next("sync_state")).videoId, "dQw4w9WgXcQ");
    await participant.next("sync_state");
    for (const [event, payload] of forbidden.filter(([event]) => event !== "request_change")) {
      await deny(participant, event, payload);
    }
    await deny(other, "assign_role", { userId: participantSession.participant.id, role: "moderator" });
    await deny(other, "remove_participant", { userId: participantSession.participant.id });
    await deny(host, "assign_role", { userId: hostSession.participant.id, role: "participant" });
    await deny(host, "remove_participant", { userId: hostSession.participant.id });
    await deny(host, "assign_role", { userId: participantSession.participant.id, role: "host" });
    participant.emit("request_change", { action: "seek", payload: { time: 30 } });
    const entry = await participant.next("request_submitted");
    await host.next("change_requested");
    await deny(other, "review_request", { requestId: entry.request.id, decision: "approve" });
    host.emit("assign_role", { userId: participantSession.participant.id, role: "moderator" });
    assert.equal((await participant.next("role_assigned")).participant.role, "moderator");
    const backlog = await participant.next("pending_requests");
    assert.ok(backlog.requests.some((item) => item.request.id === entry.request.id));
    await deny(participant, "remove_participant", { userId: hostSession.participant.id });
    await deny(participant, "assign_role", { userId: hostSession.participant.id, role: "participant" });
    participant.emit("review_request", { requestId: entry.request.id, decision: "approve" });
    assert.equal((await participant.next("request_reviewed")).request.status, "approved");
    await participant.next("sync_state");
    await deny(participant, "review_request", { requestId: entry.request.id, decision: "approve" });
    participant.emit("play");
    assert.equal((await participant.next("sync_state")).isPlaying, true);
    host.emit("assign_role", { userId: participantSession.participant.id, role: "participant" });
    assert.equal((await participant.next("role_assigned")).participant.role, "participant");
    await deny(participant, "pause");
    host.emit("remove_participant", { userId: participantSession.participant.id });
    await host.next("participant_removed");
    const removed = await connect(baseUrl);
    clients.push(removed);
    removed.emit("join_room", { code: hostSession.room.code, sessionToken: participantSession.sessionToken });
    assert.equal((await removed.next("app_error")).message, "Invalid session token or room code");
  } finally { clients.forEach((client) => client.close()); }
});
