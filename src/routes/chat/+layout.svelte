<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { z } from '$lib/z.svelte';
	import { nanoid } from 'nanoid';
	import { Query } from 'zero-svelte';
	import Sidebar from './Sidebar.svelte';

	let { children } = $props();

	let user_input = $state({
		value: ''
	});

	const chat = $derived(new Query(z.current.query.chats.where('id', page.params.id).one()));

	const messages = $derived(
		new Query(z.current.query.messages.where('chatId', page.params.id).orderBy('createdAt', 'asc'))
	);
	let first_message = $derived(messages.current[0]);
	let disabled = $derived.by(() => {
		const most_recent_chat = messages.current[-1];
		if (most_recent_chat) {
			return !most_recent_chat.isComplete || most_recent_chat.role === 'user';
		}
		return false;
	});

	async function add_user_message(chatId: string) {
		z.current.mutate.messages.insert({
			id: nanoid(),
			chatId,
			content: user_input.value,
			isComplete: true,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			role: 'user'
		});

		// Title updates will be handled on the server side

		user_input.value = '';
		ai_response();
	}

	function ai_response() {
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

	function save_chat() {
		// If chat doesn't exist, create it, and then save message and redirect other wise, just add user message, set to disabled have server do ai bits.

		if (chat.current?.id) {
			add_user_message(chat.current?.id);
		} else {
			const new_id = nanoid();
			z.current.mutate.chats.insert({
				title: $state.snapshot(user_input.value).split(' ')[0],
				id: nanoid(),
				userId: z.current.userID,
				isShared: false,
				createdAt: Date.now(),
				updatedAt: Date.now()
			});
			add_user_message(new_id);
			goto('/chat/' + new_id);
		}
	}
</script>

<div class="layout">
	<Sidebar />

	<section class="chat-section">
		{@render children()}

		<div class="chat-container">
			<form onsubmit={(e) => e.preventDefault()}>
				<input
					{disabled}
					bind:value={user_input.value}
					type="text"
					placeholder="Type your message..."
					class="chat-input"
				/>
				{#if disabled}
					<button>Regenerate</button>
				{:else}
					<button {disabled} onclick={save_chat} class="chat-submit">Send</button>
				{/if}
			</form>
		</div>
	</section>
</div>

<style>
	.layout {
		display: grid;
		grid-template-columns: 250px 1fr;
		height: 100vh;
	}

	.chat-section {
		display: grid;
		grid-template-rows: 90vh 20vh;
		background-color: var(--bg);
	}

	.chat-container {
		align-items: center;
		padding: 10px;
		height: 100%;
		margin-top: auto;
		form {
			display: flex;
		}
	}

	.chat-input {
		flex: 1;
		padding: 10px;
		border: 1px solid var(--border);
		border-radius: 4px;
		margin-right: 10px;
		background-color: var(--bg-lighter);
		color: var(--text);
	}

	.chat-submit {
		padding: 10px 20px;
		background-color: var(--primary);
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}

	.chat-submit:hover {
		background-color: var(--primary-dark);
	}
</style>
