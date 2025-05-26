connectWebSocket();
fetchUserProfile();
startLastSeenUpdater();
updateChatList(); // Initial call to fetch and render chat list

// Helper to get current chat user info (adjust as needed)
function getCurrentChatUser() {
  // You may need to fetch this from your chat list or state
  // Example:
  const chats = window.lastFetchedChats || [];
  const chat = chats.find(c => c.id === currentChatId);
  return chat || { name: "User", profile_picture: "https://via.placeholder.com/80" };
}

chatBody.addEventListener("scroll", () => {
  if (chatBody.scrollTop === 0 && hasMoreMessages) {
    loadChat(currentChatId, currentPage + 1); // Load the next page
  }
});

// Close the menu when clicking outside
document.addEventListener('click', function () {
  const allMenus = document.querySelectorAll('.options-menu');
  allMenus.forEach(menu => menu.classList.add('hidden'));
});

document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
  tab.addEventListener('click', event => {
    event.preventDefault();
    const target = document.querySelector(tab.getAttribute('data-bs-target'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('show', 'active'));
    target.classList.add('show', 'active');
  });
});

document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
  tab.addEventListener('click', event => {
    event.preventDefault();

    // Remove active class from all tabs
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));

    // Add active class to the clicked tab
    tab.classList.add('active');

    // Switch the tab content
    const target = document.querySelector(tab.getAttribute('data-bs-target'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('show', 'active'));
    target.classList.add('show', 'active');
  });
});

audioCallBtn.addEventListener('click', startAudioCall);
videoCallBtn.addEventListener('click', startVideoCall);

window.onclick = function(event) {
    const profileModal = document.getElementById('profileModal');
    const cropModal = document.getElementById('cropModal');
    const friendsModal = document.getElementById('friendsModal');
    const deleteMenuModal = document.getElementById("deleteMenuModal");
    if (event.target === profileModal) {
      closeProfileModal();
    } else if (event.target === cropModal) {
      closeCropModal();
    } else if (event.target === friendsModal) {
      closeFriendsModal();
    } else if (event.target === deleteMenuModal) {
      closeDeleteMenu();
    }
}