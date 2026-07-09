import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.sql import func
from app.auth import hash_password

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

Base = declarative_base()


# ====================================
# MODELS
# ====================================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Chat(Base):
    __tablename__ = "chats"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    filename = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ====================================
# INIT
# ====================================

def init_db():
    Base.metadata.create_all(bind=engine)


# ====================================
# CHAT FUNCTIONS
# ====================================

def save_chat(user_email, question, answer, filename):
    db = SessionLocal()
    chat = Chat(user_email=user_email, question=question, answer=answer, filename=filename)
    db.add(chat)
    db.commit()
    db.close()


def get_chats(user_email):
    db = SessionLocal()
    chats = db.query(Chat).filter(Chat.user_email == user_email).order_by(Chat.id.desc()).all()
    result = [(c.question, c.answer, c.filename, c.created_at) for c in chats]
    db.close()
    return result


# ====================================
# USER FUNCTIONS
# ====================================

def create_user(name, email, password):
    db = SessionLocal()
    hashed = hash_password(password)
    user = User(name=name, email=email, password=hashed)
    db.add(user)
    db.commit()
    db.close()


def get_user_by_email(email):
    db = SessionLocal()
    user = db.query(User).filter(User.email == email).first()
    db.close()
    if user:
        return (user.id, user.name, user.email, user.password)
    return None