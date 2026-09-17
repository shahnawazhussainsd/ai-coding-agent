const GITHUB_API = "https://api.github.com";

exports.handler = async function (event) {
  try {
    const { action, filePath, newContent, commitMessage } = JSON.parse(
      event.body
    );
    const repo = process.env.GITHUB_REPO;
    const token = process.env.GITHUB_TOKEN;

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    };

    if (action === "read") {
      const res = await fetch(
        `${GITHUB_API}/repos/${repo}/contents/${filePath}`,
        { headers }
      );

      if (res.status === 404) {
        return {
          statusCode: 200,
          body: JSON.stringify({ content: "", sha: null }),
        };
      }

      const data = await res.json();
      const content = Buffer.from(data.content, "base64").toString("utf-8");
      return {
        statusCode: 200,
        body: JSON.stringify({ content, sha: data.sha }),
      };
    }

    if (action === "write") {
      let sha = null;
      const existing = await fetch(
        `${GITHUB_API}/repos/${repo}/contents/${filePath}`,
        { headers }
      );
      if (existing.status === 200) {
        const existingData = await existing.json();
        sha = existingData.sha;
      }

      const body = {
        message: commitMessage || `AI update: ${filePath}`,
        content: Buffer.from(newContent).toString("base64"),
        ...(sha ? { sha } : {}),
      };

      const res = await fetch(
        `${GITHUB_API}/repos/${repo}/contents/${filePath}`,
        {
          method: "PUT",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      const result = await res.json();

      if (!res.ok) {
        return {
          statusCode: 500,
          body: JSON.stringify({ error: result.message }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          commitUrl: result.commit?.html_url,
        }),
      };
    }

    return { statusCode: 400, body: "Unknown action" };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
