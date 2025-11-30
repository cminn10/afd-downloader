import { NextRequest } from 'next/server';
import { parseAlbumId } from '@/lib/utils';

const API_URL = 'https://ifdian.net/api/user/get-album-post';

function sanitizeFilename(filename: string): string {
  const invalidChars = '<>:"/\\|?*';
  let sanitized = filename;
  for (const char of invalidChars) {
    sanitized = sanitized.replace(new RegExp(`\\${char}`, 'g'), '_');
  }
  return sanitized;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const album_id = searchParams.get('album_id');
  const auth_token = searchParams.get('auth_token');
  const toc_format = searchParams.get('toc_format') || 'markdown';
  
  const cleanAlbumId = parseAlbumId(album_id || '');

  if (!cleanAlbumId || !auth_token) {
    return new Response(
      JSON.stringify({ error: 'album_id and auth_token are required' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const headers = {
    'Cookie': `auth_token=${auth_token};`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  };

  // Fetch the first page to determine filename before streaming
  let filename = 'output.txt';
  try {
    const params = new URLSearchParams({
      album_id: cleanAlbumId,
      lastRank: '0',
      rankOrder: 'asc',
      rankField: 'rank',
    });

    const initialResponse = await fetch(`${API_URL}?${params}`, {
      method: 'GET',
      headers,
    });

    if (initialResponse.ok) {
      const initialData = await initialResponse.json();
      if (initialData.ec === 200) {
        const postList = initialData.data?.list || [];
        if (postList.length > 0) {
          const firstPost = postList[0];
          const albums = firstPost.albums || [];
          const albumTitle = albums.length > 0 ? albums[0].title : 'Unknown Album';
          const userName = firstPost.user?.name || 'Unknown User';
          const rawFilename = `${albumTitle}-${userName}.txt`;
          filename = sanitizeFilename(rawFilename);
        }
      }
    }
  } catch (error) {
    console.error('Error fetching initial data for filename:', error);
    // Continue with default filename
  }
  
  // Create a readable stream
  const stream = new ReadableStream({
    async start(controller) {
      let lastRank = 0;
      let hasMore = 1;

      try {
        while (hasMore) {
          const params = new URLSearchParams({
            album_id: cleanAlbumId,
            lastRank: lastRank.toString(),
            rankOrder: 'asc',
            rankField: 'rank',
          });

          const response = await fetch(`${API_URL}?${params}`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            controller.enqueue(
              new TextEncoder().encode(`Error: Failed to fetch data (HTTP ${response.status})\n`)
            );
            break;
          }

          const data = await response.json();

          // Check for API level errors
          if (data.ec !== 200) {
            controller.enqueue(
              new TextEncoder().encode(`Error: API Error ${data.ec} - ${data.em || 'Unknown error'}\n`)
            );
            break;
          }

          const postList = data.data?.list || [];

          if (postList.length === 0) {
            if (lastRank === 0) {
              controller.enqueue(
                new TextEncoder().encode('Error: No posts found in this album\n')
              );
            }
            break;
          }

          // Process and stream posts
          for (const post of postList) {
            const title = post.title || '';
            const content = post.content || '';
            
            let formattedTitle = `## ${title}`;
            if (toc_format === 'chapter_number') {
                // Use rank directly as requested
                const rank = post.rank !== undefined ? post.rank : '';
                formattedTitle = `${rank}. ${title}`; 
            }
            
            const formattedContent = `${formattedTitle}\n\n${content}\n\n\n`;
            controller.enqueue(new TextEncoder().encode(formattedContent));
            
            // Update lastRank
            const rank = post.rank;
            if (rank !== undefined && rank !== null) {
              lastRank = rank;
            }
          }

          // Check if there are more pages
          hasMore = data.data?.has_more || 0;

          if (hasMore) {
            // Small delay to be polite to the server
            await sleep(500);
          }
        }
      } catch (error) {
        console.error('Error in download stream:', error);
        controller.enqueue(
          new TextEncoder().encode(`\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Transfer-Encoding': 'chunked',
    },
  });
}
