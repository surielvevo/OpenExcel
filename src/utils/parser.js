export function esGF(vs) {
  const s = vs.filter(v => v && String(v).trim()).slice(0, 30);
  if (!s.length) return false;
  return s.filter(v => /\([^)]*,\s*[^)]*\)/.test(String(v))).length / s.length > 0.28;
}

export function parseGF(raw) {
  if (!raw && raw !== 0) return [];
  return String(raw).trim()
    .split(/\),\s+(?=[A-ZÁÉÍÓÚÜÑ\d¿])/)
    .map(p => {
      p = p.trim();
      if (!p.endsWith(')')) p += ')';
      p = p.replace(/^CANCELADA:\s*/i, '');
      const m = p.match(/^(.*?)\s*\(/);
      return m ? m[1].trim() : p.trim();
    })
    .filter(Boolean);
}

export function tipoCol(vals) {
  const ne = vals.filter(v => v !== null && v !== undefined && v !== '');
  if (!ne.length) return 'vacio';
  if (ne.filter(v => !isNaN(Number(v)) && String(v).trim()).length / ne.length > 0.8) return 'numero';
  if (esGF(ne)) return 'google_forms';
  if (ne.filter(v => /;|,/.test(String(v)) && String(v).length > 30).length / ne.length > 0.3) return 'multi';
  const u = new Set(ne.map(String)).size;
  if (u / ne.length < 0.35 && u <= 40) return 'categoria';
  return 'texto';
}

export function parsearItems(val, tipo) {
  if (!val && val !== 0) return [];
  if (tipo === 'google_forms') return parseGF(val);
  if (tipo === 'multi') return String(val).split(/[,;]/).map(s => s.trim()).filter(Boolean);
  return [String(val).trim()].filter(Boolean);
}
