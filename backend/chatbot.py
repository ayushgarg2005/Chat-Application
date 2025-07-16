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

prompt = PromptTemplate(
    input_variables=["input"],
    template="You are LangBot, a helpful AI assistant.\n\nUser: {input}\n\nAssistant:"
)

chain = LLMChain(llm=llm, prompt=prompt)


# Store memory chains per session (user/session_id -> ConversationChain)
session_chains = {}

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_input = data.get("message", "")
    session_id = data.get("session_id", "default")  # fallback session id

    if not user_input:
        return jsonify({"error": "No input provided"}), 400

    try:
        # If session doesn't exist, create it with memory
        if session_id not in session_chains:
            memory = ConversationBufferMemory(return_messages=True)
            session_chains[session_id] = ConversationChain(
                llm=llm,
                memory=memory,
                verbose=False
            )

        chain = session_chains[session_id]
        response = chain.run(user_input)

        return jsonify({"response": response})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(port=5001)