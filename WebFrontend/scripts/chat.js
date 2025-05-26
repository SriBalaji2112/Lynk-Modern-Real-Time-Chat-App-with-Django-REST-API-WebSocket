async function loadChatForNewUser(user) {
  try {
    // Fetch or create a chat for the selected user
    const token = localStorage.getItem('access_token');
  if (!token) {
    alert('No access token found. Please log in again.');
    return [];
  }
    const response = await fetch(`${server_url}/api/chats/start/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: user.username }),
    });
    if (response.ok) {
      const chat = await response.json();
      //console.log('Chat loaded successfully:', chat);
      //console.log(user);

      // Update the chat header with user info
      const chatUserNameElement = document.getElementById("chatUserName");
      if (chatUserNameElement) {
        chatUserNameElement.innerText = user.full_name;
      } else {
        console.error("Element with ID 'chatUserName' not found in the DOM.");
      }

      const chatHeaderStatus = document.querySelector(".user-header small");
      if (chatHeaderStatus) {
        chatHeaderStatus.textContent = user.is_online ? 'Online' : `Last seen ${formatLastSeen(user.last_seen)}`;
      }
      // Load the chat messages
      loadChat(chat.chat_id);
    } else {
      const errorData = await response.json();
      console.error('Error loading chat:', errorData.error || 'Unknown error');
    }

    
  } catch (error) {
    console.error('Error loading chat for user:', error);
  }
}

// Function to format last seen time
function formatLastSeen(timestamp) {
  if (!timestamp) {
    return 'a long time ago';
  }
  
  const now = new Date();
  const lastSeen = new Date(timestamp);
  const diff = now - lastSeen;
  
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }
  
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

// Function to fetch and render the chat list
async function updateChatList() {
  try {
    const chats = await makeAuthenticatedRequest(`${server_url}/api/chats/`);
    //console.log('Chat list fetched successfully:', chats);
    renderChatList(chats);
  } catch (error) {
    console.error('Error updating chat list:', error);
    // Handle error (e.g., redirect to login if unauthorized)
    if (error.message.includes('token')) {
      window.location.href = 'login_signup.html';
    }
  }
}

// Function to render the chat list
function renderChatList(chats) {
  const userList = document.getElementById('userList');
  userList.innerHTML = '';

  chats.forEach(chat => {
    if (localStorage.getItem('username') === chat.username) {
      return;
    } // Skip the current user
    const lastMessageTime = chat.timestamp ? 
      new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    
    const chatElement = document.createElement('div');
    chatElement.className = 'chat-user p-2 border-bottom d-flex justify-content-between align-items-center';
    chatElement.setAttribute('data-user-id', chat.id); // Add user ID for reference
    chatElement.onclick = () => loadChat(chat.id);
    
    chatElement.innerHTML = `
      <div class="d-flex align-items-center">
        <img src="${server_url}${chat.profile_picture}" class="rounded-circle me-2" width="50px" height="50px" id="chatListProfileId${chat.id}"/>
        <div>
          <div>
            <strong id="chatListNameId${chat.id}" class="truncate-text">${chat.name}</strong>
            ${chat.is_online ? `<span class="badge bg-success ms-2" id="chatListOnlineStatusId${chat.id}">Online</span>` : `<span class="badge bg-success ms-2" id="chatListOnlineStatusId${chat.id}"></span>`}
          </div>
          <div class="text-muted truncate-text chat-last-message" style="font-size: 0.9em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 10px;" id="chatListLastMessageId${chat.id}">
            ${chat.last_message || 'No messages yet'}
          </div>
        </div>
      </div>
      <div class="text-end">
        <small class="text-muted d-block" id="chatListLastMessageTimeId${chat.id}">${lastMessageTime}</small>
        ${chat.is_online ? `<small class="text-muted0" id="chatListLastSeenId${chat.id}"></small>` : `<small class="text-muted0" id="chatListLastSeenId${chat.id}">${formatLastSeen(chat.last_seen)}</small>`}
      </div>
    `;
    
    userList.appendChild(chatElement);

    if (!chat.is_online && chat.last_seen) {
      lastSeenTimers[chat.id] = chat.last_seen;
    }
  });
}

async function loadChat(chatId, page = 1) {
  try {
    if ((isLoadingMessages || !hasMoreMessages) && currentChatId === chatId) {
      return;
    } // Prevent duplicate requests
    isLoadingMessages = true;

    const messages = await makeAuthenticatedRequest(
      `${server_url}/api/chats/${chatId}/messages/?page=${page}`
    );
    //console.log('Chat messages loaded successfully:', messages);

    if (page === 1) {
      // Clear the chat body for the first page
      const chatBody = document.getElementById("chatBody");
      chatBody.innerHTML = '';
    }
    renderChatMessages(chatId, messages.results, page);
    
    hasMoreMessages = messages.next !== null; // Check if there are more messages
    currentPage = page; // Update the current page
    currentChatId = chatId; // Update the current chat ID

    // Update the chat header with user info
    const chats = await makeAuthenticatedRequest(`${server_url}/api/chats/`);
    const currentChat = chats.find(c => c.id === chatId);
    currentChatId = chatId; // Update the current chat ID
    if (currentChat) {
      const chatUserNameElement = document.getElementById("chatUserName");
      if (chatUserNameElement) {
        chatUserNameElement.innerText = currentChat.name;
      } else {
        console.error("Element with ID 'chatUserName' not found in the DOM.");
      }

      const chatHeaderProfile = document.getElementById("chatHeaderProfile");
      if (chatHeaderProfile) {
        chatHeaderProfile.src = `${server_url}`+currentChat.profile_picture || 'https://via.placeholder.com/40';  // Update profile picture
      } else {
        console.error("Element with ID 'chatHeaderProfile' not found in the DOM.");
      }

      const chatHeaderStatus = document.querySelector(".user-header small");
      if (chatHeaderStatus) {
        chatHeaderStatus.textContent = currentChat.is_online
          ? 'Online'
          : `Last seen ${formatLastSeen(currentChat.last_seen)}`;
      }  
    }
    
  } catch (error) {
    console.error('Error loading chat:', error);
  } finally {
    isLoadingMessages = false; // Reset the loading state
  }
}

function renderChatMessages(chatId, messages, page) {
    currentUserId = chatId; // Set the current user ID to the selected chat ID
  const chatBody = document.getElementById("chatBody");
  // chatBody.innerHTML = '';
  if (page === 1) {
    chatBody.innerHTML = '';
  }

  // Store the current scroll height before adding new messages
  const previousScrollHeight = chatBody.scrollHeight;

  const reversedMessages = [...messages].reverse();

  reversedMessages.forEach(msg => {
    const isMe = Number(msg.sender) === Number(localStorage.getItem('user_id')); // Assuming you store user_id
    const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let content = '';
    let fileName = msg.content || (msg.media && msg.media.file_name) || '';
    //console.log("File name:", fileName);

    switch (msg.message_type) {
      case 'text':
        content = `<div>${msg.content.replace(/\n/g, '<br>')}</div>`;
        break;

      case 'image':
        content = `
          <div>
            <img src="${server_url}${msg.media.file_url}" alt="${fileName || 'Image'}" class="img-fluid rounded" style="max-width: 200px; cursor: pointer;" onclick="openMedia('${server_url}${msg.media.file_url}', 'image')">
            <div class="attachment-filename mt-1" title="${fileName}">${fileName}</div>
          </div>`;
        break;

      case 'audio':
        content = `
          <div>
            <audio controls src="${server_url}${msg.media.file_url}" class="mt-2"></audio>
            <div class="attachment-filename mt-1" title="${fileName}">${fileName}</div>
          </div>`;
        break;

      case 'video':
        content = `
          <div>
            <div class="video-thumbnail" style="cursor: pointer;" onclick="openMedia('${server_url}${msg.media.file_url}', 'video')">
              <img src="${server_url}${msg.media.thumbnail_url || 'https://via.placeholder.com/200x120?text=Video'}" alt="${fileName}" class="img-fluid rounded" style="max-width: 200px;">
              <div class="play-button" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 24px; color: white; background: rgba(0, 0, 0, 0.5); border-radius: 50%; padding: 10px;">
                <i class="fas fa-play"></i>
              </div>
            </div>
            <div class="attachment-filename mt-1" title="${fileName}">${fileName}</div>
          </div>`;
        break;

      case 'file':
        content = `
          <div>
            <a href="${server_url}${msg.media.file_url}" target="_blank" class="text-decoration-none">
              <i class="fas fa-file-alt me-1"></i>${fileName || 'Download File'}
            </a>
            <div class="attachment-filename mt-1" title="${fileName}">${fileName}</div>
          </div>`;
        break;

      default:
        content = `<div>Unsupported message type</div>`;
    }

    // addMessage({
    //   text: content,
    //   time: time,
    //   isMe: isMe,
    //   readReceipt: msg.is_read ? true : (msg.delivered ? true : false),
    //   delivered: msg.delivered ? true : false,
    // });
    // chatBody.scrollTop = chatBody.scrollHeight; // Scroll to the bottom
    let readReceipt = !!msg.is_read
    let delivered = !!msg.delivered_to.length
    let edited = msg.is_edited ? 'edited' : ''

    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message-bubble", isMe ? "sender-message" : "receiver-message");
    messageDiv.setAttribute("data-message-id", msg.id); // Attach the message ID to the bubble
    messageDiv.setAttribute("data-is-read", msg.is_read ? "true" : "false"); // Track read status
    
    let receiptHTML = "";
    let menuHTML = "";
    if (isMe) {
      if (readReceipt) {
        receiptHTML = '<i class="fas fa-check double-tick green-tick"></i><i class="fas fa-check double-tick green-tick"></i>';
      } else if (delivered) {
        //console.log("delivered flag:", delivered);
        // receiptHTML = '<i class="fas fa-check double-tick"></i><i class="fas fa-check double-tick"></i>';
        receiptHTML = '<i class="fas fa-check"></i><i class="fas fa-check"></i>';

      } else {
        receiptHTML = '<i class="fas fa-check single-tick"></i>';
      }
      menuHTML = `
      <div class="message-options">
        <button class="options-btn" onclick="toggleOptionsMenu(event, ${msg.id})">
          <i class="fas fa-ellipsis-v"></i>
        </button>
        <div id="optionsMenu-${msg.id}" class="options-menu hidden">
          <button class="menu-item" onclick="replyMessage(${msg.id})">
            <i class="fas fa-reply me-2"></i>Reply
          </button>
          ${msg.message_type === 'text' ? `
          <button class="menu-item" onclick="editMessage(${msg.id})">
            <i class="fas fa-edit me-2"></i>Edit
          </button>
          ` : ''}
          <button class="menu-item" onclick="toggleDeleteMenu(${msg.id}, true)">
            <i class="fas fa-trash-alt me-2"></i>Delete
          </button>
        </div>
      </div>
    `;
    }
    else{
      menuHTML = `
      <div class="message-options">
        <button class="options-btn" onclick="toggleOptionsMenu(event, ${msg.id})">
          <i class="fas fa-ellipsis-v"></i>
        </button>
        <div id="optionsMenu-${msg.id}" class="options-menu hidden">
          <button class="menu-item" onclick="replyMessage(${msg.id})">
            <i class="fas fa-reply me-2"></i>Reply
          </button>
          <button class="menu-item" onclick="toggleDeleteMenu(${msg.id}, false)">
            <i class="fas fa-trash-alt me-2"></i>Delete
          </button>
        </div>
      </div>
    `;
    }

    let replyHTML = '';
    if (msg.reply_to && msg.reply_to.content) {
      replyHTML = `
        <div class="reply-bubble mb-1 p-2" style="background:#f1f1f1;border-left:3px solid #53a6ff;border-radius:6px;" onclick="scrollToOriginalMessage('${msg.reply_to.id}')">
          <small class="text-muted">Reply</small><br>
          <span style="color:#333;">${msg.reply_to.content}</span>
        </div>
      `;
    }

    messageDiv.innerHTML = `
    ${menuHTML}
    ${replyHTML}
        <div class="message">${content}</div>
        <div class="read-receipt">
        <div class="tick">${receiptHTML}</div>
        <div class="message-time">${time}</div>
        <div class="edited-message">${edited}</div>
        </div>
    `;

    if (page === 1) {
      chatBody.appendChild(messageDiv); // Append messages for the first page
    } else {
      chatBody.prepend(messageDiv); // Prepend messages for subsequent pages
    }
  });

  if (page === 1) {
    chatBody.scrollTop = chatBody.scrollHeight; // Scroll to the bottom for the first page
  }

  else {
    // Maintain the scroll position after prepending new messages
    chatBody.scrollTop = chatBody.scrollHeight - previousScrollHeight;
  }

  observeUnreadMessages(); // Observe unread messages

}

document.getElementById('chatBody').addEventListener('dblclick', function(event) {
  // Only trigger if NOT clicking on a message bubble or its children
  if (!event.target.closest('.message-bubble')) {
    const bubbles = document.querySelectorAll('#chatBody .message-bubble');
    const clickY = event.clientY;

    let selectedBubble = null;
    let minDistance = Infinity;

    bubbles.forEach(bubble => {
      const rect = bubble.getBoundingClientRect();
      // Check if clickY is within the vertical bounds of the bubble
      if (clickY >= rect.top && clickY <= rect.bottom) {
        // Prefer the closest bubble if overlapping
        const distance = Math.abs((rect.top + rect.bottom) / 2 - clickY);
        if (distance < minDistance) {
          minDistance = distance;
          selectedBubble = bubble;
        }
      }
    });

    // If found, trigger reply
    if (selectedBubble) {
      const messageId = selectedBubble.getAttribute('data-message-id');
      if (messageId) {
        replyMessage(messageId);
      }
    }
  }
});