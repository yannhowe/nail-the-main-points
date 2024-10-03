from flask import Flask, request, jsonify, render_template, send_from_directory
import openai
import whisper
import os
import io
import logging
import requests

app = Flask(__name__)

# Set up whisper
model = whisper.load_model("small.en")

# Set up logging
logging.basicConfig(level=logging.DEBUG)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    if 'audio' not in request.files:
        logging.error('No audio file provided')
        return jsonify({'error': 'No audio file provided'}), 400

    audio_file = request.files['audio']
    audio_file.save("audio.wav")
    
    try:
        # Ensure the file is received correctly
        if not audio_file or audio_file.filename == '':
            logging.error('No file uploaded or file name is empty')
            return jsonify({'error': 'No file uploaded or file name is empty'}), 400

        result = model.transcribe("audio.wav")
        transcription = result["text"]
        logging.debug(f'Local Whisper Transcription: {result["text"]}')
        return jsonify({'transcription': transcription})
    except Exception as e:
        logging.error(f'Error during transcription: {e}')
        return jsonify({'error': str(e)}), 500

@app.route('/chat', methods=['POST'])
def summarize():
    text = request.json.get('text')
    prompt = f"Summarize the following text: {text}"

    response = requests.post(
        'http://localhost:11434/api/chat',
         json={
            "model": "llama3:latest", 
            "messages": [
                {"role": "user",
                "content": prompt}
            ]})

    if response.status_code == 200:
        summary = response.json().get('summary', 'No summary found.')
        return jsonify({'summary': summary})
    else:
        return jsonify({'error': 'Failed to summarize text.'}), 500

if __name__ == '__main__':
    app.run(debug=True)