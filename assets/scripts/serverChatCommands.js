webchat.addServerChatCommand("/me", function(message) {
	// /me stuff => Username stuff
	var data = getWords(message.data, 1);

	//Strip off everything from their user
	var display = message.user.getFormattedDisplay(false, false, false, false);

	//Add message
	this.addChat(this.colorMessage(display + " " + data, "me"));

	this.hold = true;
});

webchat.addServerChatCommand("/slap", function(message) {
	// /slap user
	var user = getWords(message.data, 1);

	//The actual message is generated here
	var slap = this.getSlapMessage(message.user.username, user);
	this.addChat(slap);

	this.hold = true;
});