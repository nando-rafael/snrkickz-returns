import { NextResponse } from "next/server";
import { shopifyGraphQL } from "../../../lib/shopify";

const ORDER_QUERY = `
  query FindOrder($query: String!) {
    orders(first: 1, query: $query) {
      edges {
        node {
          id
          name
          email
          createdAt
          displayFulfillmentStatus
          shippingAddress { zip lastName }
          customer { lastName }
          lineItems(first: 50) {
            edges {
              node {
                id
                title
                quantity
                image { url altText }
                variant {
                  id
                  title
                  price
                  product { id title }
                }
                originalUnitPriceSet { shopMoney { amount currencyCode } }
              }
            }
          }
          fulfillments(first: 5) {
            status
            estimatedDeliveryAt
          }
        }
      }
    }
  }
`;

function normalize(str) {
  return String(str || "").trim().toLowerCase().replace(/\s+/g, "");
}

function normalizeOrderNumber(raw) {
  const trimmed = String(raw).trim();
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

export async function POST(req) {
  try {
    const { orderNumber, postcode, lastName } = await req.json();

    if (!orderNumber || !postcode || !lastName) {
      return NextResponse.json(
        { error: "Ordernummer, postcode en achternaam zijn verplicht." },
        { status: 400 }
      );
    }

    const name = normalizeOrderNumber(orderNumber);
    const data = await shopifyGraphQL(ORDER_QUERY, { query: `name:${JSON.stringify(name)}` });
    const edge = data.orders.edges[0];

    if (!edge) {
      return NextResponse.json({ error: "Geen order gevonden met dit ordernummer." }, { status: 404 });
    }

    const order = edge.node;
    const addressLastName = order.shippingAddress?.lastName || order.customer?.lastName || "";
    const addressZip = order.shippingAddress?.zip || "";

    const zipMatches = normalize(addressZip) === normalize(postcode);
    const nameMatches = normalize(addressLastName) === normalize(lastName);

    if (!zipMatches || !nameMatches) {
      return NextResponse.json(
        { error: "Gegevens komen niet overeen met de order. Check ordernummer, postcode en achternaam." },
        { status: 404 }
      );
    }

    const lineItems = order.lineItems.edges.map((e) => ({
      id: e.node.id,
      title: e.node.title,
      quantity: e.node.quantity,
      image: e.node.image?.url || null,
      variantId: e.node.variant?.id || null,
      variantTitle: e.node.variant?.title || null,
      productId: e.node.variant?.product?.id || null,
      unitPrice: e.node.originalUnitPriceSet?.shopMoney?.amount || e.node.variant?.price || "0.00",
      currency: e.node.originalUnitPriceSet?.shopMoney?.currencyCode || "EUR",
    }));

    return NextResponse.json({
      orderId: order.id,
      orderName: order.name,
      email: order.email,
      createdAt: order.createdAt,
      fulfillmentStatus: order.displayFulfillmentStatus,
      lineItems,
    });
  } catch (err) {
    const errorMsg = `DEBUG: ${err.message || String(err)}`;
    console.error(errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

