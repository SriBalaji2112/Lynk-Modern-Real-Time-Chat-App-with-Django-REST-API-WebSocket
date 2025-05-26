const emojiPicker = document.getElementById('emoji-picker');
const emojiBtn = document.getElementById('emojiBtn');
const messageInput = document.getElementById('messageInput');

// Toggle picker visibility
emojiBtn.addEventListener('click', () => {
    const isPickerVisible = emojiPicker.style.display === 'block';
    emojiPicker.style.display = isPickerVisible ? 'none' : 'block';

    // Toggle background color of the button
    if (isPickerVisible) {
    emojiBtn.classList.remove('active-emoji-btn');
    } else {
    emojiBtn.classList.add('active-emoji-btn');
    }
});

// Insert emoji into input
emojiPicker.addEventListener('emoji-click', event => {
    messageInput.value += event.detail.unicode;
//   emojiPicker.style.display = 'none';
});

messageInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault(); // Prevent newline
    sendMessage(); // Call your sendMessage function
    this.style.height = 'auto';
    }
    // If Shift+Enter, allow default (newline)
});

messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});