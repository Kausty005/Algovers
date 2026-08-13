import os
from dotenv import load_dotenv
load_dotenv(override=True)
import google.generativeai as genai
from app.ai.chatbot import ChatbotAI

c = ChatbotAI()
print(c.chat("hello", model_name="gemini-flash-latest"))
