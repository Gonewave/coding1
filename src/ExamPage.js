import React, { useEffect, useState } from "react";
import { Accordion, Button, Container,Modal, Spinner, Form, ListGroup } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import { db } from './firebaseConfig';
import { BsCheckCircle, BsXCircle } from "react-icons/bs";
import { doc, getDoc } from "firebase/firestore";
import { Editor } from "@monaco-editor/react";
import { getAuth } from "firebase/auth"; // For getting user's email
import { updateDoc, arrayUnion } from "firebase/firestore";
function ExamPage() {
    const { testId } = useParams();
    const [showModal, setShowModal] = useState(false);
    const [modalPurpose, setModalPurpose] = useState('submit'); // 'submit', 'warning', or 'error'
    const [modalMessage, setModalMessage] = useState('Are you sure you want to submit test?');
    const [testDetails, setTestDetails] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [language, setLanguage] = useState('python');
    const [codeByQuestion, setCodeByQuestion] = useState({});
    const [inputByQuestion, setInputByQuestion] = useState({});
    const [outputsByQuestion, setOutputsByQuestion] = useState({});
    const [isRunning, setIsRunning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmittingTest, setIsSubmittingTest] = useState(false);
    const [isSubmittedByQuestion, setIsSubmittedByQuestion] = useState({});
    const [apiUrl, setApiUrl] = useState('');
    const [useCustomInput, setUseCustomInput] = useState(false);
    const [timer, setTimer] = useState(10); // Test duration timer
    const [duration, setDuration] = useState(""); // Store the duration in hh:mm:ss format
    const navigate = useNavigate();
    const [timeEnded, setTimeEnded] = useState(false);
    const auth = getAuth();
    const [isExamSubmitted, setIsExamSubmitted] = useState(false);
    const [tabSwitchCount, setTabSwitchCount] = useState(0);
    useEffect(() => {
        const fetchTestDetailsAndConfig = async () => {
            setIsLoading(true); // Start loading when fetching data
            try {
                const testRef = doc(db, "tests", testId); // testId should be defined in your code
                const testSnapshot = await getDoc(testRef);
                if (testSnapshot.exists()) {
                    const data = testSnapshot.data();
                    setTestDetails(data);
                    const questionPromises = data.questions.map(async (question) => {
                        const questionRef = doc(db, "questions", question.id);
                        const questionSnapshot = await getDoc(questionRef);
                        if (questionSnapshot.exists()) {
                            return { id: questionSnapshot.id, ...questionSnapshot.data() }; // Merge question details
                        } else {
                            console.log(`Question with ID ${question.id} not found.`);
                            return null; // If the question is not found, return null
                        }
                    });
                    const fullQuestions = await Promise.all(questionPromises);
                    const filteredQuestions = fullQuestions.filter(q => q !== null);
                    setTestDetails((prevDetails) => ({
                        ...prevDetails,
                        questions: filteredQuestions
                    }));
                    console.log(filteredQuestions);
                     const initialTime = data.duration * 60; // Assuming duration is in minutes
                     setTimer(initialTime);
                } else {
                    console.log("Test not found!");
                }
                const response = await fetch('/config.json');
                const config = await response.json();
                setApiUrl(config.API_BASE_URL);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setIsLoading(false); // Stop loading after both fetches are done
            }
        };
        fetchTestDetailsAndConfig().then(() => {
            console.log(testDetails);
        }); // Call the function when the page loads
    }, []);
    useEffect(() => {
        const interval = setInterval(() => {
            setTimer(prevTime => {
                if (prevTime > 0) {
                    const newTime = prevTime - 1;
                    setDuration(formatTime(newTime));
                    return newTime;
                } else {
                    setTimeEnded(true);
                    clearInterval(interval);
                    return 0;
                }
            });
        }, 1000);
        return () => clearInterval(interval); // Cleanup on unmount
    }, []);
    useEffect(() => {
        if (timeEnded) {
            alert("Time Over Exam is being submitted")
            handleSubmitTest();
        }
    }, [timeEnded]);
    const handleTabSwitch = () => {
        if (tabSwitchCount < 3) {
            setTabSwitchCount(prevCount => prevCount + 1);
            setModalPurpose('warning');
            setModalMessage(`Warning: You have switched tabs ${tabSwitchCount+1} times. Three switches will end your test.`);
            setShowModal(true);
        } else if (tabSwitchCount === 3 && !isExamSubmitted) {
            setIsExamSubmitted(true); // Mark the exam as submitted
            alert("Swtiched tabs too many times, exam is being submitted.")
            document.getElementById('submit').click(); // Simulate the submit button click
        }
    };
    useEffect(() => {
        window.addEventListener('blur', handleTabSwitch);
        return () => {
            window.removeEventListener('blur', handleTabSwitch);
        };
    }, [tabSwitchCount, isExamSubmitted]);
    useEffect(() => {


        const handlePopState = () => {
            window.history.pushState(null, '', window.location.href);
            alert('Back navigation is disabled for the exam.');
        };
        window.addEventListener('popstate', handlePopState);
        window.history.pushState(null, '', window.location.href);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);
    const formatTime = (timeInSeconds) => {
        const hours = String(Math.floor(timeInSeconds / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((timeInSeconds % 3600) / 60)).padStart(2, '0');
        const seconds = String(timeInSeconds % 60).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    };
    const handleRunCode = async (questionId) => {
        if (!codeByQuestion[questionId]) {
            alert('Code is required to run.');
            return;
        }
        setIsRunning(true);
        const languageId = language === 'python' ? 71 : language === 'java' ? 62 : 76;
        const outputs = [];
        setIsSubmittedByQuestion(prev => ({ ...prev, [questionId]: false }));  // Mark as submitted
        try {
            if (useCustomInput) {
                const customInput = inputByQuestion[questionId] || '';  // Get custom input for the specific question
                const response = await fetch(`${apiUrl}/submissions/?base64_encoded=false&wait=true`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ language_id: languageId, source_code: codeByQuestion[questionId], stdin: customInput }),
                });
                const result = await response.json();
                outputs.push({ testCaseName: "Custom Input", output: result.status.id === 3 ? result.stdout || result.stderr : result.status.description + ": " + result.stderr, showIcon: false });
            } else {
                const question = testDetails.questions.find(q => q.questionName === questionId);
                const filteredTestCases = question.testCases.filter(tc => tc.testCaseName === 'basic1' || tc.testCaseName === 'basic2');
                for (const testCase of filteredTestCases) {
                    const response = await fetch(`${apiUrl}/submissions/?base64_encoded=false&wait=true`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ language_id: languageId, source_code: codeByQuestion[questionId], stdin: testCase.input, expected_output: testCase.output, cpu_time_limit: testCase.time }),
                    });
                    const result = await response.json();
                    outputs.push({
                        testCaseName: testCase.testCaseName,
                        status: result.status.description,
                        output: result.status.id === 3 ? result.stdout || result.stderr : result.status.description + ": " + result.stderr,
                        showIcon: true
                    });
                }
            }
            setOutputsByQuestion(prev => ({ ...prev, [questionId]: outputs }));
        } catch (error) {
            console.error('Error executing code:', error);
            setOutputsByQuestion(prev => ({ ...prev, [questionId]: [{ testCaseName: "Error", output: error.message }] }));
        } finally {
            setIsRunning(false);
        }
    };
    const handleSubmitCode = async (questionId) => {
        if (!codeByQuestion[questionId]) {
            alert('Code is required to submit.');
            return;
        }
        setIsSubmitting(true);
        const languageId = language === 'python' ? 71 : language === 'java' ? 62 : 76;
        const testResults = [];
        let totalScore = 0; 
        try {
            const question = testDetails.questions.find(q => q.questionName === questionId);
            for (const testCase of question.testCases) {
                const response = await fetch(`${apiUrl}/submissions/?base64_encoded=false&wait=true`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ language_id: languageId, source_code: codeByQuestion[questionId], stdin: testCase.input, expected_output: testCase.output, cpu_time_limit: testCase.time }),
                });
                const result = await response.json();
                console.log(result);
                const passed = result.status.description === 'Accepted';
                if (passed) {
                    totalScore += parseInt(testCase.score, 10); // Add score for passed test cases
                }
                console.log(testCase.score);
                testResults.push({
                    testCaseName: testCase.testCaseName,
                    status: result.status.description,
                    passed: result.status.description === 'Accepted',
                    score: testCase.score
                });
            }
            setOutputsByQuestion(prev => ({ ...prev, [questionId]: testResults }));
            setIsSubmittedByQuestion(prev => ({ ...prev, [questionId]: true }));  // Mark as submitted
            setTestDetails(prev => ({
                ...prev,
                questions: prev.questions.map(q => q.questionName === questionId ? {
                    ...q,
                    totalScore: totalScore // Store total score for the question
                } : q)
            }));
        } catch (error) {
            console.error('Error executing code:', error);
            
        } finally {
            setIsSubmitting(false);
        }
    };
    const handleConfirmSubmit = () => {
        if (modalPurpose==="submit"){
            setShowModal(false); // Close the modal
            handleSubmitTest(); // Proceed with submitting the test
        }
        else{
            setShowModal(false); // Close the modal
            setModalPurpose('submit');
            setModalMessage(`Are you sure you want to submit test?`);
        }
    };
    const handleCancelSubmit = () => {
        setShowModal(false);
        setModalPurpose('submit');
        setModalMessage(`Are you sure you want to submit test?`);
    };
    const handleClickedSubmitTest=()=>{
        if (tabSwitchCount!==3){
            setShowModal(true); // Show custom confirmation modal
        }
        else{
            handleSubmitTest();
        }
    }
    const handleSubmitTest = async () => {
        console.log(testDetails);
        setIsSubmittingTest(true);
        const email = auth.currentUser?.email || "unknown"; // Get user's email from Firebase Auth
        const testSubmission = {
            email,
            questions:[],
            duration: formatTime(testDetails.duration * 60 - timer)
        };
        const languageId = language === 'python' ? 71 : language === 'java' ? 62 : 76;
        const results = [];  // State to hold results breakdown for each question
        try {
            for (const question of testDetails.questions) {
                const questionResults = {
                    questionName: question.questionName,
                    testCasesPassed: 0,
                    score: 0,
                    totalTestCases: 0,
                    totalScore: 0
                };
                for (const testCase of question.testCases) {
                    const response = await fetch(`${apiUrl}/submissions/?base64_encoded=false&wait=true`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ language_id: languageId, source_code: codeByQuestion[question.questionName]?codeByQuestion[question.questionName]:"//", stdin: testCase.input, expected_output: testCase.output, cpu_time_limit: testCase.time }),
                    });
                    const result = await response.json();
                    console.log(result)
                    const passed = result.status.description === 'Accepted';
                    if (passed) {
                        questionResults.testCasesPassed += 1;
                        questionResults.score += parseInt(testCase.score, 10); // Add score for passed test cases
                    }
                    questionResults.totalTestCases += 1
                    questionResults.totalScore += parseInt(testCase.score, 10);
                }
                testSubmission.questions.push(questionResults);
                results.push(questionResults);  // Store the question results to show later
            }
            console.log(testSubmission);
        } catch (error) {
            console.error("Error adding report to test due to execution environment unreachability:\n", error.message);
            setModalPurpose('error');
            setModalMessage(`An error occurred: ${error}`);
            setIsSubmittingTest(false);
            setShowModal(true);
            if (tabSwitchCount<3){
                return;
            }
            for (const question of testDetails.questions){
                const questionResults = {
                    questionName: question.questionName,
                    testCasesPassed: 0,
                    score: 0,
                    totalTestCases: 0,
                    totalScore: 0
                };
                testSubmission.questions.push(questionResults);
                results.push(questionResults);
            }
        }
        try {
            const testDocRef = doc(db, "tests", testId);
            const testDocSnap = await getDoc(testDocRef);
            if (testDocSnap.exists()) {
                const testData = testDocSnap.data();
                const report = testData.report || [];
                const existingReportIndex = report.findIndex(entry => entry.email === email);
                if (existingReportIndex !== -1) {
                    const updatedReport = [...report];
                    updatedReport[existingReportIndex] = { ...updatedReport[existingReportIndex], ...testSubmission };
                    await updateDoc(testDocRef, {
                        report: updatedReport
                    });
                    alert("Test submitted successfully.");
                } else {
                    await updateDoc(testDocRef, {
                        report: arrayUnion(testSubmission) // Add the new report to the array
                    });
                    alert("Test submitted successfully.");
                }
            } else {
                console.log("No such test document!");
            }
            navigate("/results", { state: { results } }); // Pass the results via navigation state
        } catch (error) {
            console.error("Error adding report to test:", error.message);
            setModalPurpose('error');
            setModalMessage(`An error occurred: ${error}`);
            setShowModal(true);
            setIsSubmittingTest(false);
        }
        finally{
            setIsSubmittingTest(false);
        }
    };
    const handleInputChange = (value, questionId) => {
        setInputByQuestion(prevInput => ({
            ...prevInput,
            [questionId]: value,
        }));
    };
    const renderOutput = (questionId) => {
        const questionOutputs = outputsByQuestion[questionId] || [];
        const isSubmitted = isSubmittedByQuestion[questionId];  // Check if the code has been submitted
        return (
            <div className="d-flex flex-wrap justify-content-around mt-3">
                {questionOutputs.map((result, idx) => (
                    <div
                        key={idx}
                        className="card p-3 mb-3"
                        style={{ width: '45%', minWidth: '200px', boxShadow: "0px 0px 10px rgba(0, 0, 0, 0.1)" }}>
                        <div className="d-flex justify-content-between align-items-center">
                            <h6 className="mb-0">{result.testCaseName}</h6>
                            {isSubmitted ? (  // Only show tick/cross and hide output if submitted
                                result.status === "Accepted" ? (
                                    <BsCheckCircle color="green" size={20} className="ms-2" />
                                ) : (
                                    <BsXCircle color="red" size={20} className="ms-2" />
                                )
                            ) : (
                                isSubmitting ? (
                                    <Spinner animation="border" size="sm" />
                                ) : null
                            )}
                        </div>
                        {!isSubmitted && (
                            <>
                                <hr />
                                <div>
                                    <strong>Output:</strong>
                                    <pre className="mb-0" style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                                        {result.output}
                                    </pre>
                                </div>
                            </>
                        )}
                    </div>
                ))}
                {isSubmitted && (
                    <div className="mt-3">
                        <strong>Total Score: </strong>{testDetails.questions.find(q => q.questionName === questionId)?.totalScore || 0}
                    </div>
                )}
            </div>
        );
    };
    const handleCodeChange = (value, questionId) => {
        setCodeByQuestion(prevCodeByQuestion => ({
            ...prevCodeByQuestion,
            [questionId]: value,
        }));
    };
    const renderAccordionItem = (question, idx) => {
        const filteredTestCases = question.testCases.filter(tc => tc.testCaseName === 'basic1' || tc.testCaseName === 'basic2');
        return (
            <Accordion.Item eventKey={String(idx)}>
                <Accordion.Header>{question.questionName}</Accordion.Header>
                <Accordion.Body>
                    <div className="mb-3">
                         <strong>Description:</strong><br/>{question.questionDescription.split("\n").map((line, i) => (
                            <div key={i}>{line}</div>
                        ))}
                    </div>
                    <div className="mb-3">
                        <strong>Test Cases:</strong><br />
                        <ListGroup>
                        {filteredTestCases.map((tc, idx) => (
                                <ListGroup.Item key={idx} className="mb-2">
                                    <strong>{tc.testCaseName}:</strong><br />
                                    <div>Input:<br /> {tc.input}</div>
                                    <div>Output:<br /> {tc.output}</div>
                                </ListGroup.Item>      
                            ))}
                        </ListGroup>
                    </div>
                    <Form.Group className="mb-3">
                        <Form.Label>Select Language:</Form.Label>
                        <Form.Select value={language} onChange={(e) => setLanguage(e.target.value)}>
                            <option value="python">Python</option>
                            <option value="java">Java</option>
                            <option value="cpp">C++</option>
                        </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Check
                            type="checkbox"
                            label="Provide Custom Input"
                            checked={useCustomInput}
                            onChange={() => setUseCustomInput(!useCustomInput)}
                        />
                    </Form.Group>
                    {useCustomInput && (
                        <Form.Group className="mb-3">
                            <Form.Label>Input</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                placeholder="Enter Input"
                                value={inputByQuestion[question.questionName] || ''}  // Get the input for this specific question
                                onChange={(e) => handleInputChange(e.target.value, question.questionName)}  // Update the input for this question
                            />
                        </Form.Group>
                    )}
                    <Form.Group className="mb-3">
                        <Form.Label>Code</Form.Label>
                        <Editor
                            height="300px"
                            language={language}
                            value={codeByQuestion[question.questionName] || ''}
                            theme="vs-dark"
                            onChange={(value) => handleCodeChange(value, question.questionName)}
                        />
                    </Form.Group>
                    <Button variant="primary" onClick={() => handleRunCode(question.questionName)} disabled={isRunning}>
                        {isRunning ? "Running..." : "Run Code"}
                    </Button>
                    <Button
                        variant="success"
                        disabled={isSubmitting}
                        onClick={() => handleSubmitCode(question.questionName)}>
                        {isSubmitting ? <Spinner animation="border" size="sm" /> : "Submit Code"}
                    </Button>
                    <div className="mt-3">
                        {renderOutput(question.questionName)}
                    </div>
                </Accordion.Body>
            </Accordion.Item>
        );
    };
    if (isSubmittingTest) {
        return (
            <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
                <Spinner animation="border" size="1000px" />
            </Container>
        );  
    }

    return (
        <Container className="my-4">
            <Modal show={showModal} onHide={handleCancelSubmit}>
                <Modal.Header closeButton>
                <Modal.Title>
                        {modalPurpose === 'submit' && 'Confirm Submission'}
                        {modalPurpose === 'warning' && 'Warning'}
                        {modalPurpose === 'error' && 'Error'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body><h4>{modalMessage}</h4></Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCancelSubmit}>
                        {modalPurpose === 'submit' ? 'Cancel' : 'Close'}
                    </Button>
                    <Button variant="primary" onClick={handleConfirmSubmit}>
                        {modalPurpose === 'submit' ? 'Confirm' : 'OK'}
                    </Button>
                </Modal.Footer>
            </Modal>
            <div className="row justify-content-between" >
                <div className="col-2">
                    <p><strong>Time Remaining</strong>: {duration}</p>
                </div>
            </div>
            <h3>Test: {testDetails?.testname}</h3>
            {isLoading ? (
                <div className="text-center">
                    <Spinner animation="border" />
                </div>
            ) : (
                testDetails?.questions?.length > 0 ? (
                    <>
                        <Accordion >
                            {testDetails.questions.map((question, idx) => renderAccordionItem(question, idx))}
                        </Accordion>
                        <Button
                            id="submit"
                            variant="primary"
                            className="mt-3"
                            onClick={handleClickedSubmitTest}
                            disabled={isSubmittingTest}
                        >
                            {isSubmittingTest ? 'Submitting...' : 'Submit Test'}
                        </Button>
                    </>
                ) : (
                    <div>No questions available</div>
                )
            )}
        </Container>
    );
}
export default ExamPage;