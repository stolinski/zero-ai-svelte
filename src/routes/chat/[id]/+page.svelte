<script lang="ts">
	import { page } from '$app/state';
	import { z } from '$lib/z.svelte';
	import { Query } from 'zero-svelte';
	import ChatWindow from '$lib/components/ChatWindow.svelte';
	import ShareButton from '$lib/components/ShareButton.svelte';

	const chatId = $derived(page.params.id);
	const chat = $derived(new Query(z.current.query.chats.where('id', chatId).one()));
	const isLoading = $derived(!chat?.current);
	const isNotFound = $derived(chat?.current === null);
</script>

{#if isLoading}
	<div class="loading">Loading chat...</div>
{:else if isNotFound}
	<div class="not-found">
		<h1>Chat not found</h1>
		<p>This chat may have been deleted or is not accessible.</p>
	</div>
{:else if chat?.current}
	<div class="chat-container">
		<ShareButton {chatId} />
		<ChatWindow {chatId} isOwner={true} />
	</div>
{/if}

<style>
	.loading,
	.not-found {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
		text-align: center;
		padding: 2rem;
	}

	.not-found h1 {
		margin-bottom: 1rem;
		color: var(--text-dark);
	}

	.not-found p {
		color: var(--text-muted);
	}

	.chat-container {
		height: 100vh;
		display: flex;
		flex-direction: column;
		position: relative;
	}
</style>
