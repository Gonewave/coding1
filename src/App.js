import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./firebaseConfig"; // Import Firebase Auth instance
import Admin from './Admin';
import EditorPage from './EditorPage';
import TestQuestionsPage from './TestQuestionsPage';
import CreateTest from "./CreateTest";
import CandidateView from "./CandidateView";
import ExamPage from "./ExamPage";
import LoginSignupPage from "./LoginSignupPage"; // Import login/signup page
import ReportPage from './ReportPage'; // Import the ReportPage component
import Results from "./Results";
import CreateQuestion from "./CreateQuestion";
import ManageQuestions from "./ManageQuestions";
import Stats from "./Stats";
import DetailedReport from "./DetailedReport";
import ErrorBoundary from "./ErrorBoundary";
const adminEmails = ["animichandan@gmail.com", "achandan@gmail.com"];

function App() {
  const [user] = useAuthState(auth); // Firebase hook to track authentication state

  // Redirects users to login if not authenticated
  const ProtectedRoute = ({ children }) => {
    return user ? children : <Navigate to="/" />;
  };

  // Redirect user based on role after authentication
  const RedirectToRole = () => {
    if (user) {
      // Check if the user is admin based on their email
      const isAdmin = adminEmails.includes(user.email);
      return isAdmin ? <Navigate to="/admin" /> : <Navigate to="/candidateView" />;
    }
    return <Navigate to="/" />; // Redirect to login if no user
  };

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>

          <Route path="/" element={<ErrorBoundary><LoginSignupPage /> </ErrorBoundary> } />
          
          {/* Protect all routes below */}
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="/createTest" element={<ProtectedRoute><CreateTest /></ProtectedRoute>} />
          <Route path="/editor" element={<ProtectedRoute><EditorPage /></ProtectedRoute>} />
          <Route path="/candidateView" element={<ProtectedRoute><CandidateView /></ProtectedRoute>} />
          <Route path="/test/:id/questions" element={<ProtectedRoute><TestQuestionsPage /></ProtectedRoute>} />
          <Route path="/test/:testId/exam" element={<ProtectedRoute><ExamPage /></ProtectedRoute>} />
          <Route path="/report/:testId" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} /> {/* New route for report page */}
          <Route path="/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
          <Route path="/createQuestions" element={<ProtectedRoute><CreateQuestion /></ProtectedRoute>} />
          <Route path="/manageQuestions" element={<ProtectedRoute><ManageQuestions /></ProtectedRoute>} />
          <Route path="/stats" element={<ProtectedRoute><Stats /></ProtectedRoute>} />
          <Route path="/detailedReport/:userId" element={<ProtectedRoute><DetailedReport /></ProtectedRoute>} />

          {/* Redirect after login */}
          <Route path="/home" element={<RedirectToRole />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
