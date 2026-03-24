const ESTILOS = {
  google_forms: { bg: '#EFF6FF', bdr: '#93C5FD', c: '#1D4ED8', t: 'Google Forms \u2605' },
  categoria:    { bg: '#F0FDF4', bdr: '#86EFAC', c: '#15803D', t: 'Categor\u00eda'       },
  numero:       { bg: '#F9FAFB', bdr: '#D1D1D6', c: '#52525B', t: 'Num\u00e9rico'        },
  multi:        { bg: '#FFFBEB', bdr: '#FCD34D', c: '#92400E', t: 'Multi-valor'           },
  texto:        { bg: '#FAFAFA', bdr: '#D1D1D6', c: '#52525B', t: 'Texto libre'           },
  vacio:        { bg: '#FAFAFA', bdr: '#D1D1D6', c: '#A1A1AA', t: 'Vac\u00edo'            },
};

export default function Etiqueta({ tipo }) {
  const e = ESTILOS[tipo] || ESTILOS.texto;
  return (
    <span style={{
      background: e.bg,
      border: `1px solid ${e.bdr}`,
      color: e.c,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
      padding: '2px 9px', borderRadius: 100, whiteSpace: 'nowrap',
    }}>
      {e.t}
    </span>
  );
}
