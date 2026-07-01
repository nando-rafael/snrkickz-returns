import { NextResponse } from "next/server";
import { getTicket, updateTicket } from "../../../../../../lib/store";
import config from "../../../../../../lib/config";
import {
  createManualRefund,
  createDraftOrderForExchange,
  sendDraftOrderInvoice,
  completeDraftOrder,
} from "../../../../../../lib/shopify";

export async function POST(_req, { params }) {
  const ticket = getTicket(params.id);
  if (!ticket) {
    return NextResponse.json({ error: "Retour niet gevonden." }, { status: 404 });
  }
  if (ticket.status === config.TICKET_STATUS.PROCESSED) {
    return NextResponse.json({ error: "Deze retour is al verwerkt." }, { status: 400 });
  }

  try {
    if (ticket.resolution === config.RESOLUTIONS.REFUND) {
      const refund = await createManualRefund(
        ticket.orderId,
        ticket.refundableAmount,
        `Retour ${ticket.id} — ${ticket.orderName}`
      );

      const updated = updateTicket(ticket.id, {
        status: config.TICKET_STATUS.PROCESSED,
        shopifyRefundId: refund.id,
        processedAt: new Date().toISOString(),
      });

      return NextResponse.json({ ticket: updated });
    }

    if (ticket.resolution === config.RESOLUTIONS.EXCHANGE) {
      const { priceDifference, variantId } = ticket.exchange;

      if (priceDifference > 0) {
        // Customer's original item doesn't fully cover the new item —
        // create a draft order discounted by their refundable amount, and
        // send them an invoice link to pay the remaining difference.
        const draftOrder = await createDraftOrderForExchange({
          variantId,
          email: ticket.email,
          discountAmount: ticket.refundableAmount,
          note: `Ruil voor retour ${ticket.id} (${ticket.orderName})`,
        });
        const sent = await sendDraftOrderInvoice(draftOrder.id);

        const updated = updateTicket(ticket.id, {
          status: config.TICKET_STATUS.AWAITING_PAYMENT,
          draftOrderId: draftOrder.id,
          invoiceUrl: sent.invoiceUrl,
          processedAt: new Date().toISOString(),
        });

        return NextResponse.json({ ticket: updated });
      }

      // New item is worth the same or less — give it away free via the
      // draft order (fully discounted, so the draft order total is 0 and
      // can be completed without customer payment) and refund the leftover
      // difference in cash.
      const draftOrder = await createDraftOrderForExchange({
        variantId,
        email: ticket.email,
        discountAmount: ticket.exchange.newPrice,
        note: `Ruil voor retour ${ticket.id} (${ticket.orderName})`,
      });

      const completed = await completeDraftOrder(draftOrder.id);

      let refund = null;
      const cashBack = Math.round(Math.abs(priceDifference) * 100) / 100;
      if (cashBack > 0) {
        refund = await createManualRefund(
          ticket.orderId,
          cashBack,
          `Ruil-verschil retour ${ticket.id} — ${ticket.orderName}`
        );
      }

      const updated = updateTicket(ticket.id, {
        status: config.TICKET_STATUS.PROCESSED,
        draftOrderId: draftOrder.id,
        exchangeOrderId: completed.order?.id || null,
        exchangeOrderName: completed.order?.name || null,
        shopifyRefundId: refund?.id || null,
        cashBackAmount: cashBack,
        processedAt: new Date().toISOString(),
      });

      return NextResponse.json({ ticket: updated });
    }

    return NextResponse.json({ error: "Onbekende resolution op ticket." }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Verwerken via Shopify is mislukt: " + err.message },
      { status: 500 }
    );
  }
}
