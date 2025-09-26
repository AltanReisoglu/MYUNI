import React, { useState } from "react";
import { Mail, GraduationCap } from "lucide-react";
import "./LoginScreen.css";
import api from "./api";
import axios from 'axios';
import {API_BASE_URL} from "./util.js";

const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = "E-posta adresi gereklidir";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Geçerli bir e-posta adresi giriniz";
    }

    if (!schoolName.trim()) {
      newErrors.schoolName = "Okul adı gereklidir";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response =await axios.post(`${API_BASE_URL}/assistant/preset`, {
        email:email,
        school:schoolName,
      });

      // API’den dönen cevabı kontrol et
      console.log("API response:", response.data);

      // Parent component’e haber ver
      if (onLogin) {
        onLogin(email, schoolName);
      }
    } catch (error) {
      console.error("API error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">
            <GraduationCap className="login-icon-svg" />
          </div>
          <h1 className="login-title">Öğrenci Asistanı</h1>
          <p className="login-subtitle">
            Akademik yolculuğunuzda size yardımcı olmak için buradayım
          </p>
        </div>

        <div className="login-form">
          {/* Email */}
          <div className="form-group">
            <label className="form-label">E-posta Adresi</label>
            <div className="input-wrapper">
              <Mail className="input-icon" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`form-input ${errors.email ? "error" : ""}`}
                placeholder="ornek@email.com"
              />
            </div>
            {errors.email && <p className="error-message">{errors.email}</p>}
          </div>

          {/* School Name */}
          <div className="form-group">
            <label className="form-label">Okul Adı</label>
            <div className="input-wrapper">
              <GraduationCap className="input-icon" />
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className={`form-input ${errors.schoolName ? "error" : ""}`}
                placeholder="Üniversite/Okul adınızı giriniz"
              />
            </div>
            {errors.schoolName && (
              <p className="error-message">{errors.schoolName}</p>
            )}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            className="login-button"
            disabled={loading}
          >
            <span>{loading ? "Gönderiliyor..." : "Devam Et"}</span>
          </button>
        </div>

        <div className="login-footer">
          Giriş yaparak hizmet şartlarını kabul etmiş olursunuz
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;





