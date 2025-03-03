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
			userId: z.current.userID,
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
	</section>
</div>

<style>
	.layout {
		display: grid;
		grid-template-columns: 250px 1fr;
		height: 100vh;
	}

	.chat-section {
		background-color: var(--bg);
	}
</style>
