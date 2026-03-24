import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import PantallaCarga from './screens/PantallaCarga';
import PantallaConfig from './screens/PantallaConfig';
import PantallaDash from './screens/PantallaDash';

export default function App() {
  const [etapa, setEtapa] = useState('carga');
  const [wb,    setWb]    = useState(null);
  const [dash,  setDash]  = useState(null);

  const alCargar = useCallback(f => {
    const r = new FileReader();
    r.onload = e => {
      try {
        const wb2 = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true });
        setWb(wb2);
        setEtapa('configurar');
      } catch (er) {
        alert('Error al leer el archivo: ' + er.message);
      }
    };
    r.onerror = () => alert('No se pudo leer el archivo.');
    r.readAsArrayBuffer(f);
  }, []);

  const alConfirmar = useCallback(d => { setDash(d); setEtapa('dashboard'); }, []);
  const alReiniciar = useCallback(() => { setEtapa('carga'); setWb(null); setDash(null); }, []);

  if (etapa === 'carga')      return <PantallaCarga   alCargar={alCargar} />;
  if (etapa === 'configurar') return <PantallaConfig  workbook={wb} alConfirmar={alConfirmar} />;
  if (etapa === 'dashboard')  return <PantallaDash    {...dash} alReiniciar={alReiniciar} />;
  return null;
}
