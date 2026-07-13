// Netlify Function: proxy GitHub API to update data/content.json
// Token stored in Netlify env var GITHUB_TOKEN (never in source code)

const REPO = '4g2f5njn6k-ux/emergency-escape';
const PATH = 'data/content.json';

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) };
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'GITHUB_TOKEN not configured' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Invalid JSON' }) };
  }

  if (!body.content) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Missing content' }) };
  }

  try {
    const headers = {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      'User-Agent': 'EmergencyEscape/1.0',
      'Accept': 'application/vnd.github.v3+json'
    };

    // Step 1: Get current file SHA
    const getRes = await fetch(
      'https://api.github.com/repos/' + REPO + '/contents/' + PATH,
      { headers }
    );
    const fileInfo = await getRes.json();
    if (!fileInfo.sha) {
      return {
        statusCode: 500,
        body: JSON.stringify({ ok: false, error: '无法获取文件信息: ' + JSON.stringify(fileInfo) })
      };
    }

    // Step 2: Update file
    const putBody = {
      message: body.message || 'Publish site content',
      content: Buffer.from(body.content, 'utf-8').toString('base64'),
      sha: fileInfo.sha
    };

    const putRes = await fetch(
      'https://api.github.com/repos/' + REPO + '/contents/' + PATH,
      { method: 'PUT', headers, body: JSON.stringify(putBody) }
    );
    const result = await putRes.json();

    if (result.content) {
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, sha: result.content.sha })
      };
    } else {
      return {
        statusCode: 500,
        body: JSON.stringify({ ok: false, error: JSON.stringify(result) })
      };
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
};
