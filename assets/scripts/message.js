function Message(user, destination, data) {
	this.user        = user        || "";
	this.destination = destination || "";
	this.data        = data        || "";

	this.sent = false;
	this.hold = false;
}

Message.prototype.getCommand = function() {
	return firstWord(this.data);
};

Message.prototype.complete = function() {
	//Check for @@ and @@@
	if (this.data.substring(0, 3) === "@@@") {
		this.destination = webchat.lastwhisper;
		this.data = "/whisper " + webchat.lastwhisper + " " + this.data.substring(3);
	}
	if (this.data.substring(0, 2) === "@@") {
		this.destination = firstWord(this.data).substring(2);
		this.data = "/whisper " + this.destination + " " + restWords(this.data);
	}

	var command = this.getCommand();
	if (command === "/whisper" || command === "/msg") {
		if (this.destination === "") {
			this.destination = getWord(this.data, 1);
		}
		webchat.lastwhisper = this.destination;
	}
};

Message.prototype.display = function() {
	var command = this.getCommand();
	if (command === "/whisper" || command === "/msg") {
		//And display a (To: ) for their whisper
		var destDisplay = webchat.userlist.formatUser(this.destination, false, false);
		var message = getWords(this.data, 2);

		webchat.lastwhisper = this.destination;

		webchat.addChat(webchat.colorMessage("(To: " + htmlDecode(destDisplay) + "): ", "whisperfrom") + webchat.colorMessage(htmlDecode(message), "whispermsg"));
	}
};

Message.prototype.getLine = function() {
	return "CHAT " + encodeName(this.destination) + " " + this.data;
};