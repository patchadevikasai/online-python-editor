from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import uuid
import os
import sys

app = Flask(__name__)
CORS(app)

python_cmd = "python3" if sys.platform != "win32" else "python"

@app.route('/run', methods=['POST'])
def run_code():
    data = request.get_json()

    if not data:
        return jsonify({'output': 'No data received'}), 400

    code = data.get('code', '')
    user_input = data.get('input', '')

    if not code.strip():
        return jsonify({'output': 'No code provided'}), 400

    filename = f"temp_{uuid.uuid4().hex}.py"
    try:
        with open(filename, "w", encoding="utf-8") as f:
            f.write(code)

        result = subprocess.run(
            [python_cmd, filename],
            input=user_input.encode("utf-8"),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=10,
        )

        output = result.stdout.decode("utf-8") + result.stderr.decode("utf-8")
        return jsonify({'output': output})
    except subprocess.TimeoutExpired:
        return jsonify({'output': 'Execution timed out'}), 408
    except Exception as e:
        return jsonify({'output': f'Error: {str(e)}'}), 500
    finally:
        if os.path.exists(filename):
            os.remove(filename)

if __name__ == '__main__':
    app.run(debug=True)
