'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

interface Article {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  publishedAt: string;
  category: string | null;
  isVerified: boolean;
}

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://breaking-news-backend.onrender.com';

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/articles`);
      setArticles(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching articles:', err);
      setError('Failed to load articles');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Breaking News AI
          </h1>
          <p className="text-gray-600">
            AI-powered news aggregation and video generation
          </p>
          <div className="mt-4 text-sm text-gray-500">
            <span className="inline-flex items-center gap-2">
              🟢 API Status:{' '}
              <a href={`${API_URL}/health`} target="_blank" className="text-blue-500 hover:underline">
                {API_URL}/health
              </a>
            </span>
          </div>
        </header>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-600">Loading articles...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <article key={article.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
                <div className="mb-2 flex justify-between items-start">
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {article.category || 'News'}
                  </span>
                  {article.isVerified && (
                    <span className="text-xs text-green-600">✓ Verified</span>
                  )}
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {article.title}
                </h2>
                {article.description && (
                  <p className="text-gray-600 mb-3">{article.description}</p>
                )}
                <div className="text-sm text-gray-500">
                  {new Date(article.publishedAt).toLocaleDateString()}
                </div>
              </article>
            ))}
          </div>
        )}

        {!loading && !error && articles.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600">No articles yet. Check back soon!</p>
          </div>
        )}
      </div>
    </main>
  );
}
