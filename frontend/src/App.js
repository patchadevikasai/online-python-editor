import { useState, useEffect, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import axios from "axios";

const API_BASE_URL = "http://localhost:5000";

export default function App() {
  const [code, setCode] = useState(() => localStorage.getItem("savedCode") || "");
  const [prompts, setPrompts] = useState([]);
  const [inputs, setInputs] = useState([]);
  const [currentInput, setCurrentInput] = useState("");
  const [outputLines, setOutputLines] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  const outputEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("savedCode", code);
    extractPrompts(code);
  }, [code]);

  useEffect(() => {
    if (inputs.length === prompts.length && prompts.length > 0) {
      runCode();
    }
  }, [inputs]);

  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [outputLines]);

  const extractPrompts = (code) => {
    const regex = /input\((?:'([^']*)'|"([^"]*)")\)/g;
    const matches = [];
    let match;
    while ((match = regex.exec(code)) !== null) {
      matches.push(match[1] || match[2]);
    }
    setPrompts(matches);
    resetTerminal();
  };

  const resetTerminal = () => {
    setOutputLines([]);
    setInputs([]);
    setCurrentInput("");
  };

  const resetAll = () => {
    setCode("");
    setPrompts([]);
    resetTerminal();
    localStorage.removeItem("savedCode");
  };

  const getPrompt = () => {
    return prompts[inputs.length] || "> ";
  };

  const handleInputSubmit = () => {
    if (!currentInput.trim()) return;
    setInputs((prev) => [...prev, currentInput.trim()]);
    setCurrentInput("");
  };

  const runCode = async () => {
    setIsRunning(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/run`, {
        code,
        input: inputs.join("\n"),
      });

      const lines = (res.data.output || "")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      setOutputLines(lines);
    } catch (error) {
      setOutputLines(["Error: Failed to run code."]);
    } finally {
      setIsRunning(false);
    }
  };

  const saveCodeToFile = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "code.py";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      setCode(text);
    };
    reader.readAsText(file);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Online Python Code Editor</h2>

      <div style={styles.editorBox}>
        <CodeMirror value={code} height="300px" onChange={setCode} theme="dark" />
      </div>

      <div style={styles.buttons}>
        <button onClick={() => runCode()} disabled={isRunning} style={styles.button}>
          {isRunning ? "Running..." : "Run"}
        </button>
        <button onClick={resetAll} style={{ ...styles.button, backgroundColor: "#dc3545" }}>
          Reset
        </button>
        <button onClick={saveCodeToFile} style={{ ...styles.button, backgroundColor: "#28a745" }}>
          Download
        </button>
        <button onClick={() => fileInputRef.current?.click()} style={styles.button}>
          Upload
        </button>
        <input
          type="file"
          accept=".py,.txt"
          ref={fileInputRef}
          onChange={handleFileUpload}
          style={{ display: "none" }}
        />
      </div>

      <div style={styles.terminal}>
        {outputLines.map((line, index) => (
          <div key={index}>{line}</div>
        ))}

        {!isRunning && inputs.length < prompts.length && (
          <div style={styles.inputRow}>
            <span>{getPrompt()}</span>
            <input
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInputSubmit()}
              autoFocus
              style={styles.inputBox}
            />
          </div>
        )}
        <div ref={outputEndRef} />
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 900,
    margin: "auto",
    padding: 24,
    fontFamily: "Segoe UI, sans-serif",
  },
  title: {
    textAlign: "center",
    marginBottom: 20,
    fontSize: 26,
  },
  editorBox: {
    border: "1px solid #ccc",
    borderRadius: 6,
    overflow: "hidden",
  },
  buttons: {
    marginTop: 15,
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  button: {
    padding: "10px 20px",
    backgroundColor: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: "bold",
  },
  terminal: {
    marginTop: 25,
    backgroundColor: "#111",
    color: "#0f0",
    padding: 16,
    borderRadius: 6,
    minHeight: 150,
    fontFamily: "Courier New, monospace",
  },
  inputRow: {
    marginTop: 12,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  inputBox: {
    flex: 1,
    padding: "6px 10px",
    borderRadius: 4,
    border: "1px solid #444",
    backgroundColor: "#222",
    color: "#fff",
  },
};
