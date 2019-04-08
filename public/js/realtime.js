const socket = io();
const localVideo = document.querySelector("#localVideo");
const remoteVideo = document.querySelector("#remoteVideo");

let localStream; //holds the local video feed
let peerConnection; //will hold the peer connection object

/**
	Get rid of conflicts
**/

//determine the user media
navigator.getUserMedia =
	navigator.getUserMedia ||
	navigator.mozGetUserMedia ||
	navigator.webkitGetUserMedia;

//this estab
window.RTCPeerConnection =
	window.RTCPeerConnection ||
	window.mozRTCPeerConnection ||
	window.webkitRTCPeerConnection;

//stores ice candidate info locally
window.RTCIceCandidate =
	window.RTCIceCandidate ||
	window.mozRTCIceCandidate ||
	window.webkitRTCIceCandidate;

//use to generate the local system's terms for communication
window.RTCSessionDescription =
	window.RTCSessionDescription ||
	window.mozRTCSessionDescription ||
	window.webkitRTCSessionDescription;

//funcs

const onLocalStream = stream => {
	localStream = stream;

	//append stream to local video
	localVideo.srcObject = stream;
};

const onPageStart = () => {
	//set the constraints
	const constraints = { audio: true, video: true };

	//perform the local stream, if media is set properly
	if (navigator.getUserMedia)
		navigator.getUserMedia(constraints, onLocalStream, err =>
			console.log(err)
		);
};

const forwardIceCanidate = event => {
	if (event.candidate !== null)
		socket.emit("outgoing", { ice: event.canidate });
};

const connectRemoteStreamToVideo = event => {
	remoteVideo.srcObject = event.stream;
};

const createPeerConnection = () => {
	//the stun server tells us our public ip that is otherwise hidden behind NAT
	peerConnection = new RTCPeerConnection({
		iceServers: [
			{ url: "stun:stun4.l.google.com:19302" },
			{ url: "stun:stun3.l.google.com:19302" }
		]
	});

	//connect up our own stream to the peer connection
	peerConnection.addStream(localStream);

	/*
	 		next we specify what should happen when certain
	 						events take place
	*/

	/*
	upon receiving our details from the stun server, send them to the other client
	via our signalling server 
	*/
	peerConnection.onicecandidate = forwardIceCanidate;

	/*
		upon receiving an external from a client,
		attach it to remote video tag
	 */
	peerConnection.onaddstream = connectRemoteStreamToVideo;
};

//flow
onPageStart();
//on start call
