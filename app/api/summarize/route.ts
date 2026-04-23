import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getAIProvider, getSystemPrompt, type AIProvider } from "@/lib/ai";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = auth();
    
    if (!clerkId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { documentId, content, provider = "deepseek", language = "multilingual" } = await req.json();

    if (!documentId || !content) {
      return NextResponse.json(
        { error: "Document ID and content are required" },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check usage limit (free: 5 docs/day, pro: unlimited)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (user.subscriptionStatus === "free" && user.usageResetAt < today) {
      // Reset usage for new day
      await prisma.user.update({
        where: { id: user.id },
        data: { usageCount: 0, usageResetAt: new Date() },
      });
    }

    if (user.subscriptionStatus === "free" && user.usageCount >= 5) {
      return NextResponse.json(
        { error: "Daily limit reached. Upgrade to Pro for unlimited access." },
        { status: 429 }
      );
    }

    // Truncate content if too long
    const maxLength = 15000;
    const truncatedContent = content.length > maxLength 
      ? content.substring(0, maxLength) + "..."
      : content;

    // Get AI provider and generate summary
    let summary: string;
    let usedProvider: AIProvider;

    // Try primary provider first
    try {
      const openai = getAIProvider(provider as AIProvider);
      const completion = await openai.chat.completions.create({
        model: openai.baseURL?.includes("groq") ? "llama-3.3-70b-versatile" : 
               openai.baseURL?.includes("siliconflow") ? "Qwen/Qwen2.5-7B-Instruct" : "deepseek-chat",
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
      });
      summary = completion.choices[0]?.message?.content || "Failed to generate summary";
      usedProvider = provider as AIProvider;
    } catch (primaryError) {
      console.error("Primary provider failed, trying fallback:", primaryError);
      
      // Fallback to Groq if primary fails
      try {
        const openai = getAIProvider("groq");
        const completion = await openai.chat.completions.create({
          model: "llama-3.3-70b-versatile",
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
        });
        summary = completion.choices[0]?.message?.content || "Failed to generate summary";
        usedProvider = "groq";
      } catch (groqError) {
        console.error("Groq also failed, trying SiliconFlow:", groqError);
        
        // Final fallback to SiliconFlow
        const openai = getAIProvider("siliconflow");
        const completion = await openai.chat.completions.create({
          model: "Qwen/Qwen2.5-7B-Instruct",
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
        });
        summary = completion.choices[0]?.message?.content || "Failed to generate summary";
        usedProvider = "siliconflow";
      }
    }

    // Update document with summary
    await prisma.document.update({
      where: { id: documentId },
      data: { 
        summary,
        status: "completed",
      },
    });

    // Increment usage count
    await prisma.user.update({
      where: { id: user.id },
      data: { usageCount: { increment: 1 } },
    });

    return NextResponse.json({
      success: true,
      summary,
      documentId,
      provider: usedProvider,
    });
  } catch (error) {
    console.error("Summarize error:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}
