"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import config from "../../../lib/config";

export default function PaymentPage({ params }) {
  const router = useRouter();
  const { ticketId } = params;
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);

  // Fetch ticket details
  useEffect(() => {
    async function fetchTicket() {
      try {
        const res = await fetch(`/api/tickets/${ticketId}`);
        if (!res.ok) throw new Error("Ticket niet gevonden");
        const data = await res.json();
        setTicket(data.ticket);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchTicket();
  }, [ticketId]);

  const handlePaymentConfirm = async () => {
    setConfirming(true);
    try {
      const res = await fetch("/api/payment/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Betaalbevestiging mislukt");
      }

      // Redirect to success page
      router.push(`/retour/status/${ticketId}?paid=true`);
    } catch (err) {
      setError(err.message);
      setConfirming(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Laden...</div>;
  if (error) return <div className="p-8 text-center text-red-600">Fout: {error}</div>;
  if (!ticket) return <div className="p-8 text-center">Ticket niet gevonden</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold mb-2">Betaling retour</h1>
        <p className="text-gray-600 mb-8">Retournummer: <strong>{ticket.id}</strong></p>

        {/* Order Summary */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Retourgegevens</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Ordernummer:</span>
              <strong>{ticket.orderId}</strong>
            </div>
            <div className="flex justify-between">
              <span>Retournummer:</span>
              <strong>{ticket.id}</strong>
            </div>
            <div className="flex justify-between">
              <span>Retourreden:</span>
              <span>{ticket.reason}</span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2">
              <span>Origineel bedrag:</span>
              <strong>€{ticket.originalTotal.toFixed(2)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Retourkosten:</span>
              <strong>-€{ticket.returnFee.toFixed(2)}</strong>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
              <span>Bedrag na retourkosten:</span>
              <strong>€{ticket.refundableAmount.toFixed(2)}</strong>
            </div>
          </div>
        </div>

        {/* Payment Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 text-blue-900">Betaalinstructies</h2>
          <p className="text-sm text-gray-700 mb-4">
            Maak een overschrijving naar het volgende rekeningnummer:
          </p>
          
          <div className="bg-white border-2 border-blue-300 rounded p-4 mb-4">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">IBAN</p>
              <p className="text-2xl font-mono font-bold text-blue-900 break-all">
                {config.BANK_IBAN}
              </p>
              <p className="text-xs text-gray-500 mt-2">{config.BANK_NAME}</p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
            <p className="text-sm font-semibold text-yellow-900 mb-2">⚠️ Belangrijk:</p>
            <p className="text-sm text-yellow-800 mb-2">
              Vermeld in het betalingskenmerk (referentie):
            </p>
            <p className="font-mono text-sm bg-white p-2 rounded border border-yellow-300">
              {ticket.orderId} {ticket.id}
            </p>
            <p className="text-xs text-yellow-700 mt-2">
              Bijvoorbeeld: "ORDER123 RET-ABC123"
            </p>
          </div>

          <div className="text-sm text-gray-700">
            <p className="font-semibold mb-2">Bedrag:</p>
            <p className="text-xl font-bold text-blue-900">€{ticket.refundableAmount.toFixed(2)}</p>
          </div>
        </div>

        {/* Confirmation Button */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 text-green-900">Betaling bevestigen</h2>
          <p className="text-sm text-gray-700 mb-4">
            Zodra je de betaling hebt gedaan, klik op de knop hieronder. Je ontvangt dan een e-mail met het retourlabel en verdere instructies.
          </p>
          <button
            onClick={handlePaymentConfirm}
            disabled={confirming}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition"
          >
            {confirming ? "Bezig met verwerken..." : "Ik heb betaald"}
          </button>
        </div>

        {/* Return Conditions */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Retourvoorwaarden</h2>
          <div className="text-sm text-gray-700 whitespace-pre-wrap">
            {config.RETURN_CONDITIONS}
          </div>
        </div>
      </div>
    </div>
  );
}

