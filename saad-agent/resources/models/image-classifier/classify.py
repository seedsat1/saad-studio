import os
import sys
import json
import subprocess

# Auto-install Pillow if not available
try:
    from PIL import Image, ImageStat
except ImportError:
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow"])
        from PIL import Image, ImageStat
    except Exception as e:
        print(json.dumps({"error": f"Failed to install Pillow dependency: {str(e)}"}))
        sys.exit(1)

def classify_image(file_path):
    try:
        with Image.open(file_path) as img:
            width, height = img.size
            aspect_ratio = width / height
            
            # 1. Aspect ratio classification
            if aspect_ratio < 0.65:
                return "Mobile_Screenshots", "Vertical aspect ratio matching mobile screen."
            
            # Convert to grayscale for edge density analysis
            gray = img.convert('L')
            
            # Simple horizontal edge density analysis (for code/text detection)
            small = gray.resize((150, 150))
            pixels = list(small.getdata())
            
            diffs = []
            for y in range(150):
                for x in range(149):
                    diffs.append(abs(pixels[y*150 + x] - pixels[y*150 + x + 1]))
            
            avg_diff = sum(diffs) / len(diffs)
            
            # Check edge density (high horizontal differences indicate text/lines of code)
            if avg_diff > 32:
                return "Code_and_Text", f"High horizontal edge density ({avg_diff:.1f}), typical of code or text documents."
            
            # Color variance analysis
            stat = ImageStat.Stat(img)
            stddev = stat.stddev
            avg_std = sum(stddev) / len(stddev)
            
            if avg_std < 40:
                return "Flat_UI_Designs", f"Low color variance ({avg_std:.1f}), typical of flat UI designs."
            
            return "Desktop_UI_and_Graphics", f"Standard desktop aspect ratio and balanced color distribution."
    except Exception as e:
        return "Unreadable_Files", f"Error reading file: {str(e)}"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No directory path provided."}))
        sys.exit(1)
        
    dir_path = sys.argv[1]
    if not os.path.isdir(dir_path):
        print(json.dumps({"error": f"Directory not found: {dir_path}"}))
        sys.exit(1)
        
    results = {}
    valid_exts = {".png", ".jpg", ".jpeg", ".bmp", ".webp"}
    
    try:
        for filename in os.listdir(dir_path):
            ext = os.path.splitext(filename)[1].lower()
            if ext in valid_exts:
                file_path = os.path.join(dir_path, filename)
                category, reason = classify_image(file_path)
                results[filename] = {"category": category, "reason": reason}
    except Exception as e:
        print(json.dumps({"error": f"Error scanning directory: {str(e)}"}))
        sys.exit(1)
            
    print(json.dumps(results, indent=2))
