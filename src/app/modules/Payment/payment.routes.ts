// src/routes/paymentRoutes.ts
import express from "express";
import {

  successHandler,
  failHandler,
  cancelHandler,
  initiatePaymentController,
  ipnValidateHandler, 
} from "../Payment/payment.controller";

const router = express.Router();

router.post("/initiate", initiatePaymentController); // call this to create payment & get gateway URL
router.post("/validate-payment", ipnValidateHandler); // SSL IPN -> POSTs here
router.post("/success", successHandler);
router.post("/fail", failHandler);
router.post("/cancel", cancelHandler);

// also accept GET forms (gateway might GET)
router.get("/success", successHandler);
router.get("/fail", failHandler);
router.get("/cancel", cancelHandler);

export const  paymentsRouter = router;
