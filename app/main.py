import os
import shutil

from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.rag import PDFRAG
from app.utils import generate_answer
from fastapi import FastAPI, Request, UploadFile, File, Body, Depends
from app.database import (
    init_db,
    save_chat,
    get_chats,
    create_user,
    get_user_by_email
)
from app.auth import create_access_token, verify_password, get_current_user
from fastapi.responses import HTMLResponse


app = FastAPI(title="PDF AI Assistant")

# -----------------------------
# Static Files & Templates
# -----------------------------

app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")

# -----------------------------
# Initialize RAG
# -----------------------------

rag = PDFRAG()

init_db()

uploaded_files = []



# -----------------------------
# Home
# -----------------------------

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(
        request,
        "login.html"
    )
    
@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard(request: Request):
    return templates.TemplateResponse(
        request,
        "index.html"
    )

# -----------------------------
# Upload PDF
# -----------------------------

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
                                        

    if not file.filename.lower().endswith(".pdf"):
        return {"error": "Please upload a PDF file."}

    os.makedirs("uploads", exist_ok=True)

    file_path = os.path.join("uploads", file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    text = rag.read_pdf(file_path)

    chunks = rag.split_text(text)

    rag.create_vector_store(chunks, file.filename, current_user["email"])

    uploaded_files.append({
    "filename": file.filename,
    "user_email": current_user["email"]
})

    file_size = round(os.path.getsize(file_path) / (1024 * 1024), 2)

    return {
        "message": "PDF Uploaded Successfully!",
        "filename": file.filename,
        "chunks": len(chunks),
        "size": f"{file_size} MB"
}

# -----------------------------
# Ask AI
# -----------------------------

@app.get("/ask")
async def ask(question: str, filename: str = None, current_user: dict = Depends(get_current_user)):
    context = rag.get_context(question, filename=filename, user_email=current_user["email"])
    answer = generate_answer(question, context)

    save_chat(
        current_user["email"],
        question,
        answer,
        filename
    )

    return {
        "question": question,
        "answer": answer,
        "filename": filename
    }

# -----------------------------
# Search
# -----------------------------

@app.get("/search")
async def search(query: str):

    docs = rag.search(query)

    return {
        "query": query,
        "results": [doc.page_content for doc in docs]
    }

# -----------------------------
# Health Check
# -----------------------------

@app.get("/health")
async def health():

    return {
        "status": "running",
        "app": "PDF AI Assistant"
    }
    
@app.get("/documents")
async def get_documents(current_user: dict = Depends(get_current_user)):
    user_files = [
        doc["filename"] for doc in uploaded_files
        if doc["user_email"] == current_user["email"]
    ]
    return {"files": user_files}

# -----------------------------
# Chat History
# -----------------------------

@app.get("/history")
async def history(current_user: dict = Depends(get_current_user)):

    user_email = current_user["email"]

    rows = get_chats(user_email)
    chats = []

    for question, answer, filename, created_at in rows:
        chats.append({
            "question": question,
            "answer": answer,
            "filename": filename,
            "time": str(created_at)
        })

    return {"history": chats}

@app.post("/signup")
async def signup(data: dict = Body(...)):
    print("Received signup data:", data)
    print("Password:", data.get("password"))
    print("Password type:", type(data.get("password")))
    print("Password length:", len(str(data.get("password"))))
    
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    if not name or not email or not password:
        return {"error": "All fields are required"}

    if get_user_by_email(email):
        return {"error": "Email already exists"}

    create_user(name, email, password)

    token = create_access_token({"email": email})

    return {
        "message": "Signup successful",
        "token": token
    }
    
@app.post("/login")
async def login(data: dict = Body(...)):
    email = data.get("email")
    password = data.get("password")

    user = get_user_by_email(email)

    if not user:
        return {"error": "Invalid email or password"}

    if not verify_password(password, user[3]):
        return {"error": "Invalid email or password"}

    token = create_access_token({"email": user[2]})

    return {
        "message": "Login successful",
        "token": token,
        "name": user[1]
    }
    
@app.get("/login-page", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse(
        request,
        "login.html"
    )


@app.get("/signup-page", response_class=HTMLResponse)
async def signup_page(request: Request):
    return templates.TemplateResponse(
        request,
        "signup.html"
    )