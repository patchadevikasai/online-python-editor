import { useState, useEffect, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import axios from "axios";

const DEFAULT_CODE = ``;
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

fetch(`${API_BASE_URL}/api/some-endpoint`)
  .then(res => {
    if (!res.ok) throw new Error("Network response was not ok");
    return res.json();
  })
  .then(data => {
    // handle data
  })
  .catch(err => {
    console.error("Fetch error:", err);
  });

function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [outputLines, setOutputLines] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [inputs, setInputs] = useState([]);
  const [currentInput, setCurrentInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  const outputEndRef = useRef(null);
  const fileInputRef = useRef(null); // Ref for hidden file input

  useEffect(() => {
    const savedCode = localStorage.getItem("savedCode");
    if (savedCode) {
      setCode(savedCode);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("savedCode", code);
  }, [code]);

  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [outputLines]);

  useEffect(() => {
    resetTerminal();
    const matches = [...code.matchAll(/input\(\s*["'](.*?)["']\s*\)/g)].map(
      (m) => m[1].trim()
    );
    setPrompts(matches);
  }, [code]);

  useEffect(() => {
    if (inputs.length === prompts.length && prompts.length > 0) {
      runCodeWithInputs(inputs);
    }
  }, [inputs]);

  const handleInputSubmit = () => {
    if (!currentInput.trim()) return;
    setInputs((prev) => [...prev, currentInput.trim()]);
    setCurrentInput("");
  };

  const runCodeWithInputs = async (inputList) => {
    setIsRunning(true);
    try {
      const response = await axios.post("http://localhost:5000/run", {
        code,
        input: inputList.join("\n"),
      });

      let output = response.data.output || "";

      prompts.forEach((prompt) => {
        output = output.replace(prompt, "");
      });

      output = output.trim();
      const lines = output.split("\n").filter((line) => line.trim() !== "");

      setOutputLines(lines);
    } catch (error) {
      setOutputLines(["Error running code."]);
    }
    setIsRunning(false);
  };

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

  const saveCodeToFile = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "code.py";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle file upload input change
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      setCode(text);
      localStorage.setItem("savedCode", text);
      resetTerminal();
    };
    reader.readAsText(file);
  };

  // Trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>ONLINE PYTHON CODE EDITOR</h2>

      <div style={styles.editorWrapper}>
        <CodeMirror
          value={code}
          height="280px"
          onChange={setCode}
          style={styles.editor}
          theme="dark"
        />
      </div>

      <div style={styles.buttonsRow}>
        <button
          onClick={() => runCodeWithInputs(inputs)}
          disabled={isRunning}
          style={{
            ...styles.button,
            ...(isRunning ? styles.buttonDisabled : {}),
          }}
          title="Run the Python code"
        >
          {isRunning ? "Running..." : "Run Code"}
        </button>

        <button
          onClick={resetAll}
          style={{ ...styles.button, ...styles.resetButton }}
          title="Reset code editor and terminal output"
        >
          Reset Code & Terminal
        </button>

        <button
          onClick={saveCodeToFile}
          style={{ ...styles.button, ...styles.downloadButton }}
          title="Download the current code as a file"
        >
          Download Code
        </button>

        <button
          onClick={triggerFileInput}
          style={styles.button}
          title="Upload a code file from your device"
        >
          Upload Code
        </button>

        {/* Hidden file input */}
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
          {outputLines.map((line, i) => (
            <div key={i}>{line}</div>
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
                placeholder="Type input and press Enter"
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
  buttonDisabled: {
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
    marginTop: 12,
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  promptText: {
    fontWeight: "600",
    fontSize: 16,
    userSelect: "none",
    color: "#555",
    minWidth: 140,
  },
  inputBox: {
    backgroundColor: "#fff",
    border: "1px solid #ccc",
    borderRadius: 6,
    color: "#333",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    fontSize: 16,
    padding: "6px 12px",
    outline: "none",
    flexGrow: 1,
    transition: "border-color 0.3s ease",
  },
};

export default App;