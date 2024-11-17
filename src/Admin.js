import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Table, Button, Container, Row, Col, Spinner, Accordion } from "react-bootstrap";
import { db } from './firebaseConfig';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { auth } from "./firebaseConfig";
import { signOut } from "firebase/auth";

function Admin() {
    const [completedTests, setCompletedTests] = useState([]);
    const [scheduledTests, setScheduledTests] = useState([]);
    const [runningTests, setRunningTests] = useState([]);
    const [isStarting, setIsStarting] = useState(false);
    const [isEnding, setIsEnding] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isReconducting, setIsReconducting] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchTests = async () => {
            try {
                const testsRef = collection(db, "tests");
                const scheduledQuery = query(testsRef, where("started", "==", false));
                const completedQuery = query(testsRef, where("started", "==", true), where("ended", "==", true));
                const runningQuery = query(testsRef, where("started", "==", true), where("ended", "==", false));

                const completedSnapshot = await getDocs(completedQuery);
                const completedData = completedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setCompletedTests(completedData);

                const scheduledSnapshot = await getDocs(scheduledQuery);
                const scheduledData = scheduledSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setScheduledTests(scheduledData);

                const runningSnapshot = await getDocs(runningQuery);
                const runningData = runningSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setRunningTests(runningData);
            } catch (error) {
                console.error("Error fetching tests:", error);
            }
        };

        fetchTests();
    }, [isDeleting,isEnding,isReconducting,isStarting]);

    const startTest = async (testId) => {
        const confirmStart = window.confirm("Are you sure you want to start this test?");
        if (confirmStart) {
            setIsStarting(true);
            try {
                const testRef = doc(db, "tests", testId);
                await updateDoc(testRef, { started: true, conductedon: new Date() });
            } catch (error) {
                console.error("Error starting test:", error);
            } finally {
                setIsStarting(false);
            }
        }
    };
    
    const endTest = async (testId) => {
        const confirmEnd = window.confirm("Are you sure you want to end this test?");
        if (confirmEnd) {
            setIsEnding(true);
            try {
                const testRef = doc(db, "tests", testId);
                await updateDoc(testRef, { ended: true, conductedon: new Date() });
            } catch (error) {
                console.error("Error ending test:", error);
            } finally {
                setIsEnding(false);
            }
        }
    };
    
    const deleteTest = async (testId) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this test?");
        if (confirmDelete) {
            setIsDeleting(true);
            try {
                const testRef = doc(db, "tests", testId);
                await deleteDoc(testRef);
                    const usersRef = collection(db, "users");
                const usersSnapshot = await getDocs(usersRef);
                    const updatePromises = usersSnapshot.docs.map(async (userDoc) => {
                    const userData = userDoc.data();
                    const userDocRef = doc(db, "users", userDoc.id);
                    if (userData.tests && Array.isArray(userData.tests)) {
                        if (userData.tests.includes(testId)) {
                            const updatedTests = userData.tests.filter((test) => test !== testId);
                            await updateDoc(userDocRef, {
                                tests: updatedTests,
                            });
                        }
                    }
                });
                    await Promise.all(updatePromises);
                console.log(`Test ${testId} successfully deleted from tests collection and users' documents.`);
            } catch (error) {
                console.error("Error deleting test:", error);
            } finally {
                setIsDeleting(false);
            }
        }
    };
    
    
    const reConductTest = async (testId) => {
        const confirmReconduct = window.confirm("Are you sure you want to reconduct this test?");
        if (confirmReconduct) {
            setIsReconducting(true);
            try {
                const testRef = doc(db, "tests", testId);
                await updateDoc(testRef, { ended: false });
            } catch (error) {
                console.error("Error reconducting test:", error);
            } finally {
                setIsReconducting(false);
            }
        }
    };
    

    const renderTableRow = (test, showConductedOn = false, showReportButton = false, actions = null, showDeleteButton = false, showReConductButton = false) => {
        const duration = test.duration ? `${test.duration} min` : "N/A";
        return (
            <tr key={test.id}>
                <td>{test.testname}</td>
                <td>{new Date(test.createdon.seconds * 1000).toLocaleDateString()}</td>
                {showConductedOn && <td>{test.conductedon ? new Date(test.conductedon.seconds * 1000).toLocaleDateString() : "Not Conducted"}</td>}
                <td>{test.questions.length}</td>
                <td>{duration}</td>
                <td><Button variant="info" onClick={() => navigate(`/test/${test.id}/questions`)}>Questions</Button></td>
                {showReportButton && (
                    <td>
                        <Button
                            variant="info"
                            onClick={() => navigate(`/report/${test.id}`)}
                        >
                            Report
                        </Button>
                    </td>
                )}
                {actions && <td>{actions(test)}</td>}
                {showReConductButton && (
                    <td>
                        <Button
                            variant="warning"
                            onClick={() => reConductTest(test.id)}
                            disabled={isReconducting}
                        >
                            {isReconducting ? <Spinner animation="border" size="sm" /> : 'ReConduct'}
                        </Button>
                    </td>
                )}
                {showDeleteButton && (
                    <td>
                        <Button
                            variant="danger"
                            onClick={() => deleteTest(test.id)}
                            disabled={isDeleting}
                        >
                            {isDeleting ? <Spinner animation="border" size="sm" /> : 'Delete'}
                        </Button>
                    </td>
                )}
            </tr>
        );
    };

    const renderTable = (data, columns, showConductedOn = false, showReportButton = false, actions = null, showDeleteButton = false, showReConductButton = false) => (
        <>{data.length===0?(<div className="text-center my-4">
            <h4>No Tests Available</h4>
        </div>):(<Table striped bordered hover responsive className="mt-4">
            <thead>
                <tr>
                    {columns.map((col, idx) => <th key={idx}>{col}</th>)}
                </tr>
            </thead>
            <tbody>
                {data.map((test) => renderTableRow(test, showConductedOn, showReportButton, actions, showDeleteButton, showReConductButton))}
            </tbody>
        </Table>)}</>
    );

    const handleLogout = async () => {
        const confirmLogout = window.confirm("Are you sure you want to log out?");
        if (confirmLogout) {
            try {
                await signOut(auth);
                navigate("/"); 
            } catch (error) {
                console.error("Error signing out:", error);
            }
        }
    };
    

    return (
        <Container className="my-4">
            <Row className="mb-3">
                <Col>
                    <Button variant="primary" onClick={() => navigate("/createTest")}>Create Test</Button>
                    <Button variant="primary" onClick={() => navigate("/editor")} className="ms-2">Editor</Button>
                    <Button variant="primary" onClick={() => navigate("/manageQuestions")} className="ms-2">Questions</Button>
                    <Button variant="primary" onClick={() => navigate("/stats")} className="ms-2">Stats</Button>

                </Col>
                <Col className="text-end">
                    <Button className="ms-2" onClick={handleLogout} variant="primary">Logout</Button>
                </Col>
            </Row>

            <Accordion >
                <Accordion.Item eventKey="0">
                    <Accordion.Header>Scheduled Tests</Accordion.Header>
                    <Accordion.Body>
                        {renderTable(
                            scheduledTests,
                            ["Test Name", "Created On", "No. of Questions", "Duration", "Questions", "Actions"],
                            false,
                            false,
                            (test) => (
                                <div className="d-flex" style={{ justifyContent: "space-evenly" }}>
                                    <Button
                                        variant="success"
                                        onClick={() => startTest(test.id)}
                                        className="me-2"
                                        disabled={isStarting}
                                    >
                                        {isStarting ? <Spinner animation="border" size="sm" /> : 'Start Test'}
                                    </Button>
                                    <Button
                                        variant="danger"
                                        onClick={() => deleteTest(test.id)}
                                        disabled={isDeleting}
                                    >
                                        {isDeleting ? <Spinner animation="border" size="sm" /> : 'Delete Test'}
                                    </Button>
                                </div>
                            )
                        )}
                    </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="1">
                    <Accordion.Header>Running Tests</Accordion.Header>
                    <Accordion.Body>
                        {renderTable(
                            runningTests,
                            ["Test Name", "Created On", "No. of Questions", "Duration", "Questions", "Actions"],
                            false,
                            false,
                            (test) => (
                                <Button
                                    variant="danger"
                                    onClick={() => endTest(test.id)}
                                    disabled={isEnding}
                                >
                                    {isEnding ? <Spinner animation="border" size="sm" /> : 'End Test'}
                                </Button>
                            )
                        )}
                    </Accordion.Body>
                </Accordion.Item>

                <Accordion.Item eventKey="2">
                    <Accordion.Header>Completed Tests</Accordion.Header>
                    <Accordion.Body>
                        {renderTable(
                            completedTests,
                            ["Test Name", "Created On", "Conducted On", "No. of Questions", "Duration", "Questions", "Report", "ReConduct", "Delete"],
                            true,
                            true,
                            null,
                            true,
                            true
                        )}
                    </Accordion.Body>
                </Accordion.Item>
            </Accordion>
        </Container>
    );
}

export default Admin;
