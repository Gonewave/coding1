import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc,collection,getDocs,query,where, updateDoc } from "firebase/firestore";
import { db } from './firebaseConfig';
import Accordion from "react-bootstrap/Accordion";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import * as XLSX from 'xlsx';
import { Container, Spinner } from "react-bootstrap";

const TestReport = () => {
    const { testId } = useParams();
    const navigate = useNavigate();
    const [test, setTest] = useState(null);
    const [report, setReport] = useState([]);
    const [expandedRow, setExpandedRow] = useState(null);

    useEffect(() => {
        const fetchTestData = async () => {
            try {
                const testRef = doc(db, "tests", testId);
                const testSnap = await getDoc(testRef);
                if (testSnap.exists()) {
                    const testData = testSnap.data();
                    setTest(testData);
                    setReport(testData.report || []);
                } else {
                    console.log("No such test!");
                }
            } catch (error) {
                console.error("Error fetching test or report data:", error);
            }
        };

        fetchTestData();
    }, [testId]);

    const handleToggle = (idx) => {
        setExpandedRow(expandedRow === idx ? null : idx);
    };

    const handleDelete = async (index) => {
        const confirmDelete = window.confirm("Are you sure you want to delete?");
        if (confirmDelete) {
            const deletedReport = report[index];
            const updatedReport = report.filter((_, idx) => idx !== index);
            setReport(updatedReport);
    
            try {
                // Update the report in the "tests" collection
                const testRef = doc(db, "tests", testId);
                await updateDoc(testRef, { report: updatedReport });
    
                // Remove the testId from the "tests" array of the corresponding user
                if (deletedReport && deletedReport.email) {
                    const userQuery = query(
                        collection(db, "users"),
                        where("email", "==", deletedReport.email)
                    );
                    const userSnapshot = await getDocs(userQuery);
    
                    if (!userSnapshot.empty) {
                        const userDoc = userSnapshot.docs[0];
                        const userData = userDoc.data();
                        const userDocRef = doc(db, "users", userDoc.id);
    
                        if (userData.tests && Array.isArray(userData.tests)) {
                            // Remove the testId from the tests array
                            const updatedTests = userData.tests.filter((test) => test !== testId);
                            await updateDoc(userDocRef, { tests: updatedTests });
                        }
                    }
                }
            } catch (error) {
                console.error("Error deleting report entry or updating user's tests:", error);
            }
        }
    };
    

    const handleDownload = () => {
        const tableData = report.map(entry => ({
            Email: entry.email,
            "Time Taken": entry.duration,
            "No. of Questions": entry.questions.length,
            "Total Test Cases": entry.questions.reduce((acc, q) => acc + q.totalTestCases, 0),
            "Test Cases Passed": entry.questions.reduce((acc, q) => acc + q.testCasesPassed, 0),
            "Total Marks": entry.questions.reduce((acc, q) => acc + q.totalScore, 0),
            "Marks Scored": entry.questions.reduce((acc, q) => acc + q.score, 0)
        }));
    
        // Group Question Breakdown by Email
        const questionBreakdownData = report.map(entry => ({
            Email: entry.email,
            Breakdown: entry.questions.map((q, qIdx) => ({
                "Question Name": q.questionName,
                "Total Score": q.totalScore,
                "Marks Scored": q.score,
                "Total Test Cases": q.totalTestCases,
                "Test Cases Passed": q.testCasesPassed
            }))
        }));
    
        // Create the main worksheet for the report summary
        const worksheet1 = XLSX.utils.json_to_sheet(tableData);
    
        // Create the second worksheet for question breakdown grouped by email
        const questionBreakdownGrouped = [];
        questionBreakdownData.forEach(entry => {
            entry.Breakdown.forEach((q, idx) => {
                questionBreakdownGrouped.push({
                    Email: entry.Email,
                    "Question Name": q["Question Name"],
                    "Total Score": q["Total Score"],
                    "Marks Scored": q["Marks Scored"],
                    "Total Test Cases": q["Total Test Cases"],
                    "Test Cases Passed": q["Test Cases Passed"]
                });
            });
        });
        const worksheet2 = XLSX.utils.json_to_sheet(questionBreakdownGrouped);
    
        // Create workbook and append both sheets
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet1, "Report Summary");
        XLSX.utils.book_append_sheet(workbook, worksheet2, "Question Breakdown");
    
        // Write to file
        XLSX.writeFile(workbook, `TestReport_${test.testname}.xlsx`);
    };
    
    

    if (!test) {
        return (<>
            <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
            <Spinner animation="border" size="1000px" />;
            </Container>
            </>  )
    }

    return (
        <Container className="my-4">
            <div>
            <Button variant="secondary" onClick={() => navigate(-1)}>Back</Button>{' '}
            <Button variant="primary" onClick={handleDownload}>Download Report as Excel</Button>
            <br />
            <br />
            <h3>Test Report: {test.testname}</h3>
            {
                report.length===0?(
                    <div className="text-center my-4">
                        <h4>No Data Available</h4>
                    </div>
                ) :(
                    <Table striped bordered hover responsive>
                <thead>
                    <tr>
                        <th>Email</th>
                        <th>Time Taken</th>
                        <th>No. of Questions</th>
                        <th>Total Test Cases</th>
                        <th>Test Cases Passed</th>
                        <th>Total Marks</th>
                        <th>Marks Scored</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {report.map((entry, idx) => {
                        const totalQuestions = entry.questions.length;
                        const totalTestCases = entry.questions.reduce((acc, q) => acc + q.totalTestCases, 0);
                        const testCasesPassed = entry.questions.reduce((acc, q) => acc + q.testCasesPassed, 0);
                        const totalScore = entry.questions.reduce((acc, q) => acc + q.totalScore, 0);
                        const marksScored = entry.questions.reduce((acc, q) => acc + q.score, 0);

                        return (
                            <React.Fragment key={idx}>
                                <tr>
                                    <td>{entry.email}</td>
                                    <td>{entry.duration}</td>
                                    <td>{totalQuestions}</td>
                                    <td>{totalTestCases}</td>
                                    <td>{testCasesPassed}</td>
                                    <td>{totalScore}</td>
                                    <td>{marksScored}</td>
                                    <td>
                                        <Button onClick={() => handleToggle(idx)}>
                                            {expandedRow === idx ? "Hide Details" : "Show Details"}
                                        </Button>{" "}
                                        <Button variant="danger" onClick={() => handleDelete(idx)}>
                                            Delete
                                        </Button>
                                    </td>
                                </tr>
                                {expandedRow === idx && (
                                    <tr>
                                        <td colSpan="8">
                                            <Accordion>
                                                <Accordion.Item eventKey="0">
                                                    <Accordion.Header>Question Breakdown</Accordion.Header>
                                                    <Accordion.Body>
                                                        <Table bordered>
                                                            <thead>
                                                                <tr>
                                                                    <th>Question Name</th>
                                                                    <th>Total Score</th>
                                                                    <th>Marks Scored</th>
                                                                    <th>Total Test Cases</th>
                                                                    <th>Test Cases Passed</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {entry.questions.map((q, qIdx) => (
                                                                    <tr key={qIdx}>
                                                                        <td>{q.questionName}</td>
                                                                        <td>{q.totalScore}</td>
                                                                        <td>{q.score}</td>
                                                                        <td>{q.totalTestCases}</td>
                                                                        <td>{q.testCasesPassed}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </Table>
                                                    </Accordion.Body>
                                                </Accordion.Item>
                                            </Accordion>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </Table>
                )
            }
        </div>
        </Container>
        
    );
};

export default TestReport;
