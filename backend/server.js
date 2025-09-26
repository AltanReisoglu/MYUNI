const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/chat", (req, res) => {
  const { message, userInfo } = req.body;
  // Basit bot cevabı (buraya AI entegrasyonu eklenebilir)
  res.json({
    reply: `"${message}" hakkında size yardımcı olmaya çalışayım. Bu konuda daha detaylı bilgi verebilir misiniz?`
  });
});

app.listen(5000, () => {
  console.log("Backend server running on http://localhost:5000");
});
