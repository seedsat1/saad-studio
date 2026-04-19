export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const res = await fetch("https://www.runninghub.ai/task/openapi/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    return Response.json(
      { code: -1, msg: err instanceof Error ? err.message : "Upload proxy error" },
      { status: 500 }
    );
  }
}
