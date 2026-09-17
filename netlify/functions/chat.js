exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { instruction, fileContent, filePath } = JSON.parse(event.body);

    const prompt = `Tum ek coding AI ho. User tumhe ek instruction dega aur ek existing file ka content.
Tumhara kaam hai: file ka POORA UPDATED content return karna jo instruction ko follow kare.
IMPORTANT: Sirf updated file content return karo, koi explanation, koi markdown backticks nahi. Raw code hi output karo.

File path: ${filePath}

Current file content:
---
${fileContent || "(file khaali hai ya nayi file hai)"}
---

Instruction: ${instruction}

Ab poora updated file content do (sirf code, kuch aur nahi):`;

    const model = "gemini-3.6-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 4096, temperature: 0.2 },
      }),
    });

    const data = await response.json();

    if (data.error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: data.error.message }),
      };
    }

    let updatedCode = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    updatedCode = updatedCode
      .replace(/^```[\w]*\n/, "")
      .replace(/```$/, "")
      .trim();

    return {
      statusCode: 200,
      body: JSON.stringify({ updatedCode }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
