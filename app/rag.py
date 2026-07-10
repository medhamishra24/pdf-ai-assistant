from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma


class PDFRAG:

    def __init__(self):
        self.embedding_model = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )

        self.vector_db = None

    def read_pdf(self, file_path: str) -> str:
        """
        Read all text from PDF.
        """

        reader = PdfReader(file_path)

        text = ""

        for page in reader.pages:
            page_text = page.extract_text()

            if page_text:
                text += page_text + "\n"

        return text

    def split_text(self, text: str):

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=100
        )

        return splitter.split_text(text)

    def create_vector_store(self, chunks, filename: str, user_email: str):
        metadatas = [{"source": filename, "user_email": user_email} for _ in chunks]

        if self.vector_db is None:
            self.vector_db = Chroma(
                persist_directory="vectorstore",
                embedding_function=self.embedding_model
        )

        self.vector_db.add_texts(texts=chunks, metadatas=metadatas)

    def search(self, query: str, k: int = 3, filename: str = None, user_email: str = None):
        if self.vector_db is None:
            self.vector_db = Chroma(
                persist_directory="vectorstore",
                embedding_function=self.embedding_model
        )

    
        filter_dict = {}
        if user_email and filename:
            filter_dict = {"$and": [{"user_email": user_email}, {"source": filename}]}
        elif user_email:
            filter_dict = {"user_email": user_email}

        if filter_dict:
            docs = self.vector_db.similarity_search(query, k=k, filter=filter_dict)
        else:
            docs = self.vector_db.similarity_search(query, k=k)

        return docs

    def get_context(self, query, filename: str = None, user_email: str = None):
        docs = self.search(query, filename=filename, user_email=user_email)
    
        context = ""

        for doc in docs:
            context += doc.page_content + "\n"

        return context