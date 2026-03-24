import { D } from '../../constants/tokens';

export default function Barra({ pct, color = D.azul, h = 5 }) {
  return (
    <div style={{ background: '#EBEBF0', borderRadius: 100, height: h, overflow: 'hidden' }}>
      <div style={{
        width: `${Math.min(100, pct)}%`, height: '100%',
        background: color, borderRadius: 100, transition: 'width 0.5s ease',
      }} />
    </div>
  );
}
