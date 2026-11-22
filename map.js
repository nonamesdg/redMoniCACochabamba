/* map.js — Mapa de estaciones: Google Maps si hay clave; si no, OpenStreetMap con Leaflet */
(function () {
  'use strict';
  var COLORES = { buena: '#2f9e5b', moderada: '#e3a700', mala: '#d64545', sin: '#7a8788' };
  var CENTRO = { lat: -17.3895, lng: -66.1568 };

  function cargar(src, css) {                                                              // inserta un <script> o <link> y avisa al terminar
    return new Promise(function (ok, fallo) {
      var e = document.createElement(css ? 'link' : 'script');
      if (css) { e.rel = 'stylesheet'; e.href = src; } else { e.src = src; }
      e.onload = ok; e.onerror = fallo; document.head.appendChild(e);
    });
  }

  function conGoogle(op) {
    return new Promise(function (ok, fallo) {
      window.gm_authFailure = fallo;                                                       // clave inválida
      window.__mapaListo = function () {
        var mapa = new google.maps.Map(op.contenedor, { center: CENTRO, zoom: 12, mapTypeControl: false });
        var ventana = new google.maps.InfoWindow();
        op.estaciones.forEach(function (e) {
          var r = op.resumen(e.id);
          var mk = new google.maps.Marker({ position: { lat: e.lat, lng: e.lng }, map: mapa, title: e.nombre + ' — ' + r.etiqueta,
            icon: { path: google.maps.SymbolPath.CIRCLE, scale: 11, fillColor: COLORES[r.cat], fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 } });
          mk.addListener('click', function () { ventana.setContent(op.ficha(e)); ventana.open(mapa, mk); });
        });
        ok();
      };
      cargar('https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(CONFIG.GOOGLE_MAPS_KEY) + '&callback=__mapaListo').catch(fallo);
    });
  }

  function conLeaflet(op) {
    return cargar('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', true)
      .then(function () { return cargar('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'); })
      .then(function () {
        var mapa = L.map(op.contenedor).setView([CENTRO.lat, CENTRO.lng], 12);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© colaboradores de OpenStreetMap' }).addTo(mapa);
        op.estaciones.forEach(function (e) {
          var r = op.resumen(e.id);
          L.circleMarker([e.lat, e.lng], { radius: 11, color: '#fff', weight: 2, fillColor: COLORES[r.cat], fillOpacity: 1, title: e.nombre })
            .addTo(mapa).bindPopup(op.ficha(e));
        });
      });
  }

  /* op: { contenedor, aviso, estaciones, resumen(id) -> {cat, etiqueta}, ficha(estacion) -> nodo DOM } */
  function iniciar(op) {
    var intento = CONFIG.GOOGLE_MAPS_KEY ? conGoogle(op).catch(function () { return conLeaflet(op); }) : conLeaflet(op);
    intento.catch(function () {
      op.contenedor.hidden = true;
      op.aviso.textContent = 'No se pudo cargar el mapa; revise la conexión. La tabla de estaciones sigue disponible.';
      op.aviso.hidden = false;
    });
  }
  window.Mapa = { iniciar: iniciar };
})();
