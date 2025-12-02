// src/controllers/paymentController.ts
import { Request, Response } from "express";
import { createPaymentAndInit } from "./payment.service";
import sslCommerzService from "../SSlCommerz/sslCommerz.service";
import prisma from "../../../shared/prisma";

import config from "../../../config";


export const initiatePaymentController = async (req: Request, res: Response) => {
  try {
    const { amount, clientId, customer } = req.body;
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const result = await createPaymentAndInit({
      amount: Number(amount),
      clientId,
      customer,
    });

    return res.json({ gatewayUrl: result.gatewayUrl, tranId: result.tranId });
  } catch (err: any) {
    console.error("initiatePaymentController:", err);
    return res.status(500).json({ message: err.message ?? "Server error" });
  }
};

/**
 * IPN / validation endpoint invoked by SSLCommerz (server-to-server).
 * It tries to use val_id to verify via validation API, otherwise uses tran_id.
 */
export const ipnValidateHandler = async (req: Request, res: Response) => {
  try {
    // SSLCommerz may send POST or GET; check both
    const body = req.method === "POST" ? req.body : req.query;
    console.log("IPN Received:", body);

    const val_id = (body as any).val_id ?? (body as any).valId;
    const tran_id = (body as any).tran_id ?? (body as any).tranId ?? (body as any).transactionId;

    if (val_id) {
      const validation = await sslCommerzService.validatePaymentByValId(String(val_id));
      if (!validation.success) {
        console.error("Validation API returned error:", validation.error);
        return res.status(200).send("ok");
      }

      const data = validation.data;
      const tranIdFromData = data.tran_id ?? tran_id;
      const order = await prisma.payment.findUnique({ where: { tranId: String(tranIdFromData) } });

      if (!order) {
        // create record if not exists (optional)
        await prisma.payment.create({
          data: {
            tranId: String(tranIdFromData) ?? `unknown_${Date.now()}`,
            amount: Number(data.amount ?? 0),
            currency: data.currency ?? "BDT",
            status:
              ["VALID", "VALIDATED", "SUCCESS"].includes(String(data.status).toUpperCase()) ? "PAID" : "FAILED",
            rawResponse: data,
          },
        });
        return res.status(200).send("ok");
      }

      const expectedAmount = Number(order.amount);
      const returnedAmount = Number(data.amount ?? 0);
      const successStatuses = ["VALID", "VALIDATED", "SUCCESS"];

      if (successStatuses.includes(String(data.status).toUpperCase()) && expectedAmount === returnedAmount) {
        await prisma.payment.update({
          where: { id: order.id },
          data: { status: "PAID", rawResponse: data },
        });
      } else {
        await prisma.payment.update({
          where: { id: order.id },
          data: { status: "FAILED", rawResponse: data },
        });
      }

      return res.status(200).send("ok");
    }

    // fallback: handle redirects that provide tran_id & status query
    if (tran_id) {
      const order = await prisma.payment.findUnique({ where: { tranId: String(tran_id) } });
      const statusFromQuery = (body as any).status as string | undefined;
      if (order && statusFromQuery) {
        const mapped =
          statusFromQuery.toLowerCase() === "success"
            ? "PAID"
            : statusFromQuery.toLowerCase() === "cancel"
            ? "CANCELLED"
            : "FAILED";

        await prisma.payment.update({
          where: { id: order.id },
          data: { status: mapped as any, rawResponse: body },
        });
      }
      return res.status(200).send("ok");
    }

    // ack
    return res.status(200).send("ok");
  } catch (err: any) {
    console.error("IPN validation error:", err);
    return res.status(500).send("server error");
  }
};

export const successHandler = async (req: Request, res: Response) => {
  try {
    const data = req.method === "POST" ? req.body : req.query;
    const tranId = (data as any).tran_id ?? (data as any).transactionId ?? (req.query as any).transactionId;
    if (!tranId) return res.redirect(`${config.sslcommerz.success_frontend_url}?result=unknown`);

    const payment = await prisma.payment.findUnique({ where: { tranId: String(tranId) } });
    if (payment) {
      // mark pending -> pending (finalization should be done by IPN validation)
      await prisma.payment.update({ where: { id: payment.id }, data: { rawResponse: data } });
    }
    return res.redirect(`${config.sslcommerz.success_frontend_url}?transactionId=${tranId}`);
  } catch (err) {
    console.error(err);
    return res.redirect(`${config.sslcommerz.success_frontend_url}?result=error`);
  }
};

export const failHandler = async (req: Request, res: Response) => {
  try {
    const data = req.method === "POST" ? req.body : req.query;
    const tranId = (data as any).tran_id ?? (data as any).transactionId ?? (req.query as any).transactionId;
    if (tranId) {
      await prisma.payment.updateMany({
        where: { tranId: String(tranId) },
        data: { status: "CANCELLED", rawResponse: data },
      });
    }
    return res.redirect(`${config.sslcommerz.fail_frontend_url}?transactionId=${tranId ?? ""}`);
  } catch (err) {
    console.error(err);
    return res.redirect(`${config.sslcommerz.fail_frontend_url}?result=error`);
  }
};

export const cancelHandler = async (req: Request, res: Response) => {
  try {
    const data = req.method === "POST" ? req.body : req.query;
    const tranId = (data as any).tran_id ?? (data as any).transactionId ?? (req.query as any).transactionId;
    if (tranId) {
      await prisma.payment.updateMany({
        where: { tranId: String(tranId) },
        data: { status: "CANCELLED", rawResponse: data },
      });
    }
    return res.redirect(`${config.sslcommerz.cancel_frontend_url}?transactionId=${tranId ?? ""}`);
  } catch (err) {
    console.error(err);
    return res.redirect(`${config.sslcommerz.cancel_frontend_url}?result=error`);
  }
};
