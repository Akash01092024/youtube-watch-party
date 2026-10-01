import { Router } from "express";
import {
  createRoomController,
  joinRoomController,
} from "../controllers/room.controllers.js";

const router = Router();

router.post("/", createRoomController);
router.post("/:code/join", joinRoomController);

export default router;