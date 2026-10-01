# YouTube Watch Party

A full-stack application that allows multiple users to watch YouTube videos together with synchronized playback and role-based permissions.

## Live Demo

Deployment pending. The public URL will be added after deployment.

## Features

- Create a watch room and join using a unique room code.
- Display connected participants and their roles.
- Host can promote/demote Moderators and remove participants.
- Host and Moderators can play, pause, seek and change videos.
- Participants can request playback changes.
- Host and Moderators can approve or reject requests.
- Backend validates sessions, room membership and permissions.
- Display current time, duration and a progress timeline.
- Local sound controls and fullscreen.
- Reconnect using the saved session after refreshing.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, JavaScript, CSS |
| Backend | Node.js, Express |
| Real-time communication | Socket.IO over WebSockets |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| Validation | Zod |
| Video player | YouTube IFrame API |

## Project Structure

```text
youtube-watch-party/
├── client/
│   └── src/
│       ├── components/
│       ├── hooks/
│       ├── lib/
│       └── styles/
├── server/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── websocket/
│   │   ├── validators/
│   │   └── db/
│   ├── drizzle/
│   └── tests/
└── README.md
```

## Prerequisites

- Node.js 22.12 or later compatible version
- npm
- PostgreSQL

## Local Setup

### 1. Backend

From the project root:

```powershell
cd server
npm install
```

Create `server/.env`:

```env
PORT=8000
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/DATABASE
```

Replace USER, PASSWORD and DATABASE with your local database details.

For a fresh database, apply migrations:

```powershell
npx drizzle-kit migrate
```

Skip migration setup if your existing database is already configured.
Do not reapply initial migrations blindly to tables previously created
with `drizzle-kit push`.

Start the backend:

```powershell
npm run dev
```

### 2. Frontend

Open another terminal from the project root:

```powershell
cd client
npm install
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:8000
```

Start the frontend:

```powershell
npm run dev
```

Open the URL printed by Vite. Its origin must match the backend's
`CLIENT_URL` value.

## Role Permissions

| Action | Host | Moderator | Participant |
| --- | --- | --- | --- |
| Watch video | Yes | Yes | Yes |
| Control playback | Yes | Yes | No |
| Change video | Yes | Yes | No |
| Assign roles | Yes | No | No |
| Remove participants | Yes | No | No |
| Submit change requests | No | No | Yes |
| Approve/reject requests | Yes | Yes | No |

Role assignment and removal only target Participants or Moderators;
these actions cannot demote or remove the Host.

## Architecture Overview

1. React calls Express REST endpoints to create or join a room.
2. The backend returns room information and a session token.
3. The client connects through Socket.IO and submits the token and room code.
4. The backend verifies the session and joins the socket to the room.
5. Playback actions are validated against the user's current database role.
6. Accepted actions update PostgreSQL and broadcast `sync_state`.
7. Each client applies the state using the YouTube IFrame API.

Participants submit change requests instead of controlling playback
directly. Approval applies the requested change; rejection leaves
playback unchanged.

Session token hashes are stored in the database. Backend authorization
does not rely on roles supplied by the client.

## Playback Synchronization

The server sends the video ID, play/pause state, playback position
and update timestamp.

Clients estimate the current playback position and correct drift
every two seconds when the difference exceeds 1.5 seconds.

## Checks and Testing

Frontend:

```powershell
cd client
npm run lint
npm run build
```

Backend:

```powershell
cd server
npm test
```

For live backend tests, keep PostgreSQL and the backend running,
then run from a second server terminal:

```powershell
$env:WATCH_PARTY_TEST_URL = "http://localhost:8000"
npm test
Remove-Item Env:WATCH_PARTY_TEST_URL
```

Use a development database: the live test creates two test rooms.

### Current Validation Status

- Frontend lint passed.
- Frontend production build passed.
- Local manual testing with two rooms was reported working.
- Backend baseline tests: 11 passed.
- Live database-backed automated tests remain unconfirmed.
- Public deployment and production testing are pending.

## Deployment Configuration

- Backend: Node web service with WebSocket support.
- Frontend: Static hosting for `client/dist`.
- Database: Hosted PostgreSQL.
- Set backend `DATABASE_URL` and `CLIENT_URL`.
- Set frontend `VITE_API_URL` to the public HTTPS backend URL.
- Rebuild the frontend after changing `VITE_API_URL`.

## Limitations

- Joining uses a room code; an invite-link flow is not implemented.
- The progress timeline is display-only; seeking uses the seek input.
- Synchronization is approximate and depends partly on clock alignment.
- Browser autoplay restrictions may require user interaction.
- Some YouTube videos cannot be embedded.
- Session tokens provide room identity; global user login is not implemented.
- The current Socket.IO setup uses one backend instance.
- Chat, reactions and host transfer are not implemented.

## Author

Akash Kumar