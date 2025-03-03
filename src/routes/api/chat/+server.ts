import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { streamingChatCompletion, type Message as AIMessage } from '$lib/server/ai-service';
import { query } from '$lib/server/db';

/**
 * POST /api/chat
 * Takes a chat ID and a single new message, retrieves chat history from the database,
 * sends to OpenAI, and streams the response back
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const { chatId } = await request.json();

		// Validate request
		if (!chatId) {
			return json({ error: 'Chat ID is required' }, { status: 400 });
		}

		// Get current chat data to check title and message count
		const chatResult = await query(
			'SELECT title, user_id, is_shared, share_mode FROM chats WHERE id = $1',
			[chatId]
		);

		if (chatResult.rows.length === 0) {
			return json({ error: 'Chat not found' }, { status: 404 });
		}

		const chat = chatResult.rows[0];

		// Check if this is a shared chat and if the user has write permission
		if (chat.is_shared && chat.share_mode === 'read') {
			return json({ error: 'This chat is read-only' }, { status: 403 });
		}

		const chatTitle = chat.title;

		// Get all messages for this chat
		const messagesResult = await query(
			'SELECT * FROM messages WHERE chat_id = $1 ORDER BY created_at ASC',
			[chatId]
		);

		const messages = messagesResult.rows.map((msg) => ({
			id: msg.id,
			chatId: msg.chat_id,
			role: msg.role,
			content: msg.content,
			isComplete: msg.is_complete,
			createdAt: msg.created_at,
			updatedAt: msg.updated_at
		}));

		// Update the title if it's still the default "new chat"
		// and we have at least one user message to derive a title from
		if (chatTitle === 'new chat') {
			// Find the first user message
			const firstUserMessage = messagesResult.rows.find((msg) => msg.role === 'user')?.content;

			if (firstUserMessage) {
				const newTitle = firstUserMessage.split(' ')[0];

				// Update the title
				await query('UPDATE chats SET title = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [
					newTitle,
					chatId
				]);

				console.log(`Updated chat ${chatId} title from "new chat" to "${newTitle}"`);
			} else {
				// Just update the timestamp if we don't have a user message to derive a title from
				await query('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [chatId]);
			}
		} else {
			// Just update the timestamp for non-default titles
			await query('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [chatId]);
		}

		// Format messages for the AI service
		const messageHistory: AIMessage[] = messagesResult.rows.map((msg) => ({
			role: msg.role,
			content: msg.content
		}));

		// Create a stream for the response
		const stream = new ReadableStream({
			async start(controller) {
				try {
					// Get streaming response from AI
					const aiStream = await streamingChatCompletion(messageHistory);

					// For collecting the partial AI response until we get a paragraph
					let currentParagraph = '';
					let completeAIResponse = '';
					let messageId = crypto.randomUUID(); // One message ID for all paragraphs
					let paragraphCount = 0;

					// Set up a reader to process the stream
					const reader = aiStream.getReader();

					// Get the timestamp of the latest user message to ensure consistent ordering
					const latestMessageResult = await query(
						'SELECT created_at FROM messages WHERE chat_id = $1 AND role = $2 ORDER BY created_at DESC LIMIT 1',
						[chatId, 'user']
					);

					// Use the latest user message's timestamp + 1 second to ensure proper ordering
					let timestamp = 'CURRENT_TIMESTAMP';
					if (latestMessageResult.rows.length > 0) {
						timestamp = `(SELECT created_at + INTERVAL '1 second' FROM messages WHERE chat_id = '${chatId}' AND role = 'user' ORDER BY created_at DESC LIMIT 1)`;
					}

					// Process each chunk as it comes in
					while (true) {
						const { done, value } = await reader.read();

						if (done) {
							// If there's any remaining content, save it as the final paragraph
							if (currentParagraph.trim() !== '') {
								completeAIResponse += currentParagraph;
								// Update the final paragraph and mark it as complete
								await query(
									`UPDATE messages SET content = $1, is_complete = TRUE, updated_at = CURRENT_TIMESTAMP
									 WHERE id = $2`,
									[completeAIResponse, messageId]
								);
							} else if (paragraphCount === 0) {
								// If there were no paragraphs at all, insert the complete response
								await query(
									`INSERT INTO messages (id, chat_id, user_id, role, content, is_complete, created_at, updated_at) 
									 VALUES ($1, $2, $3, $4, $5, $6, ${timestamp}, ${timestamp})`,
									[
										messageId,
										chatId,
										(await query('SELECT user_id FROM chats WHERE id = $1', [chatId])).rows[0]
											.user_id,
										'assistant',
										completeAIResponse,
										true
									]
								);
							}

							// Update only the timestamp - title is already handled
							await query('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [
								chatId
							]);

							controller.close();
							break;
						}

						// Decode the chunk
						const chunk = new TextDecoder().decode(value);
						currentParagraph += chunk;
						completeAIResponse += chunk;

						// Check if we have a paragraph (approximately)
						if (chunk.includes('\n\n') || currentParagraph.length > 300) {
							paragraphCount++;

							if (paragraphCount === 1) {
								// First paragraph - insert new record
								await query(
									`INSERT INTO messages (id, chat_id, user_id, role, content, is_complete, created_at, updated_at) 
									 VALUES ($1, $2, $3, $4, $5, $6, ${timestamp}, CURRENT_TIMESTAMP)`,
									[
										messageId,
										chatId,
										(await query('SELECT user_id FROM chats WHERE id = $1', [chatId])).rows[0]
											.user_id,
										'assistant',
										completeAIResponse,
										false
									]
								);
							} else {
								// Update existing record with accumulated content
								await query(
									`UPDATE messages SET content = $1, updated_at = CURRENT_TIMESTAMP
									 WHERE id = $2`,
									[completeAIResponse, messageId]
								);
							}

							// Reset current paragraph collector
							currentParagraph = '';
						}

						// Send the chunk to the client
						controller.enqueue(value);
					}
				} catch (error) {
					// If something goes wrong, log it and close the stream
					console.error('Error streaming AI response:', error);
					controller.error(error);
				}
			}
		});

		// Return the streaming response
		return new Response(stream, {
			headers: {
				'Content-Type': 'text/plain'
			}
		});
	} catch (error) {
		console.error('Chat API error:', error);
		return json({ error: 'An error occurred processing your request' }, { status: 500 });
	}
};
