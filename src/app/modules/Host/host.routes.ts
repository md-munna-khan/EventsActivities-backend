import express, { NextFunction, Request, Response } from "express";
import { fileUploader } from "../../../helpers/fileUploader";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";


import { eventValidation } from "./host.validation";
import { hostController } from "./host.controller";


const router = express.Router();


 
router.post(
  "/create-event",
  auth(UserRole.HOST),
  fileUploader.upload.single("file"),
   (req: Request, res: Response, next: NextFunction) => {
        req.body = eventValidation.createHostValidation.parse(JSON.parse(req.body.data))
        return hostController.createEvent(req, res, next)
    }
);
// Get list with filters & pagination (public)
router.get("/", hostController.getEvents);

// Get single event
router.get("/:id", hostController.getSingleEvent);

// Update event (host/admin) - allow optional file upload
router.patch(
  "/:id",
  auth(UserRole.HOST,UserRole.ADMIN), // allow host or admin; inside service we check ownership
  fileUploader.upload.single("file"),
    (req: Request, res: Response, next: NextFunction) => {
        req.body = eventValidation.updateHostValidation.parse(JSON.parse(req.body.data))
        return hostController.updateEvent(req, res, next)
    }
);

// Delete event
router.delete("/:id", auth(), hostController.deleteEvent);





export const hostsRoutes = router;
