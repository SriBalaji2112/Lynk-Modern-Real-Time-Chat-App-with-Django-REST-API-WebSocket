function setAudioCallProfile(user) {
  audioCallProfilePic.src = user.profile_picture || 'https://via.placeholder.com/80';
  audioCallProfileName.innerText = user.name || user.username || 'User';
}

function startAudioCall() {
  if (!currentChatId) {
    return alert("Select a chat first!");
  }
  isCaller = true;
  callAlreadyEnded = false;
  setAudioCallProfile(getCurrentChatUser());
  audioCallStatus.innerText = "Calling...";
  attendCallBtn.style.display = "none";
  audioCallModal.style.display = 'flex';
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    localStream = stream;
    setupPeerConnection();
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    peerConnection.createOffer().then(offer => {
      peerConnection.setLocalDescription(offer);
      socket.send(JSON.stringify({
        type: 'audio_call_offer',
        chat_id: currentChatId,
        offer: offer
      }));
      // After 1.5s, show "Ringing..."
      callRingingTimeout = setTimeout(() => {
        audioCallStatus.innerText = "Ringing...";
      }, 1500);
    });
  }).catch(() => {
    alert("Microphone access denied.");
    endAudioCall();
  });
}

function setupPeerConnection() {
  peerConnection = new RTCPeerConnection();
  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.send(JSON.stringify({
        type: 'audio_call_ice',
        user_id: callerId,
        chat_id: currentChatId,
        candidate: event.candidate
      }));
    }
  };
  peerConnection.ontrack = event => {
    remoteAudio.srcObject = event.streams[0];
  };
}

function endAudioCall(sendEndSignal = true) {
  if (callAlreadyEnded) {
    return;
  }
  callAlreadyEnded = true;

  stopCallTimer();
  audioCallModal.style.display = 'none';
  if (peerConnection) {
    peerConnection.close();
  }
  peerConnection = null;
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }
  localStream = null;
  remoteAudio.srcObject = null;
  attendCallBtn.style.display = "none";
  if (callRingingTimeout) {
    clearTimeout(callRingingTimeout);
  }

  // Only send audio_call_end if this user initiated the end
  if (sendEndSignal && socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'audio_call_end',
      user_id: callerId,
      chat_id: currentChatId,
    }));
  }
}

function attendAudioCall() {
  if (!incomingCallData) {
    return;
  }
  callAlreadyEnded = false;
  audioCallStatus.innerText = "Connecting...";
  attendCallBtn.style.display = "none";
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    localStream = stream;
    setupPeerConnection();
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    peerConnection.setRemoteDescription(new RTCSessionDescription(incomingCallData.offer));
    peerConnection.createAnswer().then(answer => {
      peerConnection.setLocalDescription(answer);
      socket.send(JSON.stringify({
        type: 'audio_call_answer',
        user_id: callerId,
        chat_id: currentChatId,
        answer: answer
      }));
      startCallTimer(); // Start timer when answering
    });
  }).catch(() => {
    alert("Microphone access denied.");
    endAudioCall();
  });
}

// Patch handleIncomingMessage for call logic
const oldHandleIncomingMessage = handleIncomingMessage;
handleIncomingMessage = function(data) {
  if (data.type === 'audio_call_offer') {
    // Incoming call
    isCaller = false;
    incomingCallData = data;
    callerId = data.sender_id;
    setAudioCallProfile(data.from_user || getCurrentChatUser());
    audioCallStatus.innerText = "Incoming Call...";
    attendCallBtn.style.display = "inline-block";
    audioCallTimer.style.display = "none"; // Hide timer until connected
    audioCallModal.style.display = 'flex';
  } else if (data.type === 'audio_call_answer') {
    callerId = data.sender_id;
    // Got answer to our offer
    audioCallStatus.innerText = "Connected";
    if (callRingingTimeout) {
      clearTimeout(callRingingTimeout);
    }
    peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    startCallTimer();
  } else if (data.type === 'audio_call_ice') {
    // ICE candidate
    callerId = data.sender_id;
    if (peerConnection) {
      peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  } else if (data.type === 'audio_call_end') {
    endAudioCall(false);
  // --- VIDEO CALL ---
  } else if (data.type === 'video_call_offer') {
    callerId = data.sender_id;
    isVideoCaller = false;
    incomingVideoCallData = data;
    setVideoCallProfile(data.from_user || getCurrentChatUser());
    videoCallStatus.innerText = "Incoming Call...";
    attendVideoCallBtn.style.display = "inline-block";
    videoCallTimer.style.display = "none";
    videoCallModal.style.display = 'flex';
  } else if (data.type === 'video_call_answer') {
    callerId = data.sender_id;
    videoCallStatus.innerText = "Connected";
    if (videoCallRingingTimeout) {
      clearTimeout(videoCallRingingTimeout);
    }
    videoPeerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    startVideoCallTimer();
  } else if (data.type === 'video_call_ice') {
    callerId = data.sender_id;
    if (videoPeerConnection) {
      videoPeerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  } else if (data.type === 'video_call_end') {
    endVideoCall(false);
    // --- OTHER MESSAGES ---
    }else if (typeof oldHandleIncomingMessage === "function") {
        oldHandleIncomingMessage(data);
    }
};



function startCallTimer() {
  callSeconds = 0;
  audioCallTimer.style.display = "block";
  audioCallTimer.textContent = "00:00";
  callTimerInterval = setInterval(() => {
    callSeconds++;
    const min = String(Math.floor(callSeconds / 60)).padStart(2, '0');
    const sec = String(callSeconds % 60).padStart(2, '0');
    audioCallTimer.textContent = `${min}:${sec}`;
  }, 1000);
}

function stopCallTimer() {
  clearInterval(callTimerInterval);
  audioCallTimer.style.display = "none";
  callTimerInterval = null;
  callSeconds = 0;
}

function setVideoCallProfile(user) {
  videoCallProfilePic.src = user.profile_picture || 'https://via.placeholder.com/80';
  videoCallProfileName.innerText = user.name || user.username || 'User';
}

function startVideoCall() {
  if (!currentChatId) {
    return alert("Select a chat first!");
  }
  isVideoCaller = true;
  videoCallAlreadyEnded = false;
  setVideoCallProfile(getCurrentChatUser());
  videoCallStatus.innerText = "Calling...";
  attendVideoCallBtn.style.display = "none";
  videoCallModal.style.display = 'flex';
  navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
    localVideoStream = stream;
    localVideo.srcObject = stream;
    setupVideoPeerConnection();
    localVideoStream.getTracks().forEach(track => videoPeerConnection.addTrack(track, localVideoStream));
    videoPeerConnection.createOffer().then(offer => {
      videoPeerConnection.setLocalDescription(offer);
      socket.send(JSON.stringify({
        type: 'video_call_offer',
        chat_id: currentChatId,
        offer: offer
      }));
      // After 1.5s, show "Ringing..."
      videoCallRingingTimeout = setTimeout(() => {
        videoCallStatus.innerText = "Ringing...";
      }, 1500);
    });
  }).catch(() => {
    alert("Camera or microphone access denied.");
    endVideoCall();
  });
}

function setupVideoPeerConnection() {
  videoPeerConnection = new RTCPeerConnection();
  videoPeerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.send(JSON.stringify({
        type: 'video_call_ice',
        chat_id: currentChatId,
        user_id: callerId,
        candidate: event.candidate
      }));
    }
  };
  videoPeerConnection.ontrack = event => {
    remoteVideo.srcObject = event.streams[0];
  };
}

let videoCallAlreadyEnded = false;

function endVideoCall(sendEndSignal = true) {
  if (videoCallAlreadyEnded) {
    return;
  }
  videoCallAlreadyEnded = true;

  stopVideoCallTimer();
  videoCallModal.style.display = 'none';
  if (videoPeerConnection) {
    videoPeerConnection.close();
  }
  videoPeerConnection = null;
  if (localVideoStream) {
    localVideoStream.getTracks().forEach(track => track.stop());
  }
  localVideoStream = null;
  remoteVideo.srcObject = null;
  localVideo.srcObject = null;
  attendVideoCallBtn.style.display = "none";
  if (videoCallRingingTimeout) {
    clearTimeout(videoCallRingingTimeout);
  }

  // Only send video_call_end if this user initiated the end
  if (sendEndSignal && socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'video_call_end',
      chat_id: currentChatId,
      user_id: callerId,
    }));
  }
}

function attendVideoCall() {
  if (!incomingVideoCallData) {
    return;
  }
  videoCallAlreadyEnded = false;
  videoCallStatus.innerText = "Connecting...";
  attendVideoCallBtn.style.display = "none";
  navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
    localVideoStream = stream;
    localVideo.srcObject = stream;
    setupVideoPeerConnection();
    localVideoStream.getTracks().forEach(track => videoPeerConnection.addTrack(track, localVideoStream));
    videoPeerConnection.setRemoteDescription(new RTCSessionDescription(incomingVideoCallData.offer));
    videoPeerConnection.createAnswer().then(answer => {
      videoPeerConnection.setLocalDescription(answer);
      socket.send(JSON.stringify({
        type: 'video_call_answer',
        chat_id: currentChatId,
        user_id: callerId,
        answer: answer
      }));
      startVideoCallTimer(); // Start timer when answering
    });
  }).catch(() => {
    alert("Camera or microphone access denied.");
    endVideoCall();
  });
}


function startVideoCallTimer() {
  videoCallSeconds = 0;
  videoCallTimer.style.display = "block";
  videoCallTimer.textContent = "00:00";
  videoCallTimerInterval = setInterval(() => {
    videoCallSeconds++;
    const min = String(Math.floor(videoCallSeconds / 60)).padStart(2, '0');
    const sec = String(videoCallSeconds % 60).padStart(2, '0');
    videoCallTimer.textContent = `${min}:${sec}`;
  }, 1000);
}

function stopVideoCallTimer() {
  clearInterval(videoCallTimerInterval);
  videoCallTimer.style.display = "none";
  videoCallTimerInterval = null;
  videoCallSeconds = 0;
}