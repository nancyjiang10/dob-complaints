// Fetch DOB complaints from NYC Open Data API and transform into building records
const API_URL = 'https://data.cityofnewyork.us/resource/eabe-havv.json';
const START_YEAR = 2020;
const START_MONTH_INDEX = 0; // January
const START_DAY = 1;
const START_DATE = new Date(START_YEAR, START_MONTH_INDEX, START_DAY);
const API_TIMEOUT_MS = 15000;
let complaintsPromise;

// Complaint category code to description mapping
const COMPLAINT_CATEGORIES = {
  '01': 'Accident – Construction/Plumbing',
  '03': 'Adjacent Buildings - Not Protected',
  '04': 'After Hours Work – Illegal',
  '05': 'Permit – None (Building/PA/Demo etc.)',
  '06': 'Construction – Change Grade/Change Watercourse',
  '09': 'Debris – Excessive',
  '10': 'Debris/Building - Falling or In Danger of Falling',
  '12': 'Demolition - Unsafe/Illegal/Mechanical Demo',
  '13': 'Elevator In (FDNY) Readiness - None',
  '14': 'Excavation - Undermining Adjacent Building',
  '15': 'Fence - None/Inadequate/Illegal',
  '16': 'Inadequate Support/Shoring',
  '18': 'Material Storage – Unsafe',
  '20': 'Landmark Building – Illegal Work',
  '21': 'Safety Net/Guardrail - Damaged/Inadequate/None (over 6 Story/75 ft.)',
  '23': 'Sidewalk Shed/Supported Scaffold/Inadequate/Defective/None/No Permit/No Cert',
  '29': 'Building – Vacant, Open and Unguarded',
  '30': 'Building Shaking/Vibrating/Structural Stability Affected',
  '31': 'Certificate of Occupancy – None/Illegal/Contrary to Co',
  '35': 'Curb Cut/Driveway/Carport – Illegal',
  '37': 'Egress – Locked/Blocked/Improper/No Secondary Means',
  '45': 'Illegal Conversion',
  '49': 'Storefront or Business Sign/Awning/Marquee/Canopy – Illegal',
  '50': 'Sign Falling - Danger/Sign Erection or Display In Progress – Illegal',
  '52': 'Sprinkler System – Inadequate',
  '53': 'Vent/Exhaust – Illegal/Improper',
  '54': 'Wall/Retaining Wall – Bulging/Cracked',
  '55': 'Zoning – Non-conforming',
  '56': 'Boiler – Fumes/Smoke/Carbon Monoxide',
  '58': 'Boiler – Defective/Non-operative/No Permit',
  '59': 'Electrical Wiring – Defective/Exposed, In Progress',
  '62': 'Elevator - Danger Condition/Shaft Open/Unguarded',
  '63': 'Elevator - Danger Condition/Shaft Open/Unguarded',
  '65': 'Gas Hook-Up/Piping – Illegal or Defective',
  '66': 'Plumbing Work – Illegal/No Permit (Also Sprinkler/Standpipe)',
  '67': 'Crane – No Permit/License/Cert/Unsafe/Illegal',
  '71': 'SRO – Illegal Work/No Permit/Change In Occupancy Use',
  '73': 'Failure to Maintain',
  '74': 'Illegal Commercial/Manufacturing Use In Residential Zone',
  '75': 'Adult Establishment',
  '76': 'Unlicensed/Illegal/Improper Plumbing Work In Progress',
  '77': 'Contrary To Ll58/87 (Handicap Access)',
  '78': 'Privately Owned Public Space/Non-Compliance',
  '79': 'Lights from Parking Lot Shining on Building',
  '80': 'Elevator Not Inspected/Illegal/No Permit',
  '81': 'Elevator – Accident',
  '82': 'Boiler – Accident/Explosion',
  '83': 'Construction – Contrary/Beyond Approved Plans/Permits',
  '85': 'Failure to Retain Water/Improper Drainage (LL103/89)',
  '86': 'Work Contrary to Stop Work Order',
  '88': 'Safety Net/Guard Rail - Dam/Inadequate/None (6fl.75ft. or less)',
  '89': 'Accident – Cranes/Derricks/Suspension',
  '90': 'Unlicensed/Illegal Activity',
  '91': 'Site Conditions Endangering Workers',
  '92': 'Illegal Conversion of Manufacturing/Industrial Space',
  '93': 'Request for Retaining Wall Safety Inspection',
  '94': 'Plumbing - Defective/Leaking/Not Maintained',
  '1A': 'Illegal Conversion Commercial Building/Space to Dwelling Units',
  '1B': 'Illegal Tree Removal/Topo. Change In SNAD',
  '1D': 'Con Edison Referral',
  '1E': 'Suspended (Hanging) Scaffolds - No Permit/License/Dangerous/Accident',
  '1G': 'Stalled Construction Site',
  '1K': 'Bowstring Truss Tracking Complaint',
  '1Z': 'Enforcement Work Order (DOB)',
  '2A': 'Posted Notice or Order Removed/Tampered With',
  '2B': 'Failure to Comply with Vacate Order',
  '2C': 'Smoking Ban – Smoking on Construction Site',
  '2D': 'Smoking Signs – No Smoking Signs Not Observed on Construction Site',
  '2E': 'Demolition Notification Received',
  '2F': 'Building Under Structural Monitoring',
  '2G': 'Advertising Sign/Billboard/Posters/Flexible Fabric – Illegal',
  '2H': 'Second Avenue Subway Construction',
  '2J': 'Sandy: Building Destroyed',
  '2K': 'Structurally Compromised Building (LL33/08)',
  '2L': 'Façade (LL11/98) – Unsafe Notification',
  '2M': 'Monopole Tracking Complaint',
  '3A': 'Unlicensed/Illegal/Improper Electrical Work In Progress',
  '4A': 'Illegal Hotel Rooms In Residential Buildings',
  '4B': 'SEP – Professional Certification Compliance Audit',
  '4C': 'Excavation Tracking Complaint',
  '4D': 'Interior Demo Tracking Complaint',
  '4F': 'SST Tracking Complaint',
  '4G': 'Illegal Conversion No Access Follow-Up',
  '4J': 'M.A.R.C.H. Program (Interagency)',
  '4K': 'CSC – DM Tracking Complaint',
  '4L': 'CSC – High-Rise Tracking Complaint',
  '4M': 'CSC – Low-Rise Tracking Complaint',
  '4N': 'Retaining Wall Tracking Complaint',
  '4P': 'Legal/Padlock Tracking Complaint',
  '4W': 'Woodside Settlement Project',
  '5A': 'Request for Joint FDNY/DOB Inspection',
  '5B': 'Non-Compliance with Lightweight Materials',
  '5C': 'Structural Stability Impacted – New Building Under Construction',
  '5E': 'Amusement Ride Accident/Incident',
  '5F': 'Compliance Inspection',
  '5G': 'Unlicensed/Illegal/Improper Work In Progress',
  '6A': 'Vesting Inspection',
};

// Complaint category code to DOB priority mapping
const COMPLAINT_PRIORITIES = {
  '01': 'A',
  '03': 'A',
  '04': 'B',
  '05': 'B',
  '06': 'B',
  '09': 'B',
  '10': 'A',
  '12': 'A',
  '13': 'A',
  '14': 'A',
  '15': 'B',
  '16': 'A',
  '18': 'A',
  '20': 'A',
  '21': 'B',
  '23': 'B',
  '29': 'C',
  '30': 'A',
  '31': 'C',
  '35': 'D',
  '37': 'A',
  '45': 'B',
  '49': 'C',
  '50': 'A',
  '52': 'B',
  '53': 'D',
  '54': 'B',
  '55': 'D',
  '56': 'A',
  '58': 'B',
  '59': 'B',
  '62': 'A',
  '63': 'B',
  '65': 'A',
  '66': 'B',
  '67': 'A',
  '71': 'B',
  '73': 'C',
  '74': 'C',
  '75': 'B',
  '76': 'A',
  '77': 'C',
  '78': 'B',
  '79': 'C',
  '80': 'D',
  '81': 'A',
  '82': 'A',
  '83': 'B',
  '85': 'C',
  '86': 'A',
  '88': 'B',
  '89': 'A',
  '90': 'C',
  '91': 'A',
  '92': 'B',
  '93': 'B',
  '94': 'C',
  '1A': 'B',
  '1B': 'B',
  '1D': 'B',
  '1E': 'A',
  '1G': 'B',
  '1K': 'D',
  '1Z': 'D',
  '2A': 'B',
  '2B': 'A',
  '2C': 'B',
  '2D': 'B',
  '2E': 'A',
  '2F': 'D',
  '2G': 'C',
  '2H': 'D',
  '2J': 'D',
  '2K': 'D',
  '2L': 'D',
  '2M': 'D',
  '3A': 'B',
  '4A': 'B',
  '4B': 'B',
  '4C': 'D',
  '4D': 'D',
  '4F': 'D',
  '4G': 'B',
  '4J': 'D',
  '4K': 'D',
  '4L': 'D',
  '4M': 'D',
  '4N': 'D',
  '4P': 'D',
  '4W': 'C',
  '5A': 'B',
  '5B': 'A',
  '5C': 'A',
  '5E': 'A',
  '5F': 'B',
  '5G': 'B',
  '6A': 'C',
};

/**
 * Get the readable description for a complaint category code
 */
export function getCategoryDescription(code) {
  return COMPLAINT_CATEGORIES[code] || `Unknown Category (${code})`;
}

export function getCategoryPriority(code) {
  return COMPLAINT_PRIORITIES[code] || 'Unknown';
}

/**
 * Fetch complaints from the NYC API
 * Fetches all records (using pagination if necessary) and aggregates by address
 */
export async function fetchComplaints() {
  if (complaintsPromise) {
    return complaintsPromise;
  }

  complaintsPromise = (async () => {
  try {
    // Fetch with a limit to get substantial data
    // The API supports $limit for pagination
    const params = new URLSearchParams({
      $limit: 50000,
      $order: 'date_entered DESC',
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    let response;
    try {
      response = await fetch(`${API_URL}?${params}`, {
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const complaints = await response.json();

    // Keep only complaints from 2020 onward, even if API-side filtering changes.
    const recentComplaints = complaints.filter((complaint) => {
      const enteredDate = parseComplaintDate(complaint.date_entered);
      return enteredDate && enteredDate >= START_DATE;
    });

    // Transform and aggregate complaints by address
    const buildings = aggregateByAddress(recentComplaints);

    // Sort by violation count descending
    return buildings.sort((a, b) => b.violationCount - a.violationCount);
  } catch (error) {
    console.error('Error fetching complaints:', error);
    complaintsPromise = null;
    return [];
  }
  })();

  return complaintsPromise;
}

/**
 * Aggregate raw API complaints into building records
 */
function aggregateByAddress(complaints) {
  const addressMap = new Map();

  complaints.forEach((complaint) => {
    const address = formatAddress(complaint);
    const key = address.toLowerCase();

    if (!addressMap.has(key)) {
      addressMap.set(key, {
        id: generateId(key),
        address,
        zip: complaint.zip_code || '',
        unit: complaint.unit || '',
        bin: complaint.bin || '',
        communityBoard: complaint.community_board || '',
        violationCount: 0,
        latestDate: null,
        lat: 40.7128, // Default to NYC center
        lng: -74.0060, // Default to NYC center
        violations: [],
      });
    }

    const building = addressMap.get(key);
    building.violationCount += 1;

    // Track latest date
    if (complaint.date_entered && (!building.latestDate || complaint.date_entered > building.latestDate)) {
      building.latestDate = complaint.date_entered;
    }

    // Add the individual complaint
    building.violations.push({
      complaintNumber: complaint.complaint_number,
      status: complaint.status,
      dateEntered: complaint.date_entered,
      dispositionDate: complaint.disposition_code,
      inspectionDate: complaint.inspection_date,
      complaintCategory: complaint.complaint_category,
      priority: getCategoryPriority(complaint.complaint_category),
      unit: complaint.unit,
    });
  });

  return Array.from(addressMap.values());
}

/**
 * Format address from complaint record
 */
function formatAddress(complaint) {
  const parts = [];

  if (complaint.house_number) {
    parts.push(complaint.house_number);
  }
  if (complaint.house_street) {
    parts.push(complaint.house_street);
  }

  return parts.join(' ');
}

/**
 * Parse DOB complaint dates formatted as MM/DD/YYYY
 */
function parseComplaintDate(value) {
  if (!value) {
    return null;
  }

  const [month, day, year] = value.split('/').map(Number);
  if (!month || !day || !year) {
    return null;
  }

  return new Date(year, month - 1, day);
}

/**
 * Generate consistent ID from address
 */
function generateId(address) {
  // Simple hash to generate a numeric ID from address
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    const char = address.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString();
}
