// import express from "express";
// import { PaymentController } from "./payment.controller";



// const router = express.Router();



// router.post("/success", PaymentController.successPayment);
// router.get("/success", PaymentController.successPayment);
// router.post("/fail", PaymentController.failPayment);
// router.get("/fail", PaymentController.failPayment);
// router.post("/cancel", PaymentController.cancelPayment);
// router.get("/cancel", PaymentController.cancelPayment);

// // router.post("/success", PaymentController.successPayment);
// // router.post("/fail", PaymentController.failPayment);
// // router.post("/cancel", PaymentController.cancelPayment);


// export const PaymentRoutes = router;




// src/app/modules/Payment/payment.routes.ts (or where your router is)
import express from "express";
import { PaymentController } from "./payment.controller";

const router = express.Router();

// prefer POST for callbacks; keep GET only for manual testing if you want
router.post("/success", PaymentController.successPayment);
router.get("/success", PaymentController.successPayment);

router.post("/fail", PaymentController.failPayment);
router.get("/fail", PaymentController.failPayment);

router.post("/cancel", PaymentController.cancelPayment);
router.get("/cancel", PaymentController.cancelPayment);

router.get("/list-payments", PaymentController.listPayments);

export const PaymentRoutes = router;

