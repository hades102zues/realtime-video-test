const socket = io();
const localVideo = document.querySelector("#localVideo");
const remoteVideo = document.querySelector("#remoteVideo");
const callButton = document.querySelector("#call-button");
const chatBox = document.querySelector("#chat-box");

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

const addMessageToChatbox = event => {
	console.log("Message", event);
	const p = document.createElement("p");
	p.appendChild(document.createTextNode(event.data));
	chatBox.appendChild(p);
};

//***The Initiator's Side ***//

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

const connectRemoteStreamToVideo = event => {
	remoteVideo.srcObject = event.stream;
};

const forwardIceCanidate = event => {
	if (event.candidate !== null)
		socket.emit("outgoing", { ice: event.candidate });
};

const createPeerConnection = createDataChannel => {
	//the stun server tells us our public ip that is otherwise hidden behind NAT
	peerConnection = new RTCPeerConnection({
		iceServers: [
			{ url: "stun:stun4.l.google.com:19302" },
			{ url: "stun:stun3.l.google.com:19302" }
		]
	});

	//connect up our own stream to the peer connection
	peerConnection.addStream(localStream);

	/*	next we specify what should happen when certain
	 		events take place */

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

	//if we donot want to create a data channel
	if (!createDataChannel) return;

	/****** open up a data channel******/
	//initiate a channel
	const dataChannel = peerConnection.createDataChannel("Tunnel");

	//once the connection on both ends of the channel is established
	dataChannel.onopen = () => {
		dataChannel.send("Hi, I invited you to this call!");
	};

	dataChannel.onclose = () => console.log("The Data Channel is Closed");

	dataChannel.onerror = () => console.log("Error on data Channel");

	dataChannel.onmessage = addMessageToChatbox;
};

const callButtonHandler = () => {
	//go ahead and create the peer connection object
	createPeerConnection(true);

	//send a call offer
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

//***The Following is everthing that happens on the Receiver's end***//

//server relays a message from the Initiator
socket.on("incoming", msg => {
	//First create a peer connection object to establish a connection, if none exists
	//we pass false her because then we'd be creating our on data channel,
	//given how i set up the code
	if (peerConnection === null) createPeerConnection(false);

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

	//now we handle any data channels requests
	peerConnection.ondatachannel = event => {
		event.channel.onopen = () => {
			event.channel.send("Thanks for inviting me caller!");
		};

		event.channel.onclose = () => console.log("The Data Channel is Closed");

		event.channel.onerror = () => console.log("Error on data Channel");

		event.channel.onmessage = addMessageToChatbox;
	};
});
