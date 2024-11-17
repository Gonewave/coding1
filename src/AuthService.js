import { auth } from "./firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail
} from "firebase/auth";

// Sign up with email and password
export const signUpWithEmail = (email, password) =>
  createUserWithEmailAndPassword(auth, email, password);

// Sign in with email and password
export const signInWithEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

// Send email verification
export const sendVerificationEmail = () => {
  if (auth.currentUser) {
    return sendEmailVerification(auth.currentUser);
  }
  throw new Error("No authenticated user to send verification.");
};

// Reset password
export const resetPassword = (email) =>
  sendPasswordResetEmail(auth, email);
