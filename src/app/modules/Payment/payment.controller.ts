


// ...existing code...
import { Request, Response } from "express";
import { PaymentService } from "./payment.service";
import { catchAsync } from "../../../shared/catchAsync";
import config from "../../../config";

const _getPayload = (req: Request) => {
  // SSLCommerz sometimes sends as query params (redirect) or as POST body
  return Object.keys(req.body || {}).length ? req.body as Record<string,string> : req.query as Record<string,string>;
};

const successPayment = catchAsync(async (req: Request, res: Response) => {
    const payload = _getPayload(req);
    const result = await PaymentService.successPayment(payload);
    const tx = encodeURIComponent(payload.transactionId ?? payload.tranId ?? payload.tran_id ?? "");
    res.redirect(`${config.sslcommerz.success_frontend_url}?transactionId=${tx}&message=${encodeURIComponent(result.message ?? "success")}&status=PAID`);
});

const failPayment = catchAsync(async (req: Request, res: Response) => {
    const payload = _getPayload(req);
    const result = await PaymentService.failPayment(payload);
    const tx = encodeURIComponent(payload.transactionId ?? payload.tranId ?? payload.tran_id ?? "");
    res.redirect(`${config.sslcommerz.fail_frontend_url}?transactionId=${tx}&message=${encodeURIComponent(result.message ?? "failed")}&status=FAILED`);
});

const cancelPayment = catchAsync(async (req: Request, res: Response) => {
    const payload = _getPayload(req);
    const result = await PaymentService.cancelPayment(payload);
    const tx = encodeURIComponent(payload.transactionId ?? payload.tranId ?? payload.tran_id ?? "");
    res.redirect(`${config.sslcommerz.cancel_frontend_url}?transactionId=${tx}&message=${encodeURIComponent(result.message ?? "cancelled")}&status=CANCELLED`);
});

export const PaymentController = {
    successPayment,
    failPayment,
    cancelPayment,
};