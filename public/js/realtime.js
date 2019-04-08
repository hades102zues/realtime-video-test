const localVideo = document.querySelector("#localVideo");
const remoteVideo = document.querySelector("#remoteVideo");
let localStream;

//funcs

const onStream = stream => {
	localStream = stream;

	/*
		append stream to local video 

	*/
	localVideo.srcObject = stream;
};

const onPageStart = () => {
	//determine the user media
	navigator.getUserMedia =
		navigator.getUserMedia ||
		navigator.mozGetUserMedia ||
		navigator.webkitGetUserMedia;

	//set the constraints
	const constraints = { audio: true, video: true };

	//perform the local stream
	navigator.getUserMedia(constraints, onStream, err => console.log(err));
};

//flow
onPageStart();
