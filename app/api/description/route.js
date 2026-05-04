export async function POST(req) {
  try {
    const body = await req.json();

    const payload = {
      username: process.env.AGENT_USERNAME,
      password: process.env.AGENT_PASSWORD,
      name: "User Persona Enhancer",

      project_description: body.project_description,
      persona_title: body.persona_title,
      persona_description: body.persona_description,

      rules: [],
      user_input: JSON.stringify({
        project_description: body.project_description,
        persona_title: body.persona_title,
        persona_description: body.persona_description,
      }),
    };

    const res = await fetch(
      "https://agent5i.c5ailabs.com/api/recipes/webhook/agent/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const rawText = await res.text(); // ✅ ALWAYS safe

    console.log("RAW AGENT RESPONSE:", rawText); // 🔥 IMPORTANT

    // ✅ SAFE PARSER (same idea as Python)
    let description = "No description available";

    try {
      const parsed = JSON.parse(rawText);

      if (parsed.message) {
        try {
          const inner = JSON.parse(parsed.message);
          description =
            inner.persona_description ||
            inner.message ||
            parsed.message;
        } catch {
          description = parsed.message;
        }
      } else {
        description = JSON.stringify(parsed);
      }
    } catch {
      description = rawText;
    }

    return Response.json({ description });

  } catch (err) {
    console.error("API ERROR:", err); // 🔥 SEE THIS IN TERMINAL
    return Response.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}