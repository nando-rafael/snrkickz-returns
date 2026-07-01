import { NextResponse } from "next/server";
import { getTicket, updateTicket } from "../../../../lib/store";
import { sendReturnLabelEmail } from "../../../../lib/email";
import config from "../../../../lib/config";

export async function POST(req) {
  try {
    console.log("[PAYMENT] POST /api/payment/confirm - Payment confirmation");
    const { ticketId } = await req.json();

    if (!ticketId) {
      return NextResponse.json({ error: "Ticket ID is required" }, { status: 400 });
    }

    console.log("[PAYMENT] Fetching ticket:", ticketId);
    const ticket = getTicket(ticketId);

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    console.log("[PAYMENT] Updating ticket status to PAID");
    const updatedTicket = updateTicket(ticketId, {
      status: config.TICKET_STATUS.PAID,
      paidAt: new Date().toISOString(),
    });

    console.log("[PAYMENT] Sending return label email");
    try {
      await sendReturnLabelEmail(updatedTicket);
      console.log("[PAYMENT] Return label email sent successfully");
    } catch (emailError) {
      console.error("[PAYMENT] Email sending failed:", emailError);
      // Don't fail the entire request if email fails
    }

    return NextResponse.json({ ticket: updatedTicket }, { status: 200 });
  } catch (err) {
    console.error("[PAYMENT] Error:", err);
    return NextResponse.json(
      { error: "Payment confirmation failed: " + err.message },
      { status: 500 }
    );
  }
}

