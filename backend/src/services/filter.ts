interface NewsItem {
  title: string;
  description?: string;
  url: string;
  source: string;
  region: string;
  publishedAt: Date;
}

interface FilteredNews extends NewsItem {
  content?: string;
  category?: string;
  isBreaking?: boolean;
}

const BREAKING_KEYWORDS = [
  'breaking', 'urgent', 'just in', 'developing', 'live', 'update',
  'emergency', 'critical', 'explosion', 'attack', 'crash', 'accident',
  'earthquake', 'flood', 'storm', 'shooting', 'arrest', 'resigns',
  'election', 'crisis', 'war', 'peace'
];

export async function filterNews(newsItem: NewsItem): Promise<FilteredNews | null> {
  const titleLower = newsItem.title.toLowerCase();
  const isBreaking = BREAKING_KEYWORDS.some(keyword => titleLower.includes(keyword));
  
  if (!isBreaking) {
    return null;
  }
  
  return {
    ...newsItem,
    content: newsItem.description || '',
    category: 'general',
    isBreaking,
  };
}
