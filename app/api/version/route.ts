// Diagnostic endpoint: confirms which commit is deployed
export async function GET() {
  return Response.json({
    commit: "19bac35",
    message: "Zero-Clerk middleware + passthrough ClientClerkProvider",
    timestamp: Date.now(),
    deployTime: new Date().toISOString(),
  });
}
