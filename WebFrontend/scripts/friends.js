async function sendFriendRequest(username) {
  const friends = await makeAuthenticatedRequest('http://localhost:8000/api/friends/send-request/', body = { username });
  //console.log('Friend request sent successfully:', friends);
}

// Open the Friends modal
function openFriendsModal() {
  const friendsModal = document.getElementById('friendsModal');
  friendsModal.style.display = 'flex';
}

// Close the Friends modal
function closeFriendsModal() {
  const friendsModal = document.getElementById('friendsModal');
  friendsModal.style.display = 'none';
}

// Send a friend request
async function sendFriendRequest() {
  const username = document.getElementById('friendUsername').value.trim();
  if (!username) {
    alert('Please enter a username.');
    return;
  }

  const token = localStorage.getItem('access_token');
  if (!token) {
    alert('No access token found. Please log in again.');
    return;
  }

  try {
    const response = await fetch(`${server_url}/api/friends/send-request/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username }),
    });

    if (response.ok) {
      alert('Friend request sent successfully!');
      document.getElementById('friendUsername').value = ''; // Clear the input field
    } else {
      const errorData = await response.json();
      alert(`Error sending friend request: ${errorData.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error sending friend request:', error);
    alert('Failed to send friend request. Please try again later.');
  }
}

// Fetch and populate Manage Friends tab
async function fetchManageFriends() {
  const token = localStorage.getItem('access_token');
  if (!token) {
    return;
  }

  try {
    const response = await fetch(`${server_url}/api/friends/list/`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    if (response.ok) {
      const friends = await response.json();
      const manageFriendsList = document.getElementById('manageFriendsList');
      manageFriendsList.innerHTML = '';
      friends.forEach(friend => {
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
        listItem.innerHTML = `
        <div class="d-flex align-items-center">
        <img src="${server_url}${friend.profile_picture}" class="rounded-circle me-2" width="50px" height="50px"/>
        <div>
          <div>
            <strong>${friend.full_name}</strong>
            <br>
            <small class="text-muted">${friend.username}</small>
            ${friend.is_online ? '<span class="badge bg-success ms-2">Online</span>' : ''}
          </div>
          </div>
          </div>
          <button class="btn btn-sm btn-danger" onclick="removeFriend('${friend.id}')">Remove</button>
        `;
        manageFriendsList.appendChild(listItem);
      });
    }
  } catch (error) {
    console.error('Error fetching friends:', error);
  }
}

async function removeFriend(friendId) {
  const token = localStorage.getItem('access_token');
  if (!token) {
    alert('No access token found. Please log in again.');
    return;
  }

  try {
    const response = await fetch(`${server_url}/api/friends/unfriend/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ friend_id: friendId }),
    });

    if (response.ok) {
      alert('Friend removed successfully!');
      fetchManageFriends(); // Refresh the Manage Friends tab
    } else {
      const errorData = await response.json();
      alert(`Error removing friend: ${errorData.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error removing friend:', error);
    alert('Failed to remove friend. Please try again later.');
  }
}

// Fetch and populate Requested Friends tab
async function fetchRequestedFriends() {
  const token = localStorage.getItem('access_token');
  if (!token) {
    return;
  }

  try {
    const response = await fetch(`${server_url}/api/friends/requests/`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (response.ok) {
      const requests = await response.json();
      const requestedFriendsList = document.getElementById('requestedFriendsList');
      requestedFriendsList.innerHTML = '';

      requests.sent_requests.forEach(request => {
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item d-flex justify-content-between align-items-center';

        listItem.innerHTML = `
          <div class="d-flex align-items-center">
            <img src="${server_url}${request.profile_picture}" class="rounded-circle me-2" width="50px" height="50px" />
            <div>
              <strong>${request.full_name}</strong>
              <br>
              <small class="text-muted">${request.username}</small>
              ${request.is_online ? '<span class="badge bg-success ms-2">Online</span>' : ''}
            </div>
          </div>
          <button class="btn btn-sm btn-danger ms-auto" onclick="cancelFriendRequest('${request.id}')">Cancel</button>
        `;
        requestedFriendsList.appendChild(listItem);
      });
    }
  } catch (error) {
    console.error('Error fetching requested friends:', error);
  }
}

async function cancelFriendRequest(requestId) {
  const token = localStorage.getItem('access_token');
  if (!token) {
    alert('No access token found. Please log in again.');
    return;
  }

  try {
    const response = await fetch(`${server_url}/api/friends/cancel-request/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ request_id: requestId }),
    });

    if (response.ok) {
      alert('Friend request canceled successfully!');
      fetchRequestedFriends(); // Refresh the Requested Friends tab
    } else {
      const errorData = await response.json();
      alert(`Error canceling friend request: ${errorData.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error canceling friend request:', error);
    alert('Failed to cancel friend request. Please try again later.');
  }
}

// Fetch and populate View Requests tab
async function fetchViewRequests() {
  const token = localStorage.getItem('access_token');
  if (!token) {
    return;
  }

  try {
    const response = await fetch(`${server_url}/api/friends/requests/`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (response.ok) {
      const requests = await response.json();
      //console.log(requests);
      const viewRequestsList = document.getElementById('viewRequestsList');
      viewRequestsList.innerHTML = '';

      requests.received_requests.forEach(request => {
        //console.log(`${server_url}${request.profile_picture}`)
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
        listItem.innerHTML = `
        <img id="profilePicture" src="${server_url}${request.profile_picture}" class="rounded-circle" style="width: 50px; height: 50px; object-fit: cover;" />
          ${request.username}
          <button class="btn btn-sm btn-success" onclick="acceptFriendRequest('${request.id}')">Accept</button>
        `;
        viewRequestsList.appendChild(listItem);
      });
    }
  } catch (error) {
    console.error('Error fetching friend requests:', error);
  }
}

// Accept a friend request
async function acceptFriendRequest(requestId) {
  const token = localStorage.getItem('access_token');
  if (!token) {
    return;
  }

  try {
    const response = await fetch(`${server_url}/api/friends/accept-request/`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
       },
      body: JSON.stringify({ request_id: requestId }),
    });

    if (response.ok) {
      alert('Friend request accepted!');
      fetchViewRequests(); // Refresh the View Requests tab
      // if (socket && socket.readyState === WebSocket.OPEN) {
      //       socket.send(JSON.stringify({
      //         type: 'friend_request_accepted',
      //         request_id: requestId,
      //       }));
      //   }
    } else {
      alert('Failed to accept friend request.');
    }
  } catch (error) {
    console.error('Error accepting friend request:', error);
  }
}

async function searchUsersForAddFriend(query) {
  const token = localStorage.getItem('access_token');
  if (!token) {
    alert('No access token found. Please log in again.');
    return [];
  }

  try {
    const response = await fetch(`${server_url}/api/search/users/?query=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.ok) {
      return await response.json(); // Return the search results
    } else {
      const errorData = await response.json();
      console.error('Error searching users:', errorData.error || 'Unknown error');
      return [];
    }
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
}

function handleAddFriendSearch(event) {
  const query = event.target.value.trim();
  const dropdown = document.getElementById('addFriendDropdown');

  if (query.length === 0) {
    dropdown.style.display = 'none'; // Hide the dropdown if the query is empty
    return;
  }

  // Perform the search
  searchUsersForAddFriend(query).then(users => {
    dropdown.innerHTML = ''; // Clear previous results

    if (users.length === 0) {
      dropdown.style.display = 'none'; // Hide the dropdown if no results
      return;
    }

    // Populate the dropdown with search results
    users.forEach(user => {
      const item = document.createElement('a');
      item.className = 'dropdown-item d-flex align-items-center';
      item.href = '#'; // Add a link or action for the user
      item.innerHTML = `
        <img src="${server_url}${user.profile_picture}" alt="${user.username}" class="rounded-circle me-2" style="width: 40px; height: 40px; object-fit: cover;" />
        <div>
          <strong>${user.username}</strong>
          <div class="text-muted" style="font-size: 0.9em;">${user.full_name}</div>
        </div>
      `;
      item.onclick = () => {
        // Handle user selection
        //console.log('Selected user:', user);
        dropdown.style.display = 'none'; // Hide the dropdown
        document.getElementById('friendUsername').value = user.username; // Set the input value
      };
      dropdown.appendChild(item);
    });

    dropdown.style.display = 'block'; // Show the dropdown
  });
}
