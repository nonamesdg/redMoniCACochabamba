/* charts.js — Gráfico de serie temporal dibujado en SVG (sin librerías externas) */
(function () {
  'use strict';
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  function dia(f) { return Math.round(Date.parse(f + 'T00:00:00Z') / 864e5); }           // fecha -> número de día
  function etiqueta(d) { var f = new Date(d * 864e5); return f.getUTCDate() + ' ' + MESES[f.getUTCMonth()]; }
  function escapar(t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function paso(x) {                                                                      // paso "redondo" para el eje Y
    var p = Math.pow(10, Math.floor(Math.log10(x))), r = x / p;
    return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 5 ? 5 : 10) * p;
  }

  /* Dibuja la serie en el elemento <svg>. datos: [{fecha, valor}] ordenados; meta: {nombre, unidad, ref} */
  function dibujar(svg, datos, meta) {
    var W = 760, H = 340, m = { t: 24, r: 24, b: 58, l: 66 }, iw = W - m.l - m.r, ih = H - m.t - m.b;
    var pts = datos.map(function (d) { return { dia: dia(d.fecha), v: d.valor, f: d.fecha }; });
    var t0 = pts[0].dia, t1 = pts[pts.length - 1].dia, span = Math.max(1, t1 - t0);
    var max = Math.max.apply(null, pts.map(function (p) { return p.v; }).concat(meta.ref || 0));
    var pa = paso(max * 1.1 / 5), top = pa * Math.ceil(max * 1.1 / pa);
    function X(d) { return t1 === t0 ? m.l + iw / 2 : m.l + (d - t0) / span * iw; }
    function Y(v) { return m.t + ih - v / top * ih; }
    var s = '<g class="ejes">';
    for (var v = 0; v <= top + 1e-9; v += pa) {                                           // líneas y marcas del eje Y
      s += '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/><text x="' + (m.l - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + (Math.round(v * 10) / 10) + '</text>';
    }
    var cada = Math.ceil((span + 1) / 8);
    for (var d = t0; d <= t1; d += cada) {                                                // marcas del eje X
      s += '<text x="' + X(d) + '" y="' + (H - m.b + 18) + '" text-anchor="middle">' + etiqueta(d) + '</text>';
    }
    s += '</g>';
    if (meta.ref) {                                                                        // línea de referencia OMS 2021
      s += '<line class="ref-linea" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + Y(meta.ref) + '" y2="' + Y(meta.ref) + '"/>' +
           '<text class="etq-eje" x="' + (W - m.r) + '" y="' + (Y(meta.ref) - 6) + '" text-anchor="end">Referencia OMS 2021 (24 h): ' + meta.ref + '</text>';
    }
    var seg = [], act = [];                                                                // tramos continuos (sin unir días faltantes)
    pts.forEach(function (p, i) { if (i && p.dia - pts[i - 1].dia > 1) { seg.push(act); act = []; } act.push(p); });
    seg.push(act);
    seg.forEach(function (sg) {
      var linea = sg.map(function (p) { return X(p.dia) + ',' + Y(p.v); }).join(' ');
      if (sg.length > 1) {
        s += '<polygon class="serie-area" points="' + X(sg[0].dia) + ',' + Y(0) + ' ' + linea + ' ' + X(sg[sg.length - 1].dia) + ',' + Y(0) + '"/>' +
             '<polyline class="serie-linea" points="' + linea + '"/>';
      }
    });
    pts.forEach(function (p) {
      s += '<circle class="serie-punto" cx="' + X(p.dia) + '" cy="' + Y(p.v) + '" r="4"><title>' + escapar(p.f + ': ' + p.v + ' ' + meta.unidad) + '</title></circle>';
    });
    s += '<text class="etq-eje" x="' + (m.l + iw / 2) + '" y="' + (H - 8) + '" text-anchor="middle">Fecha</text>' +
         '<text class="etq-eje" transform="translate(16 ' + (m.t + ih / 2) + ') rotate(-90)" text-anchor="middle">Concentración (' + escapar(meta.unidad) + ')</text>';
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.innerHTML = s;
  }

  function limpiar(svg) { svg.innerHTML = ''; }
  window.Grafico = { dibujar: dibujar, limpiar: limpiar };
})();
