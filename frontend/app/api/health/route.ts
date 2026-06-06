import { NextResponse } from 'next/server';

export async function GET() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://breaking-news-backend.onrender.com';
  
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Backend unreachable' }, { status: 503 });
  }
}
