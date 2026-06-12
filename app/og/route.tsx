import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get("title") || "PDF Summary AI";
    const description =
      searchParams.get("description") ||
      "Upload any PDF and get AI-powered summaries instantly.";
    const locale = searchParams.get("locale") || "en";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "center",
            backgroundImage: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
            padding: "80px 100px",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          {/* Top accent line */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "6px",
              backgroundImage: "linear-gradient(90deg, #f59e0b, #ef4444, #ec4899)",
            }}
          />

          {/* Icon / Logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginBottom: "40px",
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="48" height="48" rx="12" fill="white" fillOpacity="0.2" />
              <path
                d="M14 12h12l8 8v16a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V16a4 4 0 0 1 4-4z"
                fill="white"
              />
              <path d="M26 12v8h8" fill="white" fillOpacity="0.5" />
              <path d="M18 26h12M18 30h8" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span
              style={{
                fontSize: "32px",
                fontWeight: 700,
                color: "white",
                letterSpacing: "-0.02em",
              }}
            >
              PDF Summary AI
            </span>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: "56px",
              fontWeight: 800,
              color: "white",
              lineHeight: 1.1,
              marginBottom: "16px",
              letterSpacing: "-0.03em",
              maxWidth: "900px",
            }}
          >
            {title}
          </div>

          {/* Description */}
          <div
            style={{
              fontSize: "28px",
              fontWeight: 400,
              color: "rgba(255,255,255,0.85)",
              lineHeight: 1.4,
              maxWidth: "800px",
            }}
          >
            {description}
          </div>

          {/* Bottom bar */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "4px",
              background: "rgba(255,255,255,0.15)",
            }}
          />
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
        },
      }
    );
  } catch (e: unknown) {
    console.error("OG image generation failed:", e);
    return new Response("Failed to generate image", { status: 500 });
  }
}
