// Diagnostic endpoint: confirms which commit is deployed
export async function GET() {
  return Response.json({
    commit: "19bac35",
    message: "Native auth middleware + passthrough AuthProvider",
    timestamp: Date.now(),
    deployTime: new Date().toISOString(),
  });
}
