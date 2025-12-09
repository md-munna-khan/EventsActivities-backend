import { Request, Response } from "express";
import httpStatus from "http-status";
import pick from "../../../shared/pick";
import { catchAsync } from "../../../shared/catchAsync";
import { sendResponse } from "../../../shared/sendResponse";
import { hostService } from "./host.service";

// Create event (HOST)
const createEvent = catchAsync(async (req: Request, res: Response) => {
  const user = req.cookies;
  const result = await hostService.createEvent(req, user);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Event created successfully!",
    data: result,
  });
});
const getMyEvents = catchAsync(async (req: Request, res: Response) => {
  const requester = (req as any).user;
  if (!requester) throw new Error("Unauthorized");

  const result = await hostService.getMyEvents(requester.email);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Host's events fetched successfully",
    data: result,
  });
});

const getEvents = catchAsync(async (req: Request, res: Response) => {
  // parse filters & pagination from query
  const filter = pick(req.query, [
    "category",
    "status",
    "search",
    "fromDate",
    "toDate",
  ]);
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const result = await hostService.getEvents({
    filter,
    pagination: { page, limit },
  });

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
  const event = await hostService.getSingleEvent(id);
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
  const updated = await hostService.updateEvent(id, payload, req);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Event updated successfully",
    data: updated,
  });
});

const deleteEvent = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await hostService.deleteEvent(id, req);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Event deleted successfully",
    data: result,
  });
});

const getAllHosts = catchAsync(async (req: Request, res: Response) => {
  const result = await hostService.getAllHosts();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hosts fetched successfully",
    data: result,
  });
});

const updateEventStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const updatedEvent = await hostService.updateEventStatus(id, status);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Event status updated successfully",
    data: updatedEvent,
  });
});
export const hostController = {
  createEvent,
  getEvents,
  getSingleEvent,
  updateEvent,
  deleteEvent,
  getMyEvents,
  getAllHosts,
  updateEventStatus,
};
