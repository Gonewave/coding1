import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from './firebaseConfig';
import { Spinner } from "react-bootstrap";
import { doc, getDoc } from "firebase/firestore";
import { Container, Button, ListGroup } from "react-bootstrap";

function TestQuestionsPage() {
    const { id } = useParams(); // Get the test id from the URL
    const [test, setTest] = useState(null);
    const [questions, setQuestions] = useState([]); // Store the full question data
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTest = async () => {
            try {
                const testRef = doc(db, "tests", id);
                const testDoc = await getDoc(testRef);
                if (testDoc.exists()) {
                    const testData = testDoc.data();
                    setTest(testData);
                    if (Array.isArray(testData.questions)) {  // Safe check to ensure it's an array
                        fetchQuestions(testData.questions); // Fetch questions using the IDs
                    } else {
                        console.error("Expected 'questions' to be an array");
                    }
                } else {
                    console.log("No such test!");
                }
            } catch (error) {
                console.error("Error fetching test:", error);
            }
        };

        const fetchQuestions = async (questionArray) => {
            try {
                const questionPromises = questionArray.map(async (questionObj) => {
                    const questionRef = doc(db, "questions", questionObj.id); // Use questionObj.id to fetch
                    const questionDoc = await getDoc(questionRef);
                    return questionDoc.exists() ? questionDoc.data() : null;
                });

                // Fetch all questions and store them
                const fetchedQuestions = await Promise.all(questionPromises);
                setQuestions(fetchedQuestions.filter(q => q !== null));  // Filter out any null results
            } catch (error) {
                console.error("Error fetching questions:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTest();
    }, [id]);

    if (isLoading) {
        return (
            <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
                <Spinner animation="border" size="1000px" />
            </Container>
        );  // Show a loading state while fetching the test data
    }

    return (
        <Container className="my-4">
            <Button variant="secondary" className="mt-4" onClick={() => window.history.back()}>
                Back to Tests
            </Button>
            <br />
            <br />
          
            <h2>{test.testname} - Questions</h2>
         
            <br />
            <ListGroup>
                {questions.length === 0 ? (
                    <div>No questions available</div>
                ) : (
                    questions.map((question, index) => (
                        <ListGroup.Item key={index}>
                            <strong>Question {index + 1}: {question.questionName}</strong>
                            <br />
                            <strong>Description:</strong>
                            {question.questionDescription.split("\n").map((line, i) => (
                                <div key={i}>{line}</div>
                            ))}
                            <ListGroup>
                                {question.testCases.map((testCase, idx) => (
                                    <ListGroup.Item key={idx}>
                                        <strong>{testCase.testCaseName}</strong>
                                        <br />
                                        Input: <br />{testCase.input}
                                        <br />
                                        Output: <br />{testCase.output}
                                        <br />
                                        Time: {testCase.time || "Not Applicable"}
                                        <br />
                                        Score: {testCase.score}
                                    </ListGroup.Item>
                                ))}
                            </ListGroup>
                        </ListGroup.Item>
                    ))
                )}
            </ListGroup>
            
            
        </Container>
    );
}

export default TestQuestionsPage;
