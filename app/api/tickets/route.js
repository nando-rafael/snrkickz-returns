import { NextResponse } from "next/server";
import config from "../../../lib/config";
import { createTicket, generateTicketId } from "../../../lib/db";
import { sendReturnConfirmation } from "../../../lib/email";
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
    console.log("[API] POST /api/tickets - Received return request");
    const body = await req.json();
    const {
      orderId,
      orderName,
      email,
      receivedDate,
      items,
      reason,
      resolution,
      exchangeVariantId,
    } = body;

    console.log("[API] Validating required fields");
    if (!orderId || !orderName || !email || !receivedDate || !items?.length || !reason || !resolution) {
      console.log("[API] Missing required fields");
      return NextResponse.json({ error: "Niet alle verplichte velden zijn ingevuld." }, { status: 400 });
    }

    if (!Object.values(config.RESOLUTIONS).includes(resolution)) {
      console.log("[API] Invalid resolution:", resolution);
      return NextResponse.json({ error: "Ongeldige keuze voor terugbetaling/ruilen." }, { status: 400 });
    }

    if (!config.RETURN_REASONS.some((r) => r.id === reason)) {
      console.log("[API] Invalid reason:", reason);
      return NextResponse.json({ error: "Ongeldige retourreden." }, { status: 400 });
    }

    console.log("[API] Validating return window");
    const received = new Date(receivedDate);
    const today = new Date();
    if (isNaN(received.getTime()) || received > today) {
      console.log("[API] Invalid received date:", receivedDate);
      return NextResponse.json({ error: "Ongeldige ontvangstdatum." }, { status: 400 });
    }
    const daysSinceReceived = daysBetween(received, today);
    if (daysSinceReceived > config.RETURN_WINDOW_DAYS) {
      console.log("[API] Return window exceeded:", daysSinceReceived, "days");
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
      console.log("[API] Validating exchange variant:", exchangeVariantId);
      if (!exchangeVariantId) {
        console.log("[API] No exchange variant provided");
        return NextResponse.json({ error: "Kies een artikel om voor te ruilen." }, { status: 400 });
      }

      const data = await shopifyGraphQL(VARIANT_QUERY, { id: exchangeVariantId });
      const variant = data.productVariant;

      if (!variant) {
        console.log("[API] Exchange variant not found");
        return NextResponse.json({ error: "Gekozen ruilartikel niet gevonden." }, { status: 404 });
      }
      if (!variant.availableForSale) {
        console.log("[API] Exchange variant not available");
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
        priceDifference,
      };
    }

    const ticketId = generateTicketId();
    console.log("[API] Creating ticket with ID:", ticketId);

    const ticket = {
      id: ticketId,
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
    };

    console.log("[API] Saving ticket to database");
    const savedTicket = await createTicket(ticket);
    console.log("[API] Ticket saved successfully:", savedTicket.id);

    console.log("[API] Sending confirmation email");
    try {
      await sendReturnConfirmation(savedTicket);
      console.log("[API] Confirmation email sent successfully");
    } catch (emailError) {
      console.error("[API] Email sending failed, but ticket was created:", emailError);
      // Don't fail the entire request if email fails
    }

    return NextResponse.json({ ticket: savedTicket }, { status: 201 });
  } catch (err) {
    console.error("[API] Error:", err);
    return NextResponse.json({ error: "Er ging iets mis bij het aanmaken van je retour: " + err.message }, { status: 500 });
  }
}

