from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename
from sparkai.llm.llm import ChatSparkLLM, ChunkPrintHandler
from sparkai.core.messages import ChatMessage

app = Flask(__name__)
CORS(app)  # 允许跨域访问

#星火大模型配置
SPARKAI_URL = 'wss://spark-api.xf-yun.com/v4.0/chat'
SPARKAI_APP_ID = 'a9fc0896'
SPARKAI_API_SECRET = 'MWVkNGI0MDI0ZTI3ZTc1MWQ5MDEwNGU1'
SPARKAI_API_KEY = '2cf6f9d6d69ba92b810a8e6bad37d42d'
SPARKAI_DOMAIN = '4.0Ultra'

#初始化星火大模型
spark = ChatSparkLLM(
        spark_api_url=SPARKAI_URL,
        spark_app_id=SPARKAI_APP_ID,
        spark_api_key=SPARKAI_API_KEY,
        spark_api_secret=SPARKAI_API_SECRET,
        spark_llm_domain=SPARKAI_DOMAIN,
        streaming=False,
    )

@app.route('/query', methods=['POST'])
def query():
    # 获取用户输入的问题
    data = request.json
    user_question = data.get('question', '')

    if not user_question:
        return jsonify({'error': 'No question provided'}), 400

    # 调用星火大模型生成回答
    messages = [ChatMessage(role="user", content=user_question)]
    response = spark.generate([messages])

    if response.generations:
        output_text = response.generations[0][0].message.content
        return jsonify({'answer': output_text}), 200
    else:
        return jsonify({'error': 'Failed to generate a response'}), 500

if __name__ == '__main__':
    app.run(debug = True,port=5000)


