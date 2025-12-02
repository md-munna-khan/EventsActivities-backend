import express, { NextFunction, Request, Response } from "express";
import { fileUploader } from "../../../helpers/fileUploader";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { eventsController } from "./event.controller";




const router = express.Router();


 


// Participant: join / leave
router.post("/:id/join", auth(UserRole.CLIENT), eventsController.joinEvent);
router.post("/:id/leave", auth(UserRole.CLIENT), eventsController.leaveEvent);



export const eventsRoutes = router;
