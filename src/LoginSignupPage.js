import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "./firebaseConfig";
import {
  signUpWithEmail,
  signInWithEmail,
  sendVerificationEmail,
  resetPassword
} from "./AuthService";
import { onAuthStateChanged } from "firebase/auth";
import { Container, Form, Button, Alert, Spinner, Card } from "react-bootstrap";

const adminEmails = ["animichandan@gmail.com", "anemchandan000@gmail.com","krutibash.n@bvrit.ac.in"];

// Password validation function
const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return (
    password.length >= minLength &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumber &&
    hasSpecialChar
  );
};

function LoginSignupPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true); // Initial loading state for app load
  const [authLoading, setAuthLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.emailVerified) {
        navigate("/home");
      }
      else{
        setLoading(false);
      }
    });
    return unsubscribe;
  }, [navigate]);

  const toggleForm = () => {
    setIsSignUp(!isSignUp);
    setErrorMessage("");
    setPasswordError("");
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setAuthLoading(true);

    if (!email.endsWith("@bvrit.ac.in") && !adminEmails.includes(email)) {
      setErrorMessage("Only @bvrit.ac.in emails are allowed for sign-up, except for admins.");
      setAuthLoading(false);
      return;
    }

    // Validate password
    if (!validatePassword(password)) {
      setPasswordError("Password must be at least 8 characters long, contain an uppercase letter, a number, and a special character.");
      setAuthLoading(false);
      return;
    }

    try {
      await signUpWithEmail(email, password);
      await sendVerificationEmail();
      alert("Sign-up successful! Check your email for verification.");
      toggleForm();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setAuthLoading(true);

    try {
      await signInWithEmail(email, password);
      if (auth.currentUser.emailVerified) {
        navigate("/home");
      } else {
        setErrorMessage("Please verify your email before signing in.");
      }
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) return setErrorMessage("Enter your email to reset the password.");
    setAuthLoading(true);
    try {
      await resetPassword(email);
      alert("Password reset link sent to your email.");
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setAuthLoading(false);
    }
  };


  if (loading) { 
    return (
      <>
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
      <Spinner animation="border" size="1000px" />;
      </Container>
      </>  
    )
  }

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
      <Card style={{ width: "400px", padding: "20px" }}>
        <Card.Body>
          <h2 className="text-center mb-4">{isSignUp ? "Sign Up" : "Sign In"}</h2>
          {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}
          {passwordError && <Alert variant="danger">{passwordError}</Alert>}
          <Form onSubmit={isSignUp ? handleSignUp : handleSignIn}>
            <Form.Group controlId="formEmail" className="mb-3">
              <Form.Label>Email address</Form.Label>
              <Form.Control
                type="email"
                placeholder="Enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group controlId="formPassword" className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Form.Group>
            <Button
              variant="primary"
              type="submit"
              className="w-100"
              disabled={authLoading}
            >
              {authLoading ? <Spinner animation="border" size="sm" /> : isSignUp ? "Sign Up" : "Sign In"}
            </Button>
          </Form>
          <div className="text-center mt-3">
            {isSignUp ? (
              <>
                Already have an account?{" "}
                <Button variant="link" onClick={toggleForm}>
                  Sign In
                </Button>
              </>
            ) : (
              <>
                Don’t have an account?{" "}
                <Button variant="link" onClick={toggleForm}>
                  Sign Up
                </Button>
              </>
            )}
            {!isSignUp && (
              <Button variant="link" onClick={handleResetPassword} disabled={authLoading}>
                Forgot Password?
              </Button>
            )}
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default LoginSignupPage;
