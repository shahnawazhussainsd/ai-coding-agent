# AI Coding Agent — Netlify Deploy Guide

Ye ek working AI agent hai jo:
1. Aap instruction doge (e.g. "login page mein dark mode add karo")
2. Google Gemini AI us file ka updated code likhega
3. Ek click mein GitHub repo par seedha push/commit ho jayega

## Environment Variables (Netlify mein set karni hain)

| Key | Value |
|---|---|
| GEMINI_API_KEY | Google AI Studio se li hui free key |
| GITHUB_TOKEN | GitHub Personal Access Token |
| GITHUB_REPO | username/repo-name |

## Use karna
Live URL kholo → file path aur instruction do → "Code Generate Karo" → preview dekho → "Push Karo".
