import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

/* ─── COLORES ──────────────────────────────────────────────────────────────── */
const COLORES = [
  "#2563EB","#059669","#D97706","#DC2626","#7C3AED",
  "#0891B2","#EA580C","#BE185D","#0D9488","#4F46E5",
  "#15803D","#9333EA","#B45309","#1D4ED8","#C026D3",
];

/* ─── TOKENS ───────────────────────────────────────────────────────────────── */
const D = {
  bg:   "#F2F2F7",
  surf: "#FFFFFF",
  brd:  "#D1D1D6",
  brd2: "#E5E5EA",
  ink:  "#09090B",
  ink2: "#27272A",
  ink3: "#52525B",
  ink4: "#A1A1AA",
  azul: "#2563EB",
  azulS:"#EFF6FF",
  sh:   "0 1px 3px rgba(0,0,0,0.07),0 1px 2px rgba(0,0,0,0.04)",
  shM:  "0 4px 16px rgba(0,0,0,0.09)",
  r:    "12px",
  rS:   "8px",
  f:    "'Inter','Segoe UI',system-ui,sans-serif",
};

/* ─── PARSER GOOGLE FORMS ──────────────────────────────────────────────────── */
const esGF = vs => {
  const s = vs.filter(v => v && String(v).trim()).slice(0, 30);
  if (!s.length) return false;
  return s.filter(v => /\([^)]*,\s*[^)]*\)/.test(String(v))).length / s.length > 0.28;
};

function parseGF(raw) {
  if (!raw && raw !== 0) return [];
  return String(raw).trim()
    .split(/\),\s+(?=[A-ZÁÉÍÓÚÜÑ\d¿])/)
    .map(p => {
      p = p.trim();
      if (!p.endsWith(")")) p += ")";
      p = p.replace(/^CANCELADA:\s*/i, "");
      const m = p.match(/^(.*?)\s*\(/);
      return m ? m[1].trim() : p.trim();
    }).filter(Boolean);
}

function tipoCol(vals) {
  const ne = vals.filter(v => v !== null && v !== undefined && v !== "");
  if (!ne.length) return "vacio";
  if (ne.filter(v => !isNaN(Number(v)) && String(v).trim()).length / ne.length > 0.8) return "numero";
  if (esGF(ne)) return "google_forms";
  if (ne.filter(v => /;|,/.test(String(v)) && String(v).length > 30).length / ne.length > 0.3) return "multi";
  const u = new Set(ne.map(String)).size;
  if (u / ne.length < 0.35 && u <= 40) return "categoria";
  return "texto";
}

function parsearItems(val, tipo) {
  if (!val && val !== 0) return [];
  if (tipo === "google_forms") return parseGF(val);
  if (tipo === "multi") return String(val).split(/[,;]/).map(s => s.trim()).filter(Boolean);
  return [String(val).trim()].filter(Boolean);
}

/* ─── PDF VIA SCRIPT TAG ───────────────────────────────────────────────────── */
let jsPDFCargado = false;

function cargarjsPDF() {
  return new Promise((res, rej) => {
    if (jsPDFCargado && window.jspdf) { res(); return; }
    const s1 = document.createElement("script");
    s1.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s1.onload = () => {
      const s2 = document.createElement("script");
      s2.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js";
      s2.onload = () => { jsPDFCargado = true; res(); };
      s2.onerror = rej;
      document.head.appendChild(s2);
    };
    s1.onerror = rej;
    document.head.appendChild(s1);
  });
}

function construirPDF(doc, grupo, columnas, titulo, colGrupo, esUltimo) {
  const ancho = doc.internal.pageSize.getWidth();
  doc.setFillColor(9, 9, 11);
  doc.rect(0, 0, ancho, 30, "F");
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(10, 7, 16, 16, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("FD", 18, 17, { align: "center" });
  const nombre = grupo.name.length > 68 ? grupo.name.slice(0, 66) + "…" : grupo.name;
  doc.setFontSize(14);
  doc.text(nombre, 30, 13);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(161, 161, 170);
  doc.text(`${titulo}  ·  Columna: ${colGrupo}  ·  ${grupo.count} participante${grupo.count !== 1 ? "s" : ""}`, 30, 22);
  const fecha = new Date().toLocaleDateString("es-DO", { year:"numeric", month:"long", day:"numeric" });
  doc.setFontSize(8);
  doc.text(fecha, ancho - 14, 13, { align: "right" });
  const heads = columnas.map(c => c.clave.length > 22 ? c.clave.slice(0, 20) + "…" : c.clave);
  const body  = grupo.members.map((m, i) => [
    String(i + 1),
    ...columnas.map(c => { const v = String(m[c.clave] ?? "—"); return v.length > 48 ? v.slice(0, 46) + "…" : v; })
  ]);
  doc.autoTable({
    startY: 36,
    head: [["#", ...heads]],
    body,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3, textColor: [9,9,11], font: "helvetica" },
    headStyles: { fillColor:[37,99,235], textColor:[255,255,255], fontStyle:"bold", fontSize:9, cellPadding:4 },
    alternateRowStyles: { fillColor: [248,248,250] },
    columnStyles: { 0: { cellWidth:10, halign:"center", textColor:[113,113,122] } },
    margin: { left:12, right:12 },
    didDrawPage: data => {
      const pg = doc.internal.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(161,161,170);
      doc.text(
        `Página ${data.pageNumber} de ${pg}  ·  FormData Dashboard  ·  ${new Date().toLocaleDateString("es-DO")}`,
        ancho / 2, doc.internal.pageSize.getHeight() - 6, { align: "center" }
      );
    },
  });
}

async function exportarPDF(grupo, columnas, titulo, colGrupo) {
  await cargarjsPDF();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:"landscape", unit:"mm", format:"a4" });
  construirPDF(doc, grupo, columnas, titulo, colGrupo, true);
  doc.save(`${grupo.name.replace(/[^\w\s]/g, "_").slice(0, 48)}.pdf`);
}

async function exportarTodosPDF(grupos, columnas, titulo, colGrupo) {
  await cargarjsPDF();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:"landscape", unit:"mm", format:"a4" });
  grupos.forEach((g, i) => {
    if (i > 0) doc.addPage();
    construirPDF(doc, g, columnas, titulo, colGrupo, i === grupos.length - 1);
  });
  doc.save(`${titulo.replace(/[^\w\s]/g, "_").slice(0, 40)}_todos.pdf`);
}

/* ─── ICONOS ───────────────────────────────────────────────────────────────── */
function Icono({ n, s = 16, c = "currentColor", sw = 1.75 }) {
  const mapa = {
    subir:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>,
    personas:  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
    columnas:  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round"><path d="M12 3h7a2 2 0 012 2v14a2 2 0 01-2 2h-7m0-18H5a2 2 0 00-2 2v14a2 2 0 002 2h7m0-18v18"/></svg>,
    barras:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    capas:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round"><polygon points="12,2 2,7 12,12 22,7"/><polyline points="2,17 12,22 22,17"/><polyline points="2,12 12,17 22,12"/></svg>,
    tabla:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>,
    rejilla:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
    ok:        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.5} strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg>,
    abajo:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round"><polyline points="6,9 12,15 18,9"/></svg>,
    arriba:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round"><polyline points="18,15 12,9 6,15"/></svg>,
    buscar:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    reiniciar: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round"><polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>,
    rayo:      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></svg>,
    etiqueta:  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
    logo:      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 17.5h7M17.5 14v7"/></svg>,
    err:       <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
    info:      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
    pdf:       <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="9" y1="15" x2="15" y2="15"/><line x1="12" y1="12" x2="12" y2="18"/></svg>,
    copiar:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
  };
  return mapa[n] || null;
}

/* ─── ETIQUETAS DE TIPO ────────────────────────────────────────────────────── */
const ETIQ_ESTILOS = {
  google_forms: { bg:"#EFF6FF", bdr:"#93C5FD", c:"#1D4ED8", t:"Google Forms ★" },
  categoria:    { bg:"#F0FDF4", bdr:"#86EFAC", c:"#15803D", t:"Categoría"       },
  numero:       { bg:"#F9FAFB", bdr:"#D1D1D6", c:"#52525B", t:"Numérico"        },
  multi:        { bg:"#FFFBEB", bdr:"#FCD34D", c:"#92400E", t:"Multi-valor"      },
  texto:        { bg:"#FAFAFA", bdr:"#D1D1D6", c:"#52525B", t:"Texto libre"      },
  vacio:        { bg:"#FAFAFA", bdr:"#D1D1D6", c:"#A1A1AA", t:"Vacío"            },
};

function Etiqueta({ tipo }) {
  const e = ETIQ_ESTILOS[tipo] || ETIQ_ESTILOS.texto;
  return (
    <span style={{ background:e.bg, border:`1px solid ${e.bdr}`, color:e.c,
      fontSize:10, fontWeight:700, letterSpacing:"0.04em",
      padding:"2px 9px", borderRadius:100, whiteSpace:"nowrap" }}>
      {e.t}
    </span>
  );
}

/* ─── COMPONENTES REUTILIZABLES ────────────────────────────────────────────── */
function Card({ children, p = "20px 24px", style, onClick, lift }) {
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
        cursor: onClick ? "pointer" : "default",
        boxShadow: hov && lift ? D.shM : D.sh,
        transform: hov && lift && onClick ? "translateY(-2px)" : "none",
        transition: "all 0.16s ease",
        ...style,
      }}>
      {children}
    </div>
  );
}

function KPI({ icono, etiq, valor, acento = D.azul }) {
  return (
    <Card>
      <div style={{ display:"flex", alignItems:"center", gap:16 }}>
        <div style={{ width:48, height:48, borderRadius:13, background:acento+"14",
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <Icono n={icono} s={21} c={acento} />
        </div>
        <div>
          <div style={{ fontSize:28, fontWeight:900, color:D.ink, lineHeight:1, letterSpacing:"-0.8px" }}>{valor}</div>
          <div style={{ fontSize:12, color:D.ink3, marginTop:4, fontWeight:500 }}>{etiq}</div>
        </div>
      </div>
    </Card>
  );
}

function TabBtn({ activo, onClick, icono, label }) {
  return (
    <button onClick={onClick} style={{
      display:"flex", alignItems:"center", gap:7, padding:"7px 15px",
      borderRadius:D.rS, border: activo ? `1px solid ${D.brd}` : "1px solid transparent",
      cursor:"pointer", fontSize:13, fontWeight: activo ? 700 : 500,
      background: activo ? D.surf : "transparent",
      color: activo ? D.ink : D.ink3,
      boxShadow: activo ? D.sh : "none",
      transition:"all 0.12s", fontFamily:D.f,
    }}>
      <Icono n={icono} s={14} c={activo ? D.ink : D.ink4} />
      {label}
    </button>
  );
}

function Barra({ pct, color = D.azul, h = 5 }) {
  return (
    <div style={{ background:"#EBEBF0", borderRadius:100, height:h, overflow:"hidden" }}>
      <div style={{ width:`${Math.min(100, pct)}%`, height:"100%", background:color,
        borderRadius:100, transition:"width 0.5s ease" }} />
    </div>
  );
}

const Tooltip2 = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:D.surf, border:`1px solid ${D.brd}`, borderRadius:D.rS,
      padding:"10px 14px", boxShadow:D.shM, fontFamily:D.f }}>
      <div style={{ fontSize:11, color:D.ink3, marginBottom:3, fontWeight:600 }}>{label}</div>
      <div style={{ fontSize:15, fontWeight:900, color:D.ink }}>{payload[0]?.value?.toLocaleString()}</div>
    </div>
  );
};

function BtnCopiar({ texto }) {
  const [ok, setOk] = useState(false);
  const copiar = async (e) => {
    e.stopPropagation();
    try { await navigator.clipboard.writeText(texto); setOk(true); setTimeout(() => setOk(false), 2000); }
    catch { }
  };
  return (
    <button onClick={copiar}
      style={{ display:"flex", alignItems:"center", gap:5, height:30, padding:"0 11px",
        borderRadius:D.rS, border:`1px solid ${ok ? "#86EFAC" : D.brd2}`,
        background: ok ? "#F0FDF4" : D.surf, color: ok ? "#15803D" : D.ink3,
        fontSize:11, fontWeight:700, cursor:"pointer", transition:"all 0.2s", fontFamily:D.f }}>
      <Icono n={ok ? "ok" : "copiar"} s={13} c={ok ? "#15803D" : D.ink4} />
      {ok ? "¡Copiado!" : "Copiar"}
    </button>
  );
}

function BtnPDF({ onClick, cargando, label = "PDF" }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={e => { e.stopPropagation(); if (!cargando) onClick(); }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      disabled={cargando}
      style={{ display:"flex", alignItems:"center", gap:5, height:30, padding:"0 12px",
        borderRadius:D.rS, border:`1px solid ${hov ? "#93C5FD" : D.brd2}`,
        background: hov ? D.azulS : D.surf, color: hov ? D.azul : D.ink3,
        fontSize:11, fontWeight:700, cursor: cargando ? "not-allowed" : "pointer",
        transition:"all 0.18s", opacity: cargando ? 0.6 : 1, fontFamily:D.f }}>
      <Icono n="pdf" s={13} c={hov ? D.azul : D.ink4} />
      {cargando ? "Generando…" : label}
    </button>
  );
}

/* ─── PANTALLA: CARGA ──────────────────────────────────────────────────────── */
function PantallaCarga({ alCargar }) {
  const [drag, setDrag] = useState(false);
  const [err, setErr]   = useState(null);
  const ref = useRef();

  const procesar = f => {
    if (!f) return;
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) { setErr("Solo se aceptan .xlsx, .xls o .csv"); return; }
    setErr(null); alCargar(f);
  };

  return (
    <div style={{ minHeight:"100vh", background:D.bg, display:"flex",
      alignItems:"center", justifyContent:"center", padding:32, fontFamily:D.f }}>
      <div style={{ width:"100%", maxWidth:500 }}>

        <div style={{ textAlign:"center", marginBottom:44 }}>
          <div style={{ display:"inline-flex", alignItems:"center", justifyContent:"center",
            width:72, height:72, borderRadius:22, background:D.ink, boxShadow:"0 8px 32px rgba(9,9,11,0.22)",
            marginBottom:28 }}>
            <Icono n="logo" s={34} c="#fff" />
          </div>
          <h1 style={{ fontSize:38, fontWeight:900, color:D.ink, margin:"0 0 12px",
            letterSpacing:"-1.5px", lineHeight:1.05 }}>
            FormData<br/>Dashboard
          </h1>
          <p style={{ fontSize:16, color:D.ink3, margin:0, lineHeight:1.7 }}>
            Carga tu Excel de Google Forms y obtén análisis,<br/>
            visualizaciones y PDFs por grupo al instante
          </p>
        </div>

        <div
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); procesar(e.dataTransfer.files[0]); }}
          onClick={() => ref.current.click()}
          style={{ border:`2px dashed ${drag ? D.ink : D.brd}`, borderRadius:16,
            padding:"44px 32px", textAlign:"center", cursor:"pointer",
            background: drag ? "#EBEBF5" : D.surf,
            boxShadow: drag ? D.shM : D.sh, transition:"all 0.2s" }}>
          <div style={{ width:56, height:56, borderRadius:15,
            background: drag ? D.ink : "#F0F0F5",
            border:`1px solid ${drag ? D.ink : D.brd2}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            margin:"0 auto 18px", transition:"all 0.2s" }}>
            <Icono n="subir" s={24} c={drag ? "#fff" : D.ink3} />
          </div>
          <p style={{ fontSize:16, fontWeight:800, color:D.ink, margin:"0 0 6px" }}>
            {drag ? "¡Suelta el archivo!" : "Arrastra tu archivo aquí"}
          </p>
          <p style={{ fontSize:13, color:D.ink4, margin:0 }}>
            o haz clic para seleccionar · .xlsx · .xls · .csv
          </p>
          <input ref={ref} type="file" accept=".xlsx,.xls,.csv"
            style={{ display:"none" }} onChange={e => procesar(e.target.files[0])} />
        </div>

        {err && (
          <div style={{ marginTop:10, padding:"10px 14px", borderRadius:D.rS,
            background:"#FEF2F2", border:"1px solid #FCA5A5", color:"#991B1B",
            fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:8 }}>
            <Icono n="err" s={14} c="#DC2626" />{err}
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginTop:16 }}>
          {[
            { i:"rayo",   t:"Parser inteligente", s:"Entiende Google Forms" },
            { i:"capas",  t:"Grupos automáticos",  s:"Detecta y separa bien" },
            { i:"pdf",    t:"Exportar a PDF",       s:"Por grupo o todos juntos" },
          ].map(f => (
            <div key={f.t} style={{ background:D.surf, border:`1px solid ${D.brd2}`,
              borderRadius:D.r, padding:"16px 14px", textAlign:"center", boxShadow:D.sh }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"#F0F0F5",
                display:"flex", alignItems:"center", justifyContent:"center",
                margin:"0 auto 10px" }}>
                <Icono n={f.i} s={18} c={D.ink2} />
              </div>
              <div style={{ fontSize:12, fontWeight:800, color:D.ink, marginBottom:3 }}>{f.t}</div>
              <div style={{ fontSize:11, color:D.ink4, lineHeight:1.4 }}>{f.s}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── PANTALLA: CONFIGURAR ─────────────────────────────────────────────────── */
function PantallaConfig({ workbook, alConfirmar }) {
  const hojas = workbook.SheetNames;
  const [hoja,  setHoja]  = useState(hojas[0]);
  const [busq,  setBusq]  = useState("");
  const [sobre, setSobre] = useState({});

  const { filas, base, cabeceras } = useMemo(() => {
    const ws  = workbook.Sheets[hoja];
    const raw = XLSX.utils.sheet_to_json(ws, { defval:"" });
    if (!raw.length) return { filas:[], base:{}, cabeceras:[] };
    const hs = Object.keys(raw[0]);
    const b  = {};
    for (const h of hs) {
      const vals = raw.map(r => r[h]);
      b[h] = { clave:h, visible:true, tipo:tipoCol(vals),
        relleno: vals.filter(v => v !== "" && v != null).length,
        total: raw.length,
        muestra: vals.filter(v => v !== "" && v != null).slice(0,2).map(String) };
    }
    return { filas:raw, base:b, cabeceras:hs };
  }, [hoja, workbook]);

  const cols = useMemo(() => {
    const m = {};
    for (const h of cabeceras) m[h] = { ...base[h], ...(sobre[h]||{}) };
    return m;
  }, [cabeceras, base, sobre]);

  const toggl  = h => setSobre(p => ({ ...p, [h]:{ ...(p[h]||{}), visible:!cols[h].visible } }));
  const todoOn = v => { const n={}; cabeceras.forEach(h => n[h]={...(sobre[h]||{}), visible:v}); setSobre(n); };

  const mostrar = cabeceras.filter(h => h.toLowerCase().includes(busq.toLowerCase()));
  const vis     = cabeceras.filter(h => cols[h]?.visible).length;
  const gfN     = cabeceras.filter(h => cols[h]?.tipo === "google_forms").length;

  return (
    <div style={{ minHeight:"100vh", background:D.bg, padding:"28px 24px", fontFamily:D.f }}>
      <div style={{ maxWidth:660, margin:"0 auto" }}>

        <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:28 }}>
          <div style={{ width:50, height:50, borderRadius:14, background:D.ink,
            display:"flex", alignItems:"center", justifyContent:"center", boxShadow:D.shM }}>
            <Icono n="columnas" s={23} c="#fff" />
          </div>
          <div>
            <h2 style={{ margin:0, fontSize:22, fontWeight:900, color:D.ink, letterSpacing:"-0.5px" }}>
              Seleccionar columnas
            </h2>
            <p style={{ margin:"3px 0 0", fontSize:13, color:D.ink3 }}>
              {filas.length.toLocaleString()} registros · {cabeceras.length} columnas
              {gfN > 0 && ` · ${gfN} Google Forms ★`}
            </p>
          </div>
        </div>

        {hojas.length > 1 && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:10, fontWeight:800, color:D.ink4, textTransform:"uppercase",
              letterSpacing:"0.1em", marginBottom:7 }}>Hoja del archivo</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {hojas.map(s => (
                <button key={s} onClick={() => { setHoja(s); setSobre({}); }}
                  style={{ padding:"6px 14px", borderRadius:D.rS, cursor:"pointer",
                    fontSize:13, fontWeight:700, fontFamily:D.f,
                    border:`1px solid ${hoja===s ? D.ink : D.brd2}`,
                    background: hoja===s ? D.ink : D.surf,
                    color: hoja===s ? "#fff" : D.ink3 }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {gfN > 0 && (
          <div style={{ background:D.azulS, border:"1px solid #93C5FD", borderRadius:D.rS,
            padding:"12px 16px", marginBottom:16, display:"flex", gap:11, alignItems:"flex-start" }}>
            <Icono n="rayo" s={16} c="#1D4ED8" />
            <div style={{ fontSize:13, color:"#1E40AF", lineHeight:1.55, fontWeight:500 }}>
              <strong>Google Forms detectado en {gfN} columna{gfN>1?"s":""}.</strong>{" "}
              Cada actividad se separará de su horario y aula automáticamente.
            </div>
          </div>
        )}

        <Card p="12px 14px" style={{ marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
            <div style={{ flex:1, position:"relative" }}>
              <div style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)" }}>
                <Icono n="buscar" s={14} c={D.ink4} />
              </div>
              <input value={busq} onChange={e => setBusq(e.target.value)} placeholder="Buscar columnas..."
                style={{ width:"100%", boxSizing:"border-box", height:36, paddingLeft:32,
                  border:`1px solid ${D.brd2}`, borderRadius:D.rS, fontSize:13, color:D.ink,
                  background:D.bg, outline:"none", fontFamily:D.f }} />
            </div>
            {[["Todas",true],["Ninguna",false]].map(([l,v]) => (
              <button key={l} onClick={() => todoOn(v)}
                style={{ height:36, padding:"0 13px", borderRadius:D.rS, fontSize:12,
                  fontWeight:700, cursor:"pointer", border:`1px solid ${D.brd2}`,
                  background:D.surf, color:D.ink2, fontFamily:D.f }}>
                {l}
              </button>
            ))}
            <span style={{ fontSize:13, color:D.ink3, fontWeight:800, whiteSpace:"nowrap",
              background:"#F0F0F5", padding:"6px 12px", borderRadius:D.rS }}>
              {vis}/{cabeceras.length}
            </span>
          </div>
        </Card>

        <Card p="6px" style={{ marginBottom:18 }}>
          {mostrar.map(h => {
            const m = cols[h]; if (!m) return null;
            const on = m.visible;
            return (
              <div key={h} onClick={() => toggl(h)}
                style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 13px",
                  borderRadius:D.rS, cursor:"pointer", marginBottom:2, transition:"all 0.11s",
                  background: on ? "#EFF6FF" : "transparent",
                  border:`1px solid ${on ? "#93C5FD" : "transparent"}` }}>
                <div style={{ width:20, height:20, borderRadius:6, flexShrink:0,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  background: on ? D.ink : D.surf,
                  border:`1.5px solid ${on ? D.ink : D.brd}`, transition:"all 0.11s" }}>
                  {on && <Icono n="ok" s={11} c="#fff" />}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:D.ink,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{h}</div>
                  <div style={{ fontSize:11, color:D.ink4, overflow:"hidden",
                    textOverflow:"ellipsis", whiteSpace:"nowrap", marginTop:1 }}>
                    {(m.muestra[0]||"").slice(0, 75)}
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:9, flexShrink:0 }}>
                  <Etiqueta tipo={m.tipo} />
                  <span style={{ fontSize:11, color:D.ink4, fontWeight:600 }}>
                    {Math.round(m.relleno/m.total*100)}%
                  </span>
                </div>
              </div>
            );
          })}
        </Card>

        <button disabled={vis===0} onClick={() => alConfirmar({ hoja, filas, cols })}
          style={{ width:"100%", height:52, borderRadius:13, border:"none",
            background: vis>0 ? D.ink : D.brd, color:"#fff",
            fontSize:16, fontWeight:800, cursor: vis>0 ? "pointer" : "not-allowed",
            display:"flex", alignItems:"center", justifyContent:"center", gap:10,
            fontFamily:D.f, boxShadow: vis>0 ? D.shM : "none", transition:"all 0.18s" }}>
          <Icono n="barras" s={18} c="#fff" />
          Generar Dashboard · {vis} columna{vis!==1?"s":""}
        </button>
      </div>
    </div>
  );
}

/* ─── PANTALLA: DASHBOARD ──────────────────────────────────────────────────── */
function PantallaDash({ hoja, filas, cols, alReiniciar }) {
  const [tab,    setTab]    = useState("resumen");
  const [colGr,  setColGr]  = useState(null);
  const [abierto,setAbierto]= useState(null);
  const [busqT,  setBusqT]  = useState("");
  const [busqG,  setBusqG]  = useState("");
  const [cargPDF,setCargPDF]= useState({});
  const [cargAll,setCargAll]= useState(false);

  const vc = useMemo(() => Object.values(cols).filter(c => c.visible), [cols]);

  useEffect(() => {
    if (!colGr) {
      const f = vc.find(c => c.tipo==="google_forms")
             || vc.find(c => c.tipo==="categoria")
             || vc.find(c => c.tipo==="multi");
      if (f) setColGr(f.clave);
    }
  }, [vc]);

  const grupos = useMemo(() => {
    if (!colGr) return [];
    const t = cols[colGr]?.tipo || "texto";
    const m = {};
    for (const fila of filas) {
      for (const item of parsearItems(fila[colGr], t)) {
        if (!item || /^cancelad/i.test(item)) continue;
        if (!m[item]) m[item] = [];
        m[item].push(fila);
      }
    }
    return Object.entries(m)
      .map(([name, members]) => ({ name, count:members.length, members }))
      .sort((a,b) => b.count - a.count);
  }, [colGr, filas, cols]);

  const gruposFiltrados = useMemo(() => {
    if (!busqG.trim()) return grupos;
    const q = busqG.toLowerCase();
    return grupos.filter(g => g.name.toLowerCase().includes(q));
  }, [grupos, busqG]);

  const colStats = useMemo(() =>
    vc.map(c => {
      const vals = filas.map(r => r[c.clave]).filter(v => v !== "" && v != null);
      const cnt  = {};
      for (const v of vals) for (const it of parsearItems(v, c.tipo)) if (it) cnt[it]=(cnt[it]||0)+1;
      const top = Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,10);
      return { ...c, relleno:vals.length, unicos:Object.keys(cnt).length,
        pct:Math.round(vals.length/filas.length*100), top };
    }), [vc, filas]);

  const chartCols = useMemo(() =>
    colStats.filter(c => ["google_forms","categoria","multi"].includes(c.tipo) && c.top.length).slice(0,4),
    [colStats]);

  const filasF = useMemo(() => {
    if (!busqT.trim()) return filas;
    const q = busqT.toLowerCase();
    return filas.filter(r => vc.some(c => String(r[c.clave]??"").toLowerCase().includes(q)));
  }, [filas, busqT, vc]);

  const ngc = vc.filter(c => c.clave !== colGr);

  const textoGrupo = g => {
    const cab = ngc.map(c => c.clave).join("\t");
    const rows = g.members.map((m,i) => [i+1, ...ngc.map(c => String(m[c.clave]??""))].join("\t"));
    return `${g.name}\n${cab}\n${rows.join("\n")}`;
  };

  const handlePDF = async (g, i) => {
    setCargPDF(p => ({ ...p, [i]:true }));
    try { await exportarPDF(g, ngc, hoja, colGr||""); }
    catch(e) { alert("Error generando PDF: " + e.message); }
    setCargPDF(p => ({ ...p, [i]:false }));
  };

  const handleTodosPDF = async () => {
    setCargAll(true);
    try { await exportarTodosPDF(grupos, ngc, hoja, colGr||""); }
    catch(e) { alert("Error: " + e.message); }
    setCargAll(false);
  };

  const TH = { padding:"10px 14px", fontSize:10, fontWeight:800, letterSpacing:"0.07em",
    textTransform:"uppercase", color:D.ink3, background:"#F8F8FA",
    textAlign:"left", borderBottom:`1px solid ${D.brd2}`, whiteSpace:"nowrap" };

  const TD = ev => ({ padding:"9px 14px", fontSize:13, color:D.ink, fontWeight:400,
    background: ev ? D.surf : "#FAFAFA", borderBottom:`1px solid ${D.brd2}`,
    maxWidth:220, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" });

  return (
    <div style={{ minHeight:"100vh", background:D.bg, fontFamily:D.f }}>

      {/* NAV */}
      <div style={{ background:D.surf, borderBottom:`1px solid ${D.brd2}`,
        position:"sticky", top:0, zIndex:100, boxShadow:D.sh }}>
        <div style={{ maxWidth:1280, margin:"0 auto", padding:"0 24px", height:58,
          display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:D.ink,
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Icono n="logo" s={18} c="#fff" />
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:900, color:D.ink, letterSpacing:"-0.3px" }}>{hoja}</div>
              <div style={{ fontSize:11, color:D.ink4, fontWeight:500 }}>
                {filas.length.toLocaleString()} registros · {vc.length} columnas activas
              </div>
            </div>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:3,
            background:D.bg, padding:4, borderRadius:11, border:`1px solid ${D.brd2}` }}>
            {[["resumen","barras","Resumen"],["grupos","capas","Grupos"],
              ["tabla","tabla","Tabla"],["columnas","rejilla","Columnas"]].map(
              ([id,ic,lb]) => <TabBtn key={id} activo={tab===id} onClick={() => setTab(id)} icono={ic} label={lb} />
            )}
          </div>

          <button onClick={alReiniciar}
            style={{ display:"flex", alignItems:"center", gap:7, height:36, padding:"0 14px",
              borderRadius:D.rS, border:`1px solid ${D.brd2}`, background:D.surf,
              color:D.ink3, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:D.f }}>
            <Icono n="reiniciar" s={13} c={D.ink4} /> Nuevo archivo
          </button>
        </div>
      </div>

      <div style={{ maxWidth:1280, margin:"0 auto", padding:"24px",
        display:"flex", flexDirection:"column", gap:18 }}>

        {/* ══ RESUMEN ══ */}
        {tab === "resumen" && <>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
            <KPI icono="personas" etiq="Total registros"    valor={filas.length.toLocaleString()} acento="#0891B2" />
            <KPI icono="columnas" etiq="Columnas activas"   valor={vc.length}                     acento={D.ink} />
            <KPI icono="rayo"     etiq="Cols. Google Forms" valor={vc.filter(c=>c.tipo==="google_forms").length} acento="#7C3AED" />
            <KPI icono="etiqueta" etiq="Grupos detectados"  valor={grupos.length}                  acento="#059669" />
          </div>

          {chartCols.length > 0 && (
            <Card>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, flexWrap:"wrap", gap:10 }}>
                <div>
                  <div style={{ fontSize:18, fontWeight:900, color:D.ink, letterSpacing:"-0.4px" }}>
                    Distribución de participantes
                  </div>
                  <div style={{ fontSize:13, color:D.ink3, marginTop:3 }}>
                    Parser Google Forms · cada actividad separada correctamente
                  </div>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns: chartCols.length>=2 ? "1fr 1fr" : "1fr", gap:24 }}>
                {chartCols.map(({ clave, top }, ci) => {
                  const data = top.slice(0,10).map(([nombre,valor]) => ({
                    nombre: nombre.length>28 ? nombre.slice(0,26)+"…" : nombre, valor
                  }));
                  return (
                    <div key={clave} style={{ background:"#F8F8FA", borderRadius:D.rS, padding:"16px 18px" }}>
                      <div style={{ fontSize:11, fontWeight:800, color:D.ink2, marginBottom:14,
                        textTransform:"uppercase", letterSpacing:"0.07em",
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {clave}
                      </div>
                      <ResponsiveContainer width="100%" height={data.length*32+10}>
                        <BarChart data={data} layout="vertical" margin={{ left:0, right:40, top:0, bottom:0 }}>
                          <XAxis type="number" tick={{ fill:D.ink4, fontSize:10, fontFamily:D.f }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="nombre" width={156}
                            tick={{ fill:D.ink2, fontSize:11, fontWeight:600, fontFamily:D.f }}
                            axisLine={false} tickLine={false} />
                          <Tooltip content={<Tooltip2 />} cursor={{ fill:"#EAEAF5" }} />
                          <Bar dataKey="valor" radius={[0,7,7,0]}>
                            {data.map((_,i) => <Cell key={i} fill={COLORES[(ci*4+i)%COLORES.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          <Card>
            <div style={{ fontSize:18, fontWeight:900, color:D.ink, letterSpacing:"-0.4px", marginBottom:18 }}>
              Análisis rápido por columna
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
              {colStats.filter(c => c.top.length>0).slice(0,6).map((c,ci) => (
                <div key={c.clave} style={{ background:"#F8F8FA", borderRadius:D.rS,
                  padding:"16px 18px", border:`1px solid ${D.brd2}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", gap:6, marginBottom:12 }}>
                    <div style={{ fontSize:12, fontWeight:800, color:D.ink,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>
                      {c.clave.length>24 ? c.clave.slice(0,22)+"…" : c.clave}
                    </div>
                    <Etiqueta tipo={c.tipo} />
                  </div>
                  <div style={{ marginBottom:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <span style={{ fontSize:11, color:D.ink4, fontWeight:600 }}>Relleno</span>
                      <span style={{ fontSize:11, fontWeight:900, color:D.ink2 }}>{c.pct}%</span>
                    </div>
                    <Barra pct={c.pct} color={COLORES[ci%COLORES.length]} h={5} />
                  </div>
                  {c.top.slice(0,5).map(([v,n]) => (
                    <div key={v} style={{ marginBottom:7 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                        <span style={{ fontSize:12, color:D.ink2, fontWeight:500, flex:1,
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"76%" }}>
                          {v.length>24 ? v.slice(0,22)+"…" : v}
                        </span>
                        <span style={{ fontSize:12, fontWeight:900, color:COLORES[ci%COLORES.length] }}>{n}</span>
                      </div>
                      <Barra pct={n/filas.length*100} color={COLORES[ci%COLORES.length]} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </Card>
        </>}

        {/* ══ GRUPOS ══ */}
        {tab === "grupos" && <>
          <Card p="18px 22px">
            <div style={{ display:"flex", alignItems:"flex-end", gap:20, flexWrap:"wrap" }}>
              <div style={{ flex:1, minWidth:280 }}>
                <div style={{ fontSize:10, fontWeight:800, color:D.ink4, textTransform:"uppercase",
                  letterSpacing:"0.1em", marginBottom:7 }}>Agrupar participantes por columna</div>
                <select value={colGr||""} onChange={e => { setColGr(e.target.value||null); setAbierto(null); }}
                  style={{ width:"100%", height:40, paddingLeft:12, paddingRight:36,
                    border:`1px solid ${D.brd}`, borderRadius:D.rS, fontSize:13, fontWeight:600,
                    color:D.ink, background:D.surf, outline:"none", fontFamily:D.f }}>
                  <option value="">— Seleccionar columna —</option>
                  {vc.map(c => (
                    <option key={c.clave} value={c.clave}>
                      {(c.clave.length>60 ? c.clave.slice(0,58)+"…" : c.clave) +
                        (c.tipo==="google_forms" ? " ★" : "")}
                    </option>
                  ))}
                </select>
              </div>
              {grupos.length > 0 && (
                <>
                  <div style={{ display:"flex", gap:24 }}>
                    {[["Grupos",grupos.length,D.ink],
                      ["Inscripciones",grupos.reduce((s,g)=>s+g.count,0).toLocaleString(),D.azul]
                    ].map(([l,v,col]) => (
                      <div key={l} style={{ textAlign:"center" }}>
                        <div style={{ fontSize:28, fontWeight:900, color:col, letterSpacing:"-0.8px" }}>{v}</div>
                        <div style={{ fontSize:11, color:D.ink4, fontWeight:600 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  <BtnPDF onClick={handleTodosPDF} cargando={cargAll}
                    label={`Exportar todos (${grupos.length})`} />
                </>
              )}
            </div>
            {grupos.length > 0 && (
              <div style={{ marginTop:14, position:"relative" }}>
                <div style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)" }}>
                  <Icono n="buscar" s={14} c={D.ink4} />
                </div>
                <input value={busqG} onChange={e => setBusqG(e.target.value)}
                  placeholder="Buscar grupo por nombre…"
                  style={{ width:"100%", boxSizing:"border-box", height:36, paddingLeft:32,
                    border:`1px solid ${D.brd2}`, borderRadius:D.rS, fontSize:13, color:D.ink,
                    background:D.bg, outline:"none", fontFamily:D.f }} />
              </div>
            )}
          </Card>

          {!colGr && (
            <div style={{ textAlign:"center", padding:"72px 0" }}>
              <div style={{ width:64, height:64, borderRadius:18, background:"#F0F0F5",
                display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
                <Icono n="capas" s={30} c={D.brd} />
              </div>
              <div style={{ fontSize:16, fontWeight:800, color:D.ink3 }}>Selecciona una columna</div>
              <div style={{ fontSize:13, marginTop:5, color:D.ink4 }}>
                Las columnas con ★ se procesan con el parser de Google Forms
              </div>
            </div>
          )}

          {colGr && grupos.length>0 && grupos.length<=35 && (
            <Card>
              <div style={{ fontSize:11, fontWeight:800, color:D.ink2, marginBottom:14,
                textTransform:"uppercase", letterSpacing:"0.07em" }}>
                Participantes por grupo
              </div>
              <ResponsiveContainer width="100%" height={Math.min(gruposFiltrados.length*30+10, 500)}>
                <BarChart
                  data={gruposFiltrados.map(g => ({
                    n: g.name.length>34 ? g.name.slice(0,32)+"…" : g.name, v:g.count
                  }))}
                  layout="vertical" margin={{ left:0, right:44, top:0, bottom:0 }}>
                  <XAxis type="number" tick={{ fill:D.ink4, fontSize:10, fontFamily:D.f }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="n" width={180}
                    tick={{ fill:D.ink2, fontSize:11, fontWeight:600, fontFamily:D.f }}
                    axisLine={false} tickLine={false} />
                  <Tooltip content={<Tooltip2 />} cursor={{ fill:"#F0F0F5" }} />
                  <Bar dataKey="v" radius={[0,7,7,0]}>
                    {gruposFiltrados.map((_,i) => <Cell key={i} fill={COLORES[i%COLORES.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {gruposFiltrados.map((g, gi) => {
              const abt   = abierto === gi;
              const color = COLORES[gi % COLORES.length];
              return (
                <Card key={gi} p="0" lift onClick={() => setAbierto(abt ? null : gi)}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:"14px 20px", gap:14 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:14, minWidth:0, flex:1 }}>
                      <div style={{ width:38, height:38, borderRadius:11,
                        background:color+"14", border:`1.5px solid ${color}30`,
                        display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <div style={{ width:13, height:13, borderRadius:"50%", background:color }} />
                      </div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:800, color:D.ink,
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {g.name}
                        </div>
                        <div style={{ fontSize:11, color:D.ink4, marginTop:2, fontWeight:600 }}>
                          {g.count} participante{g.count!==1?"s":""}
                        </div>
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                      <span style={{ background:color+"18", color, fontSize:15,
                        fontWeight:900, padding:"2px 13px", borderRadius:100 }}>
                        {g.count}
                      </span>
                      <BtnCopiar texto={textoGrupo(g)} />
                      <BtnPDF onClick={() => handlePDF(g, gi)} cargando={!!cargPDF[gi]} />
                      <Icono n={abt ? "arriba" : "abajo"} s={17} c={D.ink4} />
                    </div>
                  </div>

                  {abt && ngc.length > 0 && (
                    <div style={{ borderTop:`1px solid ${D.brd2}`, overflowX:"auto" }}
                      onClick={e => e.stopPropagation()}>
                      <div style={{ padding:"10px 20px 8px", background:color+"08",
                        borderBottom:`1px solid ${D.brd2}`,
                        display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ fontSize:11, fontWeight:800, color,
                          textTransform:"uppercase", letterSpacing:"0.06em" }}>
                          {g.name}
                        </span>
                        <span style={{ fontSize:11, color:D.ink4, fontWeight:600 }}>
                          {g.count} participante{g.count!==1?"s":""}
                        </span>
                      </div>
                      <table style={{ width:"100%", borderCollapse:"collapse" }}>
                        <thead>
                          <tr>
                            <th style={{ ...TH, textAlign:"center", width:42 }}>#</th>
                            {ngc.map(c => (
                              <th key={c.clave} style={{ ...TH, minWidth:130 }}>
                                {c.clave.length>22 ? c.clave.slice(0,20)+"…" : c.clave}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {g.members.map((m, mi) => (
                            <tr key={mi}>
                              <td style={{ ...TD(mi%2===0), textAlign:"center",
                                color:D.ink4, width:42, fontWeight:700, fontSize:11 }}>{mi+1}</td>
                              {ngc.map(c => (
                                <td key={c.clave} title={String(m[c.clave]??"")} style={TD(mi%2===0)}>
                                  {String(m[c.clave]??"—")}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>}

        {/* ══ TABLA ══ */}
        {tab === "tabla" && <>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ flex:1, position:"relative" }}>
              <div style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }}>
                <Icono n="buscar" s={15} c={D.ink4} />
              </div>
              <input value={busqT} onChange={e => setBusqT(e.target.value)}
                placeholder="Buscar en todos los campos visibles…"
                style={{ width:"100%", boxSizing:"border-box", height:42, paddingLeft:38,
                  border:`1px solid ${D.brd}`, borderRadius:11, fontSize:14, color:D.ink,
                  background:D.surf, outline:"none", boxShadow:D.sh, fontFamily:D.f }} />
            </div>
            <div style={{ background:D.surf, border:`1px solid ${D.brd2}`, borderRadius:D.rS,
              padding:"8px 14px", boxShadow:D.sh, whiteSpace:"nowrap" }}>
              <span style={{ fontSize:13, color:D.ink, fontWeight:900 }}>
                {filasF.length.toLocaleString()}
              </span>
              <span style={{ fontSize:12, color:D.ink4, fontWeight:500 }}>
                {" "}de {filas.length.toLocaleString()}
              </span>
            </div>
          </div>
          <Card p="0" style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...TH, textAlign:"center", width:46 }}>#</th>
                  {vc.map(c => (
                    <th key={c.clave} style={{ ...TH, minWidth:140 }}>
                      {c.clave.length>22 ? c.clave.slice(0,20)+"…" : c.clave}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filasF.slice(0, 300).map((fila, ri) => (
                  <tr key={ri}>
                    <td style={{ ...TD(ri%2===0), textAlign:"center",
                      color:D.ink4, width:46, fontWeight:800, fontSize:11 }}>{ri+1}</td>
                    {vc.map(c => (
                      <td key={c.clave} title={String(fila[c.clave]??"")} style={TD(ri%2===0)}>
                        {String(fila[c.clave]??"—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {filasF.length > 300 && (
              <div style={{ textAlign:"center", padding:"14px", color:D.ink4, fontSize:12,
                fontWeight:600, borderTop:`1px solid ${D.brd2}`, background:"#F8F8FA" }}>
                Mostrando 300 de {filasF.length.toLocaleString()} · usa el buscador para filtrar
              </div>
            )}
          </Card>
        </>}

        {/* ══ COLUMNAS ══ */}
        {tab === "columnas" && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
            {colStats.map((c, ci) => (
              <Card key={c.clave}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between",
                  gap:10, marginBottom:14 }}>
                  <div style={{ fontSize:13, fontWeight:900, color:D.ink, flex:1,
                    wordBreak:"break-word", lineHeight:1.45 }}>
                    {c.clave}
                  </div>
                  <Etiqueta tipo={c.tipo} />
                </div>
                <div style={{ marginBottom:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                    <span style={{ fontSize:11, color:D.ink4, fontWeight:600 }}>Datos rellenos</span>
                    <span style={{ fontSize:12, fontWeight:900, color:D.ink2 }}>{c.pct}%</span>
                  </div>
                  <Barra pct={c.pct} color={COLORES[ci%COLORES.length]} h={6} />
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12,
                  padding:"8px 12px", background:"#F8F8FA", borderRadius:D.rS }}>
                  <span style={{ fontSize:12, color:D.ink4, fontWeight:600 }}>Valores únicos</span>
                  <span style={{ fontSize:12, fontWeight:900, color:D.ink }}>{c.unicos.toLocaleString()}</span>
                </div>
                {c.top.length > 0 && (
                  <div style={{ borderTop:`1px solid ${D.brd2}`, paddingTop:12 }}>
                    <div style={{ fontSize:10, fontWeight:800, textTransform:"uppercase",
                      letterSpacing:"0.1em", color:D.ink4, marginBottom:9 }}>
                      Más frecuentes
                    </div>
                    {c.top.slice(0,5).map(([v,n]) => (
                      <div key={v} style={{ marginBottom:7 }}>
                        <div style={{ display:"flex", justifyContent:"space-between",
                          alignItems:"center", marginBottom:4 }}>
                          <span style={{ fontSize:12, color:D.ink2, fontWeight:500, flex:1,
                            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"80%" }}>
                            {v.length>28 ? v.slice(0,26)+"…" : v}
                          </span>
                          <span style={{ fontSize:13, fontWeight:900, color:COLORES[ci%COLORES.length],
                            marginLeft:10, flexShrink:0 }}>{n}</span>
                        </div>
                        <Barra pct={n/filas.length*100} color={COLORES[ci%COLORES.length]} />
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

/* ─── RAÍZ ─────────────────────────────────────────────────────────────────── */
export default function App() {
  const [etapa, setEtapa] = useState("carga");
  const [wb,    setWb]    = useState(null);
  const [dash,  setDash]  = useState(null);

  const alCargar = useCallback(f => {
    const r = new FileReader();
    r.onload = e => {
      try {
        const wb2 = XLSX.read(new Uint8Array(e.target.result), { type:"array", cellDates:true });
        setWb(wb2); setEtapa("configurar");
      } catch(er) { alert("Error al leer el archivo: " + er.message); }
    };
    r.onerror = () => alert("No se pudo leer el archivo.");
    r.readAsArrayBuffer(f);
  }, []);

  const alConfirmar = useCallback(d => { setDash(d); setEtapa("dashboard"); }, []);
  const alReiniciar = useCallback(() => { setEtapa("carga"); setWb(null); setDash(null); }, []);

  if (etapa === "carga")      return <PantallaCarga   alCargar={alCargar} />;
  if (etapa === "configurar") return <PantallaConfig  workbook={wb} alConfirmar={alConfirmar} />;
  if (etapa === "dashboard")  return <PantallaDash    {...dash} alReiniciar={alReiniciar} />;
  return null;
}
