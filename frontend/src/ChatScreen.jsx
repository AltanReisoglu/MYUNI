// ChatScreen.jsx
import React, { useState, useEffect } from "react";
import { Bot, Menu, Send } from "lucide-react";
import "./ChatScreen.css";
import api from "./api"; // axios instance
import { logout, getToken } from "./auth";

const ChatScreen = ({ userInfo, onLogout }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "bot",
      text: `Merhaba! Ben ${userInfo?.schoolName || "okulunuz"} AI asistanıyım. Size nasıl yardımcı olabilirim?`,
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    // Eğer token yoksa otomatik olarak çıkışa gönder veya uyar
    const token = getToken();
    if (!token) {
      alert("Oturum açmanız gerekiyor. Lütfen giriş yapın.");
      onLogout();
    }
  }, [onLogout]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputMessage.trim()) return;

    const newMessage = {
      id: messages.length + 1,
      sender: "user",
      text: inputMessage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
    setInputMessage("");
    setIsTyping(true);

    try {
      // --- BURADA endpoint seçimi ---
      // Çoğu durumda Choreo'da kullandığın endpoint: /assistant/preset
      // Eğer backend'in /assistant/request ise aşağıdaki satırı ona göre değiştir.
      const response = await api.post("/assistant/preset", { question: inputMessage });
      // const response = await api.post("/assistant/request", { question: inputMessage }); // alternatif

      const botText = response?.data?.answer ?? response?.data?.message ?? "Cevap alınamadı.";
      const botResponse = {
        id: messages.length + 2,
        sender: "bot",
        text: botText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
    } catch (error) {
      console.error("API error:", error);

      // 401 veya invalid credentials gelirse
      if (error?.response?.status === 401) {
        // opsiyonel: token expired ise logout
        logout();
        alert("Oturum süresi doldu veya yetkisiz. Lütfen tekrar giriş yapın.");
        onLogout();
        return;
      }

      const errMsg = error?.response?.data?.error_message || error?.message || "Bir hata oluştu.";
      const errorMessage = {
        id: messages.length + 2,
        sender: "bot",
        text: `Hata: ${errMsg}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <div className="header-left">
          <div className="bot-avatar">
            <Bot />
          </div>
          <div className="header-info">
            <h2>AI Öğrenci Asistanı</h2>
            <p>{userInfo?.schoolName}</p>
          </div>
        </div>

        <div className="user-menu">
          <button
            onClick={() => { logout(); onLogout(); }}
            className="user-menu-button"
            title="Çıkış Yap"
          >
            <Menu />
            <div className="user-info">
              <p>{userInfo?.email}</p>
              <p>Aktif</p>
            </div>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="messages-container">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message-wrapper ${message.sender === "user" ? "user" : "bot"}`}
          >
            <div className="message-content">
              <div className={`message-avatar ${message.sender}`}>
                {message.sender === "bot" ? <Bot /> : null}
              </div>
              <div className={`message-bubble ${message.sender}`}>
                <p className="message-text">{message.text}</p>
                <p className={`message-time ${message.sender}`}>
                  {message.timestamp.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="typing-indicator">
            <div className="typing-content">
              <div className="message-avatar bot">
                <Bot />
              </div>
              <div className="typing-bubble">
                <div className="typing-dots">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="input-area">
        <div className="input-wrapper">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage(e)}
            placeholder="Mesajınızı yazın..."
            className="message-input"
          />
          <button
            type="button"
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isTyping}
            className="send-button"
          >
            <Send />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatScreen;
