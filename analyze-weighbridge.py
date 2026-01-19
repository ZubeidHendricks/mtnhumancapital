from PIL import Image
import sys

def analyze_image(image_path):
    try:
        img = Image.open(image_path)
        print(f"\n�� {image_path}")
        print(f"   Size: {img.size[0]}x{img.size[1]} pixels")
        print(f"   Format: {img.format}")
        print(f"   Mode: {img.mode}")
        
        # Try to extract basic info
        if hasattr(img, '_getexif'):
            exif = img._getexif()
            if exif:
                print(f"   EXIF data found")
        
        # Save as PNG for better viewing
        output_name = image_path.replace('.jpeg', '_converted.png')
        img.save(output_name, 'PNG')
        print(f"   ✅ Converted to: {output_name}")
        
    except Exception as e:
        print(f"   ❌ Error: {e}")

if __name__ == "__main__":
    analyze_image("attached_assets/fleetlogix/weighbridge certificate.jpeg")
    analyze_image("attached_assets/fleetlogix/weight slip.jpeg")
