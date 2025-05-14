// — configuration —
const OWM_KEY        = 'ccd6fef87f97117e172a742cead50f91'; // your OpenWeatherMap key
const FLIGHT_PING_MS = 15000;

// — map setup (Web Mercator projection) —
const map = new maplibregl.Map({
  container: 'map',
  style: 'https://demotiles.maplibre.org/style.json',
  center: [0, 20],
  zoom: 1.7
});

map.on('load', () => {
  loadBorders(2025);
  toggleWeather(true);
  initFlightLayer();
});

// — helper to add/update GeoJSON layers —
function addOrUpdateGeoJSON(srcId, lyrId, data, layerDef) {
  if (map.getSource(srcId)) {
    map.getSource(srcId).setData(data);
  } else {
    map.addSource(srcId, { type:'geojson', data });
    map.addLayer(Object.assign({ id:lyrId, source:srcId }, layerDef));
  }
}

// — 1. Historical Borders —
function loadBorders(year) {
  fetch(`https://demo.ldproxy.net/cshapes/collections/borders/items?time=${year}-07-01`)
    .then(r => r.json())
    .then(gj => {
      addOrUpdateGeoJSON('borders','borders', gj, {
        type:'line', paint:{ 'line-color':'#e60000','line-width':1 }
      });
    });
}
document.getElementById('year').oninput = e => loadBorders(+e.target.value);

// — 2. Weather Overlay —
let wxTimer = null;
function buildWxURL(layer) {
  return `https://tile.openweathermap.org/map/${layer}/{z}/{x}/{y}.png?appid=${OWM_KEY}`;
}
function toggleWeather(on) {
  if (wxTimer) { clearInterval(wxTimer); wxTimer = null; }
  if (map.getLayer('wx')) {
    map.removeLayer('wx'); map.removeSource('weather');
  }
  if (!on) return;
  const layer = document.getElementById('wxLayer').value;
  map.addSource('weather', {
    type:'raster',
    tiles:[ buildWxURL(layer) ],
    tileSize:256,
    attribution:'© OpenWeatherMap'
  });
  map.addLayer({ id:'wx', type:'raster', source:'weather', paint:{ 'raster-opacity':0.75 }});
  wxTimer = setInterval(()=> {
    map.getSource('weather').setTiles([ buildWxURL(layer) ]);
  }, 600_000);
}
document.querySelector('#wxSwitch input').onchange = e => toggleWeather(e.target.checked);
document.getElementById('wxLayer').onchange = () => {
  if (document.querySelector('#wxSwitch input').checked) toggleWeather(true);
};

// — 3. Live Flight Positions —
function initFlightLayer(){
  map.addSource('flights',{ type:'geojson', data:{ type:'FeatureCollection', features:[]} });
  map.addLayer({
    id:'planes', type:'circle', source:'flights',
    paint:{
      'circle-radius':2,
      'circle-color':'#0030ff',
      'circle-stroke-width':1,
      'circle-stroke-color':'#fff'
    }
  });
  updateFlights(); setInterval(updateFlights, FLIGHT_PING_MS);
}
async function updateFlights(){
  try {
    const proxy = 'https://cors.isomorphic-git.org/';
    const js = await fetch(proxy+'https://opensky-network.org/api/states/all').then(r=>r.json());
    const feats = (js.states||[]).filter(s=>s[5]!=null && s[6]!=null).map(s=>({
      type:'Feature',
      geometry:{ type:'Point', coordinates:[ s[5], s[6] ]},
      properties:{ callsign:(s[1]||'').trim() }
    }));
    map.getSource('flights').setData({ type:'FeatureCollection', features:feats });
  } catch(e) {
    console.warn('Flights error', e);
  }
}

// — 4. GDP per Capita (World Bank) —
function toggleGDP(on) {
  if (map.getLayer('gdp')) map.removeLayer('gdp');
  if (!on) return;
  fetch('https://api.worldbank.org/v2/country/all/indicator/NY.GDP.PCAP.CD?format=json&date=2022&per_page=300')
    .then(r=>r.json())
    .then(arr => {
      const data = arr[1] || [];
      const iso2val = {};
      data.forEach(r => { if (r.country && r.country.id && r.value) iso2val[r.country.id] = Number(r.value); });
      const vals = Object.values(iso2val);
      const min = Math.min(...vals), max = Math.max(...vals);
      const stops = [];
      for (const [iso,v] of Object.entries(iso2val)) {
        const t = (v - min)/(max - min);
        const col = t>0.66
          ? `hsl(${120-(t*60)},70%,45%)`
          : t>0.33
            ? `hsl(${60-(t*30)},80%,55%)`
            : `hsl(0,85%,55%)`;
        stops.push([iso, col]);
      }
      map.addLayer({
        id:'gdp',
        type:'fill',
        source:'borders',
        paint:{
          'fill-color':['match',['get','ISO3'], ...stops.flat(), '#cccccc'],
          'fill-opacity':0.65
        }
      }, 'borders');
    })
    .catch(e => console.warn('GDP fetch error', e));
}
document.querySelector('#gdpSwitch input').onchange = e => toggleGDP(e.target.checked);

// — 5. Earthquakes (last 24h) —
let qukTimer = null;
function toggleQuakes(on) {
  if (qukTimer) { clearInterval(qukTimer); qukTimer=null; }
  if (map.getLayer('quakes')) { map.removeLayer('quakes'); map.removeSource('quakes'); }
  if (!on) return;
  loadQuakes();
  qukTimer = setInterval(loadQuakes, 60000);
}
async function loadQuakes(){
  try {
    const gj = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson')
      .then(r=>r.json());
    addOrUpdateGeoJSON('quakes','quakes', gj, {
      type:'circle',
      paint:{
        'circle-radius':['interpolate',['linear'],['get','mag'],0,2,6,12],
        'circle-color':['interpolate',['linear'],['get','mag'],
          0,'#ffffb2',3,'#fecc5c',5,'#fd8d3c',7,'#e31a1c'],
        'circle-opacity':0.8
      }
    });
  } catch(e) {
    console.warn('Quakes error', e);
  }
}
document.querySelector('#qukSwitch input').onchange = e => toggleQuakes(e.target.checked);

// — 6. Wildfires (NASA EONET v2.1) —
let fireTimer = null;
function toggleFires(on) {
  if (fireTimer) { clearInterval(fireTimer); fireTimer=null; }
  if (map.getLayer('fires')) { map.removeLayer('fires'); map.removeSource('fires'); }
  if (!on) return;
  loadFires();
  fireTimer = setInterval(loadFires, 600000);
}
async function loadFires(){
  try {
    const js = await fetch('https://eonet.sci.gsfc.nasa.gov/api/v2.1/events?status=open&category=wildfires')
      .then(r=>r.json());
    const feats = [];
    js.events.forEach(ev => {
      ev.geometries.forEach(g => {
        if (g.type === 'Point') {
          feats.push({
            type:'Feature',
            geometry:{ type:'Point', coordinates:g.coordinates },
            properties:{ id:ev.id }
          });
        }
      });
    });
    addOrUpdateGeoJSON('fires','fires', {
      type:'FeatureCollection', features:feats
    }, {
      type:'circle',
      paint:{ 'circle-radius':4, 'circle-color':'#ff4500', 'circle-opacity':0.75 }
    });
  } catch(e) {
    console.warn('Fires error', e);
  }
}
document.querySelector('#firSwitch input').onchange = e => toggleFires(e.target.checked);

// — 7. Night-lights (NASA GIBS City Lights 2012) —
function toggleNight(on) {
  if (map.getLayer('night')) { map.removeLayer('night'); map.removeSource('night'); }
  if (!on) return;
  map.addSource('night', {
    type:'raster',
    tiles:[
      'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CityLights_2012/default/GoogleMapsCompatible_Level9/{z}/{x}/{y}.png'
    ],
    tileSize:256,
    attribution:'NASA GIBS City Lights'
  });
  map.addLayer({
    id:'night', type:'raster', source:'night',
    paint:{ 'raster-opacity':0.6 }
  });
}
document.querySelector('#ntlSwitch input').onchange = e => toggleNight(e.target.checked);
