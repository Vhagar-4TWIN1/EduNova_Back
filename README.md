🎤 Video Transcription
python3.10 -m venv whisper-env
whisper-env\Scripts\activate
pip install --upgrade pip setuptools wheel
pip install git+https://github.com/openai/whisper.git
whisper "C:\path\to\your\video.mp4" --model base --language en
