import buildings from '$lib/data/bronx_buildings.json';

export function load({ params }) {
  const building = buildings.find(b => b.id === params.id);
  return { building };
}

export function entries() {
  return buildings.map(b => ({ id: b.id }));
}