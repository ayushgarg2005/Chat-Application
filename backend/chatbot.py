from dotenv import load_dotenv
import os
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from flask import Flask, request, jsonify
from langchain.memory import ConversationBufferMemory
from flask_cors import CORS

load_dotenv()

app = Flask(__name__)
CORS(app)

# ─────────────────────────────────────────────────────────────
# REDIS-BACKED CHATBOT SESSION MEMORY
# ─────────────────────────────────────────────────────────────
# Previously: session_chains = {} (Python dict — lost on restart)
# Now: RedisChatMessageHistory stores conversation in Redis
#
# How it works:
#   - Each user gets a Redis key like "chatbot:memory:user-42"
#   - Every message pair (user + bot) is appended to a Redis List
#   - On restart, the conversation history is loaded from Redis
#   - On next message, LangChain reads history from Redis automatically
#
# Example in redis-cli:
#   > LRANGE chatbot:memory:user-42 0 -1
#   1) "{\"type\": \"human\", \"content\": \"What is Redis?\"}"
#   2) "{\"type\": \"ai\", \"content\": \"Redis is an in-memory...\"}"
#   3) "{\"type\": \"human\", \"content\": \"How is it used?\"}"
#   4) "{\"type\": \"ai\", \"content\": \"Redis is commonly used for...\"}"
#
# Benefits:
#   - Conversation survives Flask restarts/deployments
#   - Works across multiple Flask instances (horizontal scaling)
#   - Can inspect/debug conversations via redis-cli
# ─────────────────────────────────────────────────────────────

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# Try to import Redis-backed memory (requires langchain-community + redis)
try:
    from langchain_community.chat_message_histories import RedisChatMessageHistory
    USE_REDIS_MEMORY = True
    print(f"✅ Redis memory enabled (URL: {REDIS_URL})")
except ImportError:
    USE_REDIS_MEMORY = False
    print("⚠️ langchain-community not installed — falling back to in-memory sessions")
    print("   Install with: pip install langchain-community redis")

llm = ChatGoogleGenerativeAI(
    model=os.getenv("GOOGLE_MODEL"),
    api_key=os.getenv("GOOGLE_API_KEY")
)

# Define a custom prompt template for conversation
prompt = PromptTemplate(
    input_variables=["history", "input"],
    template="""You are LangBot, a helpful AI assistant.
Conversation so far:
{history}

User: {input}
Assistant:"""
)

# In-memory fallback (used only if Redis is unavailable)
session_chains = {}


def get_chain(session_id):
    """
    Get or create a conversation chain for the given session.
    Uses Redis-backed memory if available, otherwise falls back to in-memory.
    """
    if USE_REDIS_MEMORY:
        # Redis-backed: conversation history persists across restarts
        message_history = RedisChatMessageHistory(
            session_id=session_id,
            url=REDIS_URL,
            key_prefix="chatbot:memory:"
        )
        memory = ConversationBufferMemory(
            memory_key="history",
            return_messages=False,
            chat_memory=message_history
        )
        # Create a fresh chain each time — memory is loaded from Redis
        return LLMChain(llm=llm, prompt=prompt, memory=memory, verbose=False)
    else:
        # In-memory fallback
        if session_id not in session_chains:
            memory = ConversationBufferMemory(memory_key="history", return_messages=False)
            session_chains[session_id] = LLMChain(
                llm=llm, prompt=prompt, memory=memory, verbose=False
            )
        return session_chains[session_id]


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_input = data.get("message", "")
    session_id = data.get("session_id", "default")

    if not user_input:
        return jsonify({"error": "No input provided"}), 400

    try:
        chain = get_chain(session_id)
        response = chain.run(input=user_input)
        return jsonify({"response": response})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint — also reports Redis memory status"""
    return jsonify({
        "status": "ok",
        "redis_memory": USE_REDIS_MEMORY,
        "redis_url": REDIS_URL if USE_REDIS_MEMORY else None,
    })


if __name__ == "__main__":
    app.run(port=5001)