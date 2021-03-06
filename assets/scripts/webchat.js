//Actual webchat object and state
function Webchat() {
	this.servers = [
		{
			address: "ws://marbleblast.com",
			port: 28002,
			path: "/leader/socketserver.php",
			timeout: 10
		},
		{ //SSL server in case the SSL resolver doesn't catch you
			address: "wss://marbleblast.com",
			port: 9192,
			path: "/leader/socketserver.php",
			timeout: 10
		}
	];
	this.user = {
		username: "",
		display: "",
		key: "",
		access: 0,
		guest: false,
		away: false,
		invisible: false
	};
	this.info = {
		welcome: "",
		help: {}
	};
	this.userlist = new Userlist();
	this.grouplist = [];
	this.colorlist = [];
	this.skins = [];
	this.lastwhisper = "";
	this.invertcolors = false;
	this.relogin = false;
	this.relogging = false;
	this.disconnecting = false;
	this.newmessages = 0;
	this.flashOn = false;

	this.serverCommands = {};
	this.clientChatCommands = {};
	this.serverChatCommands = {};

	//Set these fields so we can access them later
	this.chatbox        = $("#chatbox");
	this.textbox        = $("#textbox");
	this.chatframe      = $("#chatframe");
	this.userframe      = $("#userframe");
	this.messageframe   = $("#messageframe");
	this.messagebox     = $("#messagebox");
	this.loginform      = $("#loginform");
	this.loginusername  = $("#loginusername");
	this.loginpassword  = $("#loginpassword");
	this.loginkey       = $("#loginkey");
	this.loginremember  = $("#loginremember");
	this.loginsubmit    = $("#loginsubmit");
	this.loginguest     = $("#loginguest");
	this.loginstatus    = $("#loginstatus");
	this.titletext      = $("#titletext");
	this.titlestatus    = $("#titlestatus");
	this.tosaccept      = $("#tosaccept");
	this.tosdecline     = $("#tosdecline");
	this.settingsbutton = $("#settingsbutton");

	this.setStatus("Disconnected");

	//Bind enter key event
	this.textbox.keydown(function(e) {
		//Enter key pressed
		if (e.keyCode == 13) {
			webchat.sendChat(this.value);
			this.value = "";
		} else {
			var completed = webchat.completeChat(this.value);
			if (completed != this.value)
				this.value = completed;
		}
	});
	this.textbox.keyup(function(e) {
		var completed = webchat.completeChat(this.value);
		if (completed != this.value)
			this.value = completed;
	});
	this.loginsubmit.click(function(e) {
		webchat.formLogin();
	});

	//User/pass fields
	this.loginusername.keydown(function(e) {
		//Enter key pressed
		if (e.keyCode == 13) {
			webchat.formLogin();
		}
	});
	this.loginpassword.keydown(function(e) {
		//Enter key pressed
		if (e.keyCode == 13) {
			webchat.formLogin();
		}
	});

	//Why would you ever log in as a guest to webchat?
	this.loginguest.click(function(e) {
		webchat.guestLogin();
	});

	//TOS buttons
	this.tosaccept.click(function(e) {
		//Send an accept and we're done
		webchat.hideTOS();
		webchat.send("ACCEPTTOS\n");
		setTimeout(function() {
			webchat.send("LOCATION 3\n");
		}, 100);
	});
	this.tosdecline.click(function(e) {
		//Log out if they decline
		webchat.hideTOS();
		webchat.logout();
	});

	//Custom mobile scripts that should only happen on phones
	$(window).resize(function(e) {
		webchat.detectMobile();
	});
	this.detectMobile();

	if (typeof(console.setTitleBarText) !== "undefined") {
		console.setTitleBarText(document.title);
	}
	$(document).unload(function(e) {
		webchat.logout();
	});
}

Webchat.prototype.addServerCommand = function(name, func) {
	this.serverCommands[name] = func.bind(this);
};

Webchat.prototype.addClientChatCommand = function(name, func) {
	this.clientChatCommands[name] = func.bind(this);
};

Webchat.prototype.addServerChatCommand = function(name, func) {
	this.serverChatCommands[name] = func.bind(this);
};

Webchat.prototype.setInvertColors = function(invert) {
	this.invertcolors = invert;

	//If we have any invertable chat messages, we need to invert them so we can see
	$(".invertable").each(function() {
		var jthis = $(this);

		//Original color should be stored here
		var original = jthis.attr("original-color");

		//Invert if we're inverting, or use the original if we're not
		if (invert) {
			jthis.css("color", "#" + invertColor(original.substr(1)));
		} else {
			jthis.css("color", original);
		}
	});

	//Super hacky method for setting the native client titlebar
	if (typeof(console.setTitleBarGradient) !== "undefined") {
		//We need to convert the CSS class styles into strings
		var startElem  = $("<span class=\"titlebar-gradient-1\"></span>").appendTo($(document.body));
		var endElem    = $("<span class=\"titlebar-gradient-2\"></span>").appendTo($(document.body));
		var startColor = startElem.css("color");
		var endColor   = endElem.css("color");
		startElem.remove();
		endElem.remove();
		console.setTitleBarGradient(startColor + "|" + endColor);

		var titleElem = $("<span class=\"titlebar-text\"></span>").appendTo($(document.body));
		var textColor = titleElem.css("color");
		titleElem.remove();
		console.setTitleBarTextColor(textColor);
	}
};
Webchat.prototype.setSkin = function(skin) {
	//Load the new skin CSS from the server
	$.ajax({
		url: "https://marbleblast.com/webchat/assets/skins/" + skin + ".css",
		type: "GET"
	})
	.done(function(response) {
		//Create a new CSS style element in the head
		if (!$("#skintext").length) {
			$("head").append("<style id=\"skintext\"></style>");
		}

		//Turns out, you CAN swap stylesheets like this. Isn't that neat?
		$("#skintext").text(response);

		//Delete the old skin
		$("#styleskin").remove();

		//Nasty hardcode, TODO abstract this somehow
		webchat.setInvertColors((skin === "black"));
	})
	.fail(function(e) {

	})
	.always(function(e) {

	});
};
Webchat.prototype.setWindowTitle = function(text, mobiletext) {
	this.mobile = ($("#mobiledetect").css("display") === "none");
	if (this.mobile) {
		document.title = mobiletext;
	} else {
		document.title = text;
	}
	//Native methods
	if (typeof(console.setTitleBarText) !== "undefined") {
		console.setTitleBarText(document.title);
	}
};
Webchat.prototype.flashTitle = function() {
	if (document.hasFocus()) {
		this.flashOn = false;
		this.newmessages = 0;
	} else {
		this.flashOn = !this.flashOn;
	}

	var newTitle = (this.newmessages > 0 ? "(" + this.newmessages + " new) " : "");

	changeFavicon(this.flashOn ? "favicon-notif.ico" : "favicon.ico");
	this.setWindowTitle(newTitle + "MarbleBlast.com Webchat", newTitle + "Webchat");
	if (!document.hasFocus()) {
		if (typeof(this.flashTimer) !== "undefined")
			return;

		this.flashTimer = setTimeout(function(){
			webchat.flashTimer = undefined;
			webchat.flashTitle();
		}, 3000);
	} else {
		this.flashTimer = undefined;
	}
};
Webchat.prototype.showLogin = function() {
	$("#loginmodal").fadeIn();
};
Webchat.prototype.hideLogin = function() {
	$("#loginmodal").fadeOut();
};
Webchat.prototype.showTOS = function() {
	$("#tosmodal").fadeIn();
};
Webchat.prototype.hideTOS = function() {
	$("#tosmodal").fadeOut();
};
Webchat.prototype.enableLogin = function(enabled) {
	if (enabled) {
		this.loginusername.attr("disabled", null);
		this.loginpassword.attr("disabled", null);
        this.loginremember.attr("disabled", null);
		this.loginsubmit.attr("disabled", null);
		this.loginguest.attr("disabled", null);
	} else {
		this.loginusername.attr("disabled", "disabled");
		this.loginpassword.attr("disabled", "disabled");
        this.loginremember.attr("disabled", "disabled");
		this.loginsubmit.attr("disabled", "disabled");
		this.loginguest.attr("disabled", "disabled");
	}
};
Webchat.prototype.setLoginStatus = function(text) {
	this.loginstatus.text(text);
};
Webchat.prototype.setStatus = function(text) {
	this.titlestatus.text(text);
};
Webchat.prototype.setGuestMode = function(enabled) {
	if (enabled) {
		this.chatframe.addClass("guest");
		this.userframe.addClass("guest");
		this.messageframe.addClass("guest");
	} else {
		this.chatframe.removeClass("guest");
		this.userframe.removeClass("guest");
		this.messageframe.removeClass("guest");
	}
};
Webchat.prototype.retryRelogin = function() {
	this.relogin = false;
	this.tryRelogin();
};
Webchat.prototype.tryRelogin = function() {
	//Don't send way too many requests
	if (!this.relogin) {
		this.addChat(this.colorMessage("Disconnected. Please stand by for reconnect.", "notification"));

		clearTimeout(this.reloginTimeout);
		this.reloginTimeout = setTimeout(this.retryRelogin, 2000);

		this.relogin = true;
		this.connect();
	}
	this.setStatus("Reconnecting...");
};
Webchat.prototype.tryLogin = function(username, password) {
	//Disable form inputs while sending
	this.enableLogin(false);
	this.setGuestMode(false);
	this.setLoginStatus("Requesting Access Key...");

	//Try to validate on the server
	$.ajax({
		url: "https://marbleblast.com/webchat/",
		type: "POST",
		dataType: "json",
		data: {
			getkey: "JSON",
			username: username,
			password: password
		}
	})
	.done(function(response) {
		var success = response.success;

		if (success) {
			//Got their username and key, set them and connect
			var username = response.username;
			var key = response.key;

			webchat.relogin = false;
			webchat.setUser(username, key, webchat.loginremember.is(":checked"));
			webchat.connect();
		} else {
			//No dice, although it's not the server's fault.
			webchat.enableLogin(true);
			webchat.setLoginStatus("Invalid Credentials.");
		}
	})
	.fail(function(e) {
		//Server had an error somewhere. Should have an error reporting thing here or something.
		webchat.enableLogin(true);
		webchat.setLoginStatus("Server Error.");
	})
	.always(function() {
	});
};
Webchat.prototype.formLogin = function() {
	//Read their username and password
	var username = this.loginusername.val();
	var password = this.loginpassword.val();

	//And try to login
	this.tryLogin(username, password);
};
Webchat.prototype.guestLogin = function() {
	//Most useless mode ever.
	this.user.guest = true;
	this.connect();
	this.setGuestMode(true);
};
Webchat.prototype.detectMobile = function() {
	this.mobile = ($("#mobiledetect").css("display") === "none");
	if (this.mobile) {
		this.textbox.focus(function() {
			//Custom "keyboard open" classes for these controls because the userlist keeps getting in the way
			webchat.chatframe.toggleClass("keyboard");
			webchat.userframe.toggleClass("keyboard");
			webchat.messageframe.toggleClass("keyboard");
		});
		this.textbox.blur(function() {
			//Custom "keyboard open" classes for these controls because the userlist keeps getting in the way
			webchat.chatframe.toggleClass("keyboard");
			webchat.userframe.toggleClass("keyboard");
			webchat.messageframe.toggleClass("keyboard");
		});

		//Also shorten the title to fit
		this.titletext.text("MB Webchat");
	} else {
		this.titletext.text("MarbleBlast.com Webchat");
	}
	this.setWindowTitle("MarbleBlast.com Webchat", "Webchat");
};
Webchat.prototype.setUser = function(username, key, remember) {
	//Called via JSONP, sets the global username / chat key
	this.user.username = username;
	this.user.key = key;

	if (username === "") {
		//Delete cookie
		document.cookie = "username=;expires=Thu, 01 Jan 1970 00:00:01 GMT";
		document.cookie = "key=;expires=Thu, 01 Jan 1970 00:00:01 GMT";

		//Reset the fields
		this.loginusername.val("");
		this.loginpassword.val("");
		this.loginkey.val("");

		//Show password field
		this.loginpassword.attr("type", "password");
		this.loginkey.attr("type", "hidden");

		return;
	}

    //If they wanted us to remember their password, do so
    if (remember) {
        //Date is for 1000 years in the future, let's hope your computer isn't around by then
        var date = new Date();
        date.setTime(date.getTime() + (365 * 24 * 60 * 60 * 1000));

        //Setting cookies is strange, you'd think you need to concatenate, but this is actually how you do it
        document.cookie = "username=" + username + "; expires=" + date.toUTCString();
        document.cookie = "key=" + key + "; expires=" + date.toUTCString();
    }

	//If they don't have a password filled in, we can use the key to appear as their password.
	// We don't actually store the password in a cookie though, who does that? (Looking at you, Spy)
	if (this.loginusername.val() === "") {
		this.loginusername.val(username);
        this.loginkey.val(key);

        //Hide the password field and use the key field instead so we don't autocomplete the key
        this.loginpassword.attr("type", "hidden");
        this.loginkey.attr("type", "password");
	}
};
Webchat.prototype.connect = function(server) {
	//If we don't have a previous server, start at 0
	if (typeof(server) === "undefined")
		server = 0;

	//Disable the form so they can't tamper with their details
	this.enableLogin(false);
	this.setLoginStatus("Connecting...");

	//Create and connect the websocket
	var uri = this.servers[server].address + ":" + this.servers[server].port + this.servers[server].path;
	this.socket = $.gracefulWebSocket(uri, {});

	//Status message in case they get restless
	this.stilltimeout = setTimeout(function() {
		webchat.setLoginStatus("Still Trying to Log In...");
	}, 5000);

	//Also spawn a timer for trying the next server if the current one doesn't work
	if (server < this.servers.length) {
		this.timeout = setTimeout(function() {
			//Close the last connection
			webchat.socket.close();

			//Open the next connection
			webchat.connect((server + 1) % webchat.servers.length);
			webchat.setLoginStatus("Trying Next Server...");
		}, (this.servers[server].timeout * 1000));
	}

	//Callbacks pass directly to webchat
	this.socket.onopen = function(e) {
		//Make sure we don't time out this connection
		clearTimeout(webchat.timeout);
		clearTimeout(webchat.stilltimeout);
		clearTimeout(webchat.reloginTimeout);
		webchat.setStatus("Identifying...");
		webchat.login();
	};
	this.socket.onclose = function(e) {
		webchat.setStatus("Disconnected");
		this.onLogout();

		if (!webchat.disconnecting) {
            webchat.tryRelogin();
		}
	};
	this.socket.onmessage = function(e) {
		//Parse out the newline from the message
		webchat.parse(e.data.replace(/\n/g, ""));
	};
	this.socket.onerror = function(e) {
		webchat.error(e.data);
	};
};
Webchat.prototype.login = function() {
	this.relogging = this.relogin;
	this.relogin = false;
	this.disconnecting = false;
	this.setLoginStatus("Logging In...");
	if (this.user.guest) {
		this.send("IDENTIFY Guest");
	} else {
		if (this.relogging) {
			//RELOGIN
			//IDENTIFY <username>
			//KEY <key>
			this.send("RELOGIN\n" +
			          "IDENTIFY " + this.user.username + "\n" +
			          "KEY " + this.user.key);
		} else {
			//IDENTIFY <username>
			//KEY <key>
			this.send("IDENTIFY " + this.user.username + "\n" +
			          "KEY " + this.user.key);
		}
	}
};
Webchat.prototype.logout = function() {
	this.disconnecting = true;

	//If the socket isn't closed (i.e. we're disconnecting ourselves), then send a courtesy DISCONNECT so the server knows what we're doing.
	if (this.socket.readyState !== this.socket.CLOSED && this.socket.readyState !== this.socket.CLOSING) {
		this.socket.send("DISCONNECT\n");
	}
	this.socket.close();

	//Clear everything
	this.setLoginStatus("Disconnected.");
	this.showLogin();
	this.enableLogin(true);
	this.chatbox.empty();
	this.userlist.clear();
	// alert("Disconnected from chat -- this generally means that your internet went out.\nIf your internet still seems to be happy, the chat server probably crashed. Refresh the page and see if webchat works again. If it doesn\'t, yell at HiGuy to turn the chat server back on.");
};
Webchat.prototype.send = function(data) {
	this.socket.send(data + "\n");
};
Webchat.prototype.sendChat = function(data, destination) {
	//If you're away, and you send a chat, you're not away anymore
	if (this.user.away) {
		this.user.away = false;
		this.send("LOCATION 3");

		//Send the message after a delay, otherwise it collides and issues happen
		setTimeout(this.sendChat, 200, data, destination);
		return;
	}

	var message = new Message(this.user.username, this.user.display, destination, data, this.user.access);
	message.complete();

	//Try to find their destination if they /whisper
	var command = message.getCommand();

	if (typeof(this.clientChatCommands[command]) !== "undefined") {
		this.clientChatCommands[command](message);
	}

	if (message.hold)
		return;

	if (this.grouplist.length) {
		var group = this.grouplist[0];
		this.send("CHAT " + destination + " " + group + " " + data);
	} else {
		this.send(message.getLine());
	}
};
Webchat.prototype.completeChat = function(chat) {
	//Resolve @@/@@@ so peole know what they do
	if (chat.indexOf("@@@") === 0) {
		chat = "/whisper " + this.lastwhisper + " ";
	}
	if (chat.length > 2 && chat.indexOf("@@") === 0) {
		chat = "/whisper " + chat.substr(2);
	}
	//Because Matan keeps typing "/whisper  player stuff"
	while (chat.indexOf("/whisper  ") === 0) {
		chat = chat.substr(0, 9) + chat.substr(10);
	}
	return chat;
};
Webchat.prototype.parse = function(line) {
	var command = firstWord(line);
	var data = restWords(line);

	//Blank commands don't matter
	if (command === "")
		return;

	//Use a handler
	if (typeof(this.serverCommands[command]) !== "undefined")
		this.serverCommands[command](line, data);
	else
		console.log("Unknown command " + command);
};
Webchat.prototype.colorMessage = function(text, colortype) {
	//Make sure we have that color
	text = "<span class=\"color-" + colortype + "\">" + text + "</span>";
	return text;
};
Webchat.prototype.addChat = function(text) {
    //Only scroll down if we're near the bottom, using ~30px.
    //Do this above the append so we don't screw up large blocks of text
    var shouldScroll = (Math.abs(this.chatbox.height() + this.chatbox.scrollTop() - this.chatbox[0].scrollHeight) < 100);

	//Wrap chat in a <div> so we don't pollute anything
	this.chatbox.append("<div>" + text + "</div>");

    //Check if we should scroll
    if (shouldScroll) {
        this.chatbox.scrollTop(this.chatbox[0].scrollHeight);
    }
};
Webchat.prototype.formatChat = function(text, access) {
	//Convert links to tags
	text = text.split(" ").map(function(word) {
		if (word.substr(0, 7) === "http://" || word.substr(0, 8) === "https://") {
			var link = word;
			link = link.replace(/&amp;/g, "&").replace(/&gt;/g, ">").replace(/&lt;/g, "<");
			link = link.replace(/\\/g, "\\\\").replace(/\'/g, "\'").replace(/\"/g, "\"");
			word = "<a href='" + link + "' target='_blank'>" + word + "</a>";
		}
		return word;
	}).join(" ");

	//Greentext, I'm so sorry
	if ((text.substring(0, 1) === ">") || text.substring(0, 4) === "&gt;") {
		text = this.colorMessage(text, "greentext");
	}

	//Used many times, this shuts up PhpStorm's warnings
	var replacement;

	//Iterate backwards, building layers of <span>s as we go
	for (var i = text.length - 1; i >= 0; i --) {
		//Boldface text
		if (text.substring(i, i + 3) === "[b]") {
			//As per ingame, set bold and revert italic
			replacement = (access < 1 ? "" : "<span style=\"font-weight:bold;font-style:normal;\">");
			text = text.substring(0, i) + replacement + text.substring(i + 3) + "</span>";
			continue;
		}
		//Italic text
		if (text.substring(i, i + 3) === "[i]") {
			//As per ingame, set italic and revert bold
			replacement = (access < 1 ? "" : "<span style=\"font-weight:normal;font-style:italic;\">");
			text = text.substring(0, i) + replacement + text.substring(i + 3) + "</span>";
			continue;
		}
		//Bold+italic text
		if (text.substring(i, i + 4) === "[bi]") {
			//Both
			replacement = (access < 1 ? "" : "<span style=\"font-weight:bold;font-style:italic;\">");
			text = text.substring(0, i) + replacement + text.substring(i + 4) + "</span>";
			continue;
		}
		//Normal (cleared) style
		if (text.substring(i, i + 3) === "[c]") {
			//Neither
			replacement = (access < 1 ? "" : "<span style=\"font-weight:normal;font-style:normal;\">");
			text = text.substring(0, i) + replacement + text.substring(i + 3) + "</span>";
			continue;
		}
		//Text colors
		if (text.substring(i, i + 5) === "[col:") {
			var colorPos = text.indexOf("]", i + 5);
			//Make sure the color tag ends
			if (colorPos == -1) {
				continue;
			}
			var color = text.substring(i + 5, colorPos);
			//Check our color list for the color, or allow 6-character hex colors
			if (color.length != 6) {
				//Don't allow colors not in the list
				if (typeof(this.colorlist[color]) === "undefined") {
					continue;
				}
				color = this.colorlist[color];
			}
			//Insert the color
			replacement = (access < 1 ? "" : "<span class=\"color-user\" style=\"color:#" + color + ";\">");
			text = text.substring(0, i) + replacement + text.substring(colorPos + 1) + "</span>";
		}
		//Normal (cleared) color
		if (text.substring(i, i + 4) === "[cc]") {
			//Black
			text = text.substring(0, i) + "<span style=\"color:#000;text-shadow:none;\">" + text.substring(i + 4) + "</span>";
		}
	}
	text = this.colorMessage(text, "normal");
	return text;
};
Webchat.prototype.error = function(data) {
	this.setLoginStatus("Error: " + data);
};
Webchat.prototype.onLogin = function() {
	this.pingTimer = setInterval(function() {
		webchat.send("PING " + new Date().getUTCMilliseconds());
	}, 30000);
};
Webchat.prototype.onLogout = function() {
	clearInterval(this.pingTimer);
};
Webchat.prototype.formatAccess = function(access, color) {
	var title = "Member";
	switch (access) {
	case -3: title = "Banned"; break;
	case 0:  title = "Member"; break;
	case 1:  title = "Moderator"; break;
	case 2:  title = "Administrator"; break;
	case 3:  title = "Guest"; break;
	default: title = "Member"; break;
	}

	if (color)  {
		//Default colors as per spec
		title = "<span class=\"color-access-" + access + "\">" + title + "</span>";
	}

	return title;
};
Webchat.prototype.getSlapMessage = function(from, to) {
	//Get the message used for /slap

	//English grammar is terrible
	var self = from == this.user.username;
	var possessive = to + "\'s";
	var possessive2 = from + "\'s";
	if (from == to && from == this.user.username) {
		to = "yourself";
		possessive = "your";
		possessive2 = "your";
	}
	if (from == to && from !== this.user.username) {
		to = "themself";
		possessive = "their";
		possessive2 = "their";
	}
	if (from == this.user.username) {
		from = "you";
		possessive2 = "your";
	}
	if (to == this.user.username) {
		to = "you";
		possessive = "your";
	}
	var slap = Math.floor(Math.random() * 14);

	//awkward wording
	if (self && slap == 7) slap ++;

	//Use their display name
	to = this.userlist.formatUser(to, false, false);
	from = this.userlist.formatUser(from, false, false);

	//A wonderful collection of slap messages
	switch (slap) {
	case  0: return upperFirst(from) + " slapped " + to + " with a large fish!";
	case  1: return upperFirst(from) + " slapped " + to + " with a large trout!";
	case  2: return upperFirst(from) + " slapped " + to + " around with a large trout!";
	case  3: return upperFirst(from) + " gave " + to + " a slap with a large fish!";
	case  4: return upperFirst(from) + " gave " + to + " a good slapping with a large fish!";
	case  5: return upperFirst(from) + " fish-slapped " + to + "!";
	case  6: return upperFirst(from) + " slappily connected a large fish to " + possessive + " face!";
	case  7: return upperFirst(possessive) + " face was slapped by " + from + " with a large fish!";
	case  8: return "An airborne fish on a forward trajectory from " + from + " has intersected with " + possessive + " face!";
	case  9: return upperFirst(from) + " slapped " + possessive + " face with a large fish!";
	case 10: return upperFirst(from) + " slapped " + to + " with a large, slimy, fish!";
	case 11: return upperFirst(from) + " gave " + to + " a slap-happy fish right to the face.";
	case 12: return upperFirst(from) + " slapped " + to + " twice (for good measure) with a large fish.";
	case 13: return "A fish jumped from " + possessive2 + " hands and slapped " + to + " right in the face!"
	case 14: return upperFirst(from) + " ninja fish-slapped " + to + " in the face!";
	}
	return upperFirst(from) + " slapped " + to + " with a large fish!";
};

webchat = new Webchat();

webchat.showLogin();
webchat.enableLogin(false);