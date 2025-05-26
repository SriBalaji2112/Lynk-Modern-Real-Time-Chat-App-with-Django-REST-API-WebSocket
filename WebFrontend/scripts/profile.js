        // Function to fetch user profile
function fetchUserProfile() {
    let token = localStorage.getItem('access_token');
    // let userID = localStorage.getItem('user_id');
            if (!token) {
                alert('You are not logged in. Please log in first.');
                window.location.href = 'login_signup.html';  // Redirect to login page
            }
    fetch(`${server_url}/api/user/profile/`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,  // Include the authentication token
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())  // Assuming the response is JSON
    .then(data => {
        //console.log('User profile fetched successfully:', data);
        document.getElementById('AppName').innerText = data.name;  // Update the UI with the username
        localStorage.setItem('user_id', data.id);  // Store user ID in local storage
        localStorage.setItem('username', data.username);
        localStorage.setItem('name', data.name);
        localStorage.setItem('email', data.email);
        localStorage.setItem('profilePicture', data.profile_picture);
        //console.log("Profile picture URL:", `${server_url}`+data.profile_picture);
        document.getElementById('mainProfilePicture').src = `${server_url}`+data.profile_picture || 'https://via.placeholder.com/40';  // Update profile picture
        document.getElementById('profileUsername').innerText = data.username;  // Update the UI with the username
        document.getElementById('profileName').innerText = data.name;  // Update the UI with the name
        document.getElementById('profileEmail').innerText = data.email;  // Update the UI with the email
        document.getElementById('profilePicture').src = `${server_url}`+data.profile_picture || 'https://via.placeholder.com/40';  // Update profile picture

        // Process the data, display it in the UI, etc.
    })
    .catch(error => {
        console.error('Error fetching user profile:', error);
    });
}

// Open the profile modal
  function openProfileModal() {
    const profileModal = document.getElementById('profileModal');
    profileModal.style.display = 'flex';

    // Fetch user profile data and populate the modal
    const username = localStorage.getItem('username') || 'Username';
    const name = localStorage.getItem('name') || 'John Doe';
    const email = localStorage.getItem('email') || 'johndoe@example.com';
    const profilePicture = `${server_url}`+localStorage.getItem('profilePicture') || 'https://via.placeholder.com/100';

    document.getElementById('profileUsername').innerText = username;
    document.getElementById('profileName').innerText = name;
    document.getElementById('profileEmail').innerText = email;
    document.getElementById('profilePicture').src = profilePicture;
  }

  // Close the profile modal
  function closeProfileModal() {
    const profileModal = document.getElementById('profileModal');
    profileModal.style.display = 'none';
  }

  // Edit a specific field
  function editField(fieldId) {
    const fieldElement = document.getElementById(fieldId);
    const currentValue = fieldElement.innerText;
    const newValue = prompt(`Edit ${fieldId.replace('profile', '')}:`, currentValue);
    if (newValue !== null && newValue.trim() !== '') {
      fieldElement.innerText = newValue;
      localStorage.setItem(fieldId.replace('profile', '').toLowerCase(), newValue); // Save to localStorage
    }
  }

  // Edit profile picture
  function editProfilePicture() {
    const newPicture = prompt('Enter the URL of the new profile picture:');
    if (newPicture && newPicture.trim() !== '') {
      document.getElementById('profilePicture').src = newPicture;
      localStorage.setItem('profilePicture', newPicture); // Save to localStorage
    }
  }

  // Update profile data
  async function updateProfile() {
  const name = document.getElementById('profileName').innerText;
  const email = document.getElementById('profileEmail').innerText;
  const username = document.getElementById('profileUsername').innerText;
  const fileInput = document.getElementById('profilePictureInput');
  const file = fileInput.files[0]; // Get the selected file

  const token = localStorage.getItem('access_token');
  if (!token) {
    alert('No access token found. Please log in again.');
    return;
  }

  const formData = new FormData();
  formData.append('username', username);
  formData.append('name', name);
  formData.append('email', email);
  if (croppedBlob) {
    formData.append('profile_picture', croppedBlob, 'profile.jpg');
  } else if (file) {
    formData.append('profile_picture', file);
  }

  try {
    const response = await fetch(`${server_url}/api/user/profile/`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`, // Include the authentication token
      },
      body: formData, // Send the FormData object
    });

    if (response.ok) {
      const data = await response.json();
      alert('Profile updated successfully!');
      
      fetchUserProfile(); // Refresh the profile data
    } else {
      const errorData = await response.json();
      alert(`Error updating profile: ${errorData.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    alert('Failed to update profile. Please try again later.');
  }
}

function updateProfilePicture(event) {
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    // Show crop modal
    document.getElementById('cropImage').src = e.target.result;
    document.getElementById('cropModal').style.display = 'flex';

    document.getElementById('profileModal').style.display = 'none';

    // Initialize Cropper
    if (cropper) {
      cropper.destroy();
    }
    cropper = new Cropper(document.getElementById('cropImage'), {
      aspectRatio: 1,
      viewMode: 1,
      autoCropArea: 1,
      movable: true,
      zoomable: true,
      rotatable: false,
      scalable: false,
      cropBoxResizable: true,
      minContainerWidth: 300,
      minContainerHeight: 300,
    });
  };
  reader.readAsDataURL(file);
}

function closeCropModal() {
  document.getElementById('cropModal').style.display = 'none';
  document.getElementById('profileModal').style.display = 'flex';
  if (cropper) {
    cropper.destroy();
  }
  cropper = null;
}

function applyCrop() {
  if (!cropper) {
    return;
  }
  cropper.getCroppedCanvas({
    width: 200,
    height: 200,
    imageSmoothingQuality: 'high'
  }).toBlob(blob => {
    croppedBlob = blob;
    // Show preview
    const url = URL.createObjectURL(blob);
    document.getElementById('profilePicture').src = url;
    closeCropModal();
    // Optionally, upload croppedBlob to server here
    // You can also store it for upload on "Update Profile"
  }, 'image/jpeg', 0.95);
}