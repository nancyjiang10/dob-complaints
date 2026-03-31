<script>
  import DatabaseHeader from '$lib/components/DatabaseHeader.svelte';
  import MethodologyBox from '$lib/components/MethodologyBox.svelte';
  import LocatorMap from '$lib/components/LocatorMap.svelte';

  let { data } = $props();
  let building = data.building;
</script>

<DatabaseHeader
  headline={building.address}
  description={`${building.violationCount} open lead paint violations`}
>
  {#snippet graphic()}
    <LocatorMap
      longitude={building.lng}
      latitude={building.lat}
      zoom={13}
      dot={true}
      width={250}
    />
  {/snippet}
</DatabaseHeader>

<div class="container">
  <table>
    <thead>
      <tr>
        <th>Date issued</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
      {#each building.violations as violation (violation.violationId)}
        <tr>
          <td>{violation.date}</td>
          <td>{violation.description}</td>
        </tr>
      {/each}
    </tbody>
  </table>

  <MethodologyBox>
    <p>
      The data on this page comes from the Department of Housing Preservation and Development
      <a href="https://data.cityofnewyork.us/Housing-Development/Housing-Maintenance-Code-Violations/wvxf-dwi5" target="_blank">via New York City's open data portal</a>.
    </p>
    <p>
      The citations published by the city were filtered to include only lead paint violations that city inspectors listed as unresolved. The data was filtered to only citations linked to addresses in the Bronx and then aggregated by address. Only addresses with five or more open violations were included in the ranking. The data is current as of March 2026.
    </p>
    <p>The code that executed the analysis is available as open source on GitHub at <a href="https://github.com/palewire/nyc-hpd-bronx-lead-paint-violations" target="_blank">github.com/palewire/nyc-hpd-bronx-lead-paint-violations</a>.</p>
  </MethodologyBox>
</div>

<style>
  .container {
    max-width: var(--max-width-wide);
    margin: 0 auto;
    padding: 0 var(--spacing-md);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
  }

  th, td {
    text-align: left;
    padding: 0.75rem;
    border-bottom: 1px solid var(--color-border);
    vertical-align: top;
  }

  th {
    font-weight: bold;
    background: var(--color-light-gray);
  }
</style>