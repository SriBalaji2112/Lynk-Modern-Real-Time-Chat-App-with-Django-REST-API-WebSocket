function openMedia(url, type = 'image') {
  const mediaViewer = document.getElementById('mediaViewer');
  const mediaContent = document.getElementById('mediaContent');

  // Clear previous content
  mediaContent.innerHTML = '';

  // Add the appropriate media element
  if (type === 'image') {
    const image = document.createElement('img');
    image.src = url;
    image.alt = 'Media';
    image.className = 'zoomable-image';

    // Enable movement and zoom toggle
    enableImageMovement(image);

    mediaContent.appendChild(image);
  } else if (type === 'video') {
    mediaContent.innerHTML = `
      <video controls autoplay>
        <source src="${url}" type="video/mp4">
        Your browser does not support the video tag.
      </video>
    `;
  } else {
    mediaContent.innerHTML = `<a href="${url}" target="_blank" class="btn btn-primary">Open File</a>`;
  }

  // Show the media viewer
  mediaViewer.classList.remove('hidden');
}

function toggleZoom(image) {
  if (image.classList.contains('zoomed')) {
    // Zoom out
    image.classList.remove('zoomed'); // Remove zoomed class
    image.style.transform = ''; // Reset scale
    image.style.left = ''; // Reset position
    image.style.top = ''; // Reset position
    image.style.position = '';
  } else {
    // Zoom in
    image.classList.add('zoomed'); // Add zoomed class
    image.style.transform = 'scale(2)';
    image.style.position = 'absolute'; // Make the image movable
  }
}

function enableImageMovement(image) {
  image.addEventListener('mousemove', (event) => {
    if (!image.classList.contains('zoomed')) {
      return;
    } // Only move when zoomed

    const rect = image.getBoundingClientRect();
    const offsetX = (event.clientX - rect.left) / rect.width; // Cursor position as a percentage of the image width
    const offsetY = (event.clientY - rect.top) / rect.height; // Cursor position as a percentage of the image height

    // Calculate movement based on cursor position
    const moveX = (offsetX - 0.5) * 150; // Move left/right
    const moveY = (offsetY - 0.5) * 150; // Move up/down

    image.style.transform = `scale(2) translate(${moveX}%, ${moveY}%)`;
  });

  image.addEventListener('click', () => {
    toggleZoom(image); // Toggle zoom on click
  });
}

function closeMediaViewer() {
  const mediaViewer = document.getElementById('mediaViewer');
  const mediaContent = document.getElementById('mediaContent');

  // Clear the media content to stop video playback
  mediaContent.innerHTML = '';

  // Hide the media viewer
  mediaViewer.classList.add('hidden');
}