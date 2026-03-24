import { useState } from 'react';
import { D } from '../../constants/tokens';
import Icon from '../icons/Icon';

export default function BtnPDF({ onClick, cargando, label = 'PDF' }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={e => { e.stopPropagation(); if (!cargando) onClick(); }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      disabled={cargando}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        height: 30, padding: '0 12px', borderRadius: D.rS,
        border: `1px solid ${hov ? '#93C5FD' : D.brd2}`,
        background: hov ? D.azulS : D.surf,
        color: hov ? D.azul : D.ink3,
        fontSize: 11, fontWeight: 700,
        cursor: cargando ? 'not-allowed' : 'pointer',
        transition: 'all 0.18s',
        opacity: cargando ? 0.6 : 1,
        fontFamily: D.f,
      }}
    >
      <Icon n='pdf' s={13} c={hov ? D.azul : D.ink4} />
      {cargando ? 'Generando\u2026' : label}
    </button>
  );
}
