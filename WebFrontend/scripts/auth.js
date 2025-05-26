function toggleForms() {
    document.getElementById('loginForm').classList.toggle('d-none');
    document.getElementById('signupForm').classList.toggle('d-none');
}

document.getElementById("loginForm").addEventListener("submit", function(e) {
    e.preventDefault();

    const loginBtn = document.getElementById("loginBtn");
    const btnText = loginBtn.querySelector(".btn-text");
    const spinner = loginBtn.querySelector(".spinner-border");
    btnText.classList.add("d-none");
    spinner.classList.remove("d-none");
    loginBtn.disabled = true;

  const username = document.getElementById("loginUserName").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  fetch(`${server_url}/api/token/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      username: username,
      password: password
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error("Login failed");
    }
    return response.json();
  })
  .then(data => {
    // Save token or user data to localStorage or cookies if needed
    localStorage.setItem("access_token", data.access);
    // //console.log("Login successful:", data);

    // Redirect to dashboard
    window.location.href = "index.html";
  })
  .catch(error => {
    // //console.log(error);
    if (error instanceof TypeError && error.message.includes("NetworkError")) {
      alert("Could not connect to the server. Please check your network or server status.");
    } else {
      alert("Invalid credentials");
    }
    console.error("Login error:", error);
  })
  .finally(() => {
        btnText.classList.remove("d-none");
        spinner.classList.add("d-none");
        loginBtn.disabled = false;
      });
});

document.getElementById("signupForm").addEventListener("submit", function(e) {
    e.preventDefault();

    const signupBtn = document.getElementById("signupBtn");
    const btnText = signupBtn.querySelector(".btn-text");
    const spinner = signupBtn.querySelector(".spinner-border");
    btnText.classList.add("d-none");
    spinner.classList.remove("d-none");
    signupBtn.disabled = true;

  const username = document.getElementById("signupUserName").value.trim();
  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value.trim();

  fetch(`${server_url}/api/signup/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      username: username,
      password: password,
      name: name,
      email: email
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error("Signup failed");
    }
    return response.json();
  })
  .then(data => {
    // //console.log("Login successful:", data);

    // Redirect to dashboard
    window.location.href = "login_signup.html";
  })
  .catch(error => {
    if (error instanceof TypeError && error.message.includes("NetworkError")) {
      alert("Could not connect to the server. Please check your network or server status.");
    } else {
      alert("Invalid credentials");
    }
    console.error("Signup error:", error);
  })
  .finally(() => {
      btnText.classList.remove("d-none");
      spinner.classList.add("d-none");
      signupBtn.disabled = false;
    });
});

function logout() {
  // Clear user-related data from localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    localStorage.removeItem('name');
    localStorage.removeItem('email');
    localStorage.removeItem('profilePicture');

    // Redirect to the login page
    window.location.href = 'login_signup.html';
}

async function makeAuthenticatedRequest(url, method = 'GET', body = null) {
  const token = localStorage.getItem('access_token');
  if (!token) {
    throw new Error('No access token found');
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const options = {
    method,
    headers
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Request failed');
  }

  return await response.json();
}