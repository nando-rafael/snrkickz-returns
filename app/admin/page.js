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

      {loading ? (
        <p>Laden...</p>
      ) : returns.length === 0 ? (
        <p style={{ color: '#4a4f59' }}>Nog geen retouren binnen.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #e3e3e0' }}>ID</th>
              <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #e3e3e0' }}>Order</th>
              <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #e3e3e0' }}>Reden</th>
              <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #e3e3e0' }}>Aangemeld op</th>
              <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #e3e3e0' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #e3e3e0' }}>Tracking</th>
              <th style={{ textAlign: 'right', padding: '10px 8px', borderBottom: '1px solid #e3e3e0' }}>Acties</th>
            </tr>
          </thead>
          <tbody>
            {returns.map((r) => {
              const statusInfo = STATUS_LABELS[r.status] || STATUS_LABELS.pending;
              return (
                <tr key={r.id}>
                  <td style={{ padding: '10px 8px', borderBottom: '1px solid #e3e3e0' }}>{r.id}</td>
                  <td style={{ padding: '10px 8px', borderBottom: '1px solid #e3e3e0' }}>{r.orderName}</td>
                  <td style={{ padding: '10px 8px', borderBottom: '1px solid #e3e3e0' }}>{r.reason}</td>
                  <td style={{ padding: '10px 8px', borderBottom: '1px solid #e3e3e0', fontSize: 12, color: '#666' }}>{formatDate(r.createdAt)}</td>
                  <td style={{ padding: '10px 8px', borderBottom: '1px solid #e3e3e0' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: statusInfo.cls === 'tag-pending' ? '#fff3d6' : statusInfo.cls === 'tag-approved' ? '#e9f5ee' : statusInfo.cls === 'tag-rejected' ? '#fbeae9' : '#eef1f6', color: '#333' }}>
                      {statusInfo.label}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px', borderBottom: '1px solid #e3e3e0' }}>{r.trackingNumber || '—'}</td>
                  <td style={{ padding: '10px 8px', borderBottom: '1px solid #e3e3e0', textAlign: 'right' }}>
                    {r.status === 'pending' && (
                      <>
                        <button onClick={() => setStatus(r.id, 'approved')} style={{ marginRight: 6, padding: '6px 10px', cursor: 'pointer' }}>Goedkeuren</button>
                        <button onClick={() => setStatus(r.id, 'rejected')} style={{ padding: '6px 10px', cursor: 'pointer' }}>Afwijzen</button>
                      </>
                    )}
                    {(r.status === 'approved' || r.status === 'shipped') && (
                      <button onClick={() => setStatus(r.id, 'received')} style={{ padding: '6px 10px', cursor: 'pointer' }}>Markeer ontvangen</button>
                    )}
                    {r.status === 'received' && (
                      <button onClick={() => triggerRefund(r.id)} style={{ padding: '6px 10px', cursor: 'pointer', background: '#0b1f3a', color: '#fff', border: 'none', borderRadius: 6 }}>Refund verwerken</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}

