import { Request, Response } from "express";



import httpStatus from "http-status";
import { MetaService } from "./meta.service";
import { catchAsync } from "../../../shared/catchAsync";
import { sendResponse } from "../../../shared/sendResponse";



const fetchDashboardMetaData = catchAsync(async (req: Request, res: Response) => {
    // prefer authenticated user set by auth middleware, fallback to cookies
    const user = (req as any).user || req.cookies;
    const result = await MetaService.fetchDashboardMetaData(user);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Meta data retrieval successfully!",
        data: result
    })
});

export const MetaController = {
    fetchDashboardMetaData
}