exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { mode, instruction, fileContent, filePath, projectName } = JSON.parse(event.body);

    const model = "gemini-3.6-flash";
    const apiKey = process.env.GEMINI_API_KEY;

    // MODE 1: Edit an existing file (old behavior)
    if (mode !== "new_project") {
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

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

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
        return { statusCode: 500, body: JSON.stringify({ error: data.error.message }) };
      }

      let updatedCode = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      updatedCode = updatedCode.replace(/^```[\w]*\n/, "").replace(/```$/, "").trim();

      return { statusCode: 200, body: JSON.stringify({ updatedCode }) };
    }

    // MODE 2: Create a brand new project (single HTML file, self-contained)
    const prompt = `Tum ek expert web developer AI ho. User ek naya project banana chahta hai.

User ka instruction: "${instruction}"

Tumhara kaam: ek POORA, self-contained, working HTML file banao jisme CSS aur JavaScript bhi andar hi ho (inline <style> aur <script> tags mein). Ye file turant browser mein khulke kaam karni chahiye.

Rules:
- Poora valid HTML document banao (<!DOCTYPE html> se shuru)
- Modern, clean design use karo
- Sirf raw HTML code return karo, koi explanation nahi, koi markdown backticks nahi
- Agar koi interactivity chahiye (buttons, forms, etc), vanilla JavaScript use karo, koi external library nahi

Ab poora HTML code do:`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 8192, temperature: 0.3 },
      }),
    });

    const data = await response.json();

    if (data.error) {
      return { statusCode: 500, body: JSON.stringify({ error: data.error.message }) };
    }

    let generatedCode = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    generatedCode = generatedCode.replace(/^```[\w]*\n/, "").replace(/```$/, "").trim();

    return { statusCode: 200, body: JSON.stringify({ generatedCode }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
