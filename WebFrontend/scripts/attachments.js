function handleAttachment(event) {
  const file = event.target.files[0];
  if (!file || currentUserId === null) {
    return;
  }

  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Create a temporary message bubble with a progress bar
  const chatBody = document.getElementById("chatBody");
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message-bubble", "sender-message");
  const progressBarId = `progressBar-${Date.now()}`;
  messageDiv.innerHTML = `
    <div>
      <strong>Uploading: ${file.name}</strong>
      <div class="progress mt-2">
        <div id="${progressBarId}" class="progress-bar" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
      </div>
    </div>
    <div class="read-receipt">
      <i class="fas fa-clock"></i> ${time}
    </div>
  `;
  chatBody.appendChild(messageDiv);
  chatBody.scrollTop = chatBody.scrollHeight;

  // Upload the file
  const token = localStorage.getItem('access_token');
  if (!token) {
    alert('No access token found. Please log in again.');
    return;
  }

  const formData = new FormData();
  formData.append('chat_id', currentChatId);
  //console.log(file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file');
  formData.append('media_type', file.type.startsWith('audio/') ? 'audio' : file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file');
  formData.append('file', file);

  const xhr = new XMLHttpRequest();
  xhr.open('POST', `${server_url}/api/chat/media-upload/`, true);
  xhr.setRequestHeader('Authorization', `Bearer ${token}`);

  // Update the progress bar during the upload
  xhr.upload.onprogress = function (event) {
    if (event.lengthComputable) {
      const percentComplete = Math.round((event.loaded / event.total) * 100);
      const progressBar = document.getElementById(progressBarId);
      if (progressBar) {
        progressBar.style.width = `${percentComplete}%`;
        progressBar.setAttribute('aria-valuenow', percentComplete);
      }
    }
  };

  // Handle upload completion
  xhr.onload = function () {
    if (xhr.status === 201) {
      const response = JSON.parse(xhr.responseText);
      messageDiv.setAttribute("data-message-id", response.id);
      //console.log('File uploaded successfully:', response);

      socket.send(JSON.stringify({
          type: 'media_message',
          chat_id: currentChatId,
          content: file.name,
          media: {
              id: response.id,
              file_name: file.name,
              file_url: response.media_url,
              thumbnail_url: response.thumbnail_url,
              media_type: response.media_type,
          },
          message_id : response.id,
          message_type: response.media_type,
          timestamp: response.time,
          read_receipt: false,
          delivered: false
      }));
      // Replace the progress bar with the uploaded media
      let content = '';
      if (response.media_type === 'image') {
        content = `<img src="${server_url}${response.media_url}" alt="${file.name}" class="img-fluid rounded" style="max-width: 200px; cursor: pointer;" onclick="openMedia('${server_url}${response.media_url}', 'image')">`;
      } else if (response.media_type === 'video') {
        content = `
        <div class="video-thumbnail" style="cursor: pointer;" onclick="openMedia('${server_url}${response.media_url}', 'video')">
          <img src="${server_url}${response.thumbnail_url}" alt="${file.name}" class="img-fluid rounded" style="max-width: 200px;">
          <div class="play-button" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 24px; color: white; background: rgba(0, 0, 0, 0.5); border-radius: 50%; padding: 10px;">
            <i class="fas fa-play"></i>
          </div>
        </div>`;
      } else if (response.media_type === 'audio') {
        content = `<audio controls src="${server_url}${response.media_url}" class="mt-2" alt="${file.name}"></audio>`;
      } else {
        content = `<a href="${server_url}${response.media_url}" target="_blank" class="text-decoration-none" alt="${file.name}">
                     <i class="fas fa-file-alt me-1"></i>${file.name}
                   </a>`;
      }

      menuHTML = `
      <div class="message-options">
        <button class="options-btn" onclick="toggleOptionsMenu(event, ${response.id})">
          <i class="fas fa-ellipsis-v"></i>
        </button>
        <div id="optionsMenu-${response.id}" class="options-menu hidden">
          <button class="menu-item" onclick="replyMessage(${response.id})">
            <i class="fas fa-reply me-2"></i>Reply
          </button>
          <button class="menu-item" onclick="toggleDeleteMenu(${response.id}, true)">
            <i class="fas fa-trash-alt me-2"></i>Delete
          </button>
        </div>
      </div>
      `;


      messageDiv.innerHTML = `
        ${menuHTML}
            <div class="message">${content}</div>
            <div class="read-receipt">
            <div class="tick"><i class="fas fa-check single-tick"></i></div>
            <div class="message-time">${time}</div>
            </div>
        `;
    } else {
      console.error('Error uploading file:', xhr.responseText);
      alert('Failed to upload file. Please try again.');
      messageDiv.innerHTML = `
        <div>
          <strong>Error uploading: ${file.name}</strong>
        </div>
        <div class="read-receipt">
          <i class="fas fa-times text-danger"></i> ${time}
        </div>
      `;
    }
  };

  // Handle errors
  xhr.onerror = function () {
    console.error('Error uploading file.');
    alert('Failed to upload file. Please try again.');
    messageDiv.innerHTML = `
      <div>
        <strong>Error uploading: ${file.name}</strong>
      </div>
      <div class="read-receipt">
        <i class="fas fa-times text-danger"></i> ${time}
      </div>
    `;
  };

  // Send the request
  xhr.send(formData);
  event.target.value = ''; // Reset the file input
}