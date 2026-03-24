import { useState } from 'react';
import { D } from '../../constants/tokens';

export default function Card({ children, p = '20px 24px', style, onClick, lift }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => lift && setHov(true)}
      onMouseLeave={() => lift && setHov(false)}
      style={{
        background: D.surf,
        border: `1px solid ${hov && lift ? D.brd : D.brd2}`,
        borderRadius: D.r,
        padding: p,
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: hov && lift ? D.shM : D.sh,
        transform: hov && lift && onClick ? 'translateY(-2px)' : 'none',
        transition: 'all 0.16s ease',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
