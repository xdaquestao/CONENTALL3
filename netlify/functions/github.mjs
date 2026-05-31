export async function handler(event, context) {
  const { GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME, GITHUB_ISSUE_NUMBER } = process.env;

  const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/issues/${GITHUB_ISSUE_NUMBER}`;
  const headers = {
    'Authorization': `Bearer ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  try {
    if (event.httpMethod === 'GET') {
      const [issueRes, commentsRes] = await Promise.all([
        fetch(GITHUB_API, { headers }),
        fetch(`${GITHUB_API}/comments`, { headers })
      ]);

      const issue = await issueRes.json();
      const comments = await commentsRes.json();

      const reactionsRes = await fetch(`${GITHUB_API}/reactions`, {
        headers: {...headers, 'Accept': 'application/vnd.github.squirrel-girl-preview+json' }
      });
      const reactions = await reactionsRes.json();

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issue, comments, reactions })
      };

    } else if (event.httpMethod === 'POST') {
      const { action, body } = JSON.parse(event.body);

      if (action === 'comment') {
        const commentRes = await fetch(`${GITHUB_API}/comments`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ body })
        });
        const data = await commentRes.json();
        return {
          statusCode: 201,
          body: JSON.stringify(data)
        };

      } else if (action === 'react') {
        const reactRes = await fetch(`${GITHUB_API}/reactions`, {
          method: 'POST',
          headers: {...headers, 'Accept': 'application/vnd.github.squirrel-girl-preview+json' },
          body: JSON.stringify({ content: 'heart' })
        });
        const data = await reactRes.json();
        return {
          statusCode: 201,
          body: JSON.stringify(data)
        };
      }
    }

    return { statusCode: 405, body: 'Method Not Allowed' };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}
