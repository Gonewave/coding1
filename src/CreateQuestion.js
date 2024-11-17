import React, { useState,useEffect } from 'react';
import { Form, Button, Card, ListGroup, Spinner } from 'react-bootstrap';
import { Editor } from '@monaco-editor/react';
import { useNavigate } from 'react-router-dom';
import { db } from './firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';

function CreateQuestion() {
    const navigate=useNavigate();
    const [questionName, setQuestionName] = useState('');
    const [questionDescription, setQuestionDescription] = useState('');
    const [testCases, setTestCases] = useState([]);
    const [testCaseName, setTestCaseName] = useState('');
    const [testCaseScore, setTestCaseScore] = useState('');
    const [input, setInput] = useState('');
    const [output, setOutput] = useState('');
    const [isComplexityChecked, setIsComplexityChecked] = useState(false);
    const [timeComplexity, setTimeComplexity] = useState(5);
    const [language, setLanguage] = useState('python');
    const [code, setCode] = useState('');
    const [isRunning, setIsRunning] = useState(false); // To manage the "Run Code" button state
    const [isSaving, setIsSaving] = useState(false); // To show loading spinner when saving the question
    const [apiUrl, setApiUrl] = useState(''); // Update this with your API URL
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const response = await fetch('/config.json');
                const config = await response.json();
                setApiUrl(config.API_BASE_URL);
            } catch (error) {
                console.error('Error fetching configuration:', error);
            }
        };
        fetchConfig();
    }, []);
    const handleRunCode = async () => {
        if (!testCaseName || !input || !code) {
            alert('Test Case Name, Input, and Code are required to run.');
            return;
        }

        setIsRunning(true);

        const languageId = language === 'python' ? 71 : language === 'java' ? 62 : 76;
        try {
            const response = await fetch(`${apiUrl}/submissions/?base64_encoded=false&wait=true`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language_id: languageId, source_code: code, stdin: input }),
            });
            const result = await response.json();
            if (result.stdout) {
                setOutput(result.stdout);
            }
            if (isComplexityChecked) {
                setTimeComplexity(result.time);
            }
        } catch (error) {
            console.error('Error executing code:', error);
        } finally {
            setIsRunning(false);
        }
    };

    const handleSaveTestCase = () => {
        if (!testCaseName || !input || !output || !testCaseScore) {
            alert('All fields (Test Case Name, Input, Output, and Score) are required.');
            return;
        }

        const newTestCase = {
            testCaseName,
            input,
            output: output || 'Generated Output',
            time: isComplexityChecked ? timeComplexity : '5',
            score: testCaseScore,
        };

        setTestCases([...testCases, newTestCase]);

        setTestCaseName('');
        setInput('');
        setOutput('');
        setTestCaseScore('');
        setIsComplexityChecked(false);
        setTimeComplexity(5);
        setCode('');
    };

    const handleDeleteTestCase = (index) => {
        const updatedTestCases = testCases.filter((_, idx) => idx !== index);
        setTestCases(updatedTestCases);
    };

    const handleSaveQuestion = async () => {
        if (!questionName || !questionDescription || testCases.length === 0) {
            alert('All fields (Question Name, Description, and Test Cases) are required.');
            return;
        }

        setIsSaving(true);

        const questionDoc = {
            questionName,
            questionDescription,
            testCases,
        };

        try {
            const confirmTru = window.confirm('Are you sure you want to Add Question?');
            if (confirmTru){
                await addDoc(collection(db, 'questions'), questionDoc);
                alert('Question saved successfully!');
                setQuestionName('');
                setQuestionDescription('');
                setTestCases([]);
            } 
        } catch (error) {
            console.error('Error saving question:', error);
            alert('Failed to save question');
        } finally {
            setIsSaving(false);
        }
    };
    const handleBack = () => {
        navigate(-1); // Go back to the previous page
    };
    return (
        <div className="container mt-4">
            <Button variant="secondary" onClick={handleBack} className="mb-3">
                Back
            </Button>
            <h1 className="mb-4">Create New Question</h1>

            <Form.Group className="mb-3">
                <Form.Label>Question Name</Form.Label>
                <Form.Control
                    type="text"
                    placeholder="Enter Question Name"
                    value={questionName}
                    onChange={(e) => setQuestionName(e.target.value)}
                    required
                />
            </Form.Group>

            <Form.Group className="mb-3">
                <Form.Label>Question Description</Form.Label>
                <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Enter Question Description"
                    value={questionDescription}
                    onChange={(e) => setQuestionDescription(e.target.value)}
                    required
                />
            </Form.Group>

            <Card className="mb-4">
                <Card.Header>Add Test Case</Card.Header>
                <Card.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>Test Case Name</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Enter Test Case Name"
                            value={testCaseName}
                            onChange={(e) => setTestCaseName(e.target.value)}
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Input</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            placeholder="Enter Input"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Test Case Score</Form.Label>
                        <Form.Control
                            type="number"
                            placeholder="Enter Score"
                            value={testCaseScore}
                            onChange={(e) => setTestCaseScore(e.target.value)}
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Expected Output (optional)</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            placeholder="Enter Expected Output or leave blank to auto-generate"
                            value={output}
                            onChange={(e) => setOutput(e.target.value)}
                        />
                    </Form.Group>

                    <Form.Group className="mb-3 d-flex align-items-center">
                        <Form.Check
                            type="checkbox"
                            label="Check for Test Complexity"
                            checked={isComplexityChecked}
                            onChange={(e) => setIsComplexityChecked(e.target.checked)}
                            className="me-2"
                        />
                    </Form.Group>

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
                        <Button variant="primary" onClick={handleRunCode} disabled={isRunning}>
                            {isRunning ? <Spinner animation="border" size="sm" /> : 'Run Code'}
                        </Button>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Editor
                            height="200px"
                            defaultLanguage="python"
                            language={language}
                            value={code}
                            theme="vs-dark"
                            onChange={(value) => setCode(value)}
                            className="border"
                        />
                    </Form.Group>

                    <Button variant="success" onClick={handleSaveTestCase} className="me-3">
                        Save Test Case
                    </Button>
                </Card.Body>
            </Card>

            <ListGroup>
                {testCases.map((testCase, index) => (
                    <ListGroup.Item key={index} className="d-flex justify-content-between">
                        <div>
                            <strong>{testCase.testCaseName}</strong> <br /> Input:<br/> {testCase.input} <br />
                            Output: <br /> {testCase.output}<br/>
                            Time: {testCase.time || "Not Applicable"} <br />
                            Score: {testCase.score || "Not Assigned"}
                        </div>
                        <div style={{display:"flex",justifyContent:"center",alignItems:"center"}}>
                        <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteTestCase(index)}
                        >
                            Delete
                        </Button>
                        </div>
                    </ListGroup.Item>
                ))}
            </ListGroup>

            <Button variant="primary" onClick={handleSaveQuestion} className="mt-4">
                {isSaving ? <Spinner animation="border" size="sm" /> : 'Save Question'}
            </Button>
        </div>
    );
}

export default CreateQuestion;
