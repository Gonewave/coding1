import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Accordion, ListGroup, Spinner } from 'react-bootstrap';
import { db } from './firebaseConfig';
import { collection, addDoc, getDocs } from 'firebase/firestore';

function CreateTest() {
    const [availableQuestions, setAvailableQuestions] = useState([]);
    const [testName, setTestName] = useState('');
    const [testDuration, setTestDuration] = useState('');
    const [questions, setQuestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const [selectedQuestionId, setSelectedQuestionId] = useState('');
    const [selectedQuestionPreview, setSelectedQuestionPreview] = useState([]);
    const [numQuestionsToRandomize, setNumQuestionsToRandomize] = useState('2'); // For storing the number of questions to randomize

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'questions'));
                const questions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAvailableQuestions(questions);
            } catch (error) {
                console.error('Error fetching questions:', error);
            }
        };
        fetchQuestions();
    }, []);

    const handleSelectQuestion = (e) => {
        const selectedId = e.target.value;
        setSelectedQuestionId(selectedId);

        if (selectedId) {
            const selectedQuestion = availableQuestions.find(q => q.id === selectedId);
            setSelectedQuestionPreview([...selectedQuestionPreview, selectedQuestion]); // Display preview
            setQuestions([...questions, { id: selectedId }]); // Save only the ID
            setSelectedQuestionId('');
        }
    };

    const handleDeleteQuestion = (id) => {
        // Remove the question from the preview list
        setSelectedQuestionPreview(selectedQuestionPreview.filter(q => q.id !== id));
        // Remove the question ID from the questions array
        setQuestions(questions.filter(q => q.id !== id));
    };

    const handleCreateTest = async () => {
        const confirmLogout = window.confirm("Are you sure you want to create the test?");
        if (confirmLogout) {
            if (!testName || !testDuration || questions.length === 0) {
                alert('Test Name, Duration, and at least one Question are required.');
                return;
            }
            setIsLoading(true);

            try {
                const testDoc = {
                    testname: testName,
                    duration: Number(testDuration),
                    createdon: new Date(),
                    conductedon: null,
                    started: false,
                    ended: false,
                    questions: questions,
                    report: [],
                };

                await addDoc(collection(db, 'tests'), testDoc);
                setSelectedQuestionPreview([]);
                alert('Test created successfully!');
                setTestName('');
                setTestDuration('');
                setQuestions([]);
            } catch (error) {
                console.error('Error creating test:', error);
                alert('Failed to create test');
            } finally {
                setIsLoading(false);
            }
        }
    };
    const handleRandomize = () => {
        const numQuestions = parseInt(numQuestionsToRandomize, 10);
        if (isNaN(numQuestions) || numQuestions <= 0 || numQuestions > availableQuestions.length) {
            alert('Please enter a valid number of questions to randomize.');
            return;
        }

        const randomQuestions = [];
        const availableQuestionsCopy = [...availableQuestions];

        // Randomly select questions
        for (let i = 0; i < numQuestions; i++) {
            const randomIndex = Math.floor(Math.random() * availableQuestionsCopy.length);
            const randomQuestion = availableQuestionsCopy.splice(randomIndex, 1)[0];
            randomQuestions.push(randomQuestion);
        }

        // Set the preview list and questions array with random questions
        setSelectedQuestionPreview(randomQuestions);
        setQuestions(randomQuestions.map(q => ({ id: q.id })));
    };

    const handleBack = () => {
        navigate(-1);
    };

    return (
        <div className="container mt-4">
            <Button variant="secondary" onClick={handleBack} className="mb-3">
                Back
            </Button>
            <h1 className="mb-4">Create New Test</h1>

            <Form.Group className="mb-3 d-flex align-items-center">
                <Form.Control
                    type="text"
                    placeholder="Enter Test Name"
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    className="me-3"
                    required
                />
                <Form.Control
                    type="number"
                    placeholder="Enter Test Duration (minutes)"
                    value={testDuration}
                    onChange={(e) => setTestDuration(e.target.value)}
                    className="me-3"
                    required
                />
            </Form.Group>

            <Form.Group className="mb-3">
                <Form.Label>Select Question</Form.Label>
                <Form.Select
                    value={selectedQuestionId}
                    onChange={handleSelectQuestion}
                >
                    <option value="">Select a question</option>
                    {availableQuestions.map((question) => (
                        <option key={question.id} value={question.id}>
                            {question.questionName}
                        </option>
                    ))}
                </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3 d-flex align-items-center">
                <Form.Label className="me-2">Number of Questions to Randomize</Form.Label>
                <Form.Control
                    type="number"
                    value={numQuestionsToRandomize}
                    onChange={(e) => setNumQuestionsToRandomize(e.target.value)}
                    className="me-3"
                    min="1"
                    max={availableQuestions.length}
                    disabled={isLoading}
                />
                <Button
                    variant="primary"
                    onClick={handleRandomize}
                    disabled={!numQuestionsToRandomize || numQuestionsToRandomize <= 0 || numQuestionsToRandomize > availableQuestions.length || isLoading}
                >
                    Randomize
                </Button>
            </Form.Group>
            <Accordion>
                {selectedQuestionPreview.map((question, index) => (
                    <Accordion.Item eventKey={question.id} key={question.id}>
                        <Accordion.Header>{question.questionName}</Accordion.Header>
                        <Accordion.Body>
                            <div className="mb-3">
                                <strong>Description:</strong><br />
                                {question.questionDescription.split("\n").map((line, i) => (
                                    <div key={i}>{line}</div>
                                ))}
                            </div>
                            <div className="mb-3">
                                <strong>Test Cases:</strong><br />
                                <ListGroup>
                                    {question.testCases.map((tc, idx) => (
                                        <ListGroup.Item key={idx} className="mb-2">
                                            <strong>{tc.testCaseName}:</strong><br />
                                            <div>Input:<br /> {tc.input}</div>
                                            <div>Output:<br /> {tc.output}</div>
                                            <div>Time: {tc.time || "Not Applicable"}</div>
                                            <div>Score: {tc.score}</div>
                                        </ListGroup.Item>
                                    ))}
                                </ListGroup>
                            </div>
                            <Button
                                variant="danger"
                                size="sm"
                                className="mt-3"
                                onClick={() => handleDeleteQuestion(question.id)}
                            >
                                Delete Question
                            </Button>
                        </Accordion.Body>
                    </Accordion.Item>
                ))}
            </Accordion>

            {isLoading && (
                <div className="d-flex justify-content-center mt-4">
                    <Spinner animation="border" variant="primary" />
                </div>
            )}
            <br />
            <Button variant="primary" onClick={handleCreateTest} disabled={isLoading}>
                Create Test
            </Button>

        </div>
    );
}

export default CreateTest;
