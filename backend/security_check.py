
import cv2
import sys
import json
import base64
import numpy as np

def detect_face_from_base64(base64_str):
    """
    Decodes a base64 image and detects if a face is present and clear.
    Returns a dict with 'status', 'score', and 'message'.
    """
    try:
        # Decode base64
        encoded_data = base64_str.split(',')[1] if ',' in base64_str else base64_str
        nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return {"status": "none", "score": 0, "message": "Invalid image data"}

        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Load Haar Cascade (pre-installed with opencv)
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        
        # Detect faces
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)

        if len(faces) == 0:
            # Analyze brightness as a fallback
            avg_brightness = np.mean(gray)
            if avg_brightness < 30:
                return {"status": "none", "score": int(avg_brightness), "message": "Environment too dark"}
            return {"status": "unclear", "score": int(avg_brightness), "message": "Face not found in frame"}

        # If face found, check sharpness/clarity
        # Laplacian variance is a common measure of focus
        variance = cv2.Laplacian(gray, cv2.CV_64F).var()
        brightness = np.mean(gray)

        if variance < 100:
            return {"status": "unclear", "score": int(variance), "message": "Image is too blurry"}
        
        return {
            "status": "clear",
            "score": int(min(100, variance / 5)),
            "message": "Security Check Passed"
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    # For testing: accepts base64 image from stdin
    # Or can be used as a module in a Flask/FastAPI backend
    print(json.dumps({
        "info": "AI Security Verification Model (Python/OpenCV)",
        "capability": "Frontal Face Detection & Sharpness Analysis"
    }))
