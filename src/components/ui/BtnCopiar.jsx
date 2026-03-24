import { useState } from 'react';
import { D } from '../../constants/tokens';
import Icon from '../icons/Icon';

export default function BtnCopiar({ texto }) {
  const [ok, setOk] = useState(false);

  const copiar = async e => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(texto);
      setOk(true);
      setTimeout(() => setOk(false), 2000);
    } catch { }
  };

  return (
    <button
      onClick={copiar}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        height: 30, padding: '0 11px', borderRadius: D.rS,
        border: `1px solid ${ok ? '#86EFAC' : D.brd2}`,
        background: ok ? '#F0FDF4' : D.surf,
        color: ok ? '#15803D' : D.ink3,
        fontSize: 11, fontWeight: 700, cursor: 'pointer',
        transition: 'all 0.2s', fontFamily: D.f,
      }}
    >
      <Icon n={ok ? 'ok' : 'copiar'} s={13} c={ok ? '#15803D' : D.ink4} />
      {ok ? '\u00a1Copiado!' : 'Copiar'}
    </button>
  );
}
