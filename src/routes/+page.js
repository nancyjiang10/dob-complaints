// Page settings
// These values are passed to the layout to control what appears on the page.
import violations from '$lib/data/bronx_buildings.json';

export function load() {
  return {
    showHeader: true,
    showFooter: true,
    violations,
  };
}

