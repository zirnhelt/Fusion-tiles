// Periodic table data + presentation helpers (palette, categories, table layout).
// Pure data — no React.

// [symbol, name, atomic weight (rounded)] indexed by atomic number − 1
const RAW = [
  ['H', 'Hydrogen', 1],
  ['He', 'Helium', 4],
  ['Li', 'Lithium', 7],
  ['Be', 'Beryllium', 9],
  ['B', 'Boron', 11],
  ['C', 'Carbon', 12],
  ['N', 'Nitrogen', 14],
  ['O', 'Oxygen', 16],
  ['F', 'Fluorine', 19],
  ['Ne', 'Neon', 20],
  ['Na', 'Sodium', 23],
  ['Mg', 'Magnesium', 24],
  ['Al', 'Aluminum', 27],
  ['Si', 'Silicon', 28],
  ['P', 'Phosphorus', 31],
  ['S', 'Sulfur', 32],
  ['Cl', 'Chlorine', 35],
  ['Ar', 'Argon', 40],
  ['K', 'Potassium', 39],
  ['Ca', 'Calcium', 40],
  ['Sc', 'Scandium', 45],
  ['Ti', 'Titanium', 48],
  ['V', 'Vanadium', 51],
  ['Cr', 'Chromium', 52],
  ['Mn', 'Manganese', 55],
  ['Fe', 'Iron', 56],
  ['Co', 'Cobalt', 59],
  ['Ni', 'Nickel', 59],
  ['Cu', 'Copper', 64],
  ['Zn', 'Zinc', 65],
  ['Ga', 'Gallium', 70],
  ['Ge', 'Germanium', 73],
  ['As', 'Arsenic', 75],
  ['Se', 'Selenium', 79],
  ['Br', 'Bromine', 80],
  ['Kr', 'Krypton', 84],
  ['Rb', 'Rubidium', 85],
  ['Sr', 'Strontium', 88],
  ['Y', 'Yttrium', 89],
  ['Zr', 'Zirconium', 91],
  ['Nb', 'Niobium', 93],
  ['Mo', 'Molybdenum', 96],
  ['Tc', 'Technetium', 98],
  ['Ru', 'Ruthenium', 101],
  ['Rh', 'Rhodium', 103],
  ['Pd', 'Palladium', 106],
  ['Ag', 'Silver', 108],
  ['Cd', 'Cadmium', 112],
  ['In', 'Indium', 115],
  ['Sn', 'Tin', 119],
  ['Sb', 'Antimony', 122],
  ['Te', 'Tellurium', 128],
  ['I', 'Iodine', 127],
  ['Xe', 'Xenon', 131],
  ['Cs', 'Cesium', 133],
  ['Ba', 'Barium', 137],
  ['La', 'Lanthanum', 139],
  ['Ce', 'Cerium', 140],
  ['Pr', 'Praseodymium', 141],
  ['Nd', 'Neodymium', 144],
  ['Pm', 'Promethium', 145],
  ['Sm', 'Samarium', 150],
  ['Eu', 'Europium', 152],
  ['Gd', 'Gadolinium', 157],
  ['Tb', 'Terbium', 159],
  ['Dy', 'Dysprosium', 163],
  ['Ho', 'Holmium', 165],
  ['Er', 'Erbium', 167],
  ['Tm', 'Thulium', 169],
  ['Yb', 'Ytterbium', 173],
  ['Lu', 'Lutetium', 175],
  ['Hf', 'Hafnium', 178],
  ['Ta', 'Tantalum', 181],
  ['W', 'Tungsten', 184],
  ['Re', 'Rhenium', 186],
  ['Os', 'Osmium', 190],
  ['Ir', 'Iridium', 192],
  ['Pt', 'Platinum', 195],
  ['Au', 'Gold', 197],
  ['Hg', 'Mercury', 201],
  ['Tl', 'Thallium', 204],
  ['Pb', 'Lead', 207],
  ['Bi', 'Bismuth', 209],
  ['Po', 'Polonium', 209],
  ['At', 'Astatine', 210],
  ['Rn', 'Radon', 222],
  ['Fr', 'Francium', 223],
  ['Ra', 'Radium', 226],
  ['Ac', 'Actinium', 227],
  ['Th', 'Thorium', 232],
  ['Pa', 'Protactinium', 231],
  ['U', 'Uranium', 238],
  ['Np', 'Neptunium', 237],
  ['Pu', 'Plutonium', 244],
  ['Am', 'Americium', 243],
  ['Cm', 'Curium', 247],
  ['Bk', 'Berkelium', 247],
  ['Cf', 'Californium', 251],
  ['Es', 'Einsteinium', 252],
  ['Fm', 'Fermium', 257],
  ['Md', 'Mendelevium', 258],
  ['No', 'Nobelium', 259],
  ['Lr', 'Lawrencium', 262],
  ['Rf', 'Rutherfordium', 267],
  ['Db', 'Dubnium', 268],
  ['Sg', 'Seaborgium', 271],
  ['Bh', 'Bohrium', 272],
  ['Hs', 'Hassium', 270],
  ['Mt', 'Meitnerium', 276],
  ['Ds', 'Darmstadtium', 281],
  ['Rg', 'Roentgenium', 280],
  ['Cn', 'Copernicium', 285],
  ['Nh', 'Nihonium', 284],
  ['Fl', 'Flerovium', 289],
  ['Mc', 'Moscovium', 288],
  ['Lv', 'Livermorium', 293],
  ['Ts', 'Tennessine', 294],
  ['Og', 'Oganesson', 294],];

// ── Categories ────────────────────────────────────────────────────────────────
export const CATEGORIES = {
  alkali:     { label: 'Alkali metal',          plural: 'Alkali metals',          color: '#f87171' },
  alkaline:   { label: 'Alkaline earth metal',  plural: 'Alkaline earth metals',  color: '#fb923c' },
  transition: { label: 'Transition metal',      plural: 'Transition metals',      color: '#facc15' },
  post:       { label: 'Post-transition metal', plural: 'Post-transition metals', color: '#a3e635' },
  metalloid:  { label: 'Metalloid',             plural: 'Metalloids',             color: '#2dd4bf' },
  nonmetal:   { label: 'Reactive nonmetal',     plural: 'Reactive nonmetals',     color: '#38bdf8' },
  halogen:    { label: 'Halogen',               plural: 'Halogens',               color: '#818cf8' },
  noble:      { label: 'Noble gas',             plural: 'Noble gases',            color: '#c084fc' },
  lanthanide: { label: 'Lanthanide',            plural: 'Lanthanides',            color: '#f472b6' },
  actinide:   { label: 'Actinide',              plural: 'Actinides',              color: '#fb7185' },
};

const CATEGORY_BY_Z = (() => {
  const map = {};
  const set = (cat, list) => list.forEach(z => { map[z] = cat; });
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  set('nonmetal', [1, 6, 7, 8, 15, 16, 34]);
  set('noble', [2, 10, 18, 36, 54, 86, 118]);
  set('alkali', [3, 11, 19, 37, 55, 87]);
  set('alkaline', [4, 12, 20, 38, 56, 88]);
  set('metalloid', [5, 14, 32, 33, 51, 52]);
  set('halogen', [9, 17, 35, 53, 85, 117]);
  set('transition', [...range(21, 30), ...range(39, 48), ...range(72, 80), ...range(104, 112)]);
  set('post', [13, 31, 49, 50, 81, 82, 83, 84, 113, 114, 115, 116]);
  set('lanthanide', range(57, 71));
  set('actinide', range(89, 103));
  return map;
})();

// ── Table layout (row/col in an 18-column table; rows 8–9 are the f-block) ────
const tablePosition = (z) => {
  if (z === 1) return { row: 0, col: 0 };
  if (z === 2) return { row: 0, col: 17 };
  if (z <= 18) {
    const row = z <= 10 ? 1 : 2;
    const k = z - (row === 1 ? 3 : 11);
    return { row, col: k < 2 ? k : k + 10 };
  }
  if (z <= 54) {
    const row = z <= 36 ? 3 : 4;
    return { row, col: z - (row === 3 ? 19 : 37) };
  }
  if (z >= 57 && z <= 71) return { row: 8, col: 2 + (z - 57) };
  if (z >= 89 && z <= 103) return { row: 9, col: 2 + (z - 89) };
  const row = z <= 86 ? 5 : 6;
  const base = row === 5 ? 55 : 87;
  if (z - base < 2) return { row, col: z - base };
  return { row, col: z - (row === 5 ? 72 : 104) + 3 };
};

// ── Tile palette ─────────────────────────────────────────────────────────────
// Hues step by the golden angle so any run of consecutive atomic numbers (the
// deposit pool is always 5 consecutive elements) lands far apart on the colour
// wheel; alternating lightness separates the closest pair. Built in OKLCH so
// every hue has the same perceived brightness, then clipped into sRGB.
const srgbGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const oklchToHex = (L, C, h) => {
  const rad = (h * Math.PI) / 180;
  for (let c = C; c >= 0; c -= 0.005) {
    const a = c * Math.cos(rad);
    const b = c * Math.sin(rad);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const rgb = [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ];
    if (c - 0.005 < 0 || rgb.every(v => v >= -1e-4 && v <= 1 + 1e-4)) {
      return '#' + rgb
        .map(v => Math.round(Math.min(1, Math.max(0, srgbGamma(Math.min(1, Math.max(0, v))))) * 255)
          .toString(16).padStart(2, '0'))
        .join('');
    }
  }
  return '#808080';
};

const paletteFor = (z) => {
  const hue = (z * 137.508) % 360;
  const L = z % 2 ? 0.66 : 0.54;
  return {
    base: oklchToHex(L, 0.15, hue),
    light: oklchToHex(Math.min(0.9, L + 0.1), 0.13, hue),
    dark: oklchToHex(L - 0.16, 0.12, hue),
    glow: oklchToHex(0.75, 0.17, hue),
  };
};

export const ELEMENTS = RAW.map(([symbol, name, weight], i) => {
  const number = i + 1;
  const category = CATEGORY_BY_Z[number];
  return {
    symbol, name, number, weight, category,
    ...tablePosition(number),
    palette: paletteFor(number),
    categoryColor: CATEGORIES[category].color,
    categoryLabel: CATEGORIES[category].label,
  };
});

export const el = (z) => ELEMENTS[z - 1];
