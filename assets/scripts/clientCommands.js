webchat.addClientCommand("/skin", function(data, destination) {
	if (getWordCount(data) === 1) {
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
		return true;
	}
	//Set your skin to the given skin
	var skin = getWord(data, 1);

	//Make sure it exists
	if (this.skins.indexOf(skin) !== -1) {
		//Date is a long time in the future
		var date = new Date();
		date.setTime(date.getTime() + (365 * 24 * 60 * 60 * 1000));

		//Set your "skin" cookie to express this
		document.cookie = "skin=" + skin + "; expires=" + date.toUTCString();

		//And actually set the skin
		this.setSkin(skin);
		return true;
	} else {
		//If the skin doesn't exist, let them know
		this.addChat(this.colorMessage("Invalid Skin: " + htmlDecode(skin), "notification"));
		return true;
	}
});

webchat.addClientCommand("/invert", function(data, destination) {
	//Kalle said he wanted the ability to disable inverted name colors. Not sure why
	// as the chat becomes unreadable, but this is here just for him <3

	//Usage
	if (getWordCount(data) === 1) {
		//Give them their message
		this.addChat(this.colorMessage("Usage: /invert on|off", "notification"));
		return true;
	}
	//What did they choose
	var sub = getWord(data, 1);

	//Stupid simple set
	this.setInvertColors(sub === "on");
	return true;
});

webchat.addClientCommand("/help", function(data, destination) {
	//Help messages are client sided
	//Help overview
	if (getWordCount(data) === 1) {
		this.addChat(this.colorMessage(this.info.help["INFO"], "help"));
		return true;
	}

	//Sections are all capital
	var section = getWord(data, 1).toUpperCase();

	//Make sure the section exists
	if (typeof(this.info.help[section]) !== "undefined") {
		//And show them
		this.addChat(this.colorMessage(this.info.help[section], "help"))
	} else {
		//No such section
		this.addChat(this.colorMessage("Unknown help page \"" + htmlDecode(getWord(data, 1)) + "\".", "help"));
	}
	return true;
});