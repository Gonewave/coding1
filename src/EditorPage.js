import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Container } from 'react-bootstrap';
import { Editor } from '@monaco-editor/react';
import { useNavigate } from 'react-router-dom';  // Import useNavigate

function EditorPage() {
    const [language, setLanguage] = useState('python');
    const [code, setCode] = useState('');
    const [input, setInput] = useState('');
    const [output, setOutput] = useState('');
    const [time, setTime] = useState("");
    const [isRunning, setIsRunning] = useState(false); // To manage the "Run Code" button state
    const [apiUrl, setApiUrl] = useState('');
    
    const navigate = useNavigate();  // Initialize the navigate function

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const response = await fetch('/config.json');
                const config = await response.json();
                setApiUrl(config.API_BASE_URL);  // Assuming config contains API URL
            } catch (error) {
                console.error('Error fetching configuration:', error);
            }
        };
        fetchConfig();
    }, []);

    const handleRunCode = async () => {
        if (!input || !code) {
            alert('Input and Code are required to run.');
            return;
        }

        setIsRunning(true); // Disable the Run Code button

        const languageId = language === 'python' ? 71 : language === 'java' ? 62 : 76;
        try {
            const response = await fetch(`${apiUrl}/submissions/?base64_encoded=false&wait=true`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language_id: languageId, source_code: code, stdin: input }),
            });
            const result = await response.json();
                setOutput(result.status.id === 3 ? result.stdout || result.stderr : result.status.description + ": " + result.stderr);
                setTime(result.time?result.time:"");
            
        } catch (error) {
            console.error('Error executing code:', error);
            setOutput(error.message);
            setTime(error.message);
        } finally {
            setIsRunning(false); // Re-enable the Run Code button
        }
    };

    return (
        <Container className="mt-4">
            <h1 className="mb-4">Code Editor</h1>

            <Button variant="secondary" onClick={() => navigate(-1)} className="mb-3">Back</Button>  {/* Back button */}

            <Form.Group className="mb-3 d-flex align-items-center">
                <Form.Label className="me-2">Select Language:</Form.Label>
                <Form.Select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="me-3"
                >
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                </Form.Select>
                <Button variant="secondary" onClick={handleRunCode} disabled={isRunning}>
                    {isRunning ? 'Running...' : 'Run Code'}
                </Button>
            </Form.Group>

            <Form.Group className="mb-3">
                <Form.Label>Input</Form.Label>
                <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Enter Input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    required
                />
            </Form.Group>

            <Form.Group className="mb-3">
                <Form.Label>Code</Form.Label>
                <Editor
                    height="300px"
                    defaultLanguage="python"
                    language={language}
                    value={code}
                    theme="vs-dark"
                    onChange={(value) => setCode(value)}
                    className="border"
                />
            </Form.Group>

            <Card className="mt-4">
                <Card.Header>Output</Card.Header>
                <Card.Body>
                    <pre>{output}</pre>
                </Card.Body>
                <Card.Header>Time Taken</Card.Header>
                <Card.Body>
                    <pre>{time} sec</pre>
                </Card.Body>
            </Card>
        </Container>
    );
}

export default EditorPage;
