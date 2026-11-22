/* app.js — Lógica principal: filtros, validación, cálculos, ICA y actualización de la interfaz */
(function () {
  'use strict';
  var D = window.DATOS, C = D.contaminantes, CFG = window.CONFIG;
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function $(s) { return document.querySelector(s); }

  /* ---------- Utilidades ---------- */
  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmtFecha(s) { var p = s.split('-'); return Number(p[2]) + ' ' + MESES[Number(p[1]) - 1] + ' ' + p[0]; }
  function diasEntre(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5); }
  function sumarDias(s, n) { var d = new Date(Date.parse(s + 'T00:00:00Z') + n * 864e5); return d.toISOString().slice(0, 10); }
  function valido(r) { return r.validacion === 'Válido' && typeof r.valor === 'number' && isFinite(r.valor); }
  function estacion(id) { return D.estaciones.find(function (e) { return e.id === id; }); }
  function num(v) { return v.toLocaleString('es-BO', { maximumFractionDigits: 1 }); }
  function el(tag, cls, texto) { var n = document.createElement(tag); if (cls) n.className = cls; if (texto !== undefined) n.textContent = texto; return n; }

  /* ---------- Índice de Calidad del Aire ---------- */
  function subIndice(clave, v) {
    var tramos = D.tramosICA[clave];
    for (var i = 0; i < tramos.length; i++) {
      var t = tramos[i];
      if (v <= t[1]) return Math.round(t[2] + (Math.max(v, t[0]) - t[0]) * (t[3] - t[2]) / (t[1] - t[0]));
    }
    return 500;
  }
  function categoria(i) { return i <= 50 ? { cat: 'buena', n: 'Buena' } : i <= 100 ? { cat: 'moderada', n: 'Moderada' } : { cat: 'mala', n: 'Mala' }; }

  /* Última lectura válida por contaminante de una estación y su ICA */
  function resumenEstacion(id) {
    var ult = {};
    D.registros.forEach(function (r) {
      if (r.estacionId === id && valido(r) && (!ult[r.contaminante] || r.fecha > ult[r.contaminante].fecha)) ult[r.contaminante] = r;
    });
    var claves = Object.keys(ult);
    if (!claves.length) return null;
    var fecha = claves.map(function (k) { return ult[k].fecha; }).sort().pop(), ica = 0;
    claves.forEach(function (k) { if (ult[k].fecha === fecha) ica = Math.max(ica, subIndice(k, ult[k].valor)); });
    var ant = diasEntre(fecha, D.hoy);
    return { fecha: fecha, ult: ult, ica: ica, antiguedad: ant, reciente: ant <= CFG.UMBRAL_RECIENTE, cat: categoria(ica) };
  }
  function datosMapa(id) {
    var r = resumenEstacion(id);
    return r && r.reciente ? { cat: r.cat.cat, etiqueta: r.cat.n + ' (ICA ' + r.ica + ')' } : { cat: 'sin', etiqueta: 'Sin lectura reciente' };
  }

  /* ---------- Filtrado y estadísticos ---------- */
  function filtrar(f) {
    if (!f.desde || !f.hasta || isNaN(Date.parse(f.desde)) || isNaN(Date.parse(f.hasta)) || f.desde > f.hasta) throw new Error('Seleccione una fecha válida.');
    return D.registros.filter(function (r) {
      return r.estacionId === f.estacion && r.contaminante === f.contaminante && r.fecha >= f.desde && r.fecha <= f.hasta && valido(r);
    }).sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; });
  }
  function estadisticos(arr) {
    if (!arr.length) return null;
    var vals = arr.map(function (r) { return r.valor; }), suma = 0;
    for (var i = 0; i < vals.length; i++) suma += vals[i];
    return { n: vals.length, prom: suma / vals.length, min: Math.min.apply(null, vals), max: Math.max.apply(null, vals) };
  }

  /* ---------- Inicio ---------- */
  function renderInicio(id) {
    var e = estacion(id), r = resumenEstacion(id), panel = $('#panel-ica'), lista = $('#ica-lista'), aviso = $('#ica-aviso');
    lista.innerHTML = ''; aviso.hidden = true;
    if (!r) {
      panel.dataset.cat = 'sin'; $('#ica-num').textContent = '–'; $('#ica-cat').textContent = 'Sin datos';
      $('#ica-meta').textContent = e.nombre; aviso.textContent = 'No hay datos disponibles para esta estación.'; aviso.hidden = false; return;
    }
    var ok = r.reciente;
    panel.dataset.cat = ok ? r.cat.cat : 'sin';
    $('#ica-num').textContent = ok ? r.ica : '–';
    $('#ica-cat').textContent = ok ? r.cat.n : 'Sin lectura reciente';
    $('#ica-meta').textContent = e.nombre + ' · ' + fmtFecha(r.fecha);
    Object.keys(C).forEach(function (k) {
      if (!r.ult[k]) return;
      lista.appendChild(el('dt', '', C[k].nombre + ':'));
      lista.appendChild(el('dd', '', num(r.ult[k].valor) + ' ' + C[k].unidad));
    });
    if (!ok) { aviso.textContent = 'Última lectura hace ' + r.antiguedad + ' días. La estación está ' + e.estado.toLowerCase() + '.'; aviso.hidden = false; }
  }
  function renderKpis() {
    var activas = D.estaciones.filter(function (e) { var r = resumenEstacion(e.id); return r && r.reciente; }).length;
    var ult = D.registros.filter(valido).map(function (r) { return r.fecha; }).sort().pop();
    $('#kpi-activas').textContent = activas + ' de ' + D.estaciones.length;
    $('#kpi-ult').textContent = fmtFecha(ult);
    $('#kpi-reg').textContent = D.registros.length.toLocaleString('es-BO');
  }

  /* ---------- Estaciones: tarjetas, tabla y ficha del mapa ---------- */
  function etiquetaICA(id) {
    var d = datosMapa(id), r = resumenEstacion(id), s = el('span', 'etiqueta ' + d.cat, d.cat === 'sin' ? 'Sin lectura reciente' : d.etiqueta);
    return { nodo: s, r: r };
  }
  function crearFicha(e) {
    var f = el('div', 'ficha'), r = resumenEstacion(e.id);
    f.appendChild(el('h3', '', e.nombre));
    f.appendChild(el('p', '', e.zona + ' · ' + e.estado));
    f.appendChild(el('p', '', 'Coordenadas: ' + e.lat.toFixed(4) + ', ' + e.lng.toFixed(4)));
    f.appendChild(el('p', '', r ? 'Última observación: ' + fmtFecha(r.fecha) : 'Sin observaciones'));
    f.appendChild(etiquetaICA(e.id).nodo);
    var a = el('a', '', ' Ver gráficos'); a.href = '#graficos';
    a.addEventListener('click', function () { $('#f-estacion').value = e.id; actualizarGrafico(); });
    var p = el('p'); p.appendChild(a); f.appendChild(p);
    return f;
  }
  function renderEstaciones() {
    var cont = $('#lista-estaciones'), cuerpo = $('#tabla-estaciones tbody');
    D.estaciones.forEach(function (e) {
      var r = resumenEstacion(e.id), t = el('article', 'tarjeta');
      t.appendChild(el('h3', '', e.nombre));
      t.appendChild(el('p', '', e.zona + ' · ' + e.estado));
      t.appendChild(el('p', '', e.descripcion));
      t.appendChild(etiquetaICA(e.id).nodo);
      var a = el('a', '', 'Ver gráficos'); a.href = '#graficos';
      a.addEventListener('click', function () { $('#f-estacion').value = e.id; actualizarGrafico(); });
      var p = el('p'); p.appendChild(a); t.appendChild(p);
      cont.appendChild(t);
      var tr = el('tr');
      [e.nombre, e.zona, e.lat.toFixed(4) + ', ' + e.lng.toFixed(4), e.estado, r ? fmtFecha(r.fecha) : '–', r && r.reciente ? r.cat.n + ' (' + r.ica + ')' : 'Sin lectura reciente']
        .forEach(function (x) { tr.appendChild(el('td', '', x)); });
      cuerpo.appendChild(tr);
    });
  }

  /* ---------- Gráficos y registros ---------- */
  function llenarSelectores() {
    var opcionesE = D.estaciones.map(function (e) { return '<option value="' + esc(e.id) + '">' + esc(e.nombre) + '</option>'; }).join('');
    $('#inicio-estacion').innerHTML = opcionesE; $('#f-estacion').innerHTML = opcionesE;
    $('#f-contaminante').innerHTML = Object.keys(C).map(function (k) { return '<option value="' + k + '">' + esc(C[k].nombre) + '</option>'; }).join('');
    $('#f-hasta').value = D.hoy; $('#f-desde').value = sumarDias(D.hoy, -13);
    $('#f-desde').min = $('#f-hasta').min = sumarDias(D.hoy, -(CFG.DIAS - 1)); $('#f-desde').max = $('#f-hasta').max = D.hoy;
  }
  function seleccion() { return { estacion: $('#f-estacion').value, contaminante: $('#f-contaminante').value, desde: $('#f-desde').value, hasta: $('#f-hasta').value }; }
  var ultimo = [];

  function actualizarGrafico() {
    var msg = $('#mensaje'), svg = $('#grafico'), f = seleccion(), cuerpo = $('#tabla-registros tbody'), resumen = $('#resumen');
    msg.hidden = true; cuerpo.innerHTML = ''; resumen.innerHTML = ''; $('#grafico-nota').textContent = ''; ultimo = [];
    var datos;
    try { datos = filtrar(f); } catch (err) { msg.textContent = err.message; msg.hidden = false; Grafico.limpiar(svg); return; }
    var c = C[f.contaminante], e = estacion(f.estacion);
    $('#grafico-titulo').textContent = 'Evolución de ' + c.nombre + ' · ' + e.nombre;
    if (!datos.length) { msg.textContent = 'No hay datos disponibles para los filtros seleccionados.'; msg.hidden = false; Grafico.limpiar(svg); return; }
    ultimo = datos;
    Grafico.dibujar(svg, datos, { nombre: c.nombre, unidad: c.unidad, ref: c.ref });
    svg.setAttribute('aria-label', 'Gráfico de ' + c.nombre + ' en ' + e.nombre + ' del ' + fmtFecha(f.desde) + ' al ' + fmtFecha(f.hasta));
    $('#grafico-nota').textContent = 'Los días sin registro válido no se unen con línea. Fuente: ' + datos[0].fuente + '.';
    var s = estadisticos(datos);
    [['Promedio', num(s.prom)], ['Mínimo', num(s.min)], ['Máximo', num(s.max)], ['Observaciones', s.n]].forEach(function (x) {
      var d = el('div'); d.appendChild(el('strong', '', x[1] + (x[0] === 'Observaciones' ? '' : ' ' + c.unidad))); d.appendChild(el('span', '', x[0])); resumen.appendChild(d);
    });
    datos.slice().reverse().forEach(function (r) {
      var tr = el('tr');
      [fmtFecha(r.fecha), e.nombre, c.nombre, num(r.valor), r.unidad, r.periodo, r.fuente, r.validacion, r.tipo].forEach(function (x) { tr.appendChild(el('td', '', x)); });
      cuerpo.appendChild(tr);
    });
  }

  function exportarCSV() {
    if (!ultimo.length) { var m = $('#mensaje'); m.textContent = 'No hay datos disponibles para descargar.'; m.hidden = false; return; }
    var cab = ['id', 'estacion', 'contaminante', 'valor', 'unidad', 'fecha', 'hora', 'periodo', 'fuente', 'validacion', 'tipo'];
    var filas = ultimo.map(function (r) {
      return [r.id, estacion(r.estacionId).nombre, C[r.contaminante].nombre, r.valor, r.unidad, r.fecha, r.hora, r.periodo, r.fuente, r.validacion, r.tipo]
        .map(function (x) { return '"' + String(x).replace(/"/g, '""') + '"'; }).join(',');
    });
    var blob = new Blob(['\ufeff' + cab.join(',') + '\n' + filas.join('\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'registros_calidad_aire.csv'; a.click(); URL.revokeObjectURL(a.href);
  }

  /* ---------- Menú móvil y acceso administrador ---------- */
  function iniciarMenu() {
    var b = $('#btn-menu'), m = $('#menu');
    b.addEventListener('click', function () { var a = m.classList.toggle('abierto'); b.setAttribute('aria-expanded', a); });
    m.addEventListener('click', function (ev) { if (ev.target.tagName === 'A') { m.classList.remove('abierto'); b.setAttribute('aria-expanded', 'false'); } });
  }
  function iniciarLogin() {
    var dlg = $('#dlg-login'), msg = $('#login-msg');
    $('#btn-login').addEventListener('click', function () { msg.hidden = true; dlg.showModal(); });
    $('#btn-cerrar-login').addEventListener('click', function () { dlg.close(); });
    $('#form-login').addEventListener('submit', function (ev) {
      ev.preventDefault();                                           // no se valida ni guarda ninguna contraseña en el navegador
      msg.textContent = $('#usuario').value.trim() && $('#clave').value
        ? 'El acceso administrativo se habilitará cuando exista un servicio de autenticación en el servidor.'
        : 'Complete usuario y contraseña.';
      msg.hidden = false;
    });
  }

  /* ---------- Arranque ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('etiqueta-datos').textContent = CFG.ETIQUETA_DATOS;
    document.querySelectorAll('.etq-datos').forEach(function (n) { n.textContent = CFG.ETIQUETA_DATOS.toLowerCase(); });
    llenarSelectores(); renderKpis(); renderEstaciones(); iniciarMenu(); iniciarLogin();
    $('#inicio-estacion').addEventListener('change', function (ev) { renderInicio(ev.target.value); });
    renderInicio($('#inicio-estacion').value);
    $('#filtros').addEventListener('submit', function (ev) { ev.preventDefault(); actualizarGrafico(); });
    ['#f-estacion', '#f-contaminante', '#f-desde', '#f-hasta'].forEach(function (s) { $(s).addEventListener('change', actualizarGrafico); });
    $('#btn-csv').addEventListener('click', exportarCSV);
    actualizarGrafico();
    Mapa.iniciar({ contenedor: $('#mapa'), aviso: $('#mapa-aviso'), estaciones: D.estaciones, resumen: datosMapa, ficha: crearFicha });
  });
})();
