import { fetchComplaints } from '$lib/data/fetchComplaints.js';
import { enrichBuildingsWithImages } from '$lib/data/buildingImages.js';
import { error } from '@sveltejs/kit';

export const prerender = true;

let buildingsPromise;

function getBuildings() {
  if (!buildingsPromise) {
    buildingsPromise = fetchComplaints();
  }

  return buildingsPromise;
}

export async function load({ params }) {
  const buildings = await getBuildings();
  const building = buildings.find((b) => b.id === params.id);

  if (!building) {
    throw error(404, 'Building not found');
  }

  const [enrichedBuilding] = await enrichBuildingsWithImages([building], 1);

  return { building: enrichedBuilding };
}

export async function entries() {
  const buildings = await getBuildings();
  return buildings.map((b) => ({ id: b.id }));
}