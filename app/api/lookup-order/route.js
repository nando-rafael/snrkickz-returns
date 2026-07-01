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
                discountedUnitPriceSet { shopMoney { amount currencyCode } }
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

async function findOrder(rawOrderNumber) {
  const trimmed = String(rawOrderNumber).trim().replace(/^#/, "");
  // Try a few query variants — Shopify's search syntax treats "#" as a
  // special character, so which form matches can vary.
  const attempts = [`name:#${trimmed}`, `name:${trimmed}`, `name:"#${trimmed}"`];

  for (const query of attempts) {
    const data = await shopifyGraphQL(ORDER_QUERY, { query });
    const edge = data.orders.edges[0];
    if (edge) return edge.node;
  }
  return null;
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

    const order = await findOrder(orderNumber);

    if (!order) {
      return NextResponse.json({ error: "Geen order gevonden met dit ordernummer." }, { status: 404 });
    }
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

    const lineItems = order.lineItems.edges.map((e) => (
      {
        id: e.node.id,
        title: e.node.title,
        quantity: e.node.quantity,
        image: e.node.image?.url || null,
        variantId: e.node.variant?.id || null,
        variantTitle: e.node.variant?.title || null,
        productId: e.node.variant?.product?.id || null,
        unitPrice: e.node.discountedUnitPriceSet?.shopMoney?.amount || e.node.originalUnitPriceSet?.shopMoney?.amount || e.node.variant?.price || "0.00",
        currency: e.node.discountedUnitPriceSet?.shopMoney?.currencyCode || e.node.originalUnitPriceSet?.shopMoney?.currencyCode || "EUR",
      }
    ));

    return NextResponse.json({
      orderId: order.id,
      orderName: order.name,
      email: order.email,
      createdAt: order.createdAt,
      fulfillmentStatus: order.displayFulfillmentStatus,
      lineItems,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "DEBUG: " + (err.message || String(err)) }, { status: 500 });
  }
}

