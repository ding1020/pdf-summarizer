import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/db";

const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com/v1",
});

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = auth();
    
    if (!clerkId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { documentId, content } = await req.json();

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

    // Truncate content if too long (DeepSeek has context limit)
    const maxLength = 15000;
    const truncatedContent = content.length > maxLength 
      ? content.substring(0, maxLength) + "..."
      : content;

    // Generate summary using DeepSeek
    const completion = await openai.chat.completions.create({
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
    });

    const summary = completion.choices[0]?.message?.content || "Failed to generate summary";

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
    });
  } catch (error) {
    console.error("Summarize error:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}
