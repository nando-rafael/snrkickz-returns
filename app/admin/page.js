"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STATUS_LABELS = {
  pending: "In behandeling",
  approved: "Goedgekeurd",
  awaiting_payment: "Wacht op betaling",
  processed: "Verwerkt",
  rejected: "Afgewezen",
};

export default function AdminDashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/tickets")
      .then((res) => res.json())
      .then((body) => setTickets(body.tickets || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Retouren — admin</h1>

      {loading && <p className="text-subtitle">Laden...</p>}

      <div className="flex flex-col gap-3">
        {tickets.map((t) => (
          <Link
            key={t.id}
            href={`/admin/${t.id}`}
            className="card flex items-center justify-between hover:shadow-md transition-shadow"
          >
            <div>
              <p className="font-mono font-semibold">{t.id}</p>
              <p className="text-sm text-subtitle">
                {t.orderName} · {t.resolution === "refund" ? "Terugbetalen" : "Ruilen"} ·{" "}
                {new Date(t.createdAt).toLocaleDateString("nl-NL")}
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100">
              {STATUS_LABELS[t.status] || t.status}
            </span>
          </Link>
        ))}
        {!loading && tickets.length === 0 && (
          <p className="text-subtitle">Nog geen retouren binnen.</p>
        )}
      </div>
    </div>
  );
}
