function sendReadReceipt(messageId) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
        type: 'read_receipt',
        message_id: messageId,
        chat_id: currentChatId,
        }));
    }
}

function sendMessageToServer(message) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
        type: 'private_message',
        chat_id: currentChatId,
        content: message.text,
        timestamp: message.time,
        read_receipt: false,
        delivered: false,
        tempId: message.id, // Send the temporary ID
        reply_to: message.reply_to ? message.reply_to.id : null
    }));
  }
}

addEventListener('input', () => {
    const hasText = messageInput.value.length > 0;
    
    // Only send if typing state changes
    if (hasText !== isCurrentlyTyping) {
      isCurrentlyTyping = hasText;
      sendTypingIndicator(hasText);
    }
    
    // Reset the timer on each keystroke
    clearTimeout(typingTimeout);
    if (hasText) {
      typingTimeout = setTimeout(() => {
        isCurrentlyTyping = false;
        sendTypingIndicator(false);
      }, 1500); // 1.5 seconds after last keystroke
    }
});

// Send typing indicator
function sendTypingIndicator(isTyping) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'typing',
      chat_id: currentChatId,
      is_typing: isTyping
    }));
  }
}

function sendMakeAsReadEvent(messageId) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: "make_as_read",
      message_id: messageId,
      chat_id: currentChatId,
    }));
    //console.log(`Sent make_as_read event for message ID: ${messageId}`);
  }
}