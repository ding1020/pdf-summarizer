import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// In-memory log buffer for batching (in production, use a proper queue)
const logBuffer: Array<{
  timestamp: string;
  level: string;
  message: string;
  context?: Record<string, unknown>;
}> = [];

const BUFFER_SIZE = 100;
const FLUSH_INTERVAL = 60000; // 1 minute

// Periodically flush logs (in production, use a proper logging service)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    if (logBuffer.length > 0) {
      flushLogs();
    }
  }, FLUSH_INTERVAL);
}

async function flushLogs() {
  if (logBuffer.length === 0) return;
  
  const logsToSend = [...logBuffer];
  logBuffer.length = 0;
  
  // In production, send to your logging service
  // Example: CloudWatch, Datadog, Elasticsearch, etc.
  console.log(`[Log Batch] Flushing ${logsToSend.length} logs`);
  
  // Uncomment to send to external service:
  // await fetch('https://your-logging-service.com/logs', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(logsToSend),
  // });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate log entry
    if (!body.message || typeof body.message !== "string") {
      return NextResponse.json(
        { error: "Invalid log entry" },
        { status: 400 }
      );
    }

    const logEntry = {
      timestamp: body.timestamp || new Date().toISOString(),
      level: body.level || "info",
      message: body.message,
      context: body.context || {},
      // Add server-side metadata
      serverTimestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    };

    // Add to buffer
    logBuffer.push(logEntry);

    // Flush if buffer is full
    if (logBuffer.length >= BUFFER_SIZE) {
      await flushLogs();
    }

    // Log to server console as well
    logger.info(body.message, body.context);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to process log", error as Error);
    return NextResponse.json(
      { error: "Failed to process log" },
      { status: 500 }
    );
  }
}

// Timing-safe string comparison
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Endpoint to retrieve recent logs (for debugging/admin)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const expected = `Bearer ${process.env.LOG_API_KEY || ""}`;
  
  if (!timingSafeEqual(authHeader, expected)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    bufferSize: logBuffer.length,
    recentLogs: logBuffer.slice(-50), // Last 50 logs
    environment: process.env.NODE_ENV,
  });
}
