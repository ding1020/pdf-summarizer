"use server";

import { prisma } from "@/lib/db";
import { z } from "zod";

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(100).optional(),
  content: z.string().min(10).max(1000),
});

export async function submitReviewAction(
  data: { rating: number; title?: string; content: string },
  locale: string
) {
  const validated = reviewSchema.safeParse(data);
  if (!validated.success) {
    return { error: "Invalid review data" };
  }

  try {
    await prisma.review.create({
      data: {
        rating: validated.data.rating,
        title: validated.data.title || null,
        content: validated.data.content,
        locale: locale || "en",
        source: "web",
        status: "pending",
        userName: "Anonymous",
      },
    });
    return { success: true };
  } catch {
    return { error: "Failed to submit review" };
  }
}
