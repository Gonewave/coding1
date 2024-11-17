import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { Row, Col } from "react-bootstrap";
import Accordion from "react-bootstrap/Accordion";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import * as XLSX from 'xlsx';
import { Container, Spinner } from "react-bootstrap";

const DetailedReport = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [tests, setTests] = useState([]);
    const [expandedRow, setExpandedRow] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mail, setEmail] = useState(null);

    useEffect(() => {
        const fetchUserTests = async () => {
            try {
                // Fetch user's tests list
                const userRef = doc(db, "users", userId);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    const testIds = userData.tests || [];
                    const email = userData.email || null;
                    setEmail(email);
                    // Fetch test details for each test ID
                    const testPromises = testIds.map(async (testId) => {
                        const testRef = doc(db, "tests", testId);
                        const testSnap = await getDoc(testRef);
                        if (testSnap.exists()) {
                            return { id: testId, ...testSnap.data() };
                        }
                        return null;
                    });

                    const testsData = await Promise.all(testPromises);
                    for (var i = 0; i < testsData.length; i++) {
                        for (var j = 0; j < testsData[i].report.length; j++) {
                            if (testsData[i].report[j].email === email) {
                                testsData[i].report = [testsData[i].report[j]];
                                break;
                            }
                        }
                    }
                    console.log(testsData);
                    setTests(testsData.filter((test) => test !== null));
                } else {
                    console.error("User not found.");
                }
            } catch (error) {
                console.error("Error fetching tests:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserTests();
    }, [userId]);

    const handleToggle = (idx) => {
        setExpandedRow(expandedRow === idx ? null : idx);
    };

    const handleDownload = () => {
        // Map over tests to create a summary table
        const tableData = tests.map(test => ({
            "Test Name": test.testname,
            "Conducted On": test.conductedon
                ? new Date(test.conductedon.seconds * 1000).toLocaleDateString()
                : "Not Conducted",
            "Total Marks": test.report.reduce(
                (acc, entry) => acc + entry.questions.reduce((sum, q) => sum + q.totalScore, 0),
                0
            ),
            "Marks Scored": test.report.reduce(
                (acc, entry) => acc + entry.questions.reduce((sum, q) => sum + q.score, 0),
                0
            ),
            "No. of Questions": test.report.reduce((acc, entry) => acc + entry.questions.length, 0),
            "Total Test Cases": test.report.reduce(
                (acc, entry) => acc + entry.questions.reduce((sum, q) => sum + q.totalTestCases, 0),
                0
            ),
            "Test Cases Passed": test.report.reduce(
                (acc, entry) => acc + entry.questions.reduce((sum, q) => sum + q.testCasesPassed, 0),
                0
            ),
        }));

        // Group question breakdown by test
        const questionBreakdownData = tests.map(test => ({
            "Test Name": test.testname,
            Breakdown: test.report.flatMap(entry =>
                entry.questions.map(q => ({
                    Email: entry.email,
                    "Question Name": q.questionName,
                    "Total Score": q.totalScore,
                    "Marks Scored": q.score,
                    "Total Test Cases": q.totalTestCases,
                    "Test Cases Passed": q.testCasesPassed,
                }))
            ),
        }));

        // Create the main worksheet for the report summary
        const worksheet1 = XLSX.utils.json_to_sheet(tableData);

        // Create the second worksheet for question breakdown grouped by test
        const questionBreakdownGrouped = [];
        questionBreakdownData.forEach(test => {
            test.Breakdown.forEach(q => {
                questionBreakdownGrouped.push({
                    "Test Name": test["Test Name"],
                    Email: q.Email,
                    "Question Name": q["Question Name"],
                    "Total Score": q["Total Score"],
                    "Marks Scored": q["Marks Scored"],
                    "Total Test Cases": q["Total Test Cases"],
                    "Test Cases Passed": q["Test Cases Passed"],
                });
            });
        });
        const worksheet2 = XLSX.utils.json_to_sheet(questionBreakdownGrouped);

        // Create workbook and append both sheets
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet1, "Detailed Report Summary");
        XLSX.utils.book_append_sheet(workbook, worksheet2, "Question Breakdown");

        // Write to file
        XLSX.writeFile(workbook, `DetailedReport_User_${mail}.xlsx`);
    };


    if (loading) {
        return (
            <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
                <Spinner animation="border" />
            </Container>
        );
    }

    return (
        <Container className="my-4">
            <div>
                <Row>
                    <Col>
                        <Button variant="primary" onClick={handleDownload}>
                            Download Report
                        </Button>
                    </Col>
                    <Col className="text-end">
                        <Button variant="secondary" onClick={() => navigate(-1)}>
                            Back
                        </Button>
                    </Col>
                </Row>

                <br />
                <br />
                <h3>{mail.split("@")[0]} : Detailed Report</h3><br />
                {tests.length === 0 ? (
                    <div className="text-center my-4">
                        <h4>No Data Available</h4>
                    </div>
                ) : (
                    <Table striped bordered hover responsive>
                    <thead>
                        <tr>
                            <th>Test Name</th>
                            <th>Conducted On</th>
                            <th>Total Time</th>
                            <th>Time Spent</th>
                            <th>Total Marks</th>
                            <th>Marks Scored</th>
                            <th>No. of Questions</th>
                            <th>Total Test Cases</th>
                            <th>Test Cases Passed</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tests.map((test, idx) => {
                            const totalQuestions = test.report.reduce((acc, entry) => acc + entry.questions.length, 0);
                            const totalTestCases = test.report.reduce(
                                (acc, entry) => acc + entry.questions.reduce((sum, q) => sum + q.totalTestCases, 0),
                                0
                            );
                            const testCasesPassed = test.report.reduce(
                                (acc, entry) => acc + entry.questions.reduce((sum, q) => sum + q.testCasesPassed, 0),
                                0
                            );
                            const totalMarks = test.report.reduce(
                                (acc, entry) => acc + entry.questions.reduce((sum, q) => sum + q.totalScore, 0),
                                0
                            );
                            const marksScored = test.report.reduce(
                                (acc, entry) => acc + entry.questions.reduce((sum, q) => sum + q.score, 0),
                                0
                            );

                            return (
                                <React.Fragment key={test.id}>
                                    <tr>
                                        <td>{test.testname}</td>
                                        <td>
                                            {test.conductedon
                                                ? new Date(test.conductedon.seconds * 1000).toLocaleDateString()
                                                : "Not Conducted"}
                                        </td>
                                        <td>
                                            {test.duration} min
                                        </td>
                                        <td>
                                            {test.report.map((i)=>{
                                                if(i.email===mail){
                                                    return i.duration;
                                                }
                                                return null;
                                            })}
                                        </td>
                                        <td>{totalMarks}</td>
                                        <td>{marksScored}</td>
                                        <td>{totalQuestions}</td>
                                        <td>{totalTestCases}</td>
                                        <td>{testCasesPassed}</td>
                                        <td>
                                            <Button onClick={() => handleToggle(idx)}>
                                                {expandedRow === idx ? "Hide Details" : "Show Details"}
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
                                                                        <th>Email</th>
                                                                        <th>Question Name</th>
                                                                        <th>Total Score</th>
                                                                        <th>Marks Scored</th>
                                                                        <th>Total Test Cases</th>
                                                                        <th>Test Cases Passed</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {test.report.map((entry, entryIdx) =>
                                                                        entry.questions.map((q, qIdx) => (
                                                                            <tr key={`${entryIdx}-${qIdx}`}>
                                                                                <td>{entry.email}</td>
                                                                                <td>{q.questionName}</td>
                                                                                <td>{q.totalScore}</td>
                                                                                <td>{q.score}</td>
                                                                                <td>{q.totalTestCases}</td>
                                                                                <td>{q.testCasesPassed}</td>
                                                                            </tr>
                                                                        ))
                                                                    )}
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
                )}
            </div>
        </Container>
    );
};

export default DetailedReport;