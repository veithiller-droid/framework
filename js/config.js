// js/config.js

// Category prefixes
const CATEGORY_PREFIXES = {
    'c': 'color',
    'w': 'natural',
    'm': 'minimal',
    'b': 'bold',
    'i': 'industrial'
};

// All frame IDs (with prefixes)
const FRAME_IDS = [
    "m-weiss", "m-schwarz", "i-schwarz",
    "c-weinrot", "c-stahlblau", "c-rot",
    "c-hellblau", "c-grau", "c-gelb", "c-dunkelgruen",
    "c-dunkelblau", "c-creme", "c-braun",
    "w-holz100",
    "b-gold"
];

// Frame widths (extract number from name, default 36)
const FRAME_SERIES = {
    "m-weiss": 36, "m-schwarz": 36, "i-schwarz": 36,
    "c-weinrot": 36, "c-stahlblau": 36, "c-rot": 36,
    "c-hellblau": 36, "c-grau": 36, "c-gelb": 36,
    "c-dunkelgruen": 36, "c-dunkelblau": 36, "c-creme": 36, "c-braun": 36,
    "w-holz100": 100,
    "b-gold": 36
};

// Passepartout colors
const PP_COLORS = [
    { name: 'White', hex: '#ffffff' },
    { name: 'Black', hex: '#000000' },
    { name: 'Light Blue', hex: '#d9f9fa' },
    { name: 'Rose', hex: '#f8dff4' },
    { name: 'Sand', hex: '#faf9d9' },
    { name: 'Lime Green', hex: '#e7fcd2' }
];

// Scaling factors for different photo formats and frame widths
const SCALE_FACTORS = {
    '0.667': { 36: 0.976, 100: 0.933, 150: 0.900 },
    '0.750': { 36: 0.933, 100: 0.805, 150: 0.705 },
    '0.563': { 36: 0.933, 100: 0.807, 150: 0.710 },
    '1.000': { 36: 0.933, 100: 0.805, 150: 0.705 }
};

const PNG_DIMENSIONS = {
    width: 1000,
    height: 1500
};

const TARGET_UNDERLAP = 15;

// Start configuration
const START_CONFIG = {
    image: 'frames/Arta.jpg',
    frameId: 'm-schwarz',
    usePP: true,
    ppColorIndex: 0
};
