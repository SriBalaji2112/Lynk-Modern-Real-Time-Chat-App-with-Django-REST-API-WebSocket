let mediaRecorder, audioChunks = [], audioContext, analyser, sourceNode, animationId;
let isRecording = false, isPaused = false;
let timerInterval, seconds = 0;

const recordBtn = document.getElementById("recordBtn");
const popup = document.getElementById("recordingPopup");
const waveform = document.getElementById("waveform");
const ctx = waveform.getContext("2d");
const pauseBtn = document.getElementById("pauseBtn");
const sendBtn = document.getElementById("sendBtn");
const cancelBtn = document.getElementById("cancelBtn");
const timerDisplay = document.getElementById("recordTimer");

recordBtn.addEventListener("click", async () => {
    if (isRecording) {
      return;
    }

    try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    sourceNode = audioContext.createMediaStreamSource(stream);
    sourceNode.connect(analyser);

    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = sendAudio;

    mediaRecorder.start();
    isRecording = true;
    popup.style.display = "block";
    recordBtn.disabled = true;

    startWaveform();
    startTimer();
    } catch (err) {
    alert("Microphone access denied.");
    }
});

pauseBtn.addEventListener("click", () => {
    if (isPaused) {
    mediaRecorder.resume();
    startTimer();
    startWaveform();
    pauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    } else {
    mediaRecorder.pause();
    stopTimer();
    stopWaveform();
    pauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
    isPaused = !isPaused;
});

sendBtn.addEventListener("click", () => {
    stopRecording(true);
});

cancelBtn.addEventListener("click", () => {
    stopRecording(false);
});

function stopRecording(send = false) {
    if (!isRecording) {
      return;
    }
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(t => t.stop());
    stopWaveform();
    stopTimer();
    popup.style.display = "none";
    recordBtn.disabled = false;
    isRecording = false;

    if (!send) {
      audioChunks = [];
    } // cancel clears data
}

function sendAudio() {
    if (audioChunks.length === 0) {
        return;
    }

    const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
    const formData = new FormData();
    formData.append('chat_id', currentChatId);
    formData.append('media_type', 'audio');
    formData.append('file', audioBlob, `recording_${Date.now()}.webm`);

    const token = localStorage.getItem('access_token');
    if (!token) {
        alert('No access token found. Please log in again.');
        return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${server_url}/api/chat/media-upload/`, true);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.onload = function () {
    if (xhr.status === 201) {
        const response = JSON.parse(xhr.responseText);
        //console.log('Recorded audio uploaded successfully:', response);

        socket.send(JSON.stringify({
            type: 'media_message',
            chat_id: currentChatId,
            media: {
                id: response.id,
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

        // Add the uploaded audio to the chat UI
        const chatBody = document.getElementById("chatBody");
        const messageDiv = document.createElement("div");
        messageDiv.classList.add("message-bubble", "sender-message");
        messageDiv.setAttribute("data-message-id", response.id);

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

        content= `
            <audio controls src="${server_url}${response.media_url}" class="mt-2" alt="${response.message.content}"></audio>
            <div class="attachment-filename mt-1" title="${response.message.content}">${response.message.content}</div>
        `;

        messageDiv.innerHTML = `
        ${menuHTML}
            <div class="message">${content}</div>
            <div class="read-receipt">
            <div class="tick"><i class="fas fa-check single-tick"></i></div>
            <div class="message-time">${new Date().toLocaleTimeString()}</div>
            </div>
        `;

        
        chatBody.appendChild(messageDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
        seconds = 0; // Reset timer
        timerDisplay.textContent = "0s"; // Reset display
    } else {
        console.error('Error uploading recorded audio:', xhr.responseText);
        alert('Failed to upload recorded audio. Please try again.');
    }
    };

    xhr.onerror = function () {
    console.error('Error uploading recorded audio.');
    alert('Failed to upload recorded audio. Please try again.');
    };

    xhr.send(formData);
    audioChunks = []; // Clear the recorded audio chunks
}

function startTimer() {
    timerInterval = setInterval(() => {
    seconds++;
    timerDisplay.textContent = `${seconds}s`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

function startWaveform() {
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
    animationId = requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, waveform.width, waveform.height);

    const barWidth = (waveform.width / bufferLength) * 2.5;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 2;
        ctx.fillStyle = "rgb(" + (barHeight + 100) + ",50,50)";
        ctx.fillRect(x, waveform.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
    }
    };

    draw();
}

function stopWaveform() {
    cancelAnimationFrame(animationId);
    ctx.clearRect(0, 0, waveform.width, waveform.height);
}