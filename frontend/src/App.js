import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const MAX_NUM_QUESTIONS = 3;
const backendUrl = "http://127.0.0.1:3000"; // Updated backend URL to match your backend server
const chatUrl = `${backendUrl}/process`;
const t2iPromptUrl = `${backendUrl}/t2i_prompt_generate`;
const igUrl = `${backendUrl}/image_generate`;
const aiAnswerUrl = `${backendUrl}/ai_answer`;

function App() {
  const [conversation, setConversation] = useState([]);
  const [followUpIndex, setFollowUpIndex] = useState(0);
  const [t2iPrompt, setT2iPrompt] = useState("");
  const [userInput, setUserInput] = useState("");
  const [userId, setUserId] = useState(null);
  const [image, setImage] = useState(null);

  useEffect(() => {
    async function fetchUserId() {
      try {
        const response = await axios.post(`${backendUrl}/start`);
        setUserId(response.data.user_id);
      } catch (error) {
        console.error("Error fetching user ID:", error);
      }
    }
    fetchUserId();
  }, []);

  const handleInput = async () => {
    if (!userInput.trim()) {
      return;
    }

    const updatedConversation = [...conversation, { sender: "user", message: userInput }];
    setConversation(updatedConversation);
    setUserInput("");

    if (followUpIndex < MAX_NUM_QUESTIONS) {
      try {
        const response = await axios.post(chatUrl, { user_id: userId, user_response: userInput });
        const followUpQuestion = response.data.follow_up_question;
        setConversation([...updatedConversation, { sender: "assistant", message: followUpQuestion }]);
        setFollowUpIndex(followUpIndex + 1);
      } catch (error) {
        console.error("Error communicating with server:", error);
      }
    } else {
      try {
        const aiResponse = await axios.post(aiAnswerUrl, { user_id: userId, user_response: userInput });
        const aiAnswer = aiResponse.data.ai_answer;
        setConversation([...updatedConversation, { sender: "ai", message: aiAnswer }]);

        const t2iResponse = await axios.post(t2iPromptUrl, { user_id: userId, ai_answer: aiAnswer });
        const generatedPrompt = t2iResponse.data.t2i_prompt;
        setT2iPrompt(generatedPrompt);
        generateImage(generatedPrompt);
      } catch (error) {
        console.error("Error generating AI answer or text-to-image prompt:", error);
      }
    }
  };

  const generateImage = async (prompt) => {
    try {
      const response = await axios.post(igUrl, { prompt });
      const base64Str = response.data.base64_str;
      setImage(`data:image/jpeg;base64,${base64Str}`);
    } catch (error) {
      console.error("Error creating image:", error);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to BgOrnaments</h1>
        <p>India's first Artificial Intelligence based Jewellery Design Software.</p>
      </header>
      <div className="conversation-container">
        {conversation.map((conv, index) => (
          <div
            key={index}
            className={
              conv.sender === "user"
                ? "user-message"
                : conv.sender === "assistant"
                ? "assistant-message"
                : "ai-message"
            }
          >
            <strong>
              {conv.sender === "user" ? "You" : conv.sender === "assistant" ? "BgO" : "AI"}:
            </strong>{" "}
            {conv.message}
          </div>
        ))}
        {followUpIndex <= MAX_NUM_QUESTIONS && (
          <div className="input-container">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="You: "
            />
            <button onClick={handleInput}>Send</button>
          </div>
        )}
        {followUpIndex > MAX_NUM_QUESTIONS && (
          <div>
            <p>
              <strong>BgO:</strong> Creating your jewellery designs ...
            </p>
            <p>{t2iPrompt}</p>
            {image && <img src={image} alt="Generated Design" />}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
