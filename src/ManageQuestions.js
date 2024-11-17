import React, { useState, useEffect } from 'react';
import { Button, Accordion, Spinner, ListGroup,Row,Col } from 'react-bootstrap';
import { db } from './firebaseConfig';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

function ManageQuestions() {
    const [questions, setQuestions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'questions'));
                const fetchedQuestions = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setQuestions(fetchedQuestions);
            } catch (error) {
                console.error('Error fetching questions:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchQuestions();
    }, []);

    const handleDelete = async (id) => {
        const confirmDelete = window.confirm('Are you sure you want to delete this question?');
        if (confirmDelete) {
            try {
                await deleteDoc(doc(db, 'questions', id));
                setQuestions(questions.filter(q => q.id !== id));
                alert('Question deleted successfully!');
            } catch (error) {
                console.error('Error deleting question:', error);
                alert('Failed to delete question.');
            }
        }
    };

    const handleBack = () => {
        navigate(-1);
    };

    return (
        <div className="container mt-4">
            <Row className="mb-3">
                <Col>
                    <Button variant="primary" onClick={handleBack} className="mb-3">
                        Back
                    </Button>
                </Col>
                <Col className="text-end">
                        <Button className="ms-2" onClick={()=>{navigate("/createQuestions")}} variant="primary">Add Question</Button>
                </Col>
            </Row>
            <h1 className="mb-4">Manage Questions</h1>

            {isLoading ? (
                <div className="d-flex justify-content-center mt-4">
                    <Spinner animation="border" variant="primary" />
                </div>
            ) : (
                <Accordion>
                    {questions.length === 0 ? (
                        <div>No questions available</div>
                    ) : (
                        questions.map((question, index) => (
                            <Accordion.Item eventKey={question.id} key={question.id}>
                                <Accordion.Header>{question.questionName}</Accordion.Header>
                                <Accordion.Body>
                                    <div>
                                        <strong>Description:</strong><br />
                                        {question.questionDescription.split("\n").map((line, i) => (
                                            <div key={i}>{line}</div>
                                        ))}
                                    </div>

                                    <div className="mt-3">
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
                                        onClick={() => handleDelete(question.id)}
                                    >
                                        Delete
                                    </Button>
                                </Accordion.Body>
                            </Accordion.Item>
                        ))
                    )}
                </Accordion>
            )}
        </div>
    );
}

export default ManageQuestions;
