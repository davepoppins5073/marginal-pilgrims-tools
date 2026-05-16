export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'query parameter required' });
  }

  try {
    const response = await fetch(
      `https://substack.com/api/v1/top/search?query=${encodeURIComponent(query)}&fromSuggestedSearch=false`,
      {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://substack.com/',
          'Origin': 'https://substack.com',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
        }
      }
    );

    const text = await response.text();
    res.status(200).send(text);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}