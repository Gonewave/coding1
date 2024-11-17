import React, { useEffect, useState } from "react";
import { Table, Button,Row,Col, Container, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebaseConfig";

function Stats() {
    const [usersData, setUsersData] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            try {
                const usersCollection = collection(db, "users");
                const usersSnapshot = await getDocs(usersCollection);
                const users = usersSnapshot.docs.map(doc => ({
                    id: doc.id,
                    email: doc.data().email,
                    tests: doc.data().tests || [], // Default to empty array if not present
                }));
                setUsersData(users);
                // console.log(users);
            } catch (error) {
                console.error("Error fetching users:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    const renderUsersTable = () => (
        <Table striped bordered hover responsive className="mt-4">
            <thead>
                <tr>
                    <th>Email</th>
                    <th>No. of Tests Attempted</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {usersData.map(user => (
                    <tr key={user.id}>
                        <td>{user.email}</td>
                        <td>{user.tests.length}</td>
                        <td>
                            <Button
                                variant="info"
                                onClick={() => navigate(`/detailedReport/${user.id}`)}
                            >
                                Detailed Report
                            </Button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </Table>
    );

    return (
        <Container className="my-4">
            <Row>
                <Col>
                <h2>Stats</h2>
                </Col>
                <Col className="text-end">
                <Button variant="secondary" onClick={() => navigate(-1)}>
                    Back
            </Button>
                </Col>
            </Row>
            
            
            {loading ? <Spinner animation="border" /> : renderUsersTable()}
        </Container>
    );
}

export default Stats;
