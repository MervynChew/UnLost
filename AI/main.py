from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from robust_yolo_api import RobustDetectorAPI
import uvicorn

# Load API key for description
from dotenv import load_dotenv
import os
import json
from fastapi.responses import JSONResponse

# Image Analysis
import google.generativeai as genai
from pydantic import BaseModel
from typing import List, Optional


load_dotenv()  # This reads your .env file

gemini_key = os.getenv("API_KEY")

app = FastAPI()

# Allow React Native (running on a different port/device) to talk to this server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the detector once when the server starts
detector = RobustDetectorAPI(model_paths=['generalItem.pt'])

@app.get("/")
def home():
    return {"message": "UnLost Object Detection API is Running"}

def read_root():
    return {"status": "Online", "message": "Gemini AI Scanner is ready."}

@app.post("/detect")
async def detect_object(
    file: UploadFile = File(...), 
    client_id: str = Form(...)
):
    """
    Receives an image frame and a client_id (unique string for the user).
    Returns JSON with detection status, label, and color.
    """
    try:
        image_bytes = await file.read()
        result = detector.process_frame(image_bytes, client_id)
        return result
    except Exception as e:
        return {"error": str(e)}
    

# Gemini Image analysis
genai.configure(api_key=gemini_key)

# ---------------------------------------------------------
# 2. FINE-TUNING THE OUTPUT (THE "BRAIN")
# ---------------------------------------------------------

# We want the AI to strictly output this structure for your React Native app.
# This ensures "label" is always a string, and "tags" is always a list.
class ItemAnalysisV2(BaseModel):
    label: str
    color: str
    description: str
    tags: List[str]
    location_context: str
    sensitive: str

# UPDATED PROMPT: Explicitly lists keys to force the AI to fill them all
SYSTEM_PROMPT = """
You are an advanced AI object detection scanner. 
Analyze the image and return a JSON object.
Be precise and output RAW JSON only.
"""

# GENERATION CONFIG: This forces the "Way of Output".
# We set response_mime_type to "application/json" to guarantee valid JSON.
generation_config = {
    "temperature": 0.4, # Lower temperature = more deterministic/factual
    "top_p": 0.95,
    "top_k": 64,
    "max_output_tokens": 1024,
    "response_mime_type": "application/json", # <--- MAGIC LINE FOR JSON
    "response_schema": ItemAnalysisV2, # <--- ENFORCES THE SCHEMA
}

# Initialize the Model
model = genai.GenerativeModel(
    model_name="gemini-2.5-flash", # Flash is fastest & cheapest (Free tier available)
    system_instruction=SYSTEM_PROMPT,
    generation_config=generation_config,
)

# ---------------------------------------------------------
# 3. HELPER: ROBUST JSON EXTRACTION
# ---------------------------------------------------------
def extract_json(text):
    """
    Finds the first '{' and the last '}' to extract valid JSON.
    Includes fallback for truncated JSON.
    """
    # 1. Try standard cleaning first
    try:
        clean = text.replace("```json", "").replace("```", "").strip()
        return json.loads(clean)
    except json.JSONDecodeError:
        pass # Fall through to manual extraction

    # 2. Manual Extraction Logic
    start = text.find('{')
    last_brace = text.rfind('}')
    
    # If we found a start brace...
    if start != -1:
        # Case A: We have a closing brace
        if last_brace != -1 and last_brace > start:
            json_str = text[start : last_brace+1]
            try:
                return json.loads(json_str)
            except:
                pass # Continue to repair attempt

        # Case B: Truncated JSON (Missing closing brace)
        # We try to "repair" it by just appending a } and seeing if it works.
        # This is a hail-mary for cut-off responses.
        try:
            print("⚠️ JSON might be truncated. Attempting repair...")
            # Naive repair: Try closing the main object
            repaired = text[start:] + '}' 
            return json.loads(repaired)
        except:
            pass

    raise ValueError("Could not extract valid JSON from response")


# ---------------------------------------------------------
# 3. THE ANALYZE ENDPOINT
# ---------------------------------------------------------
@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    try:
        # 1. Read the image bytes
        image_bytes = await file.read()

        # 2. Prepare the prompt
        # REINFORCED PROMPT: We list the keys here again to force the model.
        prompt = """Analyze this image and fill in this JSON template:
        {
            "label": "Short name",
            "color": "Dominant color",
            "description": "Short description of the item",
            "tags": ["tag1", "tag2"],
            "location_context": "Indoor/Outdoor/Desk",
            "sentitive": "Sensitive/Not sensitive"
        }
        Sensitive means the image contain sexual item or private such as bank card with Card Verification
        """

        # 3. Send to Gemini
        response = model.generate_content([
            {'mime_type': file.content_type, 'data': image_bytes},
            prompt
        ])

        # 4. Safety Check
        if not response.parts:
            print(f"Blocked. Feedback: {response.prompt_feedback}")
            # Return a fallback response instead of crashing
            return JSONResponse(content={
                "success": True, 
                "data": {
                    "label": "Unknown",
                    "color": "Unknown",
                    "description": "AI could not analyze this image (Safety Block).",
                    "tags": [],
                    "location_context": "Unknown",
                    "sentitive": "unknown",
                }
            })

        # 5. Robust Parsing
        try:
            result = extract_json(response.text)

        except Exception as parse_error:
            print(f"❌ JSON Parse Error. Raw text length: {len(response.text)}")
            # print(f"First 100 chars: {response.text[:100]}") # Optional debug
            raise ValueError(f"Invalid JSON from AI: {str(parse_error)}")

        # 6. Return Success
        return JSONResponse(content={
            "success": True,
            "data": result
        })

    except Exception as e:
        print(f"Error in analyze: {str(e)}")
        # Return 200 with error details so the App shows an alert instead of crashing
        return JSONResponse(content={
            "success": False,
            "error": str(e)
        }, status_code=200)
    
if __name__ == "__main__":
    # 0.0.0.0 allows other devices (your phone) on the network to connect
    uvicorn.run(app, host="0.0.0.0", port=8000)