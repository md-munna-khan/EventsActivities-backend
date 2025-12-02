// src/services/sslcommerze.ts
import axios from "axios";
import qs from "qs";
import crypto from "crypto";
import config from "../../../config";
import { error } from "console";



export type IInitPayload = {
  amount: number;
  tranId?: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  successUrl?: string;
  failUrl?: string;
  cancelUrl?: string;
  ipnUrl?: string;
};

const generateTranId = (): string => {
  return `ORD_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
};

export const initiatePayment = async (payload: IInitPayload) => {
  const tranId = payload.tranId ?? generateTranId();

  const postData: Record<string, any> = {
    store_id: config.sslcommerz.store_id,
    store_passwd: config.sslcommerz.store_passwd,
    total_amount: payload.amount,
    currency: "BDT",
    tran_id: tranId,
    success_url: payload.successUrl ?? config.sslcommerz.success_backend_url,
    fail_url: payload.failUrl ?? config.sslcommerz.fail_backend_url,
    cancel_url: payload.cancelUrl ?? config.sslcommerz.cancel_backend_url,
    ipn_url: payload.ipnUrl ?? config.sslcommerz.ipn_url,

    shipping_method: "N/A",
    product_name: "Service",
    product_category: "Event",
    product_profile: "general",

    cus_name: payload.name ?? "Customer",
    cus_email: payload.email ?? "customer@example.com",
    cus_add1: payload.address ?? "N/A",
    cus_add2: "N/A",
    cus_city: "Dhaka",
    cus_state: "Dhaka",
    cus_postcode: "1000",
    cus_country: "Bangladesh",
    cus_phone: payload.phoneNumber ?? "01700000000",
    cus_fax: "N/A",

    ship_name: "N/A",
    ship_add1: "N/A",
    ship_add2: "N/A",
    ship_city: "N/A",
    ship_state: "N/A",
    ship_postcode: "1000",
    ship_country: "N/A",
  };

  try {
    const resp = await axios.post(config.sslcommerz.payment_api, qs.stringify(postData), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 20000,
    });

    const data = resp.data;
    console.log(data)
    const gatewayUrl = data?.GatewayPageURL ?? data?.gateway_page_url ?? data?.gatewayUrl;

    if (gatewayUrl && typeof gatewayUrl === "string") {
      return { success: true, gatewayUrl, tranId, raw: data };
    }

    return { success: false, raw: data, error: data?.failedreason ?? "No GatewayPageURL returned" };
  } catch (err: any) {
    console.error("SSLCommerz initiate error:", err?.response?.data ?? err?.message ?? err);
    const reason = err?.response?.data?.failedreason ?? err?.response?.data ?? err?.message ?? "Payment initiation failed";
    error(reason);
  }
};

export const validatePaymentByValId = async (val_id: string) => {
  if (!val_id) return { success: false, error: "val_id is required" };

  const url = `${config.sslcommerz.validation_api}?val_id=${encodeURIComponent(val_id)}&store_id=${encodeURIComponent(
    config.sslcommerz.store_id
  )}&store_passwd=${encodeURIComponent(config.sslcommerz.store_passwd)}&v=1&format=json`;

  try {
    const res = await axios.get(url, { timeout: 20000 });
    return { success: true, data: res.data };
  } catch (err: any) {
    console.error("SSLCommerz validation error:", err?.response?.data ?? err?.message ?? err);
    return { success: false, error: err?.response?.data ?? err?.message ?? "Validation API error", raw: err?.response?.data };
  }
};

export default {
  initiatePayment,
  validatePaymentByValId,
};
