from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import uuid
import os
import sys

app = Flask(__name__)
CORS(app)

# Determine the Python command based on the OS
python_cmd = 'python3' if sys.platform != 'win32' else 'python'

@app.route('/ping', methods=['GET'])
def ping():
    return "pong", 200

@app.route('/run', methods=['POST'])
def run_code():
    try:
        data = request.get_json()

        if not data:
            return jsonify({'output': 'Error: No JSON payload received.'}), 400

        code = data.get('code', '')
        user_input = data.get('input', '')

        if not code.strip():
            return jsonify({'output': 'Error: No code provided.'}), 400

        # Generate a unique temp file
        filename = f"temp_{uuid.uuid4().hex}.py"
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(code)

        # Run the file with input
        proc = subprocess.run(
            [python_cmd, "-u", filename],
            input=user_input,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=10,
            text=True
        )

        output = proc.stdout + proc.stderr  # Capture both stdout and stderr
        return jsonify({'output': output})

    except subprocess.TimeoutExpired:
        return jsonify({'output': 'Error: Code execution timed out.'}), 408
    except Exception as e:
        return jsonify({'output': f'Error: {str(e)}'}), 500
    finally:
        try:
            if os.path.exists(filename):
                os.remove(filename)
        except Exception as cleanup_err:
            print(f"Warning: Failed to delete temp file: {cleanup_err}")

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))  # For deployment compatibility
    app.run(host='0.0.0.0', port=port, debug=True)
