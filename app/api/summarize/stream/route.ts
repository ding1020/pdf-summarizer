import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com/v1",
});

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = auth();
    
    if (!clerkId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401 }
      );
    }

    const { content } = await req.json();

    if (!content) {
      return new Response(
        JSON.stringify({ error: "Content is required" }),
        { status: 400 }
      );
    }

    // Truncate content if too long
    const maxLength = 15000;
    const truncatedContent = content.length > maxLength 
      ? content.substring(0, maxLength) + "..."
      : content;

    const stream = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `You are a professional document summarizer. Create a comprehensive summary of the provided document content.

Requirements:
1. Provide a brief overview (2-3 sentences)
2. List 3-5 key points
3. Format using markdown
4. Be concise but informative
5. Use the same language as the document`,
        },
        {
          role: "user",
          content: `Please summarize the following document:\n\n${truncatedContent}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      stream: true,
    });

    // Create a readable stream
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              const data = `data: ${JSON.stringify({ content })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Stream error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate summary" }),
      { status: 500 }
    );
  }
}
