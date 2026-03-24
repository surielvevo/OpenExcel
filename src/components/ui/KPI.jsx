import { D } from '../../constants/tokens';
import Card from './Card';
import Icon from '../icons/Icon';

export default function KPI({ icono, etiq, valor, acento = D.azul }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 13,
          background: acento + '14',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon n={icono} s={21} c={acento} />
        </div>
        <div>
          <div style={{ fontSize: 28, fontWeight: 900, color: D.ink, lineHeight: 1, letterSpacing: '-0.8px' }}>
            {valor}
          </div>
          <div style={{ fontSize: 12, color: D.ink3, marginTop: 4, fontWeight: 500 }}>{etiq}</div>
        </div>
      </div>
    </Card>
  );
}
