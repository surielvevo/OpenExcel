import { D } from '../../constants/tokens';

export default function Tooltip2({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: D.surf, border: `1px solid ${D.brd}`, borderRadius: D.rS,
      padding: '10px 14px', boxShadow: D.shM, fontFamily: D.f,
    }}>
      <div style={{ fontSize: 11, color: D.ink3, marginBottom: 3, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 900, color: D.ink }}>
        {payload[0]?.value?.toLocaleString()}
      </div>
    </div>
  );
}
