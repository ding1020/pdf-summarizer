import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import * as pdfParse from "pdf-parse";

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = auth();
    
    if (!clerkId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Check file type
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    // Check file size (20MB limit)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 20MB limit" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Parse PDF
    // @ts-ignore - pdf-parse CommonJS module
    const parsePdf = pdfParse.default || pdfParse;
    const pdfData = await parsePdf(buffer);

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      // Get user email from Clerk
      const clerk = require("@clerk/nextjs/server");
      const clerkUser = await clerk.currentUser();
      
      user = await prisma.user.create({
        data: {
          clerkId,
          email: clerkUser?.emailAddresses[0]?.emailAddress || "unknown@example.com",
        },
      });
    }

    // Create document record
    const document = await prisma.document.create({
      data: {
        userId: user.id,
        filename: file.name,
        fileSize: file.size,
        pageCount: pdfData.numpages,
        content: pdfData.text,
        status: "processing",
      },
    });

    return NextResponse.json({
      success: true,
      documentId: document.id,
      filename: file.name,
      fileSize: file.size,
      pageCount: pdfData.numpages,
      content: pdfData.text,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to process PDF" },
      { status: 500 }
    );
  }
}
