const socket = io();
const localVideo = document.querySelector("#localVideo");
const remoteVideo = document.querySelector("#remoteVideo");
const callButton = document.querySelector("#call-button");

let localStream; //holds the local video feed
let peerConnection = null; //will hold the peer connection object

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

//***funcs
const sessionDescriptionHandler = sessionDescription => {
	//save the sessionDescription Locally then send it through
	//the signalling server
	peerConnection.setLocalDescription(
		sessionDescription,
		() => {
			socket.emit("outgoing", { sdp: sessionDescription });
		},
		() => console.log("Failed to store session")
	);
};

const forwardIceCanidate = event => {
	if (event.candidate !== null)
		socket.emit("outgoing", { ice: event.candidate });
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

const callButtonHandler = () => {
	//create the peer connection object
	createPeerConnection();

	//send an offer
	peerConnection.createOffer(sessionDescriptionHandler, err => {
		console.log("Error on Offer Generation");
	});
};

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

//flow
onPageStart();
callButton.addEventListener("click", callButtonHandler);

//Receiver
socket.on("incoming", msg => {
	//First create a peer connection object to establish a connection, if none exists
	if (peerConnection === null) createPeerConnection();

	//Now the incoming message can be either
	// 		iceCanidate OR sessionDescription
	if (msg.ice) {
		console.log(msg);

		//store that cannidate locally through the ICE framework
		peerConnection.addIceCandidate(new RTCIceCandidate(msg.ice));
	} else if (msg.sdp) {
		console.log(msg);

		//store the remote description locally through the description framework
		peerConnection.setRemoteDescription(
			new RTCSessionDescription(msg.sdp),
			function() {
				//if the remote session description type is an offer then send back an answer description
				if (msg.sdp.type == "offer") {
					peerConnection.createAnswer(sessionDescriptionHandler, () =>
						console.log("error creating an anser")
					);
				}
			}
		);
	}
});
