const sw0 = { strokeWidth: 1.75 };
const sw2 = { strokeWidth: 2 };
const sw25 = { strokeWidth: 2.5 };

export default function Icon({ n, s = 16, c = 'currentColor', sw = 1.75 }) {
  const b = {
    width: s, height: s, viewBox: '0 0 24 24',
    fill: 'none', stroke: c, strokeWidth: sw, strokeLinecap: 'round',
  };
  const b2  = { ...b, ...sw2 };
  const b25 = { ...b, ...sw25 };

  const mapa = {
    subir:     <svg {...b}><path d='M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12'/></svg>,
    personas:  <svg {...b}><path d='M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2'/><circle cx='9' cy='7' r='4'/><path d='M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75'/></svg>,
    columnas:  <svg {...b}><path d='M12 3h7a2 2 0 012 2v14a2 2 0 01-2 2h-7m0-18H5a2 2 0 00-2 2v14a2 2 0 002 2h7m0-18v18'/></svg>,
    barras:    <svg {...b}><line x1='18' y1='20' x2='18' y2='10'/><line x1='12' y1='20' x2='12' y2='4'/><line x1='6' y1='20' x2='6' y2='14'/></svg>,
    capas:     <svg {...b}><polygon points='12,2 2,7 12,12 22,7'/><polyline points='2,17 12,22 22,17'/><polyline points='2,12 12,17 22,12'/></svg>,
    tabla:     <svg {...b}><rect x='3' y='3' width='18' height='18' rx='2'/><path d='M3 9h18M3 15h18M9 3v18'/></svg>,
    rejilla:   <svg {...b}><rect x='3' y='3' width='7' height='7'/><rect x='14' y='3' width='7' height='7'/><rect x='3' y='14' width='7' height='7'/><rect x='14' y='14' width='7' height='7'/></svg>,
    ok:        <svg {...b25}><polyline points='20,6 9,17 4,12'/></svg>,
    abajo:     <svg {...b2}><polyline points='6,9 12,15 18,9'/></svg>,
    arriba:    <svg {...b2}><polyline points='18,15 12,9 6,15'/></svg>,
    buscar:    <svg {...b}><circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/></svg>,
    reiniciar: <svg {...b}><polyline points='23,4 23,10 17,10'/><path d='M20.49 15a9 9 0 11-2.12-9.36L23 10'/></svg>,
    rayo:      <svg {...b}><polygon points='13,2 3,14 12,14 11,22 21,10 12,10'/></svg>,
    etiqueta:  <svg {...b}><path d='M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z'/><line x1='7' y1='7' x2='7.01' y2='7'/></svg>,
    logo:      <svg {...b}><rect x='3' y='3' width='7' height='7' rx='1'/><rect x='14' y='3' width='7' height='7' rx='1'/><rect x='3' y='14' width='7' height='7' rx='1'/><path d='M14 17.5h7M17.5 14v7'/></svg>,
    err:       <svg {...b}><circle cx='12' cy='12' r='10'/><line x1='15' y1='9' x2='9' y2='15'/><line x1='9' y1='9' x2='15' y2='15'/></svg>,
    info:      <svg {...b}><circle cx='12' cy='12' r='10'/><line x1='12' y1='16' x2='12' y2='12'/><line x1='12' y1='8' x2='12.01' y2='8'/></svg>,
    pdf:       <svg {...b}><path d='M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z'/><polyline points='14,2 14,8 20,8'/><line x1='9' y1='15' x2='15' y2='15'/><line x1='12' y1='12' x2='12' y2='18'/></svg>,
    copiar:    <svg {...b}><rect x='9' y='9' width='13' height='13' rx='2'/><path d='M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1'/></svg>,
  };
  return mapa[n] || null;
}
