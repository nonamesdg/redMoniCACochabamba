/* meteo.js — Apartado de clima: temperatura (°C), humedad, viento y condición por estación */
(function () {
  'use strict';
  var D = window.DATOS, CFG = window.CONFIG;
  var DIRS = ['Norte', 'Noreste', 'Este', 'Sureste', 'Sur', 'Suroeste', 'Oeste', 'Noroeste'];
  function $(s) { return document.querySelector(s); }
  function el(tag, cls, texto) { var n = document.createElement(tag); if (cls) n.className = cls; if (texto !== undefined) n.textContent = texto; return n; }
  function dec(v) { return v.toLocaleString('es-BO', { maximumFractionDigits: 1, minimumFractionDigits: 1 }); }

  /* Condiciones del día para una estación (valores repetibles por estación y fecha) */
  function condiciones(ie, ahora) {
    var a = 0, clave = D.hoy;
    for (var i = 0; i < clave.length; i++) a = (a * 31 + clave.charCodeAt(i)) | 0;
    a = (a + ie * 7919) | 0;
    function r() { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
    var tmin = 8 + r() * 4 - ie * 0.2, tmax = 23 + r() * 5 - ie * 0.4;
    var h = ahora.getHours() + ahora.getMinutes() / 60;
    var temp = tmin + (tmax - tmin) * Math.max(0, Math.sin(Math.PI * (h - 6) / 16));   // curva diaria: mínimo de madrugada, máximo por la tarde
    var hum = Math.max(25, Math.min(95, 78 - (temp - tmin) * 2.3 + (r() - 0.5) * 8));
    var viento = 4 + r() * 14 + (h > 11 && h < 19 ? 4 : 0);
    var cond = hum > 75 ? 'Nublado' : hum > 50 ? 'Parcialmente nublado' : 'Despejado';
    return { temp: temp, tmin: tmin, tmax: tmax, hum: hum, viento: viento, dir: DIRS[Math.floor(r() * 8)], cond: cond };
  }

  function tarjeta(titulo, valor, detalle) {
    var t = el('div', 'clima-card');
    t.appendChild(el('span', '', titulo)); t.appendChild(el('strong', '', valor)); t.appendChild(el('small', '', detalle));
    return t;
  }

  function mostrar(id) {
    var ie = D.estaciones.findIndex(function (e) { return e.id === id; }), ahora = new Date(), c = condiciones(ie, ahora);
    var cont = $('#clima-tarjetas'); cont.innerHTML = '';
    cont.appendChild(tarjeta('Temperatura', dec(c.temp) + ' °C', c.cond));
    cont.appendChild(tarjeta('Mínima y máxima', dec(c.tmin) + ' / ' + dec(c.tmax) + ' °C', 'Pronóstico del día'));
    cont.appendChild(tarjeta('Humedad relativa', Math.round(c.hum) + ' %', 'Aire ' + (c.hum > 70 ? 'húmedo' : c.hum > 45 ? 'confortable' : 'seco')));
    cont.appendChild(tarjeta('Viento', dec(c.viento) + ' km/h', 'Dirección: ' + c.dir));
    var hh = String(ahora.getHours()).padStart(2, '0') + ':' + String(ahora.getMinutes()).padStart(2, '0');
    $('#clima-nota').textContent = 'Lectura de las ' + hh + ' · Tipo de dato: ' + CFG.ETIQUETA_DATOS.toLowerCase() + '. Las variables meteorológicas se muestran aparte y no intervienen en el cálculo del ICA.';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var sel = $('#clima-estacion');
    sel.innerHTML = D.estaciones.map(function (e) { return '<option value="' + e.id + '">' + e.nombre.replace(/[&<>"']/g, '') + '</option>'; }).join('');
    sel.addEventListener('change', function () { mostrar(sel.value); });
    mostrar(sel.value);
  });
})();
