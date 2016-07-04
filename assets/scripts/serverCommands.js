webchat.addServerCommand("IDENTIFY", function(line, data) {
	//IDENTIFY <status>
	// Should only check for INVALID, if we get CHALLENGE then something has gone horribly, horribly wrong
	if (data === "INVALID") {
		this.logout();
		this.setLoginStatus("Invalid Access Key.");
	}
	if (data === "BANNED") {
		this.logout();
		this.setLoginStatus("No Access: You are banned.");
	}
});

webchat.addServerCommand("PING", function(line, data) {
	//PING <pingdata>
	//Just send back a PONG with the exact data
	this.send("PONG " + data);
});

webchat.addServerCommand("INFO", function(line, data) {
	//INFO <name> <data ...>
	var type = getWord(data, 0);
	var cmddata = getWords(data, 1);

	switch (type) {
		case "ACCESS":
			//ACCESS <access>
			this.user.access = parseInt(cmddata);
			break;
		case "DISPLAY":
			//DISPLAY <display name>
			this.user.display = cmddata;
			break;
		case "WELCOME":
			//WELCOME <welcome message>
			this.info.welcome = htmlDecode(cmddata);
			if (!this.relogging) {
				//Only scroll down if we're near the bottom, using ~30px.
				//Do this above the append so we don't screw up large blocks of text
				var shouldScroll = (Math.abs(this.chatbox.height() + this.chatbox.scrollTop() - this.chatbox[0].scrollHeight) < 100);

				//Wrap chat in a <div> so we don't pollute anything
				this.chatbox.prepend("<div>" + this.colorMessage(this.info.welcome.replace(/\\n/g, "<br>"), "welcome") + "</div>");

				//Check if we should scroll
				if (shouldScroll) {
					this.chatbox.scrollTop(this.chatbox[0].scrollHeight);
				}
			}
			break;
		case "HELP":
			//HELP <section> <data ...>
			var section = getWord(cmddata, 0);
			var message = htmlDecode(getWords(cmddata, 1));
			this.info.help[section] = message.replace(/\\n/g, "<br>");
			break;
		//All of these are used ingame by MBP, we don't need to handle them
		case "SERVERTIME": //SERVERTIME <time>
		case "CURRATING": //CURRATING <rating>
		case "CURRATINGMP": //CURRATINGMP <rating>
		case "DEFAULT": //DEFAULT <default name>
		case "ADDRESS": //ADDRESS <address>
		case "PRIVILEGE": //PRIVILEGE <privilege>
			break;
	}
});

webchat.addServerCommand("CHAT", function(line, data) {
	//CHAT <username> <display name> <destination> <access> <data ...>
	//Don't get messages when we're relogging
	if (this.relogging)
		return;

	var username    = decodeName(getWord(data, 0)).toLowerCase();
	var display     = decodeName(getWord(data, 1));
	var destination = decodeName(getWord(data, 2));
	var access      =   parseInt(getWord(data, 3));

	var messageText;

	//TODO: Remove backwards compatibility
	if (this.grouplist.length) {
		var group   = decodeName(getWord(data, 4));
		messageText = htmlDecode(getWords(data, 5));
	} else {
		messageText = htmlDecode(getWords(data, 4));
	}

	var message = new Message(username, display, destination, messageText, access);
	message.sent = true;
	message.complete();

	//We may not want to show this if it's not ours
	if (message.hold)
		return;

	//Try to find their destination if they /whisper
	var command = message.getCommand();

	if (typeof(this.serverChatCommands[command]) !== "undefined") {
		this.serverChatCommands[command](message);
	}

	if (message.hold)
		return;

	this.newmessages ++;
	this.flashTitle();

	message.display();
});

webchat.addServerCommand("USER", function(line, data) {
	//USER <subcommand> <params ...>
	var command = firstWord(data);
	var params  = restWords(data);
	switch (command) {
		case "INFO":
			//INFO <username> <access> <location> <display> <color> <flair> <prefix> <suffix>
			if (this.userlist.updating) {
				var username = decodeName(getWord(params, 0)).toLowerCase();
				var access   =   parseInt(getWord(params, 1));
				var location =   parseInt(getWord(params, 2));
				var display  = decodeName(getWord(params, 3));
				var color    =            getWord(params, 4);
				var flair    = decodeName(getWord(params, 5));
				var prefix   = decodeName(getWord(params, 6));
				var suffix   = decodeName(getWord(params, 7));

				this.userlist.addUser(new User(
					username,
					display,
					access,
					location,
					flair,
					prefix,
					suffix,
					"#" + color
				));
			}
			break;
		case "START":
			//START
			this.userlist.startUpdate();
			break;
		case "DONE":
			//DONE
			this.userlist.finishUpdate();
			this.userlist.display();
			break;
	}
});

webchat.addServerCommand("NOTIFY", function(line, data) {
	//NOTIFY <type> <access> <username> <display name> <message ...>
	var type     =            getWord (data, 0);
	var access   =   parseInt(getWord (data, 1));
	var username = decodeName(getWord (data, 2)).toLowerCase();
	var display  = decodeName(getWord (data, 3));
	var message  =            getWords(data, 4);

	switch (type) {
		//Basic chat notifications
		case "login":
			if (settings.shouldShowNotification(type))
				this.addChat(this.colorMessage(display + " has logged in!", "notification"));
			break;
		case "logout":
			if (settings.shouldShowNotification("login")) //Same setting as login notifs
				this.addChat(this.colorMessage(display + " has logged out!", "notification"));
			//Remove them from the list
			var user = this.userlist.findUser(username);
			if (user !== -1) {
				this.userlist.users.splice(user, 1);
				this.userlist.display();
			}
			break;
		case "setlocation":
			this.userlist.users[this.userlist.findUser(username)].location = parseInt(message);
			this.userlist.display();
			break;

		//Fubar notifications
		case "levelup":
			if (settings.shouldShowNotification(type))
				this.addChat(this.colorMessage(display + " has reached level " + htmlDecode(message) + "!", "notification"));
			break;
		case "mastery":
			if (settings.shouldShowNotification(type))
				this.addChat(this.colorMessage(display + " has gained a Mastery Point!", "notification"));
			break;
		case "taskcomplete":
			if (settings.shouldShowNotification(type))
				this.addChat(this.colorMessage(display + " has completed the task, \"" + htmlDecode(decodeName(message)) + "\"!", "tasks"));
			break;
		case "achievement":
			if (settings.shouldShowNotification(type))
				this.addChat(this.colorMessage(display + " has completed the achievement, \"" + htmlDecode(decodeName(message)) + "\"!", "notification"));
			break;
		case "prestigeup":
			if (settings.shouldShowNotification(type))
				this.addChat(this.colorMessage(display + " has gained a prestige rank (" + htmlDecode(decodeName(message)) + ")!", "notification"));
			break;

		//World records
		case "record":
			var level = getWord(message, 0);
			var time  = getWord(message, 1);
			//Level is formatted, we need to parse time though
			if (settings.shouldShowNotification(type))
				this.addChat(this.colorMessage(display + " has just achieved a world record on \"" + htmlDecode(decodeName(level)) + "\" of " + formatTime(time), "record"));
			break;
		case "recordscore":
			var level = getWord(message, 0);
			var score  = getWord(message, 1);
			//Level is formatted, score is just a number
			if (settings.shouldShowNotification("record")) //Same setting as WR notifs
				this.addChat(this.colorMessage(display + " has just achieved a world record on \"" + htmlDecode(decodeName(level)) + "\" of " + score, "record"));
			break;
	}
});

webchat.addServerCommand("STATUS", function(line, data) {
	//STATUS <status> <display>
	var status  = parseInt(getWord(data, 0));
	var display =          getWords(data, 1);
	this.userlist.statuslist[status] = display;

});

webchat.addServerCommand("COLOR", function(line, data) {
	//COLOR <id> <color>
	var id    = getWord(data, 0);
	var color = getWord(data, 1);
	this.colorlist[id] = color;

});

webchat.addServerCommand("GROUP", function(line, data) {
	//GROUP <subcommand> <params ...>
	var type = getWord(data, 0);

	switch (type) {
		case "JOIN":
			var group = decodeName(getWord(data, 1));
			this.grouplist.push(group);
			this.addChat(this.colorMessage("Joined group \"" + group + "\".", "notification"));
			break;
		case "LEAVE":
			var group = decodeName(getWord(data, 1));
			var index = this.grouplist.indexOf(group);
			if (index > -1) {
				this.grouplist.splice(index, 1);
				this.addChat(this.colorMessage("Left group \"" + group + "\".", "notification"));
			}
			break;
		case "LOGIN":
			var username = decodeName(getWord(data, 1));
			var display = decodeName(getWord(data, 2));
			this.addChat(this.colorMessage(display + " has joined the group.", "notification"));
			break;
		case "LOGOUT":
			var username = decodeName(getWord(data, 1));
			var display = decodeName(getWord(data, 2));
			this.addChat(this.colorMessage(display + " has left the group.", "notification"));
			break;
	}
});

webchat.addServerCommand("SHUTDOWN", function(line, data) {
	//SHUTDOWN
	this.logout();
	this.setLoginStatus("The server has shut down.");
});

webchat.addServerCommand("ACCEPTTOS", function(line, data) {
	//ACCEPTTOS
	this.hideLogin();
	this.showTOS();
});

webchat.addServerCommand("LOGGED", function(line, data) {
	//LOGGED
	this.hideLogin();
	if (this.relogging) {
		this.addChat(this.colorMessage("Reconnected.", "notification"));
		this.relogging = false;
	}
	this.setStatus("Connected");

	this.onLogin();
});

//Unused
webchat.addServerCommand("FRIEND", function(){});             //FRIEND <subcommand> <params ...>
webchat.addServerCommand("BLOCK", function(){});              //BLOCK <subcommand> <params ...>
webchat.addServerCommand("WHERE", function(){});              //WHERE
webchat.addServerCommand("WINTER", function(){});             //WINTER
webchat.addServerCommand("APRIL", function(){});              //APRIL
webchat.addServerCommand("ACHIEVEMENT", function(){});        //ACHIEVEMENT <achievement id>
webchat.addServerCommand("CACHIEVEMENT", function(){});       //CACHIEVEMENT <achievement id>
webchat.addServerCommand("UACHIEVEMENT", function(){});       //UACHIEVEMENT <achievement id>
webchat.addServerCommand("MPACHIEVEMENT", function(){});      //MPACHIEVEMENT <achievement id>
webchat.addServerCommand("ACHIEVEMENTCOUNT", function(){});   //ACHIEVEMENTCOUNT <count>
webchat.addServerCommand("CACHIEVEMENTCOUNT", function(){});  //CACHIEVEMENTCOUNT <count>
webchat.addServerCommand("UACHIEVEMENTCOUNT", function(){});  //UACHIEVEMENTCOUNT <count>
webchat.addServerCommand("MPACHIEVEMENTCOUNT", function(){}); //MPACHIEVEMENTCOUNT <count>
webchat.addServerCommand("TACHIEVEMENTCOUNT", function(){});  //TACHIEVEMENTCOUNT <count>
webchat.addServerCommand("GLOBE", function(){});              //GLOBE <level>
webchat.addServerCommand("PONG", function(){});               //PONG <data>
webchat.addServerCommand("PINGTIME", function(){});           //PINGTIME <time>
webchat.addServerCommand("CHALLENGE", function(){});          //CHALLENGE <challenge data ...>
webchat.addServerCommand("SUPERCHALLENGE", function(){});     //SUPERCHALLENGE <super challenge data ...>
webchat.addServerCommand("CRC", function(){});                //CRC <crc response>

