import type { NextRequest } from 'next/server';
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
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const album_id = searchParams.get('album_id');
  const auth_token = searchParams.get('auth_token');
  const toc_format = searchParams.get('toc_format') || 'markdown';
  const progress = searchParams.get('progress') === 'true';

  const cleanAlbumId = parseAlbumId(album_id || '');

  if (!cleanAlbumId || !auth_token) {
    return new Response(JSON.stringify({ error: 'album_id and auth_token are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const headers = {
    Cookie: `auth_token=${auth_token};`,
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
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

  // If progress mode is enabled, use SSE to stream progress
  if (progress) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let lastRank = 0;
        let hasMore = 1;
        let postsProcessed = 0;

        const sendEvent = (event: string, data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

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
              sendEvent('error', { message: `Failed to fetch data (HTTP ${response.status})` });
              break;
            }

            const data = await response.json();

            if (data.ec !== 200) {
              sendEvent('error', {
                message: `API Error ${data.ec} - ${data.em || 'Unknown error'}`,
              });
              break;
            }

            const postList = data.data?.list || [];

            if (postList.length === 0) {
              if (lastRank === 0) {
                sendEvent('error', { message: 'No posts found in this album' });
              }
              break;
            }

            // Update progress
            postsProcessed += postList.length;
            sendEvent('progress', {
              posts_processed: postsProcessed,
              current_batch: postList.length,
            });

            // Update lastRank
            const lastPost = postList[postList.length - 1];
            const rank = lastPost.rank;
            if (rank !== undefined && rank !== null) {
              lastRank = rank;
            }

            // Check if there are more pages
            hasMore = data.data?.has_more || 0;

            if (hasMore) {
              await sleep(200);
            }
          }

          sendEvent('complete', {
            filename,
            posts_processed: postsProcessed,
          });
        } catch (error) {
          console.error('Error in progress stream:', error);
          sendEvent('error', {
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }

  // Buffer all content before sending (iOS Safari requires this)
  let contentBuffer = '';
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
        contentBuffer += `Error: Failed to fetch data (HTTP ${response.status})\n`;
        break;
      }

      const data = await response.json();

      if (data.ec !== 200) {
        contentBuffer += `Error: API Error ${data.ec} - ${data.em || 'Unknown error'}\n`;
        break;
      }

      const postList = data.data?.list || [];

      if (postList.length === 0) {
        if (lastRank === 0) {
          contentBuffer += 'Error: No posts found in this album\n';
        }
        break;
      }

      // Process and buffer posts
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
        contentBuffer += formattedContent;

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
        await sleep(200);
      }
    }
  } catch (error) {
    console.error('Error in download:', error);
    contentBuffer += `\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n`;
  }

  // Convert to UTF-8 bytes to calculate proper Content-Length
  const contentBytes = new TextEncoder().encode(contentBuffer);

  return new Response(contentBytes, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Content-Length': contentBytes.length.toString(),
    },
  });
}
