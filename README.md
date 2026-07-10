# RAG Document QA — AI PDF Assistant

An AI-powered document Q&A system that lets users upload PDFs and chat with them using natural language. Built with FastAPI, LangChain, and Google Gemini.

## 🔗 Live Demo
[https://pdf-ai-assistant-hnx6.onrender.com](https://pdf-ai-assistant-hnx6.onrender.com)

## Features
- **Multi-PDF Support** — Upload multiple documents and chat with a specific one or all of them
- **RAG Pipeline** — Retrieval-Augmented Generation using LangChain + ChromaDB + Google Gemini
- **JWT Authentication** — Secure signup/login with token-based auth and auto-logout on expiry
- **User-wise Data Isolation** — Each user only sees their own documents and chat history
- **Chat History** — Conversations are saved per user in PostgreSQL
- **PostgreSQL Database** (hosted on Neon) — Persistent storage for users and chat history
- **Protected Routes** — All sensitive API endpoints require authentication

## Tech Stack
- **Backend:** FastAPI, Python
- **AI/RAG:** LangChain, ChromaDB (vector store), Google Gemini API
- **Database:** PostgreSQL (Neon)
- **Auth:** JWT (python-jose), bcrypt password hashing
- **Frontend:** HTML, CSS, JavaScript
- **Deployment:** Render

## Folder Structure
rag-document-qa/
├── app/
│   ├── main.py          # FastAPI routes
│   ├── auth.py           # JWT auth logic
│   ├── database.py       # PostgreSQL models & queries
│   ├── rag.py             # RAG pipeline (chunking, embeddings, search)
│   └── utils.py           # Gemini API integration
├── static/                 # CSS, JS
├── templates/              # HTML pages
└── requirements.txt

## How It Works
1. User signs up/logs in — receives a JWT token
2. User uploads a PDF — text is extracted, chunked, and stored as embeddings in ChromaDB (tagged with the user's email)
3. User asks a question — relevant chunks are retrieved (filtered by user and optional document) and sent to Gemini for an answer
4. Conversation is saved to PostgreSQL, scoped to the logged-in user

## Setup (Local)
1. Clone the repo
2. Create a virtual environment and install dependencies: `pip install -r requirements.txt`
3. Set up `.env` with `GEMINI_API_KEY` and `DATABASE_URL`
4. Run: `uvicorn app.main:app --reload`
