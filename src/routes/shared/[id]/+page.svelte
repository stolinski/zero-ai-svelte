<script lang="ts">
	import { page } from '$app/state';
	import { z } from '$lib/z.svelte';
	import { Query } from 'zero-svelte';
	import ChatWindow from '$lib/components/ChatWindow.svelte';

	const shareId = $derived(page.params.id);
	const chat = $derived(new Query(z.current.query.chats.where('shareId', shareId).one()));
	const isLoading = $derived(!chat?.current);
	const isNotFound = $derived(chat?.current === null);
</script>

{#if isLoading}
	<div class="loading">Loading shared chat...</div>
{:else if isNotFound}
	<div class="not-found">
		<h1>Chat not found</h1>
		<p>This chat may have been deleted or the share link may be invalid.</p>
	</div>
{:else if chat?.current}
	<div class="chat-container">
		<ChatWindow chatId={chat.current.id} isOwner={false} />
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
