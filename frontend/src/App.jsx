import React, { useState } from "react";
import LoginScreen from "./LoginScreen";
import ChatScreen from "./ChatScreen";

const App = () => {
  const [currentScreen, setCurrentScreen] = useState("login");
  const [userInfo, setUserInfo] = useState({ email: "", schoolName: "" });

  const handleLogin = (email, schoolName) => {
    setUserInfo({ email, schoolName });
    setCurrentScreen("chat");
  };

  const handleLogout = () => {
    setUserInfo({ email: "", schoolName: "" });
    setCurrentScreen("login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {currentScreen === "login" ? (
        <LoginScreen onLogin={handleLogin} />
      ) : (
        <ChatScreen userInfo={userInfo} onLogout={handleLogout} />
      )}
    </div>
  );
};

export default App;