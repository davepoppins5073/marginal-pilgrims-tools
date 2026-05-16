export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { subdomain } = req.query;

  if (!subdomain) {
    return res.status(400).json({ error: 'subdomain parameter required' });
  }

  try {
    // Fetch the About page — richest source of native language text
    const response = await fetch(
      `https://${subdomain}.substack.com/about`,
      {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://substack.com/',
        }
      }
    );

    if (!response.ok) {
      // Fall back to posts API if about page fails
      const postRes = await fetch(
        `https://${subdomain}.substack.com/api/v1/posts?limit=3`,
        { headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' } }
      );
      const data = await postRes.json();
      const posts = data.posts || data || [];
      const text = posts.slice(0, 3).map(p =>
        [p.title || '', p.subtitle || '', p.description || ''].join(' ')
      ).join(' ');
      return res.status(200).json({ text, source: 'posts' });
    }

    const html = await response.text();

    // Strip HTML tags and extract readable text
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#\d+;/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000);

    res.status(200).json({ text, source: 'about' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
