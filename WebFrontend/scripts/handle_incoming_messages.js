function handleIncomingMessage(data) {
    switch(data.type) {
        case 'private_message':
            handlePrivateMessage(data);
            sendReadReceipt(data.message.id);
            break;
        case 'group_message':
            handleGroupMessage(data);
            break;
        case 'message_edit':
            handleMessageEdit(data);
            break;
        case "delete_message":
            handleDeleteMessage(data);
            break;
        case 'typing':
            handleIncomingTyping(data);
            break;
        case 'read_receipt':
            handleReadReceipt(data);
            break;
        case 'friend_status_update':
            handleFriendStatusUpdate(data);
            break;
        case 'message_acknowledgment':
            acknowledgementMessage(data);
            break;
        case 'make_as_read':
            makeAsReadMessage(data);
            break;
        default:
            console.warn('Unknown message type:', data.type);
    }
}

function handlePrivateMessage(data) {
    //console.log(data.chat_id, currentChatId);
    if (Number(data.chat_id) === Number(currentChatId)) {
        const message = data.message;
        
        //console.log("Chat messages:", message);
        const messageType = message.message_type; // Get the message type
        const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let content = '';

        // Handle different message types
        switch (messageType) {
        case 'text':
            content = `<div>${message.content}</div>`;
            break;

        case 'image':
            //console.log("Image URL:", message.media.file_url);
            content = `<img src="${server_url}${message.media.file_url}" alt="Image" class="img-fluid rounded" style="max-width: 200px; cursor: pointer;" onclick="openMedia('${server_url}${message.media.file_url}', 'image')">`;
            break;

        case 'audio':
            content = `<audio controls src="${server_url}${message.media.file_url}" class="mt-2"></audio>`;
            break;

        case 'video':
            content = `
            <div class="video-thumbnail" style="cursor: pointer;" onclick="openMedia('${server_url}${message.media.file_url}', 'video')">
                <img src="${server_url}${message.media.thumbnail_url || 'https://via.placeholder.com/200x120?text=Video'}" alt="Video Thumbnail" class="img-fluid rounded" style="max-width: 200px;">
                <div class="play-button" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 24px; color: white; background: rgba(0, 0, 0, 0.5); border-radius: 50%; padding: 10px;">
                <i class="fas fa-play"></i>
                </div>
            </div>`;
            break;

        case 'file':
            content = `<a href="${server_url}${message.media.file_url}" target="_blank" class="text-decoration-none">
                        <i class="fas fa-file-alt me-1"></i>${server_url}${message.content || 'Download File'}
                    </a>`;
            break;

        default:
            content = `<div>Unsupported message type</div>`;
        }

        // Add the message to the chat UI
        addMessage({
        id: data.message.id,
        text: content,
        time: time,
        isMe: false,
        readReceipt: message.read_receipt,
        delivered: true,
        reply_to: message.reply_to,
        });
        
    }
}

function handleFriendStatusUpdate(data){
  //console.log("Friend status update:", data);
  // Update the chat list
  const onlineStatusElement = document.getElementById(`chatListOnlineStatusId${data.user_id}`);
  const lastSeenElement = document.getElementById(`chatListLastSeenId${data.user_id}`);

  if (onlineStatusElement) {
    onlineStatusElement.innerText = data.is_online ? "Online" : "";
  }

  if (lastSeenElement) {
    lastSeenElement.innerText = data.is_online ? "" : formatLastSeen(data.last_seen);
  }

  // Update the chat header if the current chat matches the user
  if (currentChatId === data.user_id) {
    const chatHeaderOnlineStatus = document.querySelector(".user-header small");
    if (chatHeaderOnlineStatus) {
      chatHeaderOnlineStatus.textContent = data.is_online
        ? "Online"
        : `Last seen ${formatLastSeen(data.last_seen)}`;
    }
  }
  startLastSeenUpdater();
}

// Handle incoming typing indicators
function handleIncomingTyping(data) {
  if (data.chat_id === currentChatId) {
    const typingIndicator = document.getElementById('typingIndicator');
    //console.log("Received typing indicator:", data);
    if (data.is_typing) {
      // Show typing indicator for other users
      typingIndicator.style.display = 'flex';
      typingIndicator.querySelector('.typing-text').textContent = 
        `is typing...`;
    } else {
      // Hide typing indicator
      typingIndicator.style.display = 'none';
    }
  }
}

function handleReadReceipt(data) {
  //console.log("Received read receipt:", data, currentChatId);
    const chatBody = document.getElementById("chatBody");
    const messageBubbles = chatBody.getElementsByClassName("message-bubble");

    const messageDiv = document.querySelector(`[data-message-id="${data.message_id}"]`);
    if (messageDiv) {
    messageDiv.setAttribute("data-message-id", data.message_id); // Update to the server ID
    const readReceiptDiv = messageDiv.querySelector(".tick");
        if (readReceiptDiv) {
            readReceiptDiv.innerHTML = '<i class="fas fa-check"></i><i class="fas fa-check"></i>'; // Update to single tick
        }
    }
}

function handleDeleteMessage(data) {
  const messageId = data.message_id;
  const deleteType = data.delete_type;

  //console.log(`Handling delete_message event for message ID: ${messageId}, type: ${deleteType}`);

  // Remove the message from the UI
  if(deleteType){
  const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
  if (messageDiv) {
    messageDiv.remove();
  }}
}