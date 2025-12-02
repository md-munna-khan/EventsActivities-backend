import prisma from "../../../shared/prisma";


export const createPaymentAndInit = async (payload: {
  amount: number;
  clientId?: string; // optional: link to client
  customer?: { name?: string; email?: string; phone?: string; address?: string };
}) => {
  const tranId = `PAY_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  // create Payment record (PENDING)
  const payment = await prisma.payment.create({
    data: {
      tranId,
      clientId: payload.clientId,
      amount: Number(payload.amount),
      currency: "BDT",
      status: "PENDING",
      rawResponse: null,
    },
  });

  try {
    const result = await sslcommerze.initiatePayment({
      amount: payload.amount,
      transactionId: tranId,
      name: payload.customer?.name,
      email: payload.customer?.email,
      phoneNumber: payload.customer?.phone,
      address: payload.customer?.address,
    });

    // store raw response for audit
    await prisma.payment.update({
      where: { id: payment.id },
      data: { rawResponse: result.raw ?? null },
    });

    if (!result.success) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "CANCELLED" },
      });
      throw new AppError(httpStatus.BAD_REQUEST, result.error ?? "SSLCommerz init failed");
    }

    return { gatewayUrl: result.gatewayUrl, tranId };
  } catch (err) {
    console.error("createPaymentAndInit error:", err);
    // leave payment in PENDING so IPN or manual retry can verify later
    throw err;
  }
};

// create