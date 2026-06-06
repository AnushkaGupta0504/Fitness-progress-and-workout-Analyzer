from google import genai
from fastapi import FastAPI
from pydantic import BaseModel

# Directly paste your API key here (safe for college demo)
API_KEY = "AIzaSyCHVeRQjvcXbLSShXRXOzq_skqf4F-uVsY"

client = genai.Client(api_key=API_KEY)

app = FastAPI()

class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
def chat(request: ChatRequest):
    try:
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=request.message
        )
        return {"reply": response.text}
    except Exception as e:
        return {"error": str(e)}