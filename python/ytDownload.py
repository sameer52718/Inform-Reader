from pytubefix import YouTube
import sys
import os
import random
import string

def sanitize_filename(name):
    # Remove dangerous characters
    valid_chars = "-_.() %s%s" % (string.ascii_letters, string.digits)
    return ''.join(c for c in name if c in valid_chars)

def generate_random_suffix(length=5):
    # Generate a random suffix to avoid filename conflicts
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def download_video(url, download_path):
    try:
        yt = YouTube(url)
        stream = yt.streams.get_highest_resolution()
        
        safe_title = sanitize_filename(yt.title).replace(' ', '_')  # Clean title and replace spaces
        random_suffix = generate_random_suffix()
        filename = f"{safe_title[:30]}_{random_suffix}.mp4"  # Limit title length to 30 chars + suffix
        
        full_path = os.path.join(download_path, filename)
        
        stream.download(output_path=download_path, filename=filename)
        
        return full_path  # Return full path for Node.js to use
    except Exception as e:
        return str(e)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Error: Missing arguments")
        sys.exit(1)
    
    video_url = sys.argv[1]
    download_path = sys.argv[2]
    
    result = download_video(video_url, download_path)
    print(result)
