import { Request, Response } from "express";
import httpStatus from "http-status";
import pick from "../../../shared/pick";
import { catchAsync } from "../../../shared/catchAsync";
import { sendResponse } from "../../../shared/sendResponse";
import eventsService from "./host.service";


// optional; create if needed

// Create event (HOST)
const createEvent = catchAsync(async (req: Request,  res: Response) => {
const user = req.cookies
  const result = await eventsService.createEvent(req,user);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Event created successfully!",
    data: result,
  });
});

const getEvents = catchAsync(async (req: Request, res: Response) => {
  // parse filters & pagination from query
  const filter = pick(req.query, ["category", "status", "search", "fromDate", "toDate"]);
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const result = await eventsService.getEvents({ filter, pagination: { page, limit } });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Events fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getSingleEvent = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const event = await eventsService.getSingleEvent(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Event fetched successfully",
    data: event,
  });
});

const updateEvent = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const payload = req.body;
  const updated = await eventsService.updateEvent(id, payload, req);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Event updated successfully",
    data: updated,
  });
});

const deleteEvent = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result =await eventsService.deleteEvent(id, req);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Event deleted successfully",
    data: result,
  });
});

// participant controllers
const joinEvent = catchAsync(async (req: Request, res: Response) => {
  const { id: eventId } = req.params;
  const clientId = (req as any).user?.id; // must be authenticated client
  if (!clientId) throw new Error("Unauthorized");

  const participant = await eventsService.joinEvent(eventId, clientId);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Joined event successfully",
    data: participant,
  });
});

const leaveEvent = catchAsync(async (req: Request, res: Response) => {
  const { id: eventId } = req.params;
  const clientId = (req as any).user?.id;
  if (!clientId) throw new Error("Unauthorized");

  const result = await eventsService.leaveEvent(eventId, clientId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Left event successfully",
    data: result
  });
});

export const eventsController = {
  createEvent,
  getEvents,
  getSingleEvent,
  updateEvent,
  deleteEvent,
  joinEvent,
  leaveEvent,
};