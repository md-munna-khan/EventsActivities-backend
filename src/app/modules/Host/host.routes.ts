import express, { NextFunction, Request, Response } from "express";
import { fileUploader } from "../../../helpers/fileUploader";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

import { eventsController } from "./host.controller";
import { eventValidation } from "./host.validation";


const router = express.Router();


 
router.post(
  "/create-event",
  auth(UserRole.HOST),
  fileUploader.upload.single("file"),
   (req: Request, res: Response, next: NextFunction) => {
        req.body = eventValidation.createEventValidation.parse(JSON.parse(req.body.data))
        return eventsController.createEvent(req, res, next)
    }
);
// Get list with filters & pagination (public)
router.get("/", eventsController.getEvents);

// Get single event
router.get("/:id", eventsController.getSingleEvent);

// Update event (host/admin) - allow optional file upload
router.patch(
  "/:id",
  auth(), // allow host or admin; inside service we check ownership
  fileUploader.upload.single("file"),
  (req, res, next) => {
    // if body is JSON string
    try {
      if (req.body.data) {
        const payload = typeof req.body.data === "string" ? JSON.parse(req.body.data) : req.body.data;
        // you could validate with updateEventValidation
        req.body = eventValidation.updateEventValidation.parse(payload);
      }
      return eventsController.updateEvent(req, res, next);
    } catch (err) {
      return next(err);
    }
  }
);

// Delete event
router.delete("/:id", auth(), eventsController.deleteEvent);

// Participant: join / leave
router.post("/:id/join", auth(UserRole.CLIENT), eventsController.joinEvent);
router.post("/:id/leave", auth(UserRole.CLIENT), eventsController.leaveEvent);



export const eventsRoutes = router;
