function addMessage({ id, text, time, isMe, readReceipt, delivered, reply_to }) {
    const chatBody = document.getElementById("chatBody");
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message-bubble", isMe ? "sender-message" : "receiver-message");
    messageDiv.setAttribute("data-message-id", id); // Attach the message ID to the bubble
    messageDiv.setAttribute("data-is-read", readReceipt ? "true" : "false"); // Track read status
    let receiptHTML = "";
    if (isMe) {
      receiptHTML = '<i class="fas fa-clock"></i>';
      menuHTML = `
      <div class="message-options">
      </div>
      `;
    }else{
      menuHTML = `
      <div class="message-options">
        <button class="options-btn" onclick="toggleOptionsMenu(event, ${id})">
          <i class="fas fa-ellipsis-v"></i>
        </button>
        <div id="optionsMenu-${id}" class="options-menu hidden">
          <button class="menu-item" onclick="replyMessage(${id})">
            <i class="fas fa-reply me-2"></i>Reply
          </button>
          <button class="menu-item" onclick="toggleDeleteMenu(${id}, false)">
            <i class="fas fa-trash-alt me-2"></i>Delete
          </button>
        </div>
      </div>
      `;
    }

    let replyHTML = '';
    //console.log("reply_to", reply_to);
    if (reply_to && reply_to.text) {
      replyHTML = `
        <div class="reply-bubble mb-1 p-2" style="background:#f1f1f1;border-left:3px solid #53a6ff;border-radius:6px;" onclick="scrollToOriginalMessage('${reply_to.id}')">
          <small class="text-muted">Reply</small><br>
          <span style="color:#333;">${reply_to.text}</span>
        </div>
      `;
    }

    messageDiv.innerHTML = `
    ${menuHTML}
    ${replyHTML}
        <div class="message">${text.replace(/\n/g, '<br>')}</div>
        <div class="read-receipt">
        <div class="tick">${receiptHTML}</div>
        <div class="message-time">${time}</div>
        </div>
    `;

    // chatBody.prepend(messageDiv);
    chatBody.appendChild(messageDiv);
    chatBody.scrollTop = chatBody.scrollHeight;

    if (!isMe) {
      observeUnreadMessages(); // Observe unread messages
    }
}

function scrollToOriginalMessage(messageId) {
  const bubble = document.querySelector(`[data-message-id="${messageId}"]`);
  if (bubble) {
    bubble.scrollIntoView({ behavior: "smooth", block: "center" });
    bubble.classList.add("highlight-reply");
    setTimeout(() => {
      bubble.classList.remove("highlight-reply");
    }, 700);
  }
}

function acknowledgementMessage(data){
    const tempId = data.temp_id; // Temporary ID sent by the client
    const serverId = data.message_id; // Permanent ID assigned by the server
    //console.log("acknowledgementMessage", tempId, serverId);
    
    // Update the message bubble with the server ID and single tick
    const messageDiv = document.querySelector(`[data-message-id="${tempId}"]`);
    if (messageDiv) {
      messageDiv.setAttribute("data-message-id", serverId); // Update to the server ID
      const readReceiptDiv = messageDiv.querySelector(".tick");
      if (readReceiptDiv) {
        readReceiptDiv.innerHTML = '<i class="fas fa-check single-tick"></i>'; // Update to single tick
      }
      const menuDiv = messageDiv.querySelector(".message-options");
      if (menuDiv) {
        menuDiv.innerHTML = `
          <div class="message-options">
        <button class="options-btn" onclick="toggleOptionsMenu(event, ${serverId})">
          <i class="fas fa-ellipsis-v"></i>
        </button>
        <div id="optionsMenu-${serverId}" class="options-menu hidden">
          <button class="menu-item" onclick="replyMessage(${serverId})">
            <i class="fas fa-reply me-2"></i>Reply
          </button>
          ${data.message_type === 'text' ? `
          <button class="menu-item" onclick="editMessage(${serverId})">
            <i class="fas fa-edit me-2"></i>Edit
          </button>
          ` : ''}
          <button class="menu-item" onclick="toggleDeleteMenu(${serverId}, true)">
            <i class="fas fa-trash-alt me-2"></i>Delete
          </button>
        </div>
      </div>
        `;
      }
    }
  }

  function makeAsReadMessage(data){
    const serverId = data.message_id; // Permanent ID assigned by the server
    //console.log("MakeAsRead", serverId);
    
    // Update the message bubble with the server ID and single tick
    const messageDiv = document.querySelector(`[data-message-id="${serverId}"]`);
    if (messageDiv) {
      const readReceiptDiv = messageDiv.querySelector(".tick");
      if (readReceiptDiv) {
        readReceiptDiv.innerHTML = '<i class="fas fa-check double-tick green-tick"></i><i class="fas fa-check double-tick green-tick"></i>'; // Update to single tick
      }
    }
}

async function sendMessage() {
    // alert("Sending message...");
    const input = document.getElementById("messageInput");
    const text = input.value.trim();
    if (text === '' || currentUserId === null) {
      return;
    }

    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const tempMessageId = `${Date.now()}`; // Temporary ID for the message

    const message = {
      id: tempMessageId, // Temporary ID
      sender: true,
      text: text,
      time: time,
      isMe: true,
      readReceipt: false,
      delivered: false,
      reply_to: replyToMessageId ? { id: replyToMessageId, text: replyToMessageText } : null
    };

    // chatHistories[currentUserId].push(message);
    input.value = '';
    cancelReply();
    //console.log("Message sent:", message);
    // Send the message to the server via WebSocket
    const lastMessage = text.replace(/\n/g, ' ').trim();
    //console.log("Last Message", lastMessage);
    document.getElementById(`chatListLastMessageId${currentChatId}`).innerText = lastMessage;
    document.getElementById(`chatListLastMessageTimeId${currentChatId}`).innerText = time;

    addMessage(message);
    sendMessageToServer(message);
    // renderChat(chatHistories[currentUserId]);
}

function startLastSeenUpdater() {
  // Clear any existing timers to avoid duplicates
  if (lastSeenTimers.interval) {
    clearInterval(lastSeenTimers.interval);
    lastSeenTimers.interval = null;
  }

  // Update "Last Seen" every minute
  lastSeenTimers.interval = setInterval(() => {
    const userList = document.getElementById('userList');
    const chatElements = userList.querySelectorAll('.chat-user');

    chatElements.forEach(chatElement => {
      const userId = chatElement.getAttribute('data-user-id');
      const lastSeenElement = document.getElementById(`chatListLastSeenId${userId}`);
      const onlineStatusElement = document.getElementById(`chatListOnlineStatusId${userId}`);
      const lastSeenTimestamp = lastSeenTimers[userId];

      if (lastSeenElement && lastSeenTimestamp && (!onlineStatusElement || onlineStatusElement.innerText !== "Online")) {
        lastSeenElement.innerText = formatLastSeen(lastSeenTimestamp);
      }

      // Update the chat header dynamically
      if (currentChatId && lastSeenTimers[currentChatId]) {
        const chatHeaderOnlineStatus = document.querySelector(".user-header small");
        if (chatHeaderOnlineStatus && (!onlineStatusElement || onlineStatusElement.innerText !== "Online")) {
          chatHeaderOnlineStatus.textContent = `Last seen ${formatLastSeen(lastSeenTimers[currentChatId])}`;
        }
      }
    });

  }, 60000); // Update every 60 seconds
}

function observeUnreadMessages() {
  const chatBody = document.getElementById("chatBody");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const messageDiv = entry.target;
        const messageId = messageDiv.getAttribute("data-message-id");
        const isRead = messageDiv.getAttribute("data-is-read") === "true";
        const isMe = messageDiv.classList.contains("sender-message");
        if (!isRead && !isMe) {
          // Send the make_as_read event
          sendMakeAsReadEvent(messageId);

          // Update the message locally to avoid duplicate events
          messageDiv.setAttribute("data-is-read", "true");
        }
      }
    });
  }, {
    root: chatBody,
    threshold: 1.0, // Fully visible
  });

  // Observe all unread messages
  const unreadMessages = chatBody.querySelectorAll(".message-bubble[data-is-read='false']");
  unreadMessages.forEach((message) => observer.observe(message));
}

function replyMessage(messageId) {
  // Find the message bubble
  const bubble = document.querySelector(`[data-message-id="${messageId}"]`);
  if (!bubble) {
    return;
  }

  // Find the .message element inside the bubble
  const messageDiv = bubble.querySelector('.message');
  let messageText = '';

  if (messageDiv) {
    // File
    const fileLink = messageDiv.querySelector('a');
    if (fileLink) {
      messageText = fileLink.textContent.trim();
    }
    // Image
    else if (messageDiv.querySelector('img') && !messageDiv.querySelector('.video-thumbnail')) {
      // Try to get alt as file name, fallback to [Image]
      const img = messageDiv.querySelector('img');
      messageText = img.alt && img.alt !== 'Image' ? img.alt : '[Image]';
    }
    // Video
    else if (messageDiv.querySelector('.video-thumbnail')) {
      // Try to get file name from title or alt attribute
      const thumb = messageDiv.querySelector('.video-thumbnail img');
      messageText = (thumb && thumb.title) ? thumb.title : (thumb && thumb.alt && thumb.alt !== 'Video Thumbnail' ? thumb.alt : '[Video]');
      // If you store the file name in a hidden div or attribute, you can extract it here
      // Or fallback to [Video]
    }
    // Audio
    else if (messageDiv.querySelector('audio')) {
      // Try to get file name from a hidden div or attribute, or fallback to [Audio]
      const audioFileNameDiv = messageDiv.querySelector('.attachment-filename');
      if (audioFileNameDiv) {
        messageText = audioFileNameDiv.textContent.trim();
      } else {
        messageText = '[Audio]';
      }
    }
    // Text
    else {
      messageText = messageDiv.innerText.trim();
    }
  } else {
    messageText = bubble.innerText.trim();
  }
  //console.log(messageDiv);

  replyToMessageId = messageId;
  replyToMessageText = messageText;

  // Show the reply preview bubble
  document.getElementById('replyPreviewText').innerText = messageText;
  document.getElementById('replyPreview').classList.remove('d-none');
  document.getElementById('messageInput').focus();
}

function cancelReply() {
  replyToMessageId = null;
  replyToMessageText = '';
  document.getElementById('replyPreview').classList.add('d-none');
}

function editMessage(messageId) {
  const messageDiv = document.querySelector(`[data-message-id="${messageId}"] .message div`);
  if (!messageDiv) {
    return;
  }

  const currentContent = messageDiv.innerHTML;

  // Replace the message content with an input field
  messageDiv.innerHTML = `
    <input type="text" class="form-control edit-input" value="${currentContent}"/>
    <div class="edit-actions mt-2">
      <button class="btn btn-sm btn-primary me-2" onclick="saveEditedMessage(${messageId})">Save</button>
      <button class="btn btn-sm btn-secondary" onclick="cancelEditMessage(${messageId}, '${currentContent}')">Cancel</button>
    </div>
  `;
}

function saveEditedMessage(messageId) {
  const messageDiv = document.querySelector(`[data-message-id="${messageId}"] .message div`);
  const editInput = messageDiv.querySelector(".edit-input");
  if (!editInput) {
    return;
  }

  const updatedContent = editInput.value.trim();
  if (updatedContent === "") {
    alert("Message cannot be empty.");
    return;
  }

  // Update the UI with the new content
  messageDiv.innerHTML = updatedContent;

  // Send the updated message to the server
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: "message_edit",
      message_id: messageId,
      chat_id: currentChatId,
      content: updatedContent,
    }));

    const messageDiv = document.querySelector(`[data-message-id="${messageId}"] .read-receipt`);
    if (messageDiv) {
      const edited = document.createElement('small');
      edited.className = 'edited-message';
      edited.innerText = 'Edited';
      messageDiv.appendChild(edited);
      const readReceiptDiv = messageDiv.querySelector(".tick");
      if (readReceiptDiv) {
        readReceiptDiv.innerHTML = '<i class="fas fa-check"></i><i class="fas fa-check"></i>'; // Update to single tick
      }
    }
    //console.log(`Sent edited message for message ID: ${messageId}`);
  }
}

function cancelEditMessage(messageId, originalContent) {
  const messageDiv = document.querySelector(`[data-message-id="${messageId}"] .message div`);
  if (!messageDiv) {
    return;
  }

  // Restore the original content
  messageDiv.innerHTML = originalContent;
}

function handleMessageEdit(data) {
  const messageId = data.message_id;
  const updatedContent = data.content;

  //console.log(`Handling message_edit event for message ID: ${messageId}`);

  // Update the message content in the UI
  const messageDiv = document.querySelector(`[data-message-id="${messageId}"] .message div`);
  if (messageDiv) {
    messageDiv.innerHTML = updatedContent;
  }

  messageDivforEdit = document.querySelector(`[data-message-id="${messageId}"] .read-receipt`);
    if (messageDivforEdit) {
      const edited = document.createElement('small');
      edited.className = 'edited-message';
      edited.innerText = 'Edited';
      messageDivforEdit.appendChild(edited);
      const readReceiptDiv = messageDivforEdit.querySelector(".tick");
      if (readReceiptDiv) {
        readReceiptDiv.innerHTML = '<i class="fas fa-check"></i><i class="fas fa-check"></i>'; // Update to single tick
      }
    }
}

function deleteMessage(messageId, deleteType) {
  //console.log(`Deleting message ${messageId} for ${deleteType}`);

  // Send the delete_message event to the server
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: "delete_message",
      message_id: messageId,
      chat_id: currentChatId,
      for_everyone: deleteType, // "for_everyone" or "me_only"
    }));
    //console.log(`Sent delete_message event for message ID: ${messageId}, type: ${deleteType}`);
  }
  
  const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
  if (messageDiv) {
    messageDiv.remove();
  }
  // Close the modal
  closeDeleteMenu();
}