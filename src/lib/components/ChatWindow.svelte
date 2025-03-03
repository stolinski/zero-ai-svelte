<script lang="ts">
	import { z } from '$lib/z.svelte';
	import { Query } from 'zero-svelte';
	import { tick } from 'svelte';
	import { fly } from 'svelte/transition';
	import { nanoid } from 'nanoid';

	let { chatId, isOwner = false } = $props();

	const messages = $derived(
		new Query(z.current.query.messages.where('chatId', chatId).orderBy('createdAt', 'asc'))
	);

	const chat = $derived(new Query(z.current.query.chats.where('id', chatId).one()));
	const isReadOnly = $derived(chat?.current?.shareMode === 'read' && !isOwner);

	let chatContainer = $state<HTMLElement | null>(null);
	let userInput = $state('');

	// Handle sending a new message
	function sendMessage(e: Event) {
		e.preventDefault();
		if (!chat?.current || isReadOnly || !userInput.trim()) return;

		z.current.mutate.messages.insert({
			id: nanoid(),
			chatId: chat.current.id,
			userId: z.current.userID,
			content: userInput,
			isComplete: true,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			role: 'user'
		});

		// Call AI response
		userInput = '';
		generateAIResponse();
	}

	// Generate AI response
	function generateAIResponse() {
		if (chat?.current?.id) {
			fetch('/api/chat', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					chatId: chat.current.id
				})
			}).catch((error) => {
				console.error('Error:', error);
			});
		}
	}

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
			<div
				class="message {message.role === 'user' ? 'user-message' : 'assistant-message'}"
				class:shared={message.userId !== chat.current?.userId}
			>
				{@html message.content.replace(/\n/g, '<br>')}
			</div>
		</div>
	{/each}
</section>

{#if !isReadOnly}
	<div class="input-container">
		<form onsubmit={sendMessage}>
			<input
				type="text"
				bind:value={userInput}
				placeholder="Type your message..."
				class="chat-input"
			/>
			<button type="submit" class="send-button">Send</button>
		</form>
	</div>
{/if}

<style>
	.chat-container {
		flex: 1;
		overflow-y: auto;
		padding: 1rem 1rem 8rem;
		position: relative;
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
		color: black;
		border-bottom-right-radius: 0.25rem;
		font-weight: bold;
		box-shadow: 1px 4px 5px rgb(0 0 0 / 0.2);
		&.shared {
			background-color: var(--color-secondary);
		}
	}

	.assistant-message {
		background-color: var(--bg-lighter);
		color: var(--text-dark);
		border-bottom-left-radius: 0.25rem;
		box-shadow: 1px 4px 5px rgb(0 0 0 / 0.2);
	}

	.input-container {
		position: absolute;
		inset: auto 0 0 0;
		padding: 1rem 1rem 3rem;
		background-color: light-dark(rgb(255 255 255 / 0.5), rgb(18 18 18 / 0.5));
		backdrop-filter: blur(10px);
		box-shadow: 0 -2px 20px rgb(0 0 0 / 0.5);
	}

	.input-container form {
		display: flex;
		gap: 0.5rem;
		max-width: 800px;
		margin: 0 auto;
		padding: 0 1rem;
	}

	.chat-input {
		flex: 1;
		padding: 0.75rem;
		border: 1px solid var(--border);
		border-radius: 4px;
		background-color: var(--bg);
		color: var(--text);
	}

	.send-button {
		padding: 0.75rem 2.5rem;
		background-color: var(--primary);
		font-size: 20px;
		color: white;
		border: none;
		cursor: pointer;
		border-radius: 10px;
	}

	.send-button:hover {
		background-color: var(--primary-dark);
	}
</style>
