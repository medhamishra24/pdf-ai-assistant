// ====================================
// AUTH CHECK - Page load hote hi check karo
// ====================================

const authToken = localStorage.getItem("token");

if (!authToken) {
    window.location = "/login-page";
}



// ====================================
// ELEMENTS
// ====================================

const chatBox = document.getElementById("chatBox");
const questionInput = document.getElementById("question");
const sendBtn = document.getElementById("send");
const uploadBtn = document.getElementById("uploadBtn");
const pdfFile = document.getElementById("pdfFile");
const pdfList = document.getElementById("pdfList");
const typing = document.getElementById("typing");
const clearChatBtn = document.getElementById("clearChat");
const logoutBtn = document.getElementById("logoutBtn");
const newChatBtn = document.getElementById("newChat");
const historyList = document.getElementById("historyList");
const themeBtn = document.getElementById("themeBtn");
const quickButtons = document.querySelectorAll(".quick-btn");
const docSelect = document.getElementById("docSelect");
const attachBtn = document.getElementById("attachBtn");
const toast = document.getElementById("toast");

function getAuthHeaders() {
    const token = localStorage.getItem("token");
    return {
        "Authorization": "Bearer " + token
    };
}

// ====================================
// APP STATE
// ====================================

let uploadedPDF = null;

// ====================================
// HELPERS
// ====================================

function scrollBottom(){
    chatBox.scrollTop = chatBox.scrollHeight;
}

function formatTime(){
    return new Date().toLocaleTimeString([],{
        hour:"2-digit",
        minute:"2-digit"
    });
}

function escapeHtml(text){
    const div=document.createElement("div");
    div.innerText=text;
    return div.innerHTML;
}

// ====================================
// TOAST NOTIFICATION
// ====================================

function showToast(message, type = "success") {

    console.log("Toast:", message);

    const toast = document.getElementById("toast");

    toast.textContent = message;
    toast.className = "toast";
    toast.classList.add("toast-" + type);
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

// ====================================
// WELCOME MESSAGE
// ====================================

function ensureWelcomeMessage(){

    chatBox.innerHTML=`

    <div class="message ai welcome">

        <div class="avatar">
            🤖
        </div>

        <div class="bubble-wrap">

            <div class="bubble">

                <h3>Hello there 👋</h3>

                <p>
                Upload a PDF and I'll help summarize,
                explain and answer questions.
                </p>

                <p>
                I can chat with multiple PDFs.
                </p>

            </div>

        </div>

    </div>

    `;

}

// ====================================
// USER MESSAGE
// ====================================

function addUserMessage(message){

    chatBox.innerHTML+=`

    <div class="message user">

        <div class="bubble-wrap">

            <div class="bubble">

                ${escapeHtml(message)}

            </div>

            <div class="bubble-meta">

                ${formatTime()}

            </div>

        </div>

        <div class="avatar">

            👤

        </div>

    </div>

    `;

    scrollBottom();

}

// ====================================
// BOT MESSAGE
// ====================================

function addBotMessage(message){

    chatBox.innerHTML+=`

    <div class="message ai">

        <div class="avatar">

            🤖

        </div>

        <div class="bubble-wrap">

            <div class="bubble">

                <span class="typing-text"></span>

            </div>

            <div class="bubble-meta">

                ${formatTime()}

                <button class="copy-btn">📋</button>

            </div>

        </div>

    </div>

    `;

    const typingText = chatBox.lastElementChild.querySelector(".typing-text");

let i = 0;

const interval = setInterval(() => {
    typingText.textContent += message.charAt(i);
    i++;
    scrollBottom();

    if (i >= message.length) {
        clearInterval(interval);
    }
}, 15);
    const copyBtn = chatBox.lastElementChild.querySelector(".copy-btn");

    copyBtn.addEventListener("click", async () => {

    await navigator.clipboard.writeText(message);

    showToast("Response copied!", "success");

});
    scrollBottom();

}

// ====================================
// HISTORY DATE
// ====================================

function formatHistoryTime(time){

    if(!time) return "Just now";

    const d=new Date(time);

    return d.toLocaleString([],{

        month:"short",

        day:"numeric",

        hour:"numeric",

        minute:"2-digit"

    });

}

// ====================================
// DOCUMENT CARDS
// ====================================

function updateActiveDocumentCard(filename){

    document
    .querySelectorAll(".document-card")
    .forEach(card=>{

        card.classList.toggle(

            "active",

            card.dataset.filename===filename

        );

    });

}

function renderDocumentCards(files){

    pdfList.innerHTML="";

    if(!files.length){

        pdfList.innerHTML=`

        <div class="empty-doc">

            No PDF Uploaded Yet

        </div>

        `;

        return;

    }

    files.forEach(file=>{

        const card=document.createElement("div");

        card.className="document-card";

        card.dataset.filename=file;

        card.innerHTML=`

        <div class="doc-icon">

            📄

        </div>

        <div class="doc-meta">

            <h4 title="${file}">${file}</h4>
            <p>Ready to chat</p>

            <span class="doc-badge">

                ✓ Ready

            </span>

        </div>

        `;

        card.onclick=()=>{

            docSelect.value=file;

            updateActiveDocumentCard(file);

        };

        pdfList.appendChild(card);

    });

}

// ====================================
// UPLOAD PDF
// ====================================

uploadBtn.addEventListener("click",()=>pdfFile.click());

attachBtn.addEventListener("click",()=>pdfFile.click());

pdfFile.addEventListener("change",uploadPDF);

async function uploadPDF(){

    if(!pdfFile.files.length) return;

    uploadBtn.innerHTML=`
    <div class="upload-content">
        <div class="upload-icon">⏳</div>
        <div class="upload-title">Uploading...</div>
    </div>`;

    uploadBtn.disabled=true;

    const formData=new FormData();

    formData.append("file",pdfFile.files[0]);

    try{

        const response=await fetch("/upload-pdf",{

            method:"POST",

            headers: getAuthHeaders(),
            
            body:formData

        });

        if (handleAuthError(response)) return;

        const data=await response.json();

        if(data.error){

            throw new Error(data.error);

        }

        uploadedPDF=data.filename;

        showToast("✅ PDF uploaded successfully!", "success");
        addBotMessage("✅ PDF uploaded successfully.");;

        await loadDocuments();

        await loadHistory();

    }

    catch(error){

        showToast("❌ Upload failed!", "error");
        addBotMessage("❌ Upload failed.");

    }

    finally{

        uploadBtn.disabled=false;

        uploadBtn.innerHTML=`

        <div class="upload-content">

            <div class="upload-icon">

                ⬆

            </div>

            <div class="upload-title">

                Upload PDF

            </div>

            <div class="upload-subtitle">

                Drag & Drop or Browse

            </div>

        </div>`;

    }

}

// ====================================
// ASK AI
// ====================================

sendBtn.addEventListener("click",()=>askAI());

questionInput.addEventListener("keydown",(e)=>{

    if(e.key==="Enter" && !e.shiftKey){

        e.preventDefault();

        askAI();

    }

});

async function askAI(questionFromButton=null){

    const question=

        questionFromButton ||

        questionInput.value.trim();

    if(question==="") return;

    addUserMessage(question);

    questionInput.value="";

    typing.style.display="flex";

    sendBtn.disabled = true;
    console.log("Loading started")
    sendBtn.innerHTML = "⏳";

    scrollBottom();

    try{

        let url="/ask?question="+encodeURIComponent(question);

        if(docSelect.value){

            url+="&filename="+encodeURIComponent(docSelect.value);

        }

        const response = await fetch(url, {
            headers: getAuthHeaders()
        });

        if (handleAuthError(response)) return;

        const data = await response.json();

        typing.style.display="none";

        sendBtn.disabled = false;
        console.log("Loading finished");
        sendBtn.innerHTML = "➜";

        addBotMessage(data.answer);

        await loadHistory();

    }

    catch{

        typing.style.display="none";

        sendBtn.disabled = false;
        console.log("Loading finished");
        sendBtn.innerHTML = "➜";
        
        showToast("Something went wrong!", "error");
        addBotMessage("Something went wrong.");
    }

}

// ====================================
// QUICK BUTTONS
// ====================================

quickButtons.forEach(button=>{

    button.onclick=()=>{

        askAI(button.dataset.question);

    };

});

// ====================================
// CHAT HISTORY
// ====================================

function renderHistory(history){

    historyList.innerHTML="";

    if(!history.length){

        historyList.innerHTML=`
        <div class="history-empty">
            No previous chats
        </div>`;
        return;
    }

    history.forEach(chat=>{

        const item=document.createElement("button");

        item.className="history-item";

        item.innerHTML=`

            <strong>${escapeHtml(chat.question)}</strong>

            <small>

                ${escapeHtml(chat.filename || "All Documents")}

                •

                ${formatHistoryTime(chat.time)}

            </small>

        `;

        item.onclick=()=>{

            document

            .querySelectorAll(".history-item")

            .forEach(i=>i.classList.remove("active"));

            item.classList.add("active");

            chatBox.innerHTML="";

            addUserMessage(chat.question);

            addBotMessage(chat.answer);

        };

        historyList.appendChild(item);

    });

}

async function loadHistory(){

    try{

        const response=await fetch("/history");

        const data=await response.json();

        renderHistory(data.history || []);

    }

    catch{

        historyList.innerHTML=`

        <div class="history-empty">

            Couldn't load history

        </div>`;

    }

}

// ====================================
// DOCUMENTS
// ====================================

async function loadDocuments(){

    try{

        const response=await fetch("/documents", {
            headers: getAuthHeaders()
        });

        if (handleAuthError(response)) return;

        const data=await response.json();

        docSelect.innerHTML=`

        <option value="">

            All Documents

        </option>`;

        (data.files || []).forEach(file=>{

            const option=document.createElement("option");

            option.value=file;

            option.textContent=file;

            docSelect.appendChild(option);

        });

        renderDocumentCards(data.files || []);

    }

    catch{

        renderDocumentCards([]);

    }

}

docSelect.addEventListener("change",()=>{

    updateActiveDocumentCard(docSelect.value);

});

// ====================================
// CLEAR CHAT
// ====================================

clearChatBtn.onclick=()=>{

    ensureWelcomeMessage();
    showToast("Chat cleared", "info");

};

newChatBtn.onclick=()=>{

    ensureWelcomeMessage();
    showToast("New chat started", "info");

};

// ====================================
// DARK MODE
// ====================================

themeBtn.onclick=()=>{

    document.body.classList.toggle("dark");

    localStorage.setItem(

        "theme",

        document.body.classList.contains("dark")

        ?

        "dark"

        :

        "light"

    );

};

if(localStorage.getItem("theme")==="dark"){

    document.body.classList.add("dark");

}

// ====================================
// AUTO RESIZE
// ====================================

questionInput.addEventListener("input",()=>{

    questionInput.style.height="auto";

    questionInput.style.height=

    Math.min(questionInput.scrollHeight,140)+"px";

});

// ====================================
// INITIALIZE
// ====================================

loadDocuments();

loadHistory();

ensureWelcomeMessage();

// ===========================
// LOGIN CHECK
// ===========================

const token = localStorage.getItem("token");

if (!token) {
    window.location = "/login-page";
}

const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");

if (userName) {
    userName.textContent = localStorage.getItem("name") || "User";
}

if (userEmail) {
    userEmail.textContent = "Logged In";
}



// ====================================
// LOGOUT
// ====================================

logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("name");
    window.location = "/login-page";
});

// ====================================
// AUTO LOGOUT ON TOKEN EXPIRY
// ====================================

function handleAuthError(response) {
    if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("name");
        window.location = "/login-page";
        return true;
    }
    return false;
}

// ===========================
// MOBILE SIDEBAR
// ===========================

const menuBtn = document.getElementById("menuBtn");
const sidebar = document.querySelector(".sidebar");
const overlay = document.getElementById("overlay");

if(menuBtn){

    menuBtn.onclick = () => {
        sidebar.classList.toggle("show");
        overlay.classList.toggle("show");
    };

    overlay.onclick = () => {
        sidebar.classList.remove("show");
        overlay.classList.remove("show");
    };

}