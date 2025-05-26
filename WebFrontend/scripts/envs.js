let server_url = "http://127.0.0.1:8000"
let server_ip = "127.0.0.1"
let server_port = "8000"

let currentUserId = null;
let chatHistories = {}; // Initialize the chatHistories object
let currentChatId = null; // Initialize currentChatId
let replyToMessageId = null;
let replyToMessageText = '';
let lastSeenTimers = {};
let currentPage = 1; // Track the current page
let hasMoreMessages = true; // Track if more messages are available
let isLoadingMessages = false; // Prevent multiple simultaneous requests
let cropper = null;
let croppedBlob = null;
let localStream = null;
let peerConnection = null;
let isCaller = false;
let callRingingTimeout = null;
let incomingCallData = null;
let callTimerInterval = null;
let callSeconds = 0;
let callerId = null;
let callAlreadyEnded = false;
let localVideoStream = null;
let videoPeerConnection = null;
let isVideoCaller = false;
let videoCallRingingTimeout = null;
let incomingVideoCallData = null;
let videoCallTimerInterval = null;
let videoCallSeconds = 0;
let videoCallerId = null;

let typingTimeout;
let isCurrentlyTyping = false;

const chatBody = document.getElementById("chatBody");
const audioCallTimer = document.getElementById('audioCallTimer');
const audioCallBtn = document.getElementById('audioCallBtn');
const audioCallModal = document.getElementById('audioCallModal');
const remoteAudio = document.getElementById('remoteAudio');
const audioCallProfilePic = document.getElementById('audioCallProfilePic');
const audioCallProfileName = document.getElementById('audioCallProfileName');
const audioCallStatus = document.getElementById('audioCallStatus');
const attendCallBtn = document.getElementById('attendCallBtn');
const videoCallBtn = document.getElementById('videoCallBtn');
const videoCallModal = document.getElementById('videoCallModal');
const remoteVideo = document.getElementById('remoteVideo');
const localVideo = document.getElementById('localVideo');
const videoCallProfilePic = document.getElementById('videoCallProfilePic');
const videoCallProfileName = document.getElementById('videoCallProfileName');
const videoCallStatus = document.getElementById('videoCallStatus');
const attendVideoCallBtn = document.getElementById('attendVideoCallBtn');
const videoCallTimer = document.getElementById('videoCallTimer');

