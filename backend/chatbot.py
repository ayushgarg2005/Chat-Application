from dotenv import load_dotenv
import os
from langchain.chains import LLMChain, ConversationChain
from langchain.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from flask import Flask, request, jsonify
from langchain.memory import ConversationBufferMemory
load_dotenv() 

app = Flask(__name__)

from flask_cors import CORS
CORS(app)

llm = ChatGoogleGenerativeAI(
    model=os.getenv("GOOGLE_MODEL"),  
    api_key=os.getenv("GOOGLE_API_KEY")
)

# Define a custom prompt template for conversation
prompt = PromptTemplate(
    input_variables=["history", "input"],  # include history for context
    template="""You are LangBot, a helpful AI assistant.
Conversation so far:
{history}

User: {input}
Assistant:"""
)

# Dictionary to store session-specific chains
session_chains = {}

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_input = data.get("message", "")
    session_id = data.get("session_id", "default")

    if not user_input:
        return jsonify({"error": "No input provided"}), 400

    try:
        # If session doesn't exist, create it with memory and custom prompt
        if session_id not in session_chains:
            memory = ConversationBufferMemory(memory_key="history", return_messages=False)
            session_chains[session_id] = LLMChain(
                llm=llm,
                prompt=prompt,
                memory=memory,
                verbose=False
            )

        chain = session_chains[session_id]
        response = chain.run(input=user_input)

        return jsonify({"response": response})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(port=5001)