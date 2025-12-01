# AFD Download Script

Python script for downloading album posts from ifdian.net.

## Setup

1. Install dependencies using `uv`:
```bash
cd script
uv sync
```

2. Create a `.env` file in the project root with your credentials:
```
ALBUM_ID=your_album_id
AUTH_TOKEN=your_auth_token
```

## Usage

Run the script from the script directory:
```bash
cd script
uv run main.py
```

Or from the project root:
```bash
uv run script/main.py
```

The downloaded content will be saved to the `output/` directory inside the script folder (`./script/output/`).

## Configuration

The script reads the following environment variables:
- `ALBUM_ID`: The ID of the album to download
- `AUTH_TOKEN`: Your authentication token for ifdian.net

## Output

Downloaded posts are saved as text files in the `output/` directory. The filename is automatically generated based on:
- Album title
- User name

Each post includes:
- Title (formatted as markdown header)
- Content body

