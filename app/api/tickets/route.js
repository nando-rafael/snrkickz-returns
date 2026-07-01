import { NextResponse } from "next/server";
import config from "../../../lib/config";
import { createTicket, generateTicketId } from "../../../lib/store";
import { shopifyGraphQL } from "../../../lib/shopify";

const VARIANT_QUERY = `
  query GetVariant($id: ID!) {
    productVariant(id: $id) {
      id
      title
      price
      availableForSale
      product { title featuredImage { url } }
    }
  }
`;

function daysBetween(a, b) {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((b.getTime() - a.getTime()) / msPerDay);
}

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      orderId,
      orderName,
      email,
      receivedDate, // ISO date string, customer-stated delivery date
      items, // [{ lineItemId, title, quantity, unitPrice, variantId }]
      reason,
      resolution, // "refund" | "exchange"
      exchangeVariantId, // required if resolution === "exchange"
    } = body;

    if (!orderId || !orderName || !email || !receivedDate || !items?.length || !reason || !resolution) {
      return NextResponse.json({ error: "Niet alle verplichte velden zijn ingevuld." }, { status: 400 });
    }

    if (!Object.values(config.RESOLUTIONS).includes(resolution)) {
      return NextResponse.json({ error: "Ongeldige keuze voor terugbetaling/ruilen." }, { status: 400 });
    }

    if (!config.RETURN_REASONS.some((r) => r.id === reason)) {
      return NextResponse.json({ error: "Ongeldige retourreden." }, { status: 400 });
    }

    // Server-side 14-day window check based on the date the customer says
    // they received the item — never trust the client for this.
    const received = new Date(receivedDate);
    const today = new Date();
    if (isNaN(received.getTime()) || received > today) {
      return NextResponse.json({ error: "Ongeldige ontvangstdatum." }, { status: 400 });
    }
    const daysSinceReceived = daysBetween(received, today);
    if (daysSinceReceived > config.RETURN_WINDOW_DAYS) {
      return NextResponse.json(
        {
          error: `Deze order valt buiten het retourvenster van ${config.RETURN_WINDOW_DAYS} dagen (${daysSinceReceived} dagen geleden ontvangen).`,
        },
        { status: 400 }
      );
    }

    const originalTotal = items.reduce(
      (sum, item) => sum + parseFloat(item.unitPrice) * item.quantity,
      0
    );
    const refundableAmount = Math.max(originalTotal - config.RETURN_FEE, 0);

    let exchangeDetails = null;
    if (resolution === config.RESOLUTIONS.EXCHANGE) {
      if (!exchangeVariantId) {
        return NextResponse.json({ error: "Kies een artikel om voor te ruilen." }, { status: 400 });
      }

      const data = await shopifyGraphQL(VARIANT_QUERY, { id: exchangeVariantId });
      const variant = data.productVariant;

      if (!variant) {
        return NextResponse.json({ error: "Gekozen ruilartikel niet gevonden." }, { status: 404 });
      }
      if (!variant.availableForSale) {
        return NextResponse.json({ error: "Gekozen ruilartikel is niet meer op voorraad." }, { status: 400 });
      }

      const newPrice = parseFloat(variant.price);
      const priceDifference = Math.round((newPrice - refundableAmount) * 100) / 100;

      exchangeDetails = {
        variantId: variant.id,
        variantTitle: variant.title,
        productTitle: variant.product.title,
        image: variant.product.featuredImage?.url || null,
        newPrice,
        priceDifference, // > 0: customer pays extra. <= 0: customer gets abs(priceDifference) back.
      };
    }

    const ticket = createTicket({
      id: generateTicketId(),
      orderId,
      orderName,
      email,
      receivedDate,
      items,
      reason,
      resolution,
      originalTotal: Math.round(originalTotal * 100) / 100,
      refundableAmount: Math.round(refundableAmount * 100) / 100,
      returnFee: config.RETURN_FEE,
      exchange: exchangeDetails,
      status: config.TICKET_STATUS.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Er ging iets mis bij het aanmaken van je retour." }, { status: 500 });
  }
}
