/**
 * ScorePanel.jsx
 *
 * Center score panel — replaces the inline <div className="shero"> block.
 *
 * Renders:
 *   • Side-by-side score display (existing .svs / .ss structure, unchanged)
 *   • Proportional score bar (existing .sbar, unchanged)
 *   • PressureAnimation indicator when |tA − tB| > 0.8
 *
 * Props:
 *   tA      number   — weighted score for side A  (gScore result)
 *   tB      number   — weighted score for side B
 *   nameA   string   — display name for side A
 *   nameB   string   — display name for side B
 *   sum     number   — tA + tB || 1  (precomputed in App.jsx)
 */

import PressureAnimation from './animations/PressureAnimation.jsx';
import './styles/animations.css';

const PRESSURE_THRESHOLD = 0.8;

export default function ScorePanel({ tA, tB, nameA, nameB, sum }) {
  const diff         = tA - tB;
  const absDiff      = Math.abs(diff);
  const pressureOn   = absDiff > PRESSURE_THRESHOLD;
  const pressureSide = pressureOn ? (tA < tB ? 'A' : 'B') : null;

  /* ── Score indicator arrow ── */
  const arrowA = tA > tB ? '▲' : tA < tB ? '▼' : '═';
  const arrowB = tB > tA ? '▲' : tB < tA ? '▼' : '═';
  const clsA   = tA > tB ? 'sd-up' : tA < tB ? 'sd-dn' : 'sd-eq';
  const clsB   = tB > tA ? 'sd-up' : tB < tA ? 'sd-dn' : 'sd-eq';

  const pctA   = ((tA / sum) * 100).toFixed(0);
  const pctB   = ((tB / sum) * 100).toFixed(0);

  return (
    <div className="shero">

      {/* ── VS score row ── */}
      <div className="svs">

        {/* Side A */}
        <div
          className={`ss ${pressureSide === 'A' ? 'prs-winning-glow' : ''}`}
          style={{ position: 'relative' }}
        >
          <div className="sname sname-a">{nameA.split(' ')[0]}</div>
          <div
            className="sval sval-a"
            style={{
              transition: 'color .4s ease',
              color:      pressureSide === 'B' ? 'var(--A)' : undefined,
            }}
          >
            {tA.toFixed(1)}
          </div>
          <div className={`sdelta ${clsA}`}>{arrowA}</div>
        </div>

        <div className="svssep">VS</div>

        {/* Side B */}
        <div
          className={`ss ${pressureSide === 'B' ? 'prs-winning-glow' : ''}`}
          style={{ position: 'relative' }}
        >
          <div className="sname sname-b">{nameB.split(' ')[0]}</div>
          <div
            className="sval sval-b"
            style={{ transition: 'color .4s ease' }}
          >
            {tB.toFixed(1)}
          </div>
          <div className={`sdelta ${clsB}`}>{arrowB}</div>
        </div>

      </div>

      {/* ── Proportional bar ── */}
      <div className="sbar-wrap">
        <div className="sbar">
          <div
            className="sbar-a"
            style={{
              width:      `${(tA / sum) * 100}%`,
              boxShadow:  pressureSide === 'B' && tA > 0
                ? '2px 0 8px rgba(44,74,110,.35)'
                : undefined,
            }}
          />
          <div
            className="sbar-b"
            style={{
              width:      `${(tB / sum) * 100}%`,
              boxShadow:  pressureSide === 'A' && tB > 0
                ? '2px 0 8px rgba(140,58,48,.3)'
                : undefined,
            }}
          />
        </div>
        <div className="sbar-lbl">
          <span>{pctA}%</span>
          <span>{pctB}%</span>
        </div>
      </div>

      {/* ── Pressure indicator ── */}
      <PressureAnimation
        pressureSide={pressureSide}
        scoreDiff={diff}
        nameA={nameA}
        nameB={nameB}
      />

    </div>
  );
}
