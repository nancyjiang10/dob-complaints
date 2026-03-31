<script>
  import { base } from '$app/paths';
  import DatabaseHeader from '$lib/components/DatabaseHeader.svelte';
  import RankingList from '$lib/components/RankingList.svelte';
  import RankingCard from '$lib/components/RankingCard.svelte';
  import SearchInput from '$lib/components/SearchInput.svelte';
  import MethodologyBox from '$lib/components/MethodologyBox.svelte';

  let { data } = $props();

  let search = $state('');

  let filtered = $derived(
    data.violations
      .filter(b => b.address.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 20)
  );
</script>

<DatabaseHeader
  headline="Tainted Home Tracker"
  description="The Bronx buildings with the most lead paint violations"
  byline="NYCity News Service"
  date="March 2026"
>
  <div class="search-wrapper">
    <SearchInput bind:value={search} placeholder="Search by address..." />
  </div>
</DatabaseHeader>

<div class="container">
<RankingList title="Top 20 buildings by open violations">
    {#each filtered as building (building.id)}
  <RankingCard
    rank={building.rank}
    title={building.address}
    href="{base}/building/{building.id}"
    value={building.violationCount}
  />
{/each}
</RankingList>

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
  }

  .search-wrapper {
    max-width: 600px;
  }
</style>


