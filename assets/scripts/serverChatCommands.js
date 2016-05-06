webchat.addServerChatCommand("/me", function(message) {
	// /me stuff => Username stuff
	var data = getWords(message.data, 1);

	//Strip off everything from their user
	var display = this.userlist.formatUser(message.user.username, false, false, message.user.display);

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

webchat.addServerChatCommand("/a", function(message) {
	// /a stuff

	//Format their username
	var formatted = this.userlist.colorUser(message.user.username, this.userlist.formatUser(message.user.username, true, true, message.user.display) + ": ", false, access);

	//Strip off "/a "
	var data = message.data.substring(3);

	this.addChat(this.colorMessage("[Adult] ", "a") + formatted + this.formatChat(data, message.user.access));
	
	this.hold = true;
});