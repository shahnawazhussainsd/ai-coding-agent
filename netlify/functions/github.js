const GITHUB_API = "https://api.github.com";

exports.handler = async function (event) {
  try {
    const body = JSON.parse(event.body);
    const { action } = body;
    const token = process.env.GITHUB_TOKEN;

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    };

    if (action === "read") {
      const repo = process.env.GITHUB_REPO;
      const { filePath } = body;
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
      const repo = process.env.GITHUB_REPO;
      const { filePath, newContent, commitMessage } = body;

      let sha = null;
      const existing = await fetch(
        `${GITHUB_API}/repos/${repo}/contents/${filePath}`,
        { headers }
      );
      if (existing.status === 200) {
        const existingData = await existing.json();
        sha = existingData.sha;
      }

      const writeBody = {
        message: commitMessage || `AI update: ${filePath}`,
        content: Buffer.from(newContent).toString("base64"),
        ...(sha ? { sha } : {}),
      };

      const res = await fetch(
        `${GITHUB_API}/repos/${repo}/contents/${filePath}`,
        {
          method: "PUT",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(writeBody),
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

    if (action === "create_repo") {
      const { repoName, filePath, fileContent } = body;

      // Get authenticated user's username
      const userRes = await fetch(`${GITHUB_API}/user`, { headers });
      const userData = await userRes.json();
      const owner = userData.login;

      // Create new repository
      const createRes = await fetch(`${GITHUB_API}/user/repos`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: repoName,
          private: false,
          auto_init: true,
        }),
      });

      const createData = await createRes.json();

      if (!createRes.ok) {
        return {
          statusCode: 500,
          body: JSON.stringify({ error: createData.message || "Repo creation failed" }),
        };
      }

      // Wait a moment for repo initialization
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Get the initial README's sha to know main branch exists, then push file
      const contentsUrl = `${GITHUB_API}/repos/${owner}/${repoName}/contents/${filePath}`;

      const writeRes = await fetch(contentsUrl, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Initial commit: ${filePath}`,
          content: Buffer.from(fileContent).toString("base64"),
        }),
      });

      const writeData = await writeRes.json();

      if (!writeRes.ok) {
        return {
          statusCode: 500,
          body: JSON.stringify({
            error: writeData.message || "File push failed",
            repoUrl: createData.html_url,
          }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          repoUrl: createData.html_url,
          cloneUrl: createData.clone_url,
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
