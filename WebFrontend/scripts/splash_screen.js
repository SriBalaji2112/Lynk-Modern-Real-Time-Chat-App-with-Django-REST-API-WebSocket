  // Hide splash screen after all data is loaded
function hideSplashScreen() {
  const splash = document.getElementById('splashScreen');
  if (splash) {
    splash.classList.add('hide');
    setTimeout(() => splash.style.display = 'none', 500);
  }
}
// Example: Call this after your last async data load
// For example, after updateChatList() and fetchUserProfile() are both done:
// Wait for both data and 10 seconds
Promise.all([
  fetchUserProfile(),
  updateChatList(),
  new Promise(resolve => setTimeout(resolve, 1000)) // 10 seconds
]).then(hideSplashScreen);