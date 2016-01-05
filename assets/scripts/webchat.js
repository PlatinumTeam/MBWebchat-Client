(function($) {
	//Actual webchat object and state
	webchat = {
		servers: [
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
		],
		user: {
			username: "",
			display: "",
			key: "",
			access: 0,
			guest: false,
			away: false,
			invisible: false
		},
		info: {
			welcome: "",
			help: {}
		},
		userlist: {
			users: [],
			update: [],
			updating: false
		},
		grouplist: [],
		statuslist: [],
		colorlist: [],
		skins: [],
		lastwhisper: "",
		invertcolors: false,
		relogin: false,
		relogging: false,
		disconnecting: false,
		showa: false,
		onlya: false,
		lastmessage: null,
		setInvertColors: function(invert) {
			this.invertcolors = invert;

			//If we have any invertable chat messages, we need to invert them so we can see
			$(".invertable").each(function() {
				var jthis = $(this);

				//Original color should be stored here
				var original = jthis.attr("original-color");

				//Invert if we're inverting, or use the original if we're not
				if (invert) {
					jthis.css("color", "#" + webchat.invertColor(original.substr(1)));
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
		},
		setSkin: function(skin) {
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
		},
		setWindowTitle: function(text, mobiletext) {
			this.mobile = ($("#mobiledetect").css("display") === "none");
			if (this.mobile) {
				document.title = text;
			} else {
				document.title = mobiletext;
			}
			//Native methods
			if (typeof(console.setTitleBarText) !== "undefined") {
				console.setTitleBarText(document.title);
			}
		},
		flashTitle: function() {
			if (this.lastmessage) {
				/*
				{
					user: "",
					message: "",
					shown: false;
				}
				*/
				//Flash the title between the normal one and the last message
				if (this.lastmessage.shown) {
					this.setWindowTitle(this.lastmessage.user + " says: \"" + this.lastmessage.message + "\"", "Message from " + this.lastmessage.user);
				} else {
					this.setWindowTitle("MarbleBlast.com Webchat", "Webchat");
				}
				//Flash the message
				this.lastmessage.shown = !this.lastmessage.shown;
			} else {
				// this.setWindowTitle("MarbleBlast.com Webchat", "Webchat");
			}
		},
		showLogin: function() {
			$("#loginmodal").fadeIn();
		},
		hideLogin: function() {
			$("#loginmodal").fadeOut();
		},
		showTOS: function() {
			$("#tosmodal").fadeIn();
		},
		hideTOS: function() {
			$("#tosmodal").fadeOut();
		},
		enableLogin: function(enabled) {
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
		},
		setLoginStatus: function(text) {
			this.loginstatus.text(text);
		},
		setStatus: function(text) {
			this.titlestatus.text(text);
		},
		setGuestMode: function(enabled) {
			if (enabled) {
				this.chatframe.addClass("guest");
				this.userframe.addClass("guest");
				this.messageframe.addClass("guest");
			} else {
				this.chatframe.removeClass("guest");
				this.userframe.removeClass("guest");
				this.messageframe.removeClass("guest");
			}
		},
		retryRelogin: function() {
			this.relogin = false;
			this.tryRelogin();
		},
		tryRelogin: function() {
			//Don't send way too many requests
			if (!this.relogin) {
				this.addChat(this.colorMessage("Disconnected. Please stand by for reconnect.", "notification"));

				clearTimeout(this.reloginTimeout);
				this.reloginTimeout = setTimeout(this.retryRelogin, 2000);
				
				this.relogin = true;
				this.connect();
			}
			this.setStatus("Reconnecting...");
		},
		tryLogin: function(username, password) {
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
		},
		formLogin: function() {
			//Read their username and password
			var username = this.loginusername.val();
			var password = this.loginpassword.val();

			//And try to login
			this.tryLogin(username, password);
		},
		guestLogin: function() {
			//Most useless mode ever.
			this.user.guest = true;
			this.connect();
			this.setGuestMode(true);
		},
		setup: function() {
			//Set these fields so we can access them later
			this.chatbox        = $("#chatbox");
			this.userbox        = $("#userbox");
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
			this.atoggle        = $("#atoggle");

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
			this.atoggle.click(function(e) {
				webchat.setOnlyA(!webchat.onlya);
			});

			//Setup the title flashing
			setInterval(this.flashTitle, 1000);
		},
		setOnlyA: function(only) {
			this.onlya = only;

			if (this.onlya) {
				this.atoggle.addClass("active");
			} else {
				this.atoggle.removeClass("active");
			}
			this.textbox.focus();
		},
		setShowA: function(show) {
			this.showa = show;

			if (this.showa) {
				this.messagebox.addClass("showa");
				this.atoggle.attr("type", "submit");
			} else {
				this.messagebox.removeClass("showa");
				this.atoggle.attr("type", "hidden");
			}
			this.textbox.focus();
		},
		detectMobile: function() {
			this.mobile = ($("#mobiledetect").css("display") === "none");
			if (this.mobile) {
				this.textbox.focus(function() {this
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
		},
		setUser: function(username, key, remember) {
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
		},
		connect: function(server) {
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
		},
		login: function() {
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
		},
		logout: function() {
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
			this.userbox.empty();
			// alert("Disconnected from chat -- this generally means that your internet went out.\nIf your internet still seems to be happy, the chat server probably crashed. Refresh the page and see if webchat works again. If it doesn\'t, yell at HiGuy to turn the chat server back on.");
		},
		send: function(data) {
			this.socket.send(data + "\n");
		},
		sendChat: function(data, destination) {
			//Check for @@ and @@@
			if (data.substring(0, 3) === "@@@") {
				destination = this.lastwhisper;
				data = "/whisper " + this.lastwhisper + " " + data.substring(3);
			}
			if (data.substring(0, 2) === "@@") {
				destination = firstWord(data).substring(2);
				data = "/whisper " + destination + " " + restWords(data);
			}

			//If you're away, and you send a chat, you're not away anymore
			if (this.user.away) {
				this.user.away = false;
				this.send("LOCATION 3");

				//Send the message after a delay, otherwise it collides and issues happen
				setTimeout(this.sendChat, 200, data, destination);
				return;
			}

			//Try to find their destination if they /whisper
			var command = firstWord(data);

			//If they haven't explicitly given us a destination, check for a /whisper
			if (typeof(destination) === "undefined") {
				destination = "";

				if (command === "/whisper" || command === "/msg") {
					destination = getWord(data, 1);

					//And display a (To: ) for their whisper
					var destDisplay = this.formatUser(destination, false, false)
					var message = getWords(data, 2);

					this.lastwhisper = destination;

					this.addChat(this.colorMessage("(To: " + htmlDecode(destDisplay) + "): ", "whisperfrom") + this.colorMessage(htmlDecode(message), "whispermsg"));
				}
			}
			switch (command) {
			case "/skin":
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
					return;
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
					return;
				} else {
					//If the skin doesn't exist, let them know
					this.addChat(this.colorMessage("Invalid Skin: " + htmlDecode(skin), "notification"));
					return;
				}
			break;
			case "/invert":
				//Kalle said he wanted the ability to disable inverted name colors. Not sure why
				// as the chat becomes unreadable, but this is here just for him <3

				//Usage
				if (getWordCount(data) === 1) {
					//Give them their message
					this.addChat(this.colorMessage("Usage: /invert on|off", "notification"));
					return;
				}
				//What did they choose
				var sub = getWord(data, 1);

				//Stupid simple set
				this.setInvertColors(sub === "on");
				return;
			break;
			case "/help":
				//Help messages are client sided
				//Help overview
				if (getWordCount(data) === 1) {
					this.addChat(this.colorMessage(this.info.help["INFO"], "help"));
					return;
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
				return;
			case "/away":
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
				return;
			case "/invisible":
				//Invisible mode, you're not supposed to know about this
				if (this.user.access < 0) {
					break;
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
				return;
			case "/a":
				if (data === "/a on") {
					this.setShowA(true);
				}
				if (data === "/a off") {
					this.setShowA(false);
				}
				break;
			case "/who":
				//Who is online?
				if (getWordCount(data) === 1) {
					//List all the users if they don't specify someone
					this.addChat("There are " + this.userlist.users.length + " users online:");
					for (var i = 0; i < this.userlist.users.length; i ++) {
						var user = this.userlist.users[i];
						this.addChat(this.formatAccess(user.access, true) + " " + this.colorUser(user.username, user.display + " (Username: " + user.username + ")", false));
					}
					return;
				}
				
				//Info for a user
				var username = restWords(data);
				var index = this.findUser(username, true);
				if (index === -1) {
					this.addChat(this.colorMessage("Invalid user: " + username, "notification"));
					return;
				}

				var user = this.userlist.users[index];

				//Get their location
				var location = user.location;
				//Strip the () from their location
				var loctext  = this.statuslist[location].replace(/(\(|\))/g, "");

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
				this.addChat("Username: " + this.colorUser(user.username, user.username, false));
				this.addChat("Access: " + this.formatAccess(user.access, true));
				this.addChat("Location: " + loctext);
				this.addChat("Titles: " + titles);

				return;
			}

			if (this.onlya) {
				data = "/a " + data;
			}

			if (this.grouplist.length) {
				var group = this.grouplist[0];
				this.send("CHAT " + destination + " " + group + " " + data);
			} else {
				this.send("CHAT " + destination + " " + data);
			}
		},
		completeChat: function(chat) {
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
		},
		parse: function(line) {
			var command = firstWord(line);
			var data = restWords(line);
			switch (command) {
			case "IDENTIFY":
				//IDENTIFY <status>
				// Should only check for INVALID, if we get CHALLENGE then something has gone horribly, horribly wrong
				if (data === "INVALID") {
					this.logout();
					this.setLoginStatus("Invalid Access Key.");
				}
				break;
			case "PING":
				//PING <pingdata>
				//Just send back a PONG with the exact data
				this.send("PONG " + data);
				break;
			case "INFO":
				//INFO <name> <data ...>
				this.interpretInfo(data);
				break;
			case "CHAT":
				//CHAT <username> <display name> <destination> <access> <data ...>
				this.interpretChat(data);
				break;
			case "USER":
				//USER <subcommand> <params ...>
				this.interpretUser(data);
				break;
			case "NOTIFY":
				//NOTIFY <type> <access> <username> <display name> <message ...>
				this.interpretNotify(data);
				break;
			case "STATUS":
				//STATUS <status> <display>
				this.interpretStatus(data);
				break;
			case "COLOR":
				//COLOR <id> <color>
				this.interpretColor(data);
				break;
			case "GROUP":
				//GROUP <subcommand> <params ...>
				this.interpretGroup(data);
				break;
			case "SHUTDOWN":
				//SHUTDOWN
				this.logout();
				this.setLoginStatus("The server has shut down.");
				break;
			case "ACCEPTTOS":
				//ACCEPTTOS
				this.hideLogin();
				this.showTOS();
				break;
			case "LOGGED":
				//LOGGED
				this.hideLogin();
				if (this.relogging) {
					this.addChat(this.colorMessage("Reconnected.", "notification"));
					this.relogging = false;
				}
				this.setStatus("Connected");
				break;
			//All of these are used ingame by MBP, we don't need to handle them
			case "FRIEND":             //FRIEND <subcommand> <params ...>
			case "BLOCK":              //BLOCK <subcommand> <params ...>
			case "WHERE":              //WHERE
			case "WINTER":             //WINTER
			case "APRIL":              //APRIL
			case "ACHIEVEMENT":        //ACHIEVEMENT <achievement id>
			case "CACHIEVEMENT":       //CACHIEVEMENT <achievement id>
			case "UACHIEVEMENT":       //UACHIEVEMENT <achievement id>
			case "MPACHIEVEMENT":      //MPACHIEVEMENT <achievement id>
			case "ACHIEVEMENTCOUNT":   //ACHIEVEMENTCOUNT <count>
			case "CACHIEVEMENTCOUNT":  //CACHIEVEMENTCOUNT <count>
			case "UACHIEVEMENTCOUNT":  //UACHIEVEMENTCOUNT <count>
			case "MPACHIEVEMENTCOUNT": //MPACHIEVEMENTCOUNT <count>
			case "TACHIEVEMENTCOUNT":  //TACHIEVEMENTCOUNT <count>
			case "GLOBE":              //GLOBE <level>
			case "PONG":               //PONG <data>
			case "PINGTIME":           //PINGTIME <time>
			case "CHALLENGE":          //CHALLENGE <challenge data ...>
			case "SUPERCHALLENGE":     //SUPERCHALLENGE <super challenge data ...>
			case "CRC":                //CRC <crc response>
				break;
			case "":
				break;
			default:
				console.log("Unknown command " + command);
			}
		},
		interpretInfo: function(text) {
			//INFO <name> <data ...>
			var type = getWord(text, 0);
			var data = getWords(text, 1);

			switch (type) {
			case "ACCESS":
				//ACCESS <access>
				this.user.access = parseInt(data);
				break;
			case "DISPLAY":
				//DISPLAY <display name>
				this.user.display = data;
				break;
			case "WELCOME":
				//WELCOME <welcome message>
				this.info.welcome = htmlDecode(data);
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
				var section = getWord(data, 0);
				var message = htmlDecode(getWords(data, 1));
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
		},
		interpretChat: function(text) {
			//Don't get messages when we're relogging
			if (this.relogging)
				return;

			//CHAT <username> <display name> <destination> <access> <data ...>
			var username    = decodeName(getWord(text, 0)).toLowerCase();
			var display     = decodeName(getWord(text, 1));
			var destination = decodeName(getWord(text, 2));
			var access      =   parseInt(getWord(text, 3));

			var message;

			//TODO: Remove backwards compatibility
			if (this.grouplist.length) {
				var group = decodeName(getWord(text, 4));
				message   = htmlDecode(getWords(text, 5));
			} else {
				message   = htmlDecode(getWords(text, 4));
			}


			//Don't show messages not addressed to ourselves
			if (destination !== "" && destination.toLowerCase() !== this.user.username.toLowerCase()) {
				return;
			}

			//They sent a chat command
			if (message.substring(0, 1) === "/") {
				var command = firstWord(message);
				switch (command) {
				case "/whisper":
				case "/msg":
					//Private message
					var recipient = getWord(message, 1);

					//Not to us, why did we get it?
					if (recipient.toLowerCase() !== this.user.username.toLowerCase()) {
						return;
					}

					//Strip /whisper username
					message = getWords(message, 2);

					this.lastwhisper = username;

					//Add their message
					this.addChat(this.colorMessage("(From: " + htmlDecode(display) + "): ", "whisperfrom") + this.colorMessage(htmlDecode(message), "whispermsg"));
					return;
				case "/me":
					// /me stuff => Username stuff
					message = getWords(message, 1);

					//Strip off everything from their user
					display = this.formatUser(username, false, false, display);

					//Add message
					this.addChat(this.colorMessage(display + " " + message, "me"));
					return;
				case "/slap":
					// /slap user
					var user = getWords(message, 1);

					//The actual message is generated here
					message = this.getSlapMessage(username, user);
					this.addChat(message);
					return;
				}
			}
			//Format their username
			var formatted = this.colorUser(username, this.formatUser(username, true, true, display) + ": ", false, access);

			//And format their chat, too
			this.addChat(formatted + this.formatChat(message, access));
		},
		interpretUser: function(text) {
			//USER <subcommand> <params ...>
			var command = firstWord(text);
			var params  = restWords(text);
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

					this.userlist.update.push({
						username: username,
						access: access,
						location: location,
						display: display,
						color: "#" + color,
						flair: flair,
						prefix: prefix,
						suffix: suffix
					});
				}
				break;
			case "START":
				//START

				//Init update state
				this.userlist.updating = true;
				this.userlist.update = [];
				break;
			case "DONE":
				//DONE
				
				//Transfer update state to the current userlist
				this.userlist.updating = false;
				this.userlist.users = this.userlist.update;
				this.userlist.update = null;

				//Sort userlist by access, then display name
				this.userlist.users.sort(function (a, b) {
					if (a.access != b.access) {
						//Put guests at the end of the list, rather than the start
						if (a.access === 3) return 1;
						if (b.access === 3) return -1;
						return b.access - a.access;
					}
					return a.display.localeCompare(b.display);
				});
				this.displayUserlist();
				break;
			}
		},
		interpretNotify: function(text) {
			//NOTIFY <type> <access> <username> <display name> <message ...>
			var type     =            getWord (text, 0);
			var access   =   parseInt(getWord (text, 1));
			var username = decodeName(getWord (text, 2)).toLowerCase();
			var display  = decodeName(getWord (text, 3));
			var message  =            getWords(text, 4);

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
				var user = this.findUser(username);
				if (user !== -1) {
					this.userlist.users.splice(user);
					this.displayUserlist();
				}
				break;
			case "setlocation":
				this.userlist.users[this.findUser(username)].location = parseInt(message);
				this.displayUserlist();
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
					this.addChat(this.colorMessage(display + " has gained a presige rank (" + htmlDecode(decodeName(message)) + ")!", "notification"));
				break;

			//World records
			case "record":
				var level = getWord(message, 0);
				var time  = getWord(message, 1);
				//Level is formatted, we need to parse time though
				if (settings.shouldShowNotification(type))
					this.addChat(this.colorMessage(display + " has just achieved a world record on \"" + htmlDecode(decodeName(level)) + "\" of " + formatTime(time), "record"));
				break;
			}
		},
		interpretStatus: function(text) {
			//STATUS <status> <display ...>
			var status  = parseInt(getWord(text, 0));
			var display =          getWords(text, 1);
			this.statuslist[status] = display;
		},
		interpretColor: function(text) {
			//COLOR <id> <color>
			var id    = getWord(text, 0);
			var color = getWord(text, 1);
			this.colorlist[id] = color;
		},
		interpretGroup: function(text) {
			//GROUP <command> <params ...>
			var type = getWord(text, 0);

			switch (type) {
			case "JOIN":
				var group = decodeName(getWord(text, 1));
				this.grouplist.push(group);
				this.addChat(this.colorMessage("Joined group \"" + group + "\".", "notification"));
				break;
			case "LEAVE":
				var group = decodeName(getWord(text, 1));
				var index = this.grouplist.indexOf(group);
				if (index > -1) {
					this.grouplist.splice(index, 1);
					this.addChat(this.colorMessage("Left group \"" + group + "\".", "notification"));
				}
				break;
			case "LOGIN":
				var username = decodeName(getWord(text, 1));
				var display = decodeName(getWord(text, 2));
				this.addChat(this.colorMessage(display + " has joined the group.", "notification"));
				break;
			case "LOGOUT":
				var username = decodeName(getWord(text, 1));
				var display = decodeName(getWord(text, 2));
				this.addChat(this.colorMessage(display + " has left the group.", "notification"));
				break;
			}
		},
		findUser: function(username, useDisplay) {
			if (typeof(useDisplay) === "undefined") useDisplay = false;

			//Lowercase
			username = username.toLowerCase();

			//Search through this.userlist for the user
			for (var i = this.userlist.users.length - 1; i >= 0; i--) {
				if (this.userlist.users[i].username.toLowerCase() === username)
					return i;
				if (useDisplay && this.userlist.users[i].display.toLowerCase() === username)
					return i;
			}
			return -1;
		},
		formatUser: function(username, location, titles, display) {
			//Default values
			if (typeof(location) === "undefined") location = true;
			if (typeof(titles)   === "undefined") titles   = true;
			if (typeof(display)  === "undefined") display  = username;

			//If all else fails, use their display/username
			var formatted = display;

			//Find them in the userlist
			var index = this.findUser(username);

			//We can't apply titles/location if they're not online, those only exist in the userlist
			if (index != -1) {
				//They are online here, get their info

				//Start with the updated display name
				display = this.userlist.users[index].display;
				formatted = display;

				//Add titles if requested
				if (titles) {
					var flair  = this.userlist.users[index].flair;
					var prefix = this.userlist.users[index].prefix;
					var suffix = this.userlist.users[index].suffix;

					//Don't add spaces if the titles are blank
					if (prefix !== "") {
						formatted = prefix + " " + formatted;
					}
					if (suffix !== "") {
						formatted = formatted + " " + suffix;
					}
					if (flair !== "") {
						//Flair images are in assets/flair/
						formatted = "<img src=\"https://marbleblast.com/webchat/assets/flair/" + flair + ".png\"> " + formatted;
					}
				}

				//Add (Location) if requested
				if (location) {
					var location = this.userlist.users[index].location;
					var loctext  = this.statuslist[location];

					//Don't add a space if the location is blank
					if (loctext !== "") {
						formatted = formatted + " " + loctext;
					}
				}
			}
			return formatted;
		},
		colorUser: function(username, formatted, useAccess, access) {
			//Find them in the userlist
			var index = this.findUser(username);

			//Add colors if requested
			if (index == -1) {
				useAccess = true;
			} else {
				access = this.userlist.users[index].access;
			}

			if (useAccess) {
				//As long as we have their access, we can do this
				if (typeof(access) !== "undefined") {
					//Default colors as per spec
					formatted = "<span class=\"color-access-" + access + "\">" + formatted + "</span>";
				}
			} else {
				//If they're not online, then this will hit the top section instead
				var lbcolor = this.userlist.users[index].color;
				var color = lbcolor;

				//Invert their color if requested, stripping and appending a #
				if (this.invertcolors)
					color = "#" + this.invertColor(lbcolor.substring(1));

				//Disaster of a line that creates <span> tags for usernames. Example output:
				//<span class="invertable" original-color="#000000" style="color: #000000">Username</span>
				formatted = "<span class=\"invertable" + (this.invertcolors ? " inverted" : "") + "\" original-color=\"" + lbcolor + "\" style=\"color:" + color + "\">" + formatted + "</span>";
			}
			return formatted;
		},
		colorMessage: function(text, colortype) {
			//Make sure we have that color
			text = "<span class=\"color-" + colortype + "\">" + text + "</span>";
			return text;
		},
		addChat: function(text) {
            //Only scroll down if we're near the bottom, using ~30px.
            //Do this above the append so we don't screw up large blocks of text
            var shouldScroll = (Math.abs(this.chatbox.height() + this.chatbox.scrollTop() - this.chatbox[0].scrollHeight) < 100);

			//Wrap chat in a <div> so we don't pollute anything
			this.chatbox.append("<div>" + text + "</div>");

            //Check if we should scroll
            if (shouldScroll) {
                this.chatbox.scrollTop(this.chatbox[0].scrollHeight);
            }
		},
		formatChat: function(text, access) {
			//Greentext, I'm so sorry
			if ((text.substring(0, 1) === ">") || text.substring(0, 4) === "&gt;") {
				text = this.colorMessage(text, "greentext");
			}
			//Iterate backwards, building layers of <span>s as we go
			for (var i = text.length - 1; i >= 0; i --) {
				//Boldface text
				if (text.substring(i, i + 3) === "[b]") {
					//As per ingame, set bold and revert italic
					var replacement = (access < 1 ? "" : "<span style=\"font-weight:bold;font-style:normal;\">");
					text = text.substring(0, i) + replacement + text.substring(i + 3) + "</span>";
					continue;
				}
				//Italic text
				if (text.substring(i, i + 3) === "[i]") {
					//As per ingame, set italic and revert bold
					var replacement = (access < 1 ? "" : "<span style=\"font-weight:normal;font-style:italic;\">");
					text = text.substring(0, i) + replacement + text.substring(i + 3) + "</span>";
					continue;
				}
				//Bold+italic text
				if (text.substring(i, i + 4) === "[bi]") {
					//Both
					var replacement = (access < 1 ? "" : "<span style=\"font-weight:bold;font-style:italic;\">");
					text = text.substring(0, i) + replacement + text.substring(i + 4) + "</span>";
					continue;
				}
				//Normal (cleared) style 
				if (text.substring(i, i + 3) === "[c]") {
					//Neither
					var replacement = (access < 1 ? "" : "<span style=\"font-weight:normal;font-style:normal;\">");
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
					var replacement = (access < 1 ? "" : "<span class=\"color-user\" style=\"color:#" + color + ";\">");
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
		},
		displayUserlist: function() {
			//Clear the user list
			this.userbox.empty();
			this.userbox.append("<div>Userlist:</div>");

			//Build the user list
			for (var i = 0; i < this.userlist.users.length; i ++) {
				var username = this.userlist.users[i].username;
				this.userbox.append("<div>" + this.colorUser(username, this.formatUser(username, true, false), true) + "</div>");
			}
		},
		error: function(data) {
			this.setLoginStatus("Error: " + data);
		},
		formatAccess: function(access, color) {
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
		},
		invertColor: function(color) {
			var r = parseInt(color.substring(0, 2), 16);
			var g = parseInt(color.substring(2, 4), 16);
			var b = parseInt(color.substring(4, 6), 16);

			//Super cool actually investigating this rather than just using a hue/saturation calculation
			r = 255 - r;
			g = 255 - g;
			b = 255 - b;
			var c = [r, g, b];

			//Which color index is the largest or smallest?
			var max   = r > g ? (r > b ? 0 : 2) : (g > b ? 1 : 2);
			var min   = r < g ? (r < b ? 0 : 2) : (g < b ? 1 : 2);

			//Which one did we not get?
			var other = (max + min == 1 ? 2 : (max + min == 3 ? 0 : 1));

			//Calculate c[other] (probably a cleaner way to do this)
			c[other] = (c[max] - c[other]) + c[min];

			//Save it because we can't just forget the value
			var cmax = c[max];

			//Swap the two of them
			c[max] = c[min];
			c[min] = cmax;

			var add = Math.floor(((255 * 3) - (c[0] + c[1] + c[2])) / 6);

			c[0] = (c[0] + add > 255 ? 255 : c[0] + add);
			c[1] = (c[1] + add > 255 ? 255 : c[1] + add);
			c[2] = (c[2] + add > 255 ? 255 : c[2] + add);

			r = c[0].toString(16).paddingLeft("00");
			g = c[1].toString(16).paddingLeft("00");
			b = c[2].toString(16).paddingLeft("00");

			return r + g + b;
		},
		getSlapMessage: function(from, to) {
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
			to = this.formatUser(to, false, false);
			from = this.formatUser(from, false, false);

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
		}
	};

	window.webchat = webchat;

	webchat.setup();
	webchat.enableLogin(false);
})(jQuery.noConflict());