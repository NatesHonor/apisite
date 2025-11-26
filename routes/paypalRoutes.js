const express = require("express");
const router = express.Router();
require("dotenv").config();

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_ENV = process.env.PAYPAL_ENV || "sandbox";

const PAYPAL_API_BASE =
  PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

async function getAccessToken() {
  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = await res.json();
  console.log(data);

  return data.access_token;
}

async function getClientToken() {
  const accessToken = await getAccessToken();
  const res = await fetch(`${PAYPAL_API_BASE}/v1/identity/generate-token`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    }
  });
  const data = await res.json();
  console.log("generate-token response:", data);
  return data.client_token;
}

router.get("/auth/browser-safe-client-token", async (req, res) => {
  try {
    const clientToken = await getClientToken();
    if (!clientToken) {
      return res.status(500).json({ error: "client_token_missing" });
    }
    res.json({ clientToken });
  } catch (err) {
    console.error("Failed to get client token", err);
    res.status(500).json({ error: "client_token_failed" });
  }
});

router.post("/checkout/orders/create", async (req, res) => {
  try {
    const accessToken = await getAccessToken();
    const cart = req.session.cart || [];
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const payload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: subtotal.toFixed(2),
          },
        },
      ],
    };

    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "order_create_failed" });
  }
});

router.post("/checkout/orders/:orderId/capture", async (req, res) => {
  try {
    const { orderId } = req.params;
    const accessToken = await getAccessToken();

    const response = await fetch(
      `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "order_capture_failed" });
  }
});

module.exports = router;
