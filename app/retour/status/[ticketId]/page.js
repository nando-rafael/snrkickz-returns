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
  const [trackingNumber, setTrackingNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/tickets/${params.ticketId}`)
      .then((res) => res.json())
      .then((body) => {
        if (body.error) setError(body.error);
        else {
          setTicket(body.ticket);
          if (body.ticket.trackingNumber) {
            setTrackingNumber(body.ticket.trackingNumber);
          }
        }
      });
  }, [params.ticketId]);

  async function handleTrackingSubmit(e) {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess(false);

    if (!trackingNumber.trim()) {
      setSubmitError("Voer een trackingnummer in.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/tickets/${params.ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingNumber: trackingNumber.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fout bij opslaan trackingnummer");
      }

      const data = await res.json();
      setTicket(data);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (error) return <p className="text-red-600">{error}</p>;
  if (!ticket) return <p className="text-subtitle">Laden...</p>;

  const hasTracking = ticket.trackingNumber && ticket.trackingNumber.trim();
  const hasPriceDifference = ticket.resolution === "exchange" && ticket.exchange && ticket.exchange.priceDifference && ticket.exchange.priceDifference > 0;

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
        {ticket.resolution === "refund" && (
          <li>Resolutie: Terugbetalen (Retourneren op eigen kosten)</li>
        )}
        {ticket.resolution === "refund" && <li>Bedrag: Volledige terugbetaling</li>}
        {ticket.resolution === "exchange" && ticket.exchange && (
          <>
            <li>Resolutie: Ruilen</li>
            <li>Ruilartikel: {ticket.exchange.variantTitle}</li>
          </>
        )}
      </ul>

      {/* Price difference payment instructions for exchanges */}
      {hasPriceDifference && (
        <div className="mt-4 pt-4 border-t bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-3">Betaling prijsverschil</h3>
          <div className="text-sm space-y-2">
            <p><strong>Bedrag:</strong> €{ticket.exchange.priceDifference.toFixed(2)}</p>
            <p><strong>Referentie:</strong> {ticket.id}</p>
          </div>
          <div className="mt-3 pt-3 border-t border-blue-200">
            <p className="text-xs font-medium mb-2">Bankgegevens:</p>
            <div className="text-xs space-y-1 font-mono bg-white p-2 rounded">
              <p><strong>Bank:</strong> Revolut</p>
              <p><strong>IBAN:</strong> NL72 REVO 6615 0541 67</p>
              <p><strong>Naam:</strong> SNRKICKZ</p>
              <p><strong>Referentie:</strong> {ticket.id}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tracking section */}
      <div className="mt-6 pt-6 border-t">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-sm mb-3">Voorwaarden voor retour:</h3>
          <ul className="text-xs space-y-2 text-gray-700 mb-4">
            <li>• Stuur je retour met een Track & Trace-dienst naar keuze (bijvoorbeeld PostNL, DHL of DPD).</li>
            <li>• Bewaar het verzendbewijs en de Track & Trace-code totdat je terugbetaling volledig is verwerkt.</li>
            <li>• Verzeker je retourzending. Bij verlies of beschadiging tijdens het retourtransport is de vervoerder verantwoordelijk. Snrkickz is niet aansprakelijk voor niet-afgeleverde of beschadigde retourzendingen.</li>
          </ul>

          <div className="pt-4 border-t border-yellow-200">
            <h4 className="font-semibold text-sm mb-3">Retouradres:</h4>
            <div className="text-sm space-y-1 text-gray-700">
              <p>Snrkickz</p>
              <p>Impuls 28</p>
              <p>1446 WX Purmerend</p>
              <p>The Netherlands</p>
            </div>
          </div>
        </div>

        {hasTracking ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm font-medium text-green-900">Trackingnummer ontvangen:</p>
            <p className="text-lg font-mono font-bold text-green-700 mt-2">{ticket.trackingNumber}</p>
            <p className="text-xs text-green-600 mt-2">Bedankt! We volgen je pakket.</p>
          </div>
        ) : (
          <form onSubmit={handleTrackingSubmit} className="flex flex-col gap-3">
            <div>
              <label className="text-sm font-medium">Trackingnummer</label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="bv. 3SABC1234567890"
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            {submitError && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-2">
                {submitError}
              </div>
            )}

            {submitSuccess && (
              <div className="text-green-600 text-sm bg-green-50 border border-green-200 rounded p-2">
                ✓ Trackingnummer opgeslagen!
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
            >
              {submitting ? "Opslaan..." : "Trackingnummer opslaan"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

