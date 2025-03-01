<script lang="ts">
	import { page } from '$app/state';
	import { z } from '$lib/z.svelte';
	import { Query } from 'zero-svelte';
	import { tick } from 'svelte';
	import { fly } from 'svelte/transition';

	const messages = $derived(
		new Query(z.current.query.messages.where('chatId', page.params.id).orderBy('createdAt', 'asc'))
	);

	let chatContainer: HTMLElement;
	let previousMessageCount = 0;

	// Scroll to bottom function
	function scrollToBottom() {
		if (!chatContainer) return;
		chatContainer.scrollTop = chatContainer.scrollHeight;
	}

	// Use $effect to scroll on initial load
	$effect(() => {
		if (!chatContainer) return;
		scrollToBottom();
	});

	// Use $effect to detect new messages and scroll to bottom
	$effect(() => {
		if (!chatContainer) return;

		// Reference messages.current to trigger effect when it changes
		messages.current;

		// Scroll to bottom after DOM update
		tick().then(scrollToBottom);
	});
</script>

<section bind:this={chatContainer} class="chat-container">
	{#each messages.current as message}
		<div
			transition:fly={{ y: 10, opacity: 0 }}
			class="message-wrapper {message.role === 'user' ? 'user' : 'assistant'}"
		>
			<div class="message {message.role === 'user' ? 'user-message' : 'assistant-message'}">
				{@html message.content.replace(/\n/g, '<br>')}
			</div>
		</div>
	{/each}
</section>

<style>
	.chat-container {
		height: 100%;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		padding: 1rem;
	}

	.message-wrapper {
		width: 100%;
		display: flex;
		margin-bottom: 1rem;
	}

	.message-wrapper.user {
		justify-content: flex-end;
	}

	.message-wrapper.assistant {
		justify-content: flex-start;
	}

	.message {
		max-width: 80%;
		padding: 0.5rem 1rem;
		border-radius: 1rem;
		word-break: break-word;
		white-space: pre-wrap;
	}

	.user-message {
		background-image: linear-gradient(-180deg, rgb(255 255 255 / 0.2), rgb(0 0 0 / 0.3));
		text-shadow: 1px 1px 2px rgb(0 0 0 / 0.2);
		background-color: var(--color-primary);
		color: white;
		border-bottom-right-radius: 0.25rem;
		font-weight: bold;
		box-shadow: 1px 4px 5px rgb(0 0 0 / 0.2);
	}

	.assistant-message {
		background-color: var(--color-bg-lighter);
		color: var(--color-text-dark);
		border-bottom-left-radius: 0.25rem;
	}
</style>
