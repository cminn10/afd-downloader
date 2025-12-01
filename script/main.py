import requests
import time
import os
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
load_dotenv()

# Configuration
ALBUM_ID = os.getenv('ALBUM_ID')
AUTH_TOKEN = os.getenv('AUTH_TOKEN')
API_URL = 'https://ifdian.net/api/user/get-album-post'

if not ALBUM_ID:
    print("Error: ALBUM_ID environment variable is not set.")
    exit(1)

if not AUTH_TOKEN:
    print("Error: AUTH_TOKEN environment variable is not set.")
    exit(1)

# Headers
HEADERS = {
    'Cookie': f'auth_token={AUTH_TOKEN};',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

def sanitize_filename(filename):
    # Remove invalid characters for filenames
    invalid_chars = '<>:"/\\|?*'
    for char in invalid_chars:
        filename = filename.replace(char, '_')
    return filename

def download_album_posts():
    last_rank = 0
    has_more = 1
    output_dir = 'output'
    output_file = os.path.join(output_dir, 'output.txt') # Default fallback
    
    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)
    
    filename_determined = False
    
    print(f"Starting download for Album ID: {ALBUM_ID}")

    while has_more:
        params = {
            'album_id': ALBUM_ID,
            'lastRank': last_rank,
            'rankOrder': 'asc',
            'rankField': 'rank'
        }
        
        print(f"Fetching posts with lastRank={last_rank}...")
        
        try:
            response = requests.get(API_URL, params=params, headers=HEADERS)
            response.raise_for_status()
            data = response.json()
            
            # Check for API level errors
            if data.get('ec') != 200:
                print(f"API Error: {data.get('ec')} - {data.get('em')}")
                break
                
            post_list = data.get('data', {}).get('list', [])
            
            if not post_list:
                print("No posts found in response.")
                break
            
            # Determine filename from the first post if not already done
            if not filename_determined and post_list:
                first_post = post_list[0]
                
                # 1. Get album title
                albums = first_post.get('albums', [])
                album_title = "Unknown Album"
                if albums:
                    album_title = albums[0].get('title', 'Unknown Album')
                
                # 2. Get user name
                user_name = first_post.get('user', {}).get('name', 'Unknown User')
                
                # 3. Concatenate
                raw_filename = f"{album_title}-{user_name}.txt"
                output_file = os.path.join(output_dir, sanitize_filename(raw_filename))
                
                print(f"Output filename determined: {output_file}")
                
                # Create/Clear the file once we know the name
                with open(output_file, 'w', encoding='utf-8') as f:
                    pass
                
                filename_determined = True

            if not filename_determined:
                 # Fallback if we somehow get posts but can't determine filename (unlikely with logic above)
                 # Only happens if post_list is empty which is handled before
                 pass

            with open(output_file, 'a', encoding='utf-8') as f:
                for post in post_list:
                    # 1. Generate title
                    title = post.get('title', '')
                    formatted_title = f"## {title}"
                    
                    # 2. Get content body
                    content = post.get('content', '')
                    
                    # Write to file
                    f.write(f"{formatted_title}\n\n")
                    f.write(f"{content}\n")
                    f.write("\n\n") # Adding some spacing between posts
                    
                    # 3. Update lastRank
                    # The requirement says "For each item... update lastRank to `rank` field"
                    # This ensures lastRank captures the rank of the last processed item
                    rank = post.get('rank')
                    if rank is not None:
                        last_rank = rank
            
            # Check if there are more pages
            has_more = data.get('data', {}).get('has_more', 0)
            
            if has_more:
                # Small delay to be polite to the server
                time.sleep(0.5)
            
        except requests.exceptions.RequestException as e:
            print(f"Network error: {e}")
            break
        except Exception as e:
            print(f"Unexpected error: {e}")
            break
            
    print(f"Download finished. Content saved to {output_file}")

if __name__ == "__main__":
    download_album_posts()
