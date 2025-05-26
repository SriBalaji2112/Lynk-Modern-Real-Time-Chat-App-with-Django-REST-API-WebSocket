function toggleOptionsMenu(event, messageId) {
  event.stopPropagation(); // Prevent the click from propagating to the document
  const menu = document.getElementById(`optionsMenu-${messageId}`);
  const allMenus = document.querySelectorAll('.options-menu');

  // Close all other menus
  allMenus.forEach(m => {
    if (m !== menu) {
      m.classList.add('hidden');
    }
  });

  // Toggle the current menu
  menu.classList.toggle('hidden');
}

function toggleDeleteMenu(messageId, isMe) {
  const deleteMenuModal = document.getElementById("deleteMenuModal");
  const deleteMenuOptions = document.getElementById("deleteMenuOptions");

  // Clear previous option
  if (isMe) {
    deleteMenuOptions.innerHTML = `
      <button class="btn btn-danger w-100 mb-2" onclick="deleteMessage(${messageId}, true)">Delete for Everyone</button>
      <button class="btn btn-warning w-100 mb-2" onclick="deleteMessage(${messageId}, false)">Delete for Me</button>
      <button class="btn btn-secondary w-100" onclick="closeDeleteMenu()">Cancel</button>
    `;
  } else {
    deleteMenuOptions.innerHTML = `
      <button class="btn btn-danger w-100 mb-2" onclick="deleteMessage(${messageId}, false)">Delete for Me</button>
      <button class="btn btn-secondary w-100" onclick="closeDeleteMenu()">Cancel</button>
    `;
  }
  // Show the modal
  deleteMenuModal.style.display = 'flex';
}

function closeDeleteMenu() {
  const deleteMenuModal = document.getElementById("deleteMenuModal");
  deleteMenuModal.style.display = 'none';
}