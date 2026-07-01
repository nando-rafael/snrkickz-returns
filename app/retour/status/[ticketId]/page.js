"use client";

import { useEffect, useState } from "react";

const STATUS_LABELS = {
  pending: "In behandeling",
  paid: "Betaald - wacht op verwerking",
  approved: "Goedgekeurd",
  awaiting_payment: "Wacht op betaling verschil",
  processed: "Verwerkt",
  rejected: "Afgewezen",
};

export default function TicketStatus({ params }) {
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/tickets/${params.ticketId}`)
      .then((res) => res.json())
      .then((body) => {
        if (body.error) setError(body.error);
        else setTicket(body.ticket);
      });
  }, [params.ticketId]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!ticket) return <p className="text-subtitle">Laden...</p>;

  return (
    <div className="card flex flex-col gap-3">
      <p className="text-sm text-subtitle">Retournummer</p>
      <p className="text-2xl font-bold font-mono">{ticket.id}</p>

      <div className="mt-2">
        <span className="inline-block rounded-full bg-purple-50 text-purple-700 text-xs font-semibold px-3 py-1">
          {STATUS_LABELS[ticket.status] || ticket.status}
        </span>
      </div>

      <ul className="text-sm flex flex-col gap-1 mt-3">
        <li>Order: {ticket.orderName}</li>
        <li>Resolutie: {ticket.resolution === "refund" ? "Terugbetalen" : "Ruilen"}</li>
        {ticket.resolution === "refund" && <li>Bedrag: €{ticket.refundableAmount.toFixed(2)}</li>}
        {ticket.resolution === "exchange" && ticket.exchange && (
          <li>Ruilartikel: {ticket.exchange.variantTitle}</li>
        )}
      </ul>

      {/* Payment link for refunds that haven't been paid yet */}
      {ticket.resolution === "refund" && ticket.status === "pending" && (
        <div className="mt-4 pt-4 border-t">
          <a
            href={`/payment/${ticket.id}`}
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
          >
            Betaal retourkosten →
          </a>
        </div>
      )}

      {/* Payment link for exchanges with price difference */}
      {ticket.invoiceUrl && (
        <li>
          <a href={ticket.invoiceUrl} className="underline font-medium" target="_blank" rel="noreferrer">
            Betaal het verschil →
          </a>
        </li>
      )}
    </div>
  );
}

