const express = require("express");
const router = express.Router();
require("dotenv").config();

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_ENV = process.env.PAYPAL_ENV || "sandbox";
const DOMAINS = (process.env.DOMAINS || "").split(",").map(s => s.trim()).filter(Boolean);

const PAYPAL_API_BASE =
  PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

async function getClientToken() {
  console.log("Requesting client token from PayPal...");
  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");
  params.append("response_type", "client_token");
  DOMAINS.forEach(d => params.append("domains[]", d));

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  console.log("Client token response status:", res.status);
  const data = await res.json();
  return data;
}

async function getAccessToken() {
  console.log("Requesting access token from PayPal...");
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

  console.log("Access token response status:", res.status);
  const data = await res.json();
  return data.access_token;
}

router.get("/auth/browser-safe-client-token", async (req, res) => {
  try {
    console.log("GET /auth/browser-safe-client-token called");
    const tokenData = await getClientToken();
    if (!tokenData.client_token) {
      console.error("Missing client_token in response:", tokenData);
      return res.status(500).json({ error: "client_token_missing" });
    }
    console.log("Returning client token to frontend");
    res.json({
      clientToken: tokenData.client_token,
    });
  } catch (err) {
    console.error("Error generating client token:", err);
    res.status(500).json({ error: "client_token_failed" });
  }
});


router.post("/checkout/orders/create", async (req, res) => {
  try {
    console.log("POST /checkout/orders/create called");
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

    console.log("Sending order create request to PayPal with payload:", payload);

    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log("Order create response status:", response.status);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Error creating order:", err);
    res.status(500).json({ error: "order_create_failed" });
  }
});


router.post("/checkout/orders/:orderId/capture", async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log(`POST /checkout/orders/${orderId}/capture called`);
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

    console.log("Order capture response status:", response.status);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Error capturing order:", err);
    res.status(500).json({ error: "order_capture_failed" });
  }
});

module.exports = router;
