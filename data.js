/* data.js — Capa de datos: configuración, estaciones, contaminantes y registros ambientales */
(function () {
  'use strict';

  /* ---- Configuración general (aquí se cambia la clave de Google Maps y la etiqueta de los datos) ---- */
  window.CONFIG = {
    GOOGLE_MAPS_KEY: '',                 // Si se completa, el mapa usa Google Maps; si está vacía, usa OpenStreetMap
    ETIQUETA_DATOS: 'Datos de demostración',
    FUENTE: 'Conjunto de datos del proyecto (data.js)',
    DIAS: 30,                            // Cantidad de días de historial
    UMBRAL_RECIENTE: 3                   // Días máximos para considerar "lectura reciente"
  };

  /* ---- Contaminantes: nombre, unidad, nivel base y referencia OMS 2021 (24 h) ---- */
  var CONTAMINANTES = {
    pm25: { nombre: 'PM2.5', unidad: 'µg/m³', base: 20, ref: 15 },
    pm10: { nombre: 'PM10', unidad: 'µg/m³', base: 42, ref: 45 },
    no2:  { nombre: 'NO₂',  unidad: 'µg/m³', base: 22, ref: 25 },
    o3:   { nombre: 'O₃',   unidad: 'µg/m³', base: 48, ref: null }
  };

  /* ---- Tramos para calcular el ICA: [conc. mínima, conc. máxima, índice mínimo, índice máximo] ---- */
  var TRAMOS_ICA = {
    pm25: [[0, 12, 0, 50], [12.1, 35.4, 51, 100], [35.5, 55.4, 101, 150], [55.5, 150.4, 151, 200], [150.5, 500, 201, 500]],
    pm10: [[0, 54, 0, 50], [55, 154, 51, 100], [155, 254, 101, 150], [255, 354, 151, 200], [355, 600, 201, 500]],
    no2:  [[0, 100, 0, 50], [101, 188, 51, 100], [189, 677, 101, 150], [678, 1220, 151, 200], [1221, 3000, 201, 500]],
    o3:   [[0, 106, 0, 50], [107, 137, 51, 100], [138, 167, 101, 150], [168, 206, 151, 200], [207, 600, 201, 500]]
  };

  /* ---- Estaciones: puntos de referencia con coordenadas aproximadas (reemplazar por coordenadas documentadas) ---- */
  var ESTACIONES = [
    { id: 'E01', nombre: 'Estación Centro',      zona: 'Centro de Cochabamba', lat: -17.3937, lng: -66.1570, estado: 'Operativa',        factor: 1.15, descripcion: 'Zona central, alta circulación vehicular.' },
    { id: 'E02', nombre: 'Estación Sacaba',      zona: 'Sacaba',               lat: -17.4000, lng: -66.0400, estado: 'Operativa',        factor: 0.85, descripcion: 'Sector oriental del valle.' },
    { id: 'E03', nombre: 'Estación Colcapirhua', zona: 'Colcapirhua',          lat: -17.3940, lng: -66.2300, estado: 'Operativa',        factor: 1.35, descripcion: 'Corredor vial hacia el oeste.' },
    { id: 'E04', nombre: 'Estación Quillacollo', zona: 'Quillacollo',          lat: -17.3970, lng: -66.2780, estado: 'Operativa',        factor: 1.10, descripcion: 'Zona urbana e industrial del oeste.' },
    { id: 'E05', nombre: 'Estación Tiquipaya',   zona: 'Tiquipaya',            lat: -17.3400, lng: -66.2150, estado: 'Operativa',        factor: 0.75, descripcion: 'Sector norte con menor tráfico.' },
    { id: 'E06', nombre: 'Estación El Paso',     zona: 'El Paso',              lat: -17.3550, lng: -66.2500, estado: 'En mantenimiento', factor: 0.90, descripcion: 'Punto en revisión técnica.' }
  ];

  /* ---- Utilidades de fecha ---- */
  function pad(n) { return String(n).padStart(2, '0'); }
  function fmt(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  /* ---- Generador numérico repetible (mismo resultado en cada carga) ---- */
  function generador(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* ---- Construcción de los registros ambientales (modelo de datos del Anexo B) ---- */
  var hoy = new Date(); hoy.setHours(12, 0, 0, 0);
  var registros = [], n = 1;
  ESTACIONES.forEach(function (e, ie) {
    var rnd = generador(1000 + ie * 77);
    Object.keys(CONTAMINANTES).forEach(function (k, ik) {
      var c = CONTAMINANTES[k];
      for (var d = CONFIG.DIAS - 1; d >= 0; d--) {
        if (e.estado === 'En mantenimiento' && d < 9) continue;   // sin lecturas en los últimos 9 días
        var f = new Date(hoy); f.setDate(hoy.getDate() - d);
        var onda = 1 + 0.22 * Math.sin((CONFIG.DIAS - d) / 4.2 + ie + ik);
        var v = Math.round(c.base * e.factor * onda * (0.9 + rnd() * 0.2) * 10) / 10;
        var valida = 'Válido';
        if (rnd() < 0.015) { valida = 'Inválido'; v = null; }
        registros.push({
          id: 'R' + String(n++).padStart(5, '0'), estacionId: e.id, contaminante: k, valor: v, unidad: c.unidad,
          fecha: fmt(f), hora: '00:00–23:59', periodo: 'Promedio 24 h', fuente: CONFIG.FUENTE,
          validacion: valida, tipo: CONFIG.ETIQUETA_DATOS
        });
      }
    });
  });

  window.DATOS = { contaminantes: CONTAMINANTES, tramosICA: TRAMOS_ICA, estaciones: ESTACIONES, registros: registros, hoy: fmt(hoy) };
})();
