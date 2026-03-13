// routes/ticket.routes.js

import { Router } from "express";
import { verifyTicket, useTicket } from "../controllers/ticket.controller.js";

const ticketRoutes = Router();

// Publics — pas d'auth
ticketRoutes.get("/verify/:code", verifyTicket);
ticketRoutes.post("/use/:code",   useTicket);

export default ticketRoutes;
