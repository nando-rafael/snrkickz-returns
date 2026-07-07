'use client';

import { useEffect, useState } from 'react';

const STATUS_LABELS = {
  pending: { label: 'In behandeling', cls: 'tag-pending' },
  approved: { label: 'Goedgekeurd', cls: 'tag-approved' },
  rejected: { label: 'Afgewezen', cls: 'tag-rejected' },
  shipped: { label: 'Onderweg', cls: 'tag-shipped' },
  received: { label: 'Ontvangen', cls: 'tag-received' },
  refunded: { label: 'Terugbetaald', cls: 'tag-refunded' },
  cancelled: { label: 'Geannuleerd', cls: 'tag-rejected' },
};

function formatDate(isoString) {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('nl-NL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function AdminPage() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  function getAuthHeader() {
    return password ? { 'Authorization': `Bearer ${password}` } : {};
  }

  function load() {
    setLoading(true);
    fetch('/api/admin/returns', {
      headers: getAuthHeader(),
    })
      .then((res) => {
        if (res.status === 401) throw new Error('Niet ingelogd — voer het admin wachtwoord in.');
        if (res.status === 503) throw new Error('ADMIN_PASSWORD is niet ingesteld in Railway.');
        if (!res.ok) throw new Error(`Fout: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setReturns(data.returns || []);
        setLoading(false);
        setIsAuthenticated(true);
      })
      .catch((err) => {
        setActionError(err.message);
        setLoading(false);
        setIsAuthenticated(false);
      });
  }

  useEffect(() => {
    if (isAuthenticated || password) {
      load();
    } else {
      setLoading(false);
    }
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    load();
  }

  async function setStatus(id, status) {
    setActionError('');
    const res = await fetch(`/api/admin/returns/${id}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json();
      setActionError(data.error || 'Actie mislukt');
      return;
    }
    load();
  }

  async function triggerRefund(id) {
    setActionError('');
    if (!confirm('Refund verwerken via Shopify, met retourkosten ingehouden?')) return;
    const res = await fetch(`/api/admin/returns/${id}/refund`, { 
      method: 'POST',
      headers: getAuthHeader(),
    });
    if (!res.ok) {
      const data = await res.json();
      setActionError(data.error || 'Refund mislukt');
      return;
    }
    load();
  }

  if (!isAuthenticated && !loading) {
    return (
      <>
        <h1>Admin — Inloggen</h1>
        <form onSubmit={handleLogin} style={{ maxWidth: 300 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Admin wachtwoord</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: 4 }}
              placeholder="Voer wachtwoord in"
            />
          </div>
          <button type="submit" style={{ padding: '8px 16px', background: '#0b1f3a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            Inloggen
          </button>
        </form>
      </>
    );
  }

  return (
    <>
      <h1>Retouren — admin</h1>

      {actionError && (
        <div style={{ background: '#fbeae9', color: '#b3261e', padding: '12px 14px', borderRadius: 8, marginBottom: 16 }}>
          {actionError}
        </div>
      )}

      {/* Return Address */}
      <div style={{ background: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#0b1f3a' }}>Retouradres:</h3>
        <div style={{ fontSize: 13, lineHeight: 1.8, color: '#333' }}>
          <p style={{ margin: '0 0 4px 0' }}>Snrkickz</p>
          <p style={{ margin: '0 0 4px 0' }}>Impuls 28</p>
          <p style={{ margin: '0 0 4px 0' }}>1446 WX Purmerend</p>
          <p style={{ margin: 0 }}>Noord-Holland, Nederland</p>
        </div>
      </div>

      {loading ? (
        <p>Laden...</p>
      ) : returns.length === 0 ? (
        <p style={{ color: '#4a4f59' }}>Nog geen retouren binnen.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 16 }}>
          {returns.map((r) => {
            const statusInfo = STATUS_LABELS[r.status] || STATUS_LABELS.pending;
            const priceDifference = r.exchange && r.exchange.priceDifference ? r.exchange.priceDifference : null;
            
            return (
              <div
                key={r.id}
                style={{
                  border: '1px solid #e3e3e0',
                  borderRadius: 8,
                  padding: 16,
                  backgroundColor: '#fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}
              >
                {/* ID - Bold, Large */}
                <p style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', marginBottom: 12, color: '#0b1f3a' }}>
                  {r.id}
                </p>

                {/* Status Badge */}
                <div style={{ marginBottom: 12 }}>
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 700,
                      background:
                        statusInfo.cls === 'tag-pending'
                          ? '#fff3d6'
                          : statusInfo.cls === 'tag-approved'
                          ? '#e9f5ee'
                          : statusInfo.cls === 'tag-rejected'
                          ? '#fbeae9'
                          : '#eef1f6',
                      color: '#333',
                    }}
                  >
                    {statusInfo.label}
                  </span>
                </div>

                {/* Fields */}
                <div style={{ fontSize: 13, lineHeight: 1.8, marginBottom: 16 }}>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#666', fontWeight: 500 }}>Order:</span> {r.orderName}
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#666', fontWeight: 500 }}>Reden:</span> {r.reason}
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#666', fontWeight: 500 }}>Resolutie:</span>{' '}
                    {r.resolution === 'refund' ? 'Terugbetaling' : 'Ruilen'}
                  </div>

                  {r.exchange && r.exchange.variantTitle && (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: '#666', fontWeight: 500 }}>Ruilartikel:</span> {r.exchange.variantTitle}
                    </div>
                  )}

                  {priceDifference && (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: '#666', fontWeight: 500 }}>Prijsverschil:</span> €{priceDifference.toFixed(2)}
                    </div>
                  )}

                  {r.trackingNumber && (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: '#666', fontWeight: 500 }}>Tracking:</span> {r.trackingNumber}
                    </div>
                  )}

                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#666', fontWeight: 500 }}>Aangemeld op:</span> {formatDate(r.createdAt)}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {r.status === 'pending' && (
                    <>
                      <button
                        onClick={() => setStatus(r.id, 'approved')}
                        style={{
                          flex: 1,
                          minWidth: 100,
                          padding: '8px 12px',
                          background: '#e9f5ee',
                          border: '1px solid #c8e6c9',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 500,
                          color: '#2e7d32',
                        }}
                      >
                        Goedkeuren
                      </button>
                      <button
                        onClick={() => setStatus(r.id, 'rejected')}
                        style={{
                          flex: 1,
                          minWidth: 100,
                          padding: '8px 12px',
                          background: '#fbeae9',
                          border: '1px solid #ffcdd2',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 500,
                          color: '#c62828',
                        }}
                      >
                        Afwijzen
                      </button>
                    </>
                  )}

                  {(r.status === 'approved' || r.status === 'shipped') && (
                    <button
                      onClick={() => setStatus(r.id, 'received')}
                      style={{
                        flex: 1,
                        minWidth: 100,
                        padding: '8px 12px',
                        background: '#eef1f6',
                        border: '1px solid #c5cae9',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 500,
                        color: '#1a237e',
                      }}
                    >
                      Markeer ontvangen
                    </button>
                  )}

                  {r.status === 'received' && (
                    <button
                      onClick={() => triggerRefund(r.id)}
                      style={{
                        flex: 1,
                        minWidth: 100,
                        padding: '8px 12px',
                        background: '#0b1f3a',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 500,
                        color: '#fff',
                      }}
                    >
                      Refund verwerken
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

