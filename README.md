# YouTube Watch Party

A full-stack application that allows multiple users to watch YouTube videos together with synchronized playback and role-based permissions.

## Live Demo

https://watch-party-client-byla.onrender.com

## Repository

https://github.com/Akash01092024/youtube-watch-party

## Features

- Create a watch room and join using a unique room code.
- Display connected participants and their roles.
- Host can promote Participants to Moderators and demote them.
- Host can remove Participants and Moderators.
- Host and Moderators can play, pause, seek and change videos.
- Participants can request playback changes.
- Host and Moderators can approve or reject requests.
- Accept YouTube URLs or video IDs for video changes and requests.
- Validate sessions, room membership and permissions on the backend.
- Display current playback time, duration and a progress timeline.
- Local sound controls and fullscreen.
- Restore the room session after refreshing the page.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, JavaScript, CSS |
| Backend | Node.js, Express |
| Real-time communication | Socket.IO over WebSockets |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| Validation | Zod |
| Video integration | YouTube IFrame API |
| Frontend and backend hosting | Render |
| Database hosting | Neon |

## Project Structure

```text
youtube-watch-party/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── styles/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   └── package.json
├── server/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── websocket/
│   │   ├── validators/
│   │   ├── db/
│   │   ├── utils/
│   │   └── index.js
│   ├── drizzle/
│   ├── tests/
│   ├── drizzle.config.js
│   └── package.json
├── .gitignore
└── README.md
```

## Prerequisites

- Node.js 22.12 or a newer compatible version
- npm
- PostgreSQL, either local or hosted

## Local Setup

### 1. Clone the Repository

```powershell
git clone https://github.com/Akash01092024/youtube-watch-party.git
cd youtube-watch-party
```

### 2. Configure the Backend

```powershell
cd server
npm ci
```

Create `server/.env`:

```env
PORT=8000
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/DATABASE
```

Replace the database placeholders with your connection details.

For hosted PostgreSQL, use the connection URL supplied by the provider, including its required SSL parameters.

For a fresh database, apply migrations:

```powershell
npx drizzle-kit migrate
```

If your database is already configured, do not reapply initial migrations blindly. Databases previously created using `drizzle-kit push` may need migration-history reconciliation.

Start the backend:

```powershell
npm run dev
```

The local backend runs at:

```text
http://localhost:8000
```

Health endpoint:

```text
http://localhost:8000/health
```

### 3. Configure the Frontend

Open another terminal from the project root:

```powershell
cd client
npm ci
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:8000
```

Start the frontend:

```powershell
npm run dev
```

Open the URL printed by Vite. Its origin must match the backend's `CLIENT_URL`.

Do not commit actual `.env` files or database credentials.

## How to Use

1. Enter your name and create a room.
2. Share the room code with another user.
3. The other user enters their name and joins using the code.
4. The Host selects a YouTube video.
5. Host and Moderators control shared playback.
6. Participants submit requests for playback changes.
7. A Host or Moderator approves or rejects each request.
8. The Host can change participant roles or remove users.

Use separate browsers or an incognito window when testing multiple users on one computer.

## Role Permissions

| Action | Host | Moderator | Participant |
| --- | --- | --- | --- |
| Watch video | Yes | Yes | Yes |
| Play/Pause | Yes | Yes | No |
| Seek | Yes | Yes | No |
| Change video | Yes | Yes | No |
| Assign roles | Yes | No | No |
| Remove participants | Yes | No | No |
| Submit change requests | No | No | Yes |
| Approve/Reject requests | Yes | Yes | No |

Role assignment and removal target Participants or Moderators. These actions cannot demote or remove the Host.

## Architecture Overview

### Room Sessions

The frontend calls Express REST endpoints to create or join a room.

The backend returns room information, participant information and a random session token. The database stores the token's SHA-256 hash.

The client saves the session in `sessionStorage` and submits the token and room code when connecting through Socket.IO.

### Real-time Communication

After verifying the session, the backend joins the socket to the room's channel.

Playback actions are validated and authorized before updating the database. The server broadcasts the resulting state to clients in that room.

Clients apply the state through the YouTube IFrame API.

### Backend Authorization

The backend uses the identity from the verified socket session.

Database checks validate the user's current role and room membership. Authorization does not rely on role values supplied by the client or on hidden frontend controls.

### Change Requests

Participants submit requests instead of controlling playback directly.

The backend stores each request as pending. A Host or Moderator in the same room can approve or reject it.

Approval applies the requested playback change. Rejection leaves playback unchanged. Transaction locks and pending-status checks prevent duplicate request processing.

## Playback Synchronization

The server sends:

- `videoId`
- `isPlaying`
- `currentTime`
- `stateUpdatedAt`

When playback is running, clients estimate the target position using the saved position and elapsed time.

Every two seconds, the player checks for drift and seeks when the difference exceeds 1.5 seconds.

## API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/rooms` | Create a room and Host session |
| POST | `/api/rooms/:code/join` | Join a room as Participant |
| GET | `/health` | Check that the server is running |

The health endpoint does not verify database connectivity.

## Main Socket Events

| Event | Direction | Purpose |
| --- | --- | --- |
| `join_room` | Client → Server | Verify session and join room |
| `room_joined` | Server → Client | Confirm room membership |
| `participants_updated` | Server → Clients | Update connected participant list |
| `sync_state` | Server → Clients | Send shared playback state |
| `play` / `pause` | Client → Server | Change playback state |
| `seek` | Client → Server | Change playback position |
| `change_video` | Client → Server | Select another video |
| `assign_role` | Client → Server | Host changes a participant's role |
| `role_assigned` | Server → Clients | Notify clients of a role change |
| `remove_participant` | Client → Server | Host removes a participant |
| `participant_removed` | Server → Clients | Notify clients of removal |
| `request_change` | Client → Server | Submit a playback request |
| `request_submitted` | Server → Client | Confirm request submission |
| `change_requested` | Server → Reviewers | Notify reviewers of a new request |
| `pending_requests` | Server → Reviewer | Load pending requests |
| `review_request` | Client → Server | Approve or reject a request |
| `request_reviewed` | Server → Clients | Notify clients of a review |
| `app_error` | Server → Client | Report validation or permission errors |

## Checks and Testing

### Frontend

Run from the `client` directory:

```powershell
npm run lint
npm run build
```

The production build is generated in `client/dist`.

### Backend Baseline Tests

Run from the `server` directory:

```powershell
npm test
```

Without `WATCH_PARTY_TEST_URL`, the live integration test is skipped.

### Live Backend Integration Tests

Keep PostgreSQL and the backend running. In a second terminal, from the `server` directory:

```powershell
$env:WATCH_PARTY_TEST_URL = "http://localhost:8000"
npm test
Remove-Item Env:WATCH_PARTY_TEST_URL
```

Use a development database because this test creates two test rooms.

The tests cover unauthenticated actions, invalid payloads, role restrictions, cross-room access, request approval, duplicate review rejection, promotion/demotion and removed-session rejection.

### Validation Status

- Frontend lint passed.
- Frontend production build passed.
- Backend baseline tests: 11 passed.
- Local manual testing with two rooms was reported working.
- Production room creation and joining tested manually.
- Production YouTube link request and approval tested manually.
- Live database-backed automated test results remain unconfirmed.
- Full production playback and role regression testing remains to be completed.

## Deployment

| Component | Provider |
| --- | --- |
| Frontend static site | Render |
| Express and Socket.IO backend | Render |
| PostgreSQL database | Neon |

### Backend Settings

```text
Root Directory: server
Build Command: npm ci
Start Command: npm start
```

Environment variables:

```text
DATABASE_URL = Hosted PostgreSQL connection URL
CLIENT_URL = https://watch-party-client-byla.onrender.com
```

The backend uses the port provided by the hosting environment.

### Frontend Settings

```text
Root Directory: client
Build Command: npm ci && npm run build
Publish Directory: dist
```

Environment variable:

```env
VITE_API_URL=https://watch-party-server-xqpg.onrender.com
```

`VITE_API_URL` is embedded during the frontend build. Rebuild after changing it.

## Limitations and Trade-offs

- Joining uses a room code; an invite-link flow is not implemented.
- The timeline displays progress; seeking uses the seek input.
- Synchronization is approximate and depends partly on client clock alignment.
- Browser autoplay restrictions may require Enable sound or Enable playback.
- Some YouTube videos do not allow embedding.
- Sound and fullscreen are local controls, not shared room actions.
- Session tokens identify room participants; global login is not implemented.
- Removal invalidates the old session, but does not permanently ban a person from joining with a new identity.
- Socket presence and broadcasting use one backend process. Multiple instances would require shared coordination.
- Free hosting may introduce cold-start delays.
- Chat, reactions and host transfer are optional features and are not implemented.

## Author

Akash Kumar