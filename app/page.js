"use client";

import { useState } from "react";
import config from "../lib/config";

const STEPS = {
  LOOKUP: "lookup",
  ITEMS: "items",
  RESOLUTION: "resolution",
  EXCHANGE_PICK: "exchange_pick",
  REVIEW: "review",
  DONE: "done",
};

export default function Home() {
  const [step, setStep] = useState(STEPS.LOOKUP);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Lookup
  const [orderNumber, setOrderNumber] = useState("");
  const [postcode, setPostcode] = useState("");
  const [lastName, setLastName] = useState("");
  const [order, setOrder] = useState(null);

  // Items
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [receivedDate, setReceivedDate] = useState("");
  const [reason, setReason] = useState("");

  // Resolution
  const [resolution, setResolution] = useState("");
  const [exchangeQuery, setExchangeQuery] = useState("");
  const [exchangeResults, setExchangeResults] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);

  const [ticket, setTicket] = useState(null);

  const selectedItems = order?.lineItems.filter((li) => selectedItemIds.includes(li.id)) || [];
  const originalTotal = selectedItems.reduce((s, i) => s + parseFloat(i.unitPrice) * i.quantity, 0);
  const refundableAmount = Math.max(originalTotal - config.RETURN_FEE, 0);

  async function handleLookup(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/lookup-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, postcode, lastName }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Order niet gevonden.");
      setOrder(body);
      setStep(STEPS.ITEMS);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleItem(id) {
    setSelectedItemIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleItemsNext(e) {
    e.preventDefault();
    setError("");
    if (!selectedItemIds.length) return setError("Kies minstens één artikel.");
    if (!receivedDate) return setError("Vul in wanneer je de order ontvangen hebt.");
    if (!reason) return setError("Kies een retourreden.");

    const received = new Date(receivedDate);
    const days = Math.floor((Date.now() - received.getTime()) / (1000 * 60 * 60 * 24));
    if (days > config.RETURN_WINDOW_DAYS) {
      return setError(
        `Deze order valt buiten het retourvenster van ${config.RETURN_WINDOW_DAYS} dagen.`
      );
    }
    setStep(STEPS.RESOLUTION);
  }

  async function handleExchangeSearch(e) {
    e.preventDefault();
    if (exchangeQuery.trim().length < 2) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/variants/search?q=${encodeURIComponent(exchangeQuery)}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setExchangeResults(body.products);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.orderId,
          orderName: order.orderName,
          email: order.email,
          receivedDate,
          items: selectedItems,
          reason,
          resolution,
          exchangeVariantId: resolution === "exchange" ? selectedVariant?.id : undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Er ging iets mis.");
      setTicket(body.ticket);
      setStep(STEPS.DONE);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-1">Retourneren of ruilen</h1>
      <p className="text-subtitle mb-6">
        Vul je gegevens in om je retour te starten. Retourneren kan tot {config.RETURN_WINDOW_DAYS}{" "}
        dagen na ontvangst.
      </p>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {error}
        </div>
      )}

      {step === STEPS.LOOKUP && (
        <form onSubmit={handleLookup} className="card flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium">Ordernummer</label>
            <input
              className="input-field mt-1"
              placeholder="bv. 1234"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Postcode</label>
            <input
              className="input-field mt-1"
              placeholder="bv. 1234 AB"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Achternaam</label>
            <input
              className="input-field mt-1"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
          <button className="btn-primary mt-2" disabled={loading}>
            {loading ? "Zoeken..." : "Order zoeken"}
          </button>
        </form>
      )}

      {step === STEPS.ITEMS && order && (
        <form onSubmit={handleItemsNext} className="card flex flex-col gap-5">
          <div>
            <p className="font-semibold">{order.orderName}</p>
            <p className="text-sm text-subtitle">{order.email}</p>
          </div>

          <div className="flex flex-col gap-2">
            {order.lineItems.map((li) => (
              <label
                key={li.id}
                className="flex items-center gap-3 border border-border rounded-xl p-3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedItemIds.includes(li.id)}
                  onChange={() => toggleItem(li.id)}
                />
                {li.image && <img src={li.image} alt="" className="w-12 h-12 rounded-lg object-cover" />}
                <div className="flex-1">
                  <p className="text-sm font-medium">{li.title}</p>
                  {li.variantTitle && <p className="text-xs text-subtitle">{li.variantTitle}</p>}
                </div>
                <p className="text-sm">€{parseFloat(li.unitPrice).toFixed(2)}</p>
              </label>
            ))}
          </div>

          <div>
            <label className="text-sm font-medium">Wanneer heb je de order ontvangen?</label>
            <input
              type="date"
              className="input-field mt-1"
              value={receivedDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setReceivedDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Reden</label>
            <select
              className="input-field mt-1"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            >
              <option value="">Kies een reden</option>
              {config.RETURN_REASONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <button className="btn-primary">Volgende</button>
        </form>
      )}

      {step === STEPS.RESOLUTION && (
        <div className="card flex flex-col gap-4">
          <p className="font-semibold">Wat wil je doen?</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              className={`rounded-xl border-2 p-4 text-left ${
                resolution === "exchange" ? "border-ink" : "border-border"
              }`}
              onClick={() => setResolution("exchange")}
            >
              <p className="font-semibold">Ruilen</p>
              <p className="text-xs text-subtitle mt-1">Andere maat, kleur of artikel</p>
            </button>
            <button
              className={`rounded-xl border-2 p-4 text-left ${
                resolution === "refund" ? "border-ink" : "border-border"
              }`}
              onClick={() => setResolution("refund")}
            >
              <p className="font-semibold">Terugbetalen</p>
              <p className="text-xs text-subtitle mt-1">
                €{refundableAmount.toFixed(2)} terug (na €{config.RETURN_FEE.toFixed(2)}{" "}
                verzendkosten)
              </p>
            </button>
          </div>

          {resolution === "refund" && (
            <button className="btn-primary mt-2" onClick={() => setStep(STEPS.REVIEW)}>
              Volgende
            </button>
          )}
          {resolution === "exchange" && (
            <button className="btn-primary mt-2" onClick={() => setStep(STEPS.EXCHANGE_PICK)}>
              Kies ruilartikel
            </button>
          )}
        </div>
      )}

      {step === STEPS.EXCHANGE_PICK && (
        <div className="card flex flex-col gap-4">
          <form onSubmit={handleExchangeSearch} className="flex gap-2">
            <input
              className="input-field"
              placeholder="Zoek op productnaam of SKU"
              value={exchangeQuery}
              onChange={(e) => setExchangeQuery(e.target.value)}
            />
            <button className="btn-primary px-5" disabled={loading}>
              {loading ? "..." : "Zoek"}
            </button>
          </form>

          <div className="flex flex-col gap-3 max-h-96 overflow-y-auto">
            {exchangeResults.map((product) => (
              <div key={product.id}>
                <p className="text-sm font-semibold mb-1">{product.title}</p>
                <div className="flex flex-col gap-1">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      disabled={!v.availableForSale}
                      onClick={() =>
                        setSelectedVariant({
                          id: v.id,
                          title: `${product.title} — ${v.title}`,
                          price: v.price,
                          image: product.image,
                        })
                      }
                      className={`text-left border rounded-lg px-3 py-2 text-sm flex justify-between ${
                        selectedVariant?.id === v.id ? "border-ink" : "border-border"
                      } ${!v.availableForSale ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      <span>{v.title}</span>
                      <span>€{parseFloat(v.price).toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {selectedVariant && (
            <div className="border border-border rounded-xl p-3 text-sm">
              <p className="font-medium">Gekozen: {selectedVariant.title}</p>
              <p className="text-subtitle">
                Waarde ingeleverd artikel: €{refundableAmount.toFixed(2)} · Nieuw artikel: €
                {parseFloat(selectedVariant.price).toFixed(2)}
              </p>
              <p className="mt-1 font-medium">
                {parseFloat(selectedVariant.price) - refundableAmount > 0
                  ? `Nog bij te betalen: €${(parseFloat(selectedVariant.price) - refundableAmount).toFixed(2)}`
                  : `Terug te ontvangen: €${(refundableAmount - parseFloat(selectedVariant.price)).toFixed(2)}`}
              </p>
            </div>
          )}

          <button
            className="btn-primary"
            disabled={!selectedVariant}
            onClick={() => setStep(STEPS.REVIEW)}
          >
            Volgende
          </button>
        </div>
      )}

      {step === STEPS.REVIEW && (
        <div className="card flex flex-col gap-4">
          <p className="font-semibold">Controleer je retour</p>
          <ul className="text-sm flex flex-col gap-1">
            <li>Order: {order.orderName}</li>
            <li>Artikelen: {selectedItems.map((i) => i.title).join(", ")}</li>
            <li>Reden: {config.RETURN_REASONS.find((r) => r.id === reason)?.label}</li>
            <li>Keuze: {resolution === "refund" ? "Terugbetalen" : `Ruilen voor ${selectedVariant?.title}`}</li>
          </ul>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? "Versturen..." : "Retour bevestigen"}
          </button>
        </div>
      )}

      {step === STEPS.DONE && ticket && (
        <div className="card flex flex-col gap-3">
          <p className="text-lg font-semibold">Retour aangemeld ✓</p>
          <p className="text-sm text-subtitle">
            Je retournummer is <span className="font-mono font-semibold">{ticket.id}</span>. We
            beoordelen 'm zo snel mogelijk — je ontvangt een update per e-mail op {ticket.email}.
          </p>
          <a href={`/retour/status/${ticket.id}`} className="btn-primary text-center">
            Bekijk status
          </a>
        </div>
      )}
    </div>
  );
}
