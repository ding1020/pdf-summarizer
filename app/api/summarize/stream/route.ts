import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { getAIProvider, getSystemPrompt, type AIProvider } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = auth();
    
    if (!clerkId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401 }
      );
    }

    const { content, provider = "deepseek", language = "multilingual" } = await req.json();

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

    // Get AI client
    const openai = getAIProvider(provider as AIProvider);
    
    const model = openai.baseURL?.includes("groq") ? "llama-3.3-70b-versatile" : 
                  openai.baseURL?.includes("siliconflow") ? "Qwen/Qwen2.5-7B-Instruct" : "deepseek-chat";

    const stream = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: getSystemPrompt(language),
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
