import React from "react";
import { assets } from "../../assets/assets";

const MessageItem = ({ message, isStreaming = false }) => {
  const { role, content } = message;

  return (
    <div className={`message-item message-${role}`}>
      <div className="message-avatar">
        <img
          src={role === "user" ? assets.user_icon : assets.gemini_icon}
          alt={role === "user" ? "用户" : "AI"}
        />
      </div>
      <div className="message-content">
        {role === "assistant" && isStreaming ? (
          <div className="message-streaming">
            <p dangerouslySetInnerHTML={{ __html: content }}></p>
            <span className="streaming-cursor">▋</span>
          </div>
        ) : (
          <p dangerouslySetInnerHTML={{ __html: content }}></p>
        )}
      </div>
    </div>
  );
};

export default MessageItem;
