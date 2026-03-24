import { D } from '../../constants/tokens';
import Icon from '../icons/Icon';

export default function TabBtn({ activo, onClick, icono, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 7, padding: '7px 15px',
        borderRadius: D.rS,
        border: activo ? `1px solid ${D.brd}` : '1px solid transparent',
        cursor: 'pointer', fontSize: 13,
        fontWeight: activo ? 700 : 500,
        background: activo ? D.surf : 'transparent',
        color: activo ? D.ink : D.ink3,
        boxShadow: activo ? D.sh : 'none',
        transition: 'all 0.12s', fontFamily: D.f,
      }}
    >
      <Icon n={icono} s={14} c={activo ? D.ink : D.ink4} />
      {label}
    </button>
  );
}
