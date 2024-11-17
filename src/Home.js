import React, { useEffect, useState } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebaseConfig";

const adminEmails = ["animichandan@gmail.com", "achandan@gmail.com"];

function Home() {
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAdmin(adminEmails.includes(user.email));
      } else {
        navigate("/"); // Redirect to login/signup if not logged in
      }
    });
    return unsubscribe;
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/"); // Redirect to login/signup page after logout
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <>
      <nav className="navbar">
        <ul className="nav-links">
          <li>
            <Link to="/">Home</Link>
          </li>
          {isAdmin ? (
            <li>
              <Link to="/Admin">Admin</Link>
            </li>
          ) : (
            <li>
              <Link to="/candidateView">Candidate View</Link>
            </li>
          )}
          <li>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </li>
        </ul>
      </nav>
      <Outlet />
    </>
  );
}

export default Home;
