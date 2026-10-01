import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import roomRoutes from "./routes/room.routes.js";
import { setupSocketIO } from "./websocket/index.js";
const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors({
  origin: process.env.CLIENT_URL,
}));

app.use(express.json());

app.use("/api/rooms", roomRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Watch Party server is running",
  });
});

const server = createServer(app);

setupSocketIO(server);

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
