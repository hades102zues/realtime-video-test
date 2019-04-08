const express = require("express");
const app = express();
const port = process.env.PORT || 3001;
const path = require("path");

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
	res.status(200).sendFile(path.join(__dirname, "index.html"));
});

app.use((error, req, res, next) => {
	const errorStatus = error.status || 500;
	const errorMessage = error.message || "Something Went  Wrong";

	res.status(errorStatus).json({ message: errorMessage });
});
app.use((req, res) => {
	res.status(400).json({ message: "Route Not Found" });
});

const server = app.listen(port, () =>
	console.log("***HTTP Server Initiated***")
);

const io = require("socket.io")(server);
io.on("connection", socket => {
	socket.on("outgoing", msg => {
		console.log(msg);
		//socket.broadcast.emit("incoming", msg);
	});
});
