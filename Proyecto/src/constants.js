// ===== Paleta Halloween cálida (estilo infantil/cute) =====
const COLORS = {
  purple:      '#6B2D7B',
  darkPurple:  '#4A1D5C',
  orange:      '#E8A030',
  deepOrange:  '#E85D3A',
  cream:       '#FFF5E6',
  warmWhite:   '#FFFBF0',
  yellow:      '#F5C518',
  darkText:    '#2D2D2D',
  lightText:   '#FFF5E6',
};

// Colores RGB para partículas
const HALLOWEEN_COLORS = [
  [232, 160,  48],   // naranja dorado
  [245, 197,  24],   // amarillo
  [107,  45, 123],   // púrpura
  [232,  93,  58],   // rojo coral
  [255, 245, 230],   // crema
  [255, 170,  60],   // naranja claro
  [180,  80, 200],   // lila
];

// ===== Umbrales de detección facial =====
const MOUTH_OPEN_THRESHOLD = 0.20;
const MOUTH_WIDE_THRESHOLD = 0.50;

// ===== 5 Fases de partículas (transición progresiva) =====
// Cada fase define: umbral de tiempo continuo, tipos de partículas,
// partículas por frame, y un nombre para el feedback visual.
const PHASES = [
  { time: 0,  types: ['sparkle'],                                        pps: 3,  name: 'Primeros destellos',   bg: 0 },
  { time: 3,  types: ['sparkle', 'candy'],                               pps: 4,  name: 'Dulces mágicos',       bg: 1 },
  { time: 6,  types: ['sparkle', 'ghost', 'candy'],                      pps: 6,  name: 'Fantasmas amigables',  bg: 2 },
  { time: 10, types: ['sparkle', 'ghost', 'pumpkin', 'candy'],           pps: 8,  name: 'Noche de calabazas',   bg: 3 },
  { time: 15, types: ['sparkle', 'ghost', 'pumpkin', 'bat', 'candy'],   pps: 11, name: '¡Halloween total!',    bg: 4 },
];

// ===== Partículas =====
const MAX_PARTICLES = 350;

// ===== Canvas y cámara =====
const CANVAS_W = 1920;
const CANVAS_H = 1080;
const CAM_W    = 1280;
const CAM_H    =  720;

// ===== Cierre de boca =====
const MOUTH_CLOSE_GRACE = 0.6;
