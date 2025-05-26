async function searchUsers(query) {
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

function handleSearchInput(event) {
  const query = event.target.value.trim();
  const dropdown = document.getElementById('searchDropdown');

  if (query.length === 0) {
    dropdown.style.display = 'none'; // Hide the dropdown if the query is empty
    return;
  }

  // Perform the search
  searchUsers(query).then(users => {
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
        document.getElementById('searchInput').value = ''; // Set the input value
        loadChatForNewUser(user); // Load chat for the selected user
      };
      dropdown.appendChild(item);
    });

    dropdown.style.display = 'block'; // Show the dropdown
  });
}