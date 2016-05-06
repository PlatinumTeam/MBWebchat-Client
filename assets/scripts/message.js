function Message(user, display, destination, data, access) {
	this.user = new User(user, display, access);
	
	this.destination = destination || "";
	this.data        = data        || "";

	this.sent = false;
	this.hold = false;
}

Message.prototype.getCommand = function() {
	return firstWord(this.data);
};

Message.prototype.complete = function() {
	if (this.sent) {
		//Don't show messages not addressed to ourselves
		if (this.destination !== "" && this.destination.toLowerCase() !== webchat.user.username.toLowerCase()) {
			this.hold = true;
		}
	} else {
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
	}
};

Message.prototype.display = function() {
	var command = this.getCommand();
	if (this.sent) {
		if (command === "/whisper" || command === "/msg") {
			//Strip /whisper username
			var message = getWords(this.data, 2);

			webchat.lastwhisper = this.user.username;

			//Add their message
			webchat.addChat(webchat.colorMessage("(From: " + htmlDecode(this.user.display) + "): ", "whisperfrom") + webchat.colorMessage(htmlDecode(message), "whispermsg"));
			return;
		}

		//Format their username
		var formatted = webchat.userlist.colorUser(this.user.username, webchat.userlist.formatUser(this.user.username, true, true, this.user.display) + ": ", false, this.user.access);

		//And format their chat, too
		webchat.addChat(formatted + webchat.formatChat(this.data, this.user.access));
	} else {
		if (command === "/whisper" || command === "/msg") {
			//And display a (To: ) for their whisper
			var destDisplay = webchat.userlist.formatUser(this.destination, false, false);
			var message = getWords(this.data, 2);

			webchat.lastwhisper = this.destination;

			webchat.addChat(webchat.colorMessage("(To: " + htmlDecode(destDisplay) + "): ", "whisperfrom") + webchat.colorMessage(htmlDecode(message), "whispermsg"));
		}
	}
};

Message.prototype.getLine = function() {
	return "CHAT " + encodeName(this.destination) + " " + this.data;
};