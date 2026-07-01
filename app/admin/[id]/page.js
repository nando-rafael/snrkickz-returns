"use client";

import { useEffect, useState } from "react";

export default function AdminTicketDetail({ params }) {
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    fetch(`/api/admin/tickets/${params.id}`)
      .then((res) => res.json())
      .then((body) => setTicket(body.ticket));
  }

  useEffect(load, [params.id]);

  async function setStatus(status) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/tickets/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setTicket(body.ticket);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function process() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/tickets/${params.id}/process`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setTicket(body.ticket);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!ticket) return <p className="text-subtitle">Laden...</p>;

  return (
    <div className="flex flex-col gap-4">
      <a href="/admin" className="text-sm text-subtitle">
        ← Terug naar overzicht
      </a>

      <div className="card flex flex-col gap-3">
        <p className="font-mono text-xl font-bold">{ticket.id}</p>
        <p className="text-sm">
          Order <strong>{ticket.orderName}</strong> · {ticket.email}
        </p>
        <p className="text-sm">Status: <strong>{ticket.status}</strong></p>

        <div className="border-t border-border pt-3">
          <p className="text-sm font-medium mb-1">Artikelen</p>
          <ul className="text-sm text-subtitle">
            {ticket.items.map((i) => (
              <li key={i.id}>
                {i.quantity}× {i.title} — €{parseFloat(i.unitPrice).toFixed(2)}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-border pt-3 text-sm">
          <p>Origineel totaal: €{ticket.originalTotal.toFixed(2)}</p>
          <p>Retourkosten: €{ticket.returnFee.toFixed(2)}</p>
          <p>Restwaarde: €{ticket.refundableAmount.toFixed(2)}</p>
        </div>

        {ticket.resolution === "exchange" && ticket.exchange && (
          <div className="border-t border-border pt-3 text-sm">
            <p className="font-medium">Ruilartikel</p>
            <p>{ticket.exchange.variantTitle} — €{ticket.exchange.newPrice.toFixed(2)}</p>
            <p>
              {ticket.exchange.priceDifference > 0
                ? `Klant betaalt bij: €${ticket.exchange.priceDifference.toFixed(2)}`
                : `Klant krijgt terug: €${Math.abs(ticket.exchange.priceDifference).toFixed(2)}`}
            </p>
          </div>
        )}

        {ticket.invoiceUrl && (
          <div className="border-t border-border pt-3 text-sm">
            <a href={ticket.invoiceUrl} target="_blank" rel="noreferrer" className="underline font-medium">
              Factuur-link voor klant →
            </a>
          </div>
        )}

        {ticket.shopifyRefundId && (
          <p className="text-sm text-subtitle">Refund ID: {ticket.shopifyRefundId}</p>
        )}
        {ticket.exchangeOrderName && (
          <p className="text-sm text-subtitle">Ruil-order: {ticket.exchangeOrderName}</p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2">
          {ticket.status === "pending" && (
            <>
              <button className="btn-primary" disabled={busy} onClick={() => setStatus("approved")}>
                Goedkeuren
              </button>
              <button
                className="h-12 px-6 rounded-full border border-border font-semibold"
                disabled={busy}
                onClick={() => setStatus("rejected")}
              >
                Afwijzen
              </button>
            </>
          )}
          {ticket.status === "approved" && (
            <button className="btn-primary" disabled={busy} onClick={process}>
              {busy ? "Verwerken..." : "Verwerk via Shopify"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
