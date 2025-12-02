import { Request, Response } from "express";
import httpStatus from "http-status";

import { catchAsync } from "../../../shared/catchAsync";
import { sendResponse } from "../../../shared/sendResponse";
import { eventsService } from "./event.service";




// participant controllers
const joinEvent = catchAsync(async (req: Request, res: Response) => {
  const { id: eventId } = req.params;
 const user = req.cookies;// must be authenticated client
  if (!user) throw new Error("Unauthorized");

  const participant = await eventsService.joinEvent(eventId, user);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Joined event successfully",
    data: participant,
  });
});

const leaveEvent = catchAsync(async (req: Request, res: Response) => {
  const { id: eventId } = req.params;
 const user = req.cookies;// must be authenticated client
  if (!user) throw new Error("Unauthorized");

  const result = await eventsService.leaveEvent(eventId, user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Left event successfully",
    data: result
  });
});

export const eventsController = {

  joinEvent,
  leaveEvent,
};