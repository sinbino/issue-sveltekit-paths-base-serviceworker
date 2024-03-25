<script lang="ts">
  import { base } from "$app/paths";
  import { onMount } from "svelte";

  let text = ''

  onMount(() => {
    const time = setInterval(async () => {
      const response = await fetch(`${base}/current-time`)
      text = await response.text()
    }, 1000)
    return () => {
      clearInterval(time)
    }
  })
  
</script>


<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>

<div>text={text}</div>
<div>base={base}</div>
