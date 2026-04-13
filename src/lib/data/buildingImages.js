import { getCuratedImage } from './curatedBuildingImages.js';

const OPENVERSE_LICENSES = new Set(['by', 'by-sa', 'cc0', 'pdm']);
const COMMONS_LICENSES = ['CC BY', 'CC BY-SA', 'CC0', 'Public domain'];
const NYC_SIGNALS = ['new york', 'nyc', 'manhattan', 'brooklyn', 'bronx', 'queens', 'staten island'];
const ADDRESS_STOP_WORDS = new Set([
  'street',
  'st',
  'avenue',
  'ave',
  'place',
  'pl',
  'road',
  'rd',
  'west',
  'east',
  'north',
  'south',
  'new',
  'york',
]);

const geocodeCache = new Map();
const imageCache = new Map();
const REQUEST_TIMEOUT_MS = 8000;

const STOCK_IMAGE_POOL = [
  {
    image: 'https://live.staticflickr.com/1029/5185665182_e4eded1137_b.jpg',
    imageAlt: 'New York apartment building exterior',
    imageCredit: 'Photo: La Citta Vita / Flickr (CC BY-SA 2.0)',
    imageSourceUrl: 'https://www.flickr.com/photos/49539505@N04/5185665182',
    imageLicense: 'CC BY-SA 2.0',
  },
  {
    image: 'https://upload.wikimedia.org/wikipedia/commons/9/9d/Rooftop_water_towers_on_New_York_apartment_buildings.jpg',
    imageAlt: 'Rooftop water towers on New York apartment buildings',
    imageCredit: 'Photo: Roy Googin / Wikimedia Commons (CC BY-SA 3.0)',
    imageSourceUrl: 'https://commons.wikimedia.org/w/index.php?curid=7216042',
    imageLicense: 'CC BY-SA 3.0',
  },
  {
    image: 'https://live.staticflickr.com/3193/2600430491_70da3db212_b.jpg',
    imageAlt: 'Midrise apartment building in New York City',
    imageCredit: 'Photo: Mister-E / Flickr (CC BY 2.0)',
    imageSourceUrl: 'https://www.flickr.com/photos/45189308@N00/2600430491',
    imageLicense: 'CC BY 2.0',
  },
  {
    image: 'https://live.staticflickr.com/5180/5549998552_f04ab0aee8_b.jpg',
    imageAlt: 'Residential facade detail in Manhattan',
    imageCredit: 'Photo: o palsson / Flickr (CC BY 2.0)',
    imageSourceUrl: 'https://www.flickr.com/photos/45713725@N00/5549998552',
    imageLicense: 'CC BY 2.0',
  },
  {
    image: 'https://live.staticflickr.com/2864/10949257334_9e845e4b7d_b.jpg',
    imageAlt: 'Brooklyn streetscape with residential buildings',
    imageCredit: 'Photo: WanderingtheWorld / Flickr (CC BY-NC 2.0)',
    imageSourceUrl: 'https://www.flickr.com/photos/44028103@N07/10949257334',
    imageLicense: 'CC BY-NC 2.0',
  },
  {
    image: 'https://live.staticflickr.com/7017/13464863183_f9ca2006f6_b.jpg',
    imageAlt: 'East Village apartment buildings in New York City',
    imageCredit: 'Photo: WanderingtheWorld / Flickr (CC BY-NC 2.0)',
    imageSourceUrl: 'https://www.flickr.com/photos/44028103@N07/13464863183',
    imageLicense: 'CC BY-NC 2.0',
  },
  {
    image: 'https://live.staticflickr.com/2839/9636312625_6efaa2263f_b.jpg',
    imageAlt: 'Midtown Manhattan buildings',
    imageCredit: 'Photo: Dimitry B / Flickr (CC BY 2.0)',
    imageSourceUrl: 'https://www.flickr.com/photos/61533954@N00/9636312625',
    imageLicense: 'CC BY 2.0',
  },
  {
    image: 'https://live.staticflickr.com/65535/51397021369_4ec447d020_b.jpg',
    imageAlt: 'Downtown Brooklyn building streetscape',
    imageCredit: 'Photo: Onasill - Bill Badzo / Flickr (CC BY-SA 2.0)',
    imageSourceUrl: 'https://www.flickr.com/photos/7156765@N05/51397021369',
    imageLicense: 'CC BY-SA 2.0',
  },
];

function stripHtml(value = '') {
  return String(value).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function dedupe(values) {
  return [...new Set(values.filter(Boolean))];
}

function addressHash(address = '') {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = (hash << 5) - hash + address.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getStockImageForBuilding(building, indexHint = 0) {
  const poolSize = STOCK_IMAGE_POOL.length;
  if (!poolSize) {
    return null;
  }

  const hash = addressHash(building.address || '');
  const index = (hash + indexHint) % poolSize;
  return STOCK_IMAGE_POOL[index];
}

function tokenize(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function getResultText(result) {
  const tags = (result.tags || []).map((tag) => tag.name || '').join(' ');
  return [result.title, result.creator, result.foreign_landing_url, tags].filter(Boolean).join(' ').toLowerCase();
}

function extractAddressKeywords(address = '') {
  return tokenize(address)
    .filter((token) => !/^\d+$/.test(token))
    .filter((token) => token.length >= 4)
    .filter((token) => !ADDRESS_STOP_WORDS.has(token));
}

function hasAnySignal(text, tokens) {
  return tokens.some((token) => token && text.includes(token.toLowerCase()));
}

function isLikelyNycMatch(result, address, locationParts = []) {
  const text = getResultText(result);
  const hasNycSignal = hasAnySignal(text, NYC_SIGNALS);

  const locationTokens = locationParts
    .flatMap((part) => tokenize(part))
    .filter((token) => token.length >= 4);
  const hasLocationSignal = locationTokens.length > 0 ? hasAnySignal(text, locationTokens) : false;

  const addressKeywords = extractAddressKeywords(address);
  const hasAddressSignal = addressKeywords.length > 0 ? hasAnySignal(text, addressKeywords) : false;

  // Require NYC context plus either a location or address cue to avoid false matches.
  return hasNycSignal && (hasLocationSignal || hasAddressSignal);
}

function getOpenverseSourceLabel(source) {
  if (source === 'flickr') {
    return 'Flickr';
  }

  if (source === 'wikimedia commons') {
    return 'Wikimedia Commons';
  }

  return source || 'Openverse';
}

function isOpenverseLicense(license) {
  return OPENVERSE_LICENSES.has(String(license || '').toLowerCase());
}

function isCommonsLicense(license) {
  const normalized = String(license || '').toLowerCase();
  return COMMONS_LICENSES.some((allowed) => normalized.includes(allowed.toLowerCase()));
}

function buildSearchTerms(address, locationParts = []) {
  const terms = [
    `${address}`,
    `${address} building`,
    `${address} New York`,
    `${address} New York building`,
  ];

  for (const part of locationParts) {
    terms.push(`${part} building`);
    terms.push(`${part} exterior`);
    terms.push(part);
  }

  return dedupe(terms.map((term) => term.trim()));
}

function extractLocationParts(displayName = '') {
  return dedupe(
    displayName
      .split(',')
      .map((part) => part.trim())
      .filter((part, index, parts) => {
        if (index === 0) {
          return false;
        }

        const lower = part.toLowerCase();
        if (!lower || lower === 'new york' || lower === 'united states') {
          return false;
        }

        if (/^new york county$/.test(lower) || /^kings county$/.test(lower) || /^bronx county$/.test(lower) || /^queens county$/.test(lower) || /^richmond county$/.test(lower)) {
          return false;
        }

        if (/^\d{5}$/.test(lower)) {
          return false;
        }

        return parts.indexOf(part) > 0;
      })
      .slice(0, 3)
  );
}

function normalizeOpenverseResult(result, address) {
  const sourceLabel = getOpenverseSourceLabel(result.source);
  const creditParts = [result.creator, sourceLabel].filter(Boolean);

  return {
    image: result.url,
    imageAlt: result.title ? result.title : `${address} exterior`,
    imageCredit: `Photo: ${creditParts.join(' / ')}`,
    imageSourceUrl: result.foreign_landing_url || result.url,
    imageLicense: `${result.license}${result.license_version ? ` ${result.license_version}` : ''}`,
  };
}

function normalizeCommonsResult(page, address) {
  const info = page.imageinfo?.[0];
  if (!info) {
    return null;
  }

  const meta = info.extmetadata || {};
  const artist = stripHtml(meta.Artist?.value);
  const credit = stripHtml(meta.Credit?.value);
  const license = stripHtml(meta.LicenseShortName?.value);
  const sourceLabel = license ? `Wikimedia Commons (${license})` : 'Wikimedia Commons';
  const creditText = artist || credit || address;

  return {
    image: info.thumburl || info.url,
    imageAlt: stripHtml(meta.ImageDescription?.value) || `${address} exterior`,
    imageCredit: `Photo: ${creditText} / ${sourceLabel}`,
    imageSourceUrl: info.descriptionurl || info.url,
    imageLicense: license,
  };
}

async function geocodeAddress(address) {
  if (geocodeCache.has(address)) {
    return geocodeCache.get(address);
  }

  const query = `${address}, New York, NY`;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
  let response;
  try {
    response = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': 'dob-complaints/1.0 (open-licensed building images)',
      },
    });
  } catch {
    geocodeCache.set(address, null);
    return null;
  }

  if (!response.ok) {
    geocodeCache.set(address, null);
    return null;
  }

  const results = await response.json();
  const match = results[0] || null;
  geocodeCache.set(address, match);
  return match;
}

async function fetchOpenverseImage(address, searchTerms, locationParts = []) {
  for (const term of searchTerms) {
    const url = `https://api.openverse.engineering/v1/images/?q=${encodeURIComponent(term)}&license_type=all&source_facet=wikimedia+commons,flickr`;
    let response;
    try {
      response = await fetchWithTimeout(url);
    } catch {
      continue;
    }

    if (!response.ok) {
      continue;
    }

    const data = await response.json();
    const candidate = data.results?.find(
      (result) => isOpenverseLicense(result.license) && isLikelyNycMatch(result, address, locationParts)
    );

    if (candidate) {
      return normalizeOpenverseResult(candidate, address);
    }
  }

  return null;
}

async function fetchCommonsImage(address, geocode) {
  if (!geocode?.lat || !geocode?.lon) {
    return null;
  }

  const query = `https://commons.wikimedia.org/w/api.php?action=query&generator=geosearch&ggscoord=${encodeURIComponent(`${geocode.lat}|${geocode.lon}`)}&ggsradius=2000&ggslimit=10&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=900&format=json&origin=*`;
  let response;
  try {
    response = await fetchWithTimeout(query);
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const pages = Object.values(data.query?.pages || {});

  for (const page of pages) {
    const normalized = normalizeCommonsResult(page, address);
    if (normalized && isCommonsLicense(normalized.imageLicense)) {
      return normalized;
    }
  }

  return null;
}

async function lookupBuildingImage(building) {
  const address = building.address || '';
  if (!address) {
    return null;
  }

  const curated = getCuratedImage(address);
  if (curated) {
    imageCache.set(address, curated);
    return curated;
  }

  if (imageCache.has(address)) {
    return imageCache.get(address);
  }

  const geocode = await geocodeAddress(address);
  const locationParts = extractLocationParts(geocode?.display_name || '');
  const searchTerms = buildSearchTerms(address, locationParts);

  const openverseMatch = await fetchOpenverseImage(address, searchTerms, locationParts);
  if (openverseMatch) {
    imageCache.set(address, openverseMatch);
    return openverseMatch;
  }

  const commonsMatch = await fetchCommonsImage(address, geocode);
  imageCache.set(address, commonsMatch);
  return commonsMatch;
}

export async function enrichBuildingsWithImages(buildings, limit = 20) {
  const visibleBuildings = buildings.slice(0, limit);
  const enriched = await Promise.all(
    visibleBuildings.map(async (building) => {
      const image = await lookupBuildingImage(building);
      if (!image) {
        return building;
      }

      return {
        ...building,
        ...image,
      };
    })
  );

  const withStock = buildings.slice(limit).map((building, offset) => {
    if (building.image) {
      return building;
    }

    const stock = getStockImageForBuilding(building, limit + offset);
    if (!stock) {
      return building;
    }

    return {
      ...building,
      ...stock,
    };
  });

  return [...enriched, ...withStock];
}