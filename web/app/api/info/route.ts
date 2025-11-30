import { NextRequest, NextResponse } from 'next/server';
import { parseAlbumId } from '@/lib/utils';

const API_URL = 'https://ifdian.net/api/user/get-album-info';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { album_id, auth_token } = body;
    
    const cleanAlbumId = parseAlbumId(album_id);

    if (!cleanAlbumId || !auth_token) {
      return NextResponse.json(
        { error: 'album_id and auth_token are required' },
        { status: 400 }
      );
    }

    const params = new URLSearchParams({
      album_id: cleanAlbumId,
    });

    const headers = {
      'Cookie': `auth_token=${auth_token};`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    };

    const response = await fetch(`${API_URL}?${params}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch album data' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Check for API level errors
    if (data.ec !== 200) {
      return NextResponse.json(
        { error: `API Error: ${data.ec} - ${data.em || 'Unknown error'}` },
        { status: 400 }
      );
    }

    const albumData = data.data?.album;

    if (!albumData) {
      return NextResponse.json(
        { error: 'Album not found' },
        { status: 404 }
      );
    }
    
    // Get album title
    const album_title = albumData.title || 'Unknown Album';
    const post_count = albumData.post_count || 0;
    
    // Get author name
    const author_name = albumData.user?.name || 'Unknown User';
    
    const has_unlock_all = albumData.hasUnlockAll === 1;

    return NextResponse.json({
      album_title,
      author_name,
      post_count,
      has_unlock_all,
    });

  } catch (error) {
    console.error('Error in /api/info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

