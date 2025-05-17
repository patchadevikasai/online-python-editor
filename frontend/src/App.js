import { useState, useEffect, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import axios from "axios";

const DEFAULT_CODE = ``;
const API_BASE_URL = "http://localhost:5000";

export default function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [outputLines, setOutputLines] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [inputs, setInputs] = useState([]);
  const [currentInput, setCurrentInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  const outputEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load saved code on mount
  useEffect(() => {
    const savedCode = localStorage.getItem("savedCode");
    if (savedCode) setCode(savedCode);
  }, []);

  // Save code on change
  useEffect(() => {
    localStorage.setItem("savedCode", code);
  }, [code]);

  // Scroll output to bottom on new output
  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [outputLines]);

  // Extract prompts from the code
  useEffect(() => {
    resetTerminal();
    const matches = [...code.matchAll(/input\(\s*['"](.*?)['"]\s*\)/g)].map(
      (m) => m[1].trim()
    );
    setPrompts(matches);
  }, [code]);

  // Auto-run code when all inputs are collected
  useEffect(() => {
    if (inputs.length === prompts.length && prompts.length > 0) {
      runCodeWithInputs(inputs);
    }
  }, [inputs, prompts]);

  const resetTerminal = () => {
    setOutputLines([]);
    setInputs([]);
    setCurrentInput("");
  };

  const resetAll = () => {
    setCode(DEFAULT_CODE);
    resetTerminal();
    setPrompts([]);
    localStorage.removeItem("savedCode");
  };

  const getPrompt = () => {
    return inputs.length < prompts.length ? prompts[inputs.length] + " " : "> ";
  };

  const handleInputSubmit = () => {
    if (!currentInput.trim()) return;
    setInputs((prev) => [...prev, currentInput.trim()]);
    setCurrentInput("");
  };

  const runCodeWithInputs = async (inputList) => {
    if (!API_BASE_URL) {
      setOutputLines(["Error: Backend API URL not configured"]);
      return;
    }

    setIsRunning(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/run`, {
        code,
        input: inputList.join("\n"),
      });

      let output = res.data.output || "";

      // Remove prompts from output for cleaner display
      prompts.forEach((p) => {
        output = output.replaceAll(p, "");
      });

      const lines = output
        .trim()
        .split("\n")
        .filter((line) => line.trim() !== "");

      setOutputLines(lines);
    } catch (error) {
      console.error("Run error:", error);
      setOutputLines(["Error running code"]);
    }

    setIsRunning(false);
  };

  // File upload handlers
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      setCode(text);
      localStorage.setItem("savedCode", text);
      resetTerminal();
    };
    reader.readAsText(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
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

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>ONLINE PYTHON CODE EDITOR</h2>

      <div style={styles.editorWrapper}>
        <CodeMirror
          value={code}
          height="280px"
          onChange={setCode}
          theme="dark"
          style={styles.editor}
        />
      </div>

      <div style={styles.buttonsRow}>
        <button
          style={{ ...styles.button, ...(isRunning ? styles.disabledButton : {}) }}
          onClick={() => runCodeWithInputs(inputs)}
          disabled={isRunning}
          title="Run Code"
        >
          {isRunning ? "Running..." : "Run Code"}
        </button>

        <button
          style={{ ...styles.button, ...styles.resetButton }}
          onClick={resetAll}
          title="Reset Code & Terminal"
        >
          Reset
        </button>

        <button
          style={{ ...styles.button, ...styles.downloadButton }}
          onClick={saveCodeToFile}
          title="Download Code"
        >
          Download
        </button>

        <button style={styles.button} onClick={triggerFileInput} title="Upload Code">
          Upload
        </button>

        <input
          type="file"
          accept=".py,.txt"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileUpload}
        />
      </div>

      <div style={styles.outputContainer}>
        <pre style={styles.output}>
          {outputLines.map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}

          {!isRunning && inputs.length < prompts.length && (
            <div style={styles.inputRow}>
              <span style={styles.promptText}>{getPrompt()}</span>
              <input
                type="text"
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInputSubmit()}
                autoFocus
                style={styles.inputBox}
                placeholder="Enter input and press Enter"
              />
            </div>
          )}
          <div ref={outputEndRef} />
        </pre>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 900,
    margin: "40px auto",
    padding: 30,
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    color: "#333",
    display: "flex",
    flexDirection: "column",
  },
  title: {
    textAlign: "center",
    marginBottom: 30,
    fontWeight: "700",
    fontSize: 28,
    letterSpacing: 0.5,
    color: "#222",
  },
  editorWrapper: {
    border: "1px solid #ccc",
    borderRadius: 6,
    overflow: "hidden",
    boxShadow: "inset 0 0 8px #ddd",
  },
  editor: {
    backgroundColor: "#fff",
    color: "#333",
    fontSize: 16,
    fontWeight: 500,
  },
  buttonsRow: {
    marginTop: 20,
    display: "flex",
    justifyContent: "center",
    gap: 15,
    flexWrap: "wrap",
  },
  button: {
    padding: "12px 28px",
    fontSize: 16,
    fontWeight: "600",
    borderRadius: 6,
    border: "none",
    backgroundColor: "#007bff",
    color: "#fff",
    cursor: "pointer",
    boxShadow: "0 3px 8px rgba(0,123,255,0.4)",
    transition: "background-color 0.25s ease-in-out",
  },
  disabledButton: {
    backgroundColor: "#aaa",
    color: "#eee",
    cursor: "not-allowed",
    boxShadow: "none",
  },
  resetButton: {
    backgroundColor: "#dc3545",
    color: "#fff",
    boxShadow: "0 3px 8px rgba(220,53,69,0.4)",
  },
  downloadButton: {
    backgroundColor: "#28a745",
    boxShadow: "0 3px 8px rgba(40,167,69,0.4)",
    color: "#fff",
  },
  outputContainer: {
    marginTop: 30,
    backgroundColor: "#fff",
    borderRadius: 6,
    padding: 20,
    minHeight: 180,
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: 16,
    whiteSpace: "pre-wrap",
    boxShadow: "0 0 10px rgba(0,0,0,0.05) inset",
    color: "#333",
  },
  output: {
    margin: 0,
    lineHeight: 1.5,
    minHeight: 120,
  },
  inputRow: {
    display: "flex",
    alignItems: "center",
    marginTop: 10,
  },
  promptText: {
    fontWeight: "600",
    marginRight: 6,
    color: "#555",
  },
  inputBox: {
    flex: 1,
    padding: 8,
    fontSize: 16,
    borderRadius: 4,
    border: "1px solid #ccc",
  },
};
