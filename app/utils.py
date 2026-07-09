import google.generativeai as genai
from app.config import GEMINI_API_KEY

genai.configure(api_key=GEMINI_API_KEY)

model = genai.GenerativeModel("gemini-2.5-flash")


def generate_answer(question, context):
    prompt = f"""
You are an AI assistant.

Answer ONLY from the context below.

If the answer is not present in the context, say:
"I couldn't find this information in the PDF."

Context:
{context}

Question:
{question}

Answer:
"""

    response = model.generate_content(prompt)
    return response.text