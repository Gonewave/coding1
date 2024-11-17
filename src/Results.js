import { Button } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';

const Results = () => {
    const { state } = useLocation();
    const results = state?.results || [];
    const navigate = useNavigate(); // To navigate to the home page

    return (
        <div className='container my-4'>
            <div className="results-container">
                <Button className="back-button" onClick={() => navigate('/')}>Back</Button> {/* Back button */}
                <h2 className="results-title">Test Results</h2>
                <div className="results-list">
                    {results.map((question, index) => (
                        <div key={index} className="result-card">
                            <h3 className="question-title">Question: {question.questionName}</h3>
                            <div className="result-details">
                                <p><strong>Total Test Cases:</strong> {question.totalTestCases}</p>
                                <p><strong>Test Cases Passed:</strong> {question.testCasesPassed}</p>
                                <p><strong>Total Score:</strong> {question.totalScore}</p>
                                <p><strong>Score:</strong> {question.score}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Results;
