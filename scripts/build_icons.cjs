const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const htmlPath = path.join(rootDir, 'public', 'index.html');
const content = fs.readFileSync(htmlPath, 'utf8');

// Find all fa- classes
const iconMatches = content.match(/fa-[a-z0-9-]+/g) || [];
const uniqueIcons = new Set();

const nonIconClasses = new Set(['fa-solid', 'fa-regular', 'fa-brands', 'fa-spin', 'fa-fw', 'fa-lg', 'fa-2x', 'fa-3x']);

iconMatches.forEach(c => {
  if (!nonIconClasses.has(c)) {
    uniqueIcons.add(c.replace('fa-', ''));
  }
});

console.log('Detected icon names:', Array.from(uniqueIcons).sort());

const svgsDir = path.join(rootDir, 'node_modules', '@fortawesome', 'fontawesome-free', 'svgs');

// Alias mappings
const aliases = {
  'search': 'magnifying-glass',
  'rotate': 'arrows-rotate',
  'wand-magic-sparkles': 'wand-magic-sparkles',
};

function getSvg(name) {
  const actualName = aliases[name] || name;
  
  // Try solid
  const solidPath = path.join(svgsDir, 'solid', `${actualName}.svg`);
  if (fs.existsSync(solidPath)) {
    return fs.readFileSync(solidPath, 'utf8');
  }

  // Try brands
  const brandsPath = path.join(svgsDir, 'brands', `${actualName}.svg`);
  if (fs.existsSync(brandsPath)) {
    return fs.readFileSync(brandsPath, 'utf8');
  }

  // Try regular
  const regularPath = path.join(svgsDir, 'regular', `${actualName}.svg`);
  if (fs.existsSync(regularPath)) {
    return fs.readFileSync(regularPath, 'utf8');
  }

  console.warn('SVG NOT FOUND for:', name, '(actual:', actualName, ')');
  return null;
}

function svgToDataUri(svgString) {
  // Ensure fill="currentColor" or fill="black" for mask
  // Strip XML prolog or comments
  let cleaned = svgString
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\?xml[\s\S]*?\?>/g, '')
    .trim();
  
  // Convert to URI encoded
  cleaned = cleaned
    .replace(/"/g, "'")
    .replace(/%/g, '%25')
    .replace(/#/g, '%23')
    .replace(/{/g, '%7B')
    .replace(/}/g, '%7D')
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E')
    .replace(/\s+/g, ' ');

  return `data:image/svg+xml,${cleaned}`;
}

let css = `/**
 * Pure SVG CSS Mask Icon System for TuneFree Next Web
 * 100% Offline, Zero External Requests, Instant Render (No FOIT/Blank Box)
 */

.fa-solid, .fa-brands, .fa-regular, [class^="fa-"], [class*=" fa-"] {
  display: inline-block;
  width: 1em;
  height: 1em;
  vertical-align: -0.125em;
  background-color: currentColor;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-position: center;
  mask-position: center;
}

@keyframes fa-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.fa-spin {
  animation: fa-spin 1s infinite linear;
}

`;

let foundCount = 0;
let missing = [];

uniqueIcons.forEach(iconName => {
  const svg = getSvg(iconName);
  if (svg) {
    foundCount++;
    const dataUri = svgToDataUri(svg);
    css += `.fa-${iconName} {
  -webkit-mask-image: url("${dataUri}");
  mask-image: url("${dataUri}");
}
`;
  } else {
    missing.push(iconName);
  }
});

console.log(`Found ${foundCount} icons. Missing:`, missing);

const outDir = path.join(rootDir, 'public', 'assets', 'css');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const outCssPath = path.join(outDir, 'icons.css');
fs.writeFileSync(outCssPath, css, 'utf8');
console.log(`Saved CSS to ${outCssPath} (${(css.length / 1024).toFixed(1)} KB)`);
