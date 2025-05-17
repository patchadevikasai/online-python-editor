from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import uuid
import os
import sys

python_cmd = 'python3' if sys.platform != 'win32' else 'python'
app = Flask(__name__)
CORS(app)

@app.route('/run', methods=['POST'])
def run_code():
    data = request.json
    code = data.get('code', '')
    user_input = data.get('input', '')

    filename = f"temp_{uuid.uuid4().hex}.py"
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(code)

    try:
        proc = subprocess.run(
            [python_cmd, "-u", filename],  # Unbuffered output mode
            input=user_input,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=10,
            text=True
        )

        output = proc.stdout
        if proc.stderr:
            output += "\n" + proc.stderr


    except subprocess.TimeoutExpired:
        return jsonify({'output': 'Error: Code execution timed out.'})
    except Exception as e:
        return jsonify({'output': f'Error: {str(e)}'})
    finally:
        if os.path.exists(filename):
            os.remove(filename)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))  # Use Render's PORT env var or fallback to 5000
    app.run(host='0.0.0.0', port=port, debug=True)