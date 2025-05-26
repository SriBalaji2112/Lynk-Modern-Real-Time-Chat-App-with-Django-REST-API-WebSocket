function connectWebSocket() {
    let token = localStorage.getItem('access_token');
    if (!token) {
        alert('You are not logged in. Please log in first.');
        window.location.href = 'login_signup.html';  // Redirect to login page
    }

    socket = new WebSocket(`ws://${server_ip}:${server_port}/ws/socket-server/?token=${token}`);

    socket.onopen = function () {
        //console.log("WebSocket connected.");
    };

    socket.onmessage = function (event) {
        const data = JSON.parse(event.data);
        //console.log("Received data:", data, currentUserId);
        handleIncomingMessage(data);

    };

    socket.onclose = function () {
        console.warn("WebSocket disconnected. Reconnecting...");
        setTimeout(connectWebSocket, 1000);
    };

    socket.onerror = function (error) {
        console.error("WebSocket error:", error);
        alert("Unable to connect to the chat server. Please log in again.");
        window.location.href = "login_signup.html";
    };
}