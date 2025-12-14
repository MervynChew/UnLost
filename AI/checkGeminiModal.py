import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()  # This reads your .env file

gemini_key = os.getenv("API_KEY")

genai.configure(api_key=gemini_key)

print("Fetching available models...")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"- {m.name}")
except Exception as e:
    print(f"Error: {e}")