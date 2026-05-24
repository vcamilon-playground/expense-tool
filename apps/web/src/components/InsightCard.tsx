'use client';

import { useState } from 'react';
import type { Expense, MonthlyInsight } from '@expense/shared';
import { formatMoney } from '@expense/shared';

export default function InsightCard({ expenses }: { expenses: Expense[] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insight, setInsight] = useState<MonthlyInsight | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ expenses }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as MonthlyInsight;
      setInsight(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>🤖 Monthly AI Insight</h2>
        <button className="primary" onClick={generate} disabled={loading}>
          {loading ? 'Thinking…' : insight ? 'Refresh' : 'Generate'}
        </button>
      </div>
      {error && <p style={{ color: 'var(--bad)' }}>{error}</p>}
      {insight && (
        <div style={{ marginTop: 12 }}>
          <p className="muted">
            {insight.month} · Total spent {formatMoney(insight.total)}
          </p>
          <h3 style={{ marginTop: 8 }}>{insight.headline}</h3>
          {insight.observations.length > 0 && (
            <>
              <h3>What I noticed</h3>
              <ul>
                {insight.observations.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </>
          )}
          {insight.recommendations.length > 0 && (
            <>
              <h3>What to do next</h3>
              <ul>
                {insight.recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      {!insight && !loading && (
        <p className="muted" style={{ marginTop: 8 }}>
          Click Generate to have Claude analyze your recent spending and suggest next steps.
        </p>
      )}
    </div>
  );
}
