from dotenv import load_dotenv
import os
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from langchain_groq import ChatGroq
from flask import Flask, request, jsonify
load_dotenv() 

app = Flask(__name__)

from flask_cors import CORS
CORS(app)

llm = ChatGroq(
    model="gemma2-9b-it",  
    api_key=os.getenv("GROQ_API_KEY")
)

prompt = PromptTemplate(
    input_variables=["input"],
    template="You are LangBot, a helpful AI assistant.\n\nUser: {input}\n\nAssistant:"
)

chain = LLMChain(llm=llm, prompt=prompt)


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_input = data.get("message", "")
    if not user_input:
        return jsonify({"error": "No input provided"}), 400

    try:
        response = chain.run(user_input)
        return jsonify({"response": response})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=5001)
