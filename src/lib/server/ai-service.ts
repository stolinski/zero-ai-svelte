import OpenAI from 'openai';
import { env } from '$env/dynamic/private';

// Initialize OpenAI client
const openai = new OpenAI({
	apiKey: env.OPENAI_API_KEY
});

// Default system message to set the AI's behavior
const DEFAULT_SYSTEM_MESSAGE =
	'You are a helpful assistant. Feel free to respond in multiple paragraphs where appropriate';

export type Message = {
	role: 'user' | 'assistant' | 'system';
	content: string;
};

export type StreamingTextResponse = ReadableStream<Uint8Array>;

/**
 * Generate a chat completion with streaming from OpenAI
 */
export async function streamingChatCompletion(
	messages: Message[],
	options: {
		temperature?: number;
		systemMessage?: string;
	} = {}
): Promise<StreamingTextResponse> {
	// Set default options
	const model = 'gpt-3.5-turbo';
	const temperature = options.temperature ?? 0.7;
	const systemMessage = options.systemMessage || DEFAULT_SYSTEM_MESSAGE;

	// Ensure there's a system message
	if (!messages.some((m) => m.role === 'system')) {
		messages = [{ role: 'system', content: systemMessage }, ...messages];
	}

	// Create a streaming response from OpenAI
	const response = await openai.chat.completions.create({
		model,
		messages: messages as any, // Type cast to satisfy OpenAI SDK
		temperature,
		stream: true
	});

	// Transform the response into a readable stream
	const stream = new ReadableStream({
		async start(controller) {
			// Process each chunk as it arrives
			for await (const chunk of response) {
				// Get the content delta if it exists
				const content = chunk.choices[0]?.delta?.content || '';
				console.log('content', content);

				if (content) {
					// Send the content chunk to the stream
					controller.enqueue(new TextEncoder().encode(content));
				}
			}
			controller.close();
		}
	});

	return stream;
}
