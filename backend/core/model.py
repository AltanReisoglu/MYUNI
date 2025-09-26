import os
import requests
from dotenv import load_dotenv
from typing import TypedDict, Annotated, Sequence
from operator import add as add_messages
from pymongo import MongoClient

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage, ToolMessage
from langchain_core.tools import tool
from langchain_community.vectorstores import MongoDBAtlasVectorSearch
from langchain_community.embeddings import FastEmbedEmbeddings  # Değişiklik: fastembed kullanıldı
from langchain.chat_models import init_chat_model

from fastapi import APIRouter
from pydantic import BaseModel

# -------------------------------
# Simple in-memory DB
# -------------------------------
import tomli

# TOML dosyasını aç ve oku

LittleDB = {
    "email": None,
    "school": None
}

router = APIRouter(
    prefix="/assistant",
    tags=["assistant"]
)

# -------------------------------
# Request / Response Models
# -------------------------------
class PresetRequest(BaseModel):
    email: str
    school: str

class PresetResponse(BaseModel):
    answer: str

# -------------------------------
# Endpoint to submit preset info
# -------------------------------
@router.post("/preset", response_model=PresetResponse)
def query_preset(request: PresetRequest) -> PresetResponse:
    LittleDB["school"] = request.school
    LittleDB["email"] = request.email
    return PresetResponse(
        answer=f"Preset query received from {request.email} for school {request.school}."
    )

# -------------------------------
# Load environment
# -------------------------------
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "rag")
SERPER_API_KEY = os.getenv("SERPER_API_KEY")

with open(r"backend\datas.toml", "rb") as f:
    universities = tomli.load(f)

ytü_variants = universities["universiteler"]["ytu_variants"]
boun_variants = universities["universiteler"]["boun_variants"]
cerrahpasa_variants = universities["universiteler"]["cerrahpasa_variants"]

# -------------------------------
# Embeddings & Vectorstore
# -------------------------------
# Değişiklik: HuggingFaceEmbeddings yerine FastEmbedEmbeddings kullanıldı
embedding_model = FastEmbedEmbeddings()

def Sets(school_name: str):
    if school_name.lower() in  [s.lower() for s in ytü_variants]:
        COLLECTION_NAME = "ytüadvanced"
        INDEX_NAME = "default"
    elif school_name.lower() in [s.lower() for s in boun_variants]:
        COLLECTION_NAME = "boun"
        INDEX_NAME = "boun_search"
    elif school_name.lower() in [s.lower() for s in cerrahpasa_variants]:
        COLLECTION_NAME = "iuc"
        INDEX_NAME = "iuc_search"
    else:
        COLLECTION_NAME = "ytüadvanced"
        INDEX_NAME = "default"

    client = MongoClient(MONGO_URI)
    collection = client[DB_NAME][COLLECTION_NAME]
    return client, collection, INDEX_NAME, COLLECTION_NAME

def get_vectorstore_for_school(school_name: str):
    client, collection, INDEX_NAME, COLLECTION_NAME = Sets(school_name)
    return MongoDBAtlasVectorSearch(
        collection=collection,
        embedding=embedding_model,
        index_name=INDEX_NAME
    )

# -------------------------------
# LLM Setup
# -------------------------------
model = init_chat_model("gemini-2.5-flash", model_provider="google_genai")

# -------------------------------
# Dynamic system prompt
# -------------------------------
def build_system_prompt():
    okul = LittleDB.get("school") or "Okul bilgisi yok"
    return f"""Sen bir **{okul}** öğrencilerine özel akıllı asistansın.
        - Öğrencilerle sohbet edebilir, ders, ödev, kariyer, kampüs yaşamı ve kişisel gelişim konularında rehberlik yaparsın.
        - Yanıtlarında teknik detaylar veya araç kullanımını açıklamazsın; yanıtlar kısa, net ve anlaşılır olur.
        - Öğrenciyi motive edici, destekleyici ve pratik öneriler sunan bir üslup kullanırsın.
        - Gerekirse **retriever_tool** adlı güvenilir bir kaynak aracını kullanabilirsin ama kullandığın zaman kullanıcıya söylemezsin.
        - **retriever_tool** sadece gerektiğinde **{okul}** ile ilgili akademik bilgiler, Erasmus ve benzeri öğrenci programları için kullanılır.
        - Güncel bilgilere ihtiyaç duyarsan **web_search_tool** kullanabilirsin ama kullandığın zaman kullanıcıya söylemezsin."""

# -------------------------------
# TOOLS
# -------------------------------
@tool
def retriever_tool(query: str, history=None) -> str:
    """
    Girilen sorguya göre vectorstoredan okul ile ilgili bilgileri döner.
    Okul dışı bilgi vermez. Erasmus, yurt dışı gibi konularda bilgi verebilir.
    """
    okul_adi = LittleDB.get("school") or "Okul bilgisi yok"
    vectorstore = get_vectorstore_for_school(okul_adi)
    retriever = vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": 5})

    docs = retriever.invoke(query)
    if not docs:
        return f"No relevant information found for {okul_adi}."

    results = []
    for i, doc in enumerate(docs):
        results.append(f"[{okul_adi}] Document {i+1}:\n{doc.page_content}")
    return "\n\n".join(results)

@tool
def web_search_tool(query: str) -> str:
    """
    İnternette arama yapar ve güncel bilgileri döner.
    Haber, güncel etkinlikler, güncel bilgiler için kullanılır.
    """
    if not SERPER_API_KEY:
        return "Web arama servisi kullanılamıyor. API key bulunamadı."

    try:
        url = "https://google.serper.dev/search"
        headers = {
            "X-API-KEY": SERPER_API_KEY,
            "Content-Type": "application/json"
        }

        payload = {
            "q": query,
            "num": 5,
            "gl": "tr",
            "hl": "tr"
        }

        response = requests.post(url, json=payload, headers=headers, timeout=10)

        if response.status_code == 200:
            data = response.json()
            results = []

            if "organic" in data:
                for i, result in enumerate(data["organic"][:3]):
                    title = result.get("title", "")
                    snippet = result.get("snippet", "")
                    link = result.get("link", "")
                    results.append(f"Sonuç {i+1}:\nBaşlık: {title}\nÖzet: {snippet}\nLink: {link}")

            if results:
                return "\n\n".join(results)
            else:
                return f"'{query}' için web'de sonuç bulunamadı."
        else:
            return f"Web arama hatası: {response.status_code}"

    except requests.exceptions.Timeout:
        return "Web arama zaman aşımına uğradı."
    except requests.exceptions.RequestException as e:
        return f"Web arama bağlantı hatası: {str(e)}"
    except Exception as e:
        return f"Web arama genel hatası: {str(e)}"

tools = [retriever_tool, web_search_tool]
tools_dict = {t.name: t for t in tools}

# -------------------------------
# Agent Setup
# -------------------------------
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]

def should_continue(state: AgentState):
    result = state['messages'][-1]
    return hasattr(result, "tool_calls") and len(result.tool_calls) > 0

def call_llm(state: AgentState) -> AgentState:
    messages = [SystemMessage(content=build_system_prompt())] + list(state["messages"])
    message = model.invoke(messages)
    return {"messages": [message]}

def take_action(state: AgentState) -> AgentState:
    tool_calls = state["messages"][-1].tool_calls
    results = []
    for t in tool_calls:
        if t["name"] not in tools_dict:
            result = "Incorrect Tool Name"
        else:
            if t["name"] == "retriever_tool":
                result = tools_dict[t["name"]].invoke(t["args"].get("query", ""))
            elif t["name"] == "web_search_tool":
                result = tools_dict[t["name"]].invoke(t["args"].get("query", ""))
            else:
                result = tools_dict[t["name"]].invoke(t["args"])
        results.append(
            ToolMessage(tool_call_id=t["id"], name=t["name"], content=str(result))
        )
    return {"messages": results}

graph = StateGraph(AgentState)
graph.add_node("llm", call_llm)
graph.add_node("retriever_agent", take_action)
graph.add_conditional_edges("llm", should_continue, {True: "retriever_agent", False: END})
graph.add_edge("retriever_agent", "llm")
graph.set_entry_point("llm")

memory = MemorySaver()
rag_agent = graph.compile(checkpointer=memory)
config = {"configurable": {"thread_id": "abc123"}}

# -------------------------------
# Main response function
# -------------------------------
def get_response_model(query, history=None):
    user_msg = HumanMessage(content=query)
    result = rag_agent.invoke({"messages": [user_msg]}, config)
    as1 = result['messages'][-1]
    if hasattr(as1, "content"):
        return as1.content
    return as1