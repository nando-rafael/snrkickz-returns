const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
const API_VERSION = process.env.SHOPIFY_API_VERSION || "2026-07";

let cachedToken = null;
let cachedTokenExpiresAt = 0;

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < cachedTokenExpiresAt) return cachedToken;

  const res = await fetch(`https://${SHOPIFY_DOMAIN}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to obtain Shopify access token: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  cachedTokenExpiresAt = now + Math.max((data.expires_in || 3600) - 300, 60) * 1000;
  return cachedToken;
}

async function shopifyGraphQL(query, variables) {
  const token = await getAccessToken();
  const res = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  if (json.errors) {
    throw new Error(`Shopify GraphQL error: ${JSON.stringify(json.errors)}`);
  }
  if (json.data && Object.values(json.data).some((v) => v && v.userErrors && v.userErrors.length)) {
    const errs = Object.values(json.data).flatMap((v) => v?.userErrors || []);
    throw new Error(`Shopify mutation userErrors: ${JSON.stringify(errs)}`);
  }
  return json.data;
}

async function getRefundableTransaction(orderId) {
  const query = `
    query GetOrderTransactions($id: ID!) {
      order(id: $id) {
        id
        currencyCode
        transactions(first: 10) {
          id
          kind
          gateway
          status
          amountSet { shopMoney { amount } }
        }
      }
    }
  `;
  const data = await shopifyGraphQL(query, { id: orderId });
  const order = data.order;
  if (!order) throw new Error("Order not found for refund lookup.");

  // Prefer a SALE, fall back to CAPTURE — either can be the parent of a refund.
  const candidate =
    order.transactions.find((t) => t.kind === "SALE" && t.status === "SUCCESS") ||
    order.transactions.find((t) => t.kind === "CAPTURE" && t.status === "SUCCESS");

  if (!candidate) throw new Error("No refundable transaction found on this order.");

  return { gateway: candidate.gateway, parentId: candidate.id, currencyCode: order.currencyCode };
}

async function createManualRefund(orderId, amount, note) {
  const { gateway, parentId, currencyCode } = await getRefundableTransaction(orderId);

  const mutation = `
    mutation RefundCreate($input: RefundInput!) {
      refundCreate(input: $input) {
        refund { id totalRefundedSet { shopMoney { amount } } }
        userErrors { field message }
      }
    }
  `;

  const input = {
    orderId,
    notify: true,
    note: note || "Snrkickz retour",
    transactions: [
      {
        orderId,
        gateway,
        kind: "REFUND",
        parentId,
        amount: amount.toFixed(2),
      },
    ],
  };

  const data = await shopifyGraphQL(mutation, { input });
  return data.refundCreate.refund;
}

async function createDraftOrderForExchange({ variantId, email, discountAmount, note }) {
  const mutation = `
    mutation DraftOrderCreate($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder {
          id
          name
          invoiceUrl
          totalPriceSet { shopMoney { amount } }
        }
        userErrors { field message }
      }
    }
  `;

  const input = {
    email,
    note: note || "Snrkickz ruil",
    lineItems: [{ variantId, quantity: 1 }],
    appliedDiscount: discountAmount
      ? {
          description: "Ruil — waarde ingeleverd artikel",
          valueType: "FIXED_AMOUNT",
          value: discountAmount.toFixed(2),
        }
      : undefined,
    tags: ["ruil", "snrkickz-returns"],
  };

  const data = await shopifyGraphQL(mutation, { input });
  return data.draftOrderCreate.draftOrder;
}

async function sendDraftOrderInvoice(draftOrderId) {
  const mutation = `
    mutation DraftOrderInvoiceSend($id: ID!) {
      draftOrderInvoiceSend(id: $id) {
        draftOrder { id invoiceUrl }
        userErrors { field message }
      }
    }
  `;
  const data = await shopifyGraphQL(mutation, { id: draftOrderId });
  return data.draftOrderInvoiceSend.draftOrder;
}

async function completeDraftOrder(draftOrderId) {
  const mutation = `
    mutation DraftOrderComplete($id: ID!) {
      draftOrderComplete(id: $id) {
        draftOrder { id order { id name } }
        userErrors { field message }
      }
    }
  `;
  const data = await shopifyGraphQL(mutation, { id: draftOrderId });
  return data.draftOrderComplete.draftOrder;
}

module.exports = {
  shopifyGraphQL,
  getAccessToken,
  getRefundableTransaction,
  createManualRefund,
  createDraftOrderForExchange,
  sendDraftOrderInvoice,
  completeDraftOrder,
};
