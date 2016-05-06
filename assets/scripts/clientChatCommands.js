webchat.addClientChatCommand("/skin", function(message) {
	if (getWordCount(message.data) === 1) {
		//Called with no args, just list skins
		var skinList = "";
		for (var i = 0; i < this.skins.length; i++) {
			//If it's not the first skin, then we need commas
			if (i)
				skinList += ", " + this.skins[i];
			else
				skinList = this.skins[i];
		}

		//Give them their message
		this.addChat(this.colorMessage("Current Skin List: " + skinList, "notification"));
		message.hold = true;
		return;
	}
	//Set your skin to the given skin
	var skin = getWord(message.data, 1);

	//Make sure it exists
	if (this.skins.indexOf(skin) !== -1) {
		//Date is a long time in the future
		var date = new Date();
		date.setTime(date.getTime() + (365 * 24 * 60 * 60 * 1000));

		//Set your "skin" cookie to express this
		document.cookie = "skin=" + skin + "; expires=" + date.toUTCString();

		//And actually set the skin
		this.setSkin(skin);
		message.hold = true;
	} else {
		//If the skin doesn't exist, let them know
		this.addChat(this.colorMessage("Invalid Skin: " + htmlDecode(skin), "notification"));
		message.hold = true;
	}
});

webchat.addClientChatCommand("/invert", function(message) {
	//Kalle said he wanted the ability to disable inverted name colors. Not sure why
	// as the chat becomes unreadable, but this is here just for him <3

	//Usage
	if (getWordCount(message.data) === 1) {
		//Give them their message
		this.addChat(this.colorMessage("Usage: /invert on|off", "notification"));
		message.hold = true;
		return;
	}
	//What did they choose
	var sub = getWord(message.data, 1);

	//Stupid simple set
	this.setInvertColors(sub === "on");
	message.hold = true;
});

webchat.addClientChatCommand("/help", function(message) {
	//Help messages are client sided
	//Help overview
	if (getWordCount(message.data) === 1) {
		this.addChat(this.colorMessage(this.info.help["INFO"], "help"));
		message.hold = true;
		return;
	}

	//Sections are all capital
	var section = getWord(message.data, 1).toUpperCase();

	//Make sure the section exists
	if (typeof(this.info.help[section]) !== "undefined") {
		//And show them
		this.addChat(this.colorMessage(this.info.help[section], "help"))
	} else {
		//No such section
		this.addChat(this.colorMessage("Unknown help page \"" + htmlDecode(getWord(message.data, 1)) + "\".", "help"));
	}
	message.hold = true;
});

webchat.addClientChatCommand("/away", function() {
	//Away status
	if (this.user.away) {
		//Webchat
		this.send("LOCATION 3");
	} else {
		//Away
		this.send("LOCATION 9");
	}
	this.user.away = !this.user.away;
	this.user.invisible = false;
	message.hold = true;
});

webchat.addClientChatCommand("/invisible", function() {
	//Invisible mode, you're not supposed to know about this
	if (this.user.access < 0) {
		return;
	}
	if (this.user.invisible) {
		//Webchat
		this.send("LOCATION 3");
	} else {
		//Invisible
		this.send("LOCATION -1");
	}
	this.user.invisible = !this.user.invisible;
	this.user.away = false;
	message.hold = true;
});

webchat.addClientChatCommand("/a", function(message) {
	if (message.data === "/a on") {
		this.setShowA(true);
	}
	if (message.data === "/a off") {
		this.setShowA(false);
	}
});

webchat.addClientChatCommand("/who", function(message) {
	//Who is online?
	if (getWordCount(message.data) === 1) {
		//List all the users if they don't specify someone
		this.addChat("There are " + this.userlist.users.length + " users online:");
		for (var i = 0; i < this.userlist.users.length; i ++) {
			var user = this.userlist.users[i];
			this.addChat(this.formatAccess(user.access, true) + " " + this.userlist.colorUser(user.username, user.display + " (Username: " + user.username + ")", false));
		}
		message.hold = true;
		return;
	}

	//Info for a user
	var username = restWords(message.data);
	var index = this.userlist.findUser(username, true);
	if (index === -1) {
		this.addChat(this.colorMessage("Invalid user: " + username, "notification"));
		message.hold = true;
		return;
	}

	var user = this.userlist.users[index];

	//Get their location
	var location = user.location;
	//Strip the () from their location
	var loctext  = this.userlist.statuslist[location].replace(/(\(|\))/g, "");

	//Titles
	var titles = "";
	if (user.prefix !== "") {
		titles = titles + "Prefix: " + user.prefix;
	}
	if (user.suffix !== "") {
		//If they have a previous one, use commas
		if (user.prefix !== "")
			titles = titles + ", ";
		titles = titles + "Suffix: " + user.suffix;
	}
	if (user.flair !== "") {
		//If they have a previous one, use commas
		if (user.prefix !== "" || user.suffix !== "")
			titles = titles + ", ";
		titles = titles + "Flair: <img src=\"https://marbleblast.com/webchat/assets/flair/" + user.flair + ".png\">";
	}

	//Print their user information
	this.addChat("User information for " + user.display + ":");
	this.addChat("Username: " + this.userlist.colorUser(user.username, user.username, false));
	this.addChat("Access: " + this.formatAccess(user.access, true));
	this.addChat("Location: " + loctext);
	this.addChat("Titles: " + titles);

	message.hold = true;
});