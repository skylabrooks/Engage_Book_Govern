// Simple test server
console.log("Starting simple Deno server...");

Deno.serve({
  port: 8000,
  handler: (req) => {
    console.log(`Received ${req.method} request to ${req.url}`);
    return new Response("Hello from Deno!", {
      headers: { "Content-Type": "text/plain" }
    });
  }
});

console.log("Server should be listening on http://localhost:8000/");
