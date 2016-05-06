function Userlist() {
	this.userbox = $("#userbox");

	this.statuslist = [];
	this.users = [];
	this.update = [];
	this.updating = false;
}

Userlist.prototype.findUser = function(username, useDisplay) {
	if (typeof(useDisplay) === "undefined") useDisplay = false;

	//Lowercase
	username = username.toLowerCase();

	//Search through this for the user
	for (var i = this.users.length - 1; i >= 0; i--) {
		if (this.users[i].username.toLowerCase() === username)
			return i;
		if (useDisplay && this.users[i].display.toLowerCase() === username)
			return i;
	}
	return -1;
};
Userlist.prototype.formatUser = function(username, location, titles, display) {
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
		display = this.users[index].display;
		formatted = display;

		//Add titles if requested
		if (titles) {
			var flair  = this.users[index].flair;
			var prefix = this.users[index].prefix;
			var suffix = this.users[index].suffix;

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
			var location = this.users[index].location;
			var loctext  = this.statuslist[location];

			//Don't add a space if the location is blank
			if (loctext !== "") {
				formatted = formatted + " " + loctext;
			}
		}
	}
	return formatted;
};
Userlist.prototype.colorUser = function(username, formatted, useAccess, access) {
	//Find them in the userlist
	var index = this.findUser(username);

	//Add colors if requested
	if (index == -1) {
		useAccess = true;
	} else {
		access = this.users[index].access;
	}

	if (useAccess) {
		//As long as we have their access, we can do this
		if (typeof(access) !== "undefined") {
			//Default colors as per spec
			formatted = "<span class=\"color-access-" + access + "\">" + formatted + "</span>";
		}
	} else {
		//If they're not online, then this will hit the top section instead
		var lbcolor = this.users[index].color;
		var color = lbcolor;

		//Invert their color if requested, stripping and appending a #
		if (webchat.invertcolors)
			color = "#" + invertColor(lbcolor.substring(1));

		//Disaster of a line that creates <span> tags for usernames. Example output:
		//<span class="invertable" original-color="#000000" style="color: #000000">Username</span>
		formatted = "<span class=\"invertable" + (webchat.invertcolors ? " inverted" : "") + "\" original-color=\"" + lbcolor + "\" style=\"color:" + color + "\">" + formatted + "</span>";
	}
	return formatted;
};

Userlist.prototype.startUpdate = function() {
	//Init update state
	this.updating = true;
	this.update = [];
};
Userlist.prototype.addUser = function(info) {
	if (this.updating) {
		this.update.push(info);
	} else {
		this.users.push(info);
	}
};
Userlist.prototype.finishUpdate = function() {
	//Transfer update state to the current userlist
	this.updating = false;
	this.users = this.update;
	this.update = null;

	//Sort userlist by access, then display name
	this.users.sort(function (a, b) {
		if (a.access != b.access) {
			//Put guests at the end of the list, rather than the start
			if (a.access === 3) return 1;
			if (b.access === 3) return -1;
			return b.access - a.access;
		}
		return a.display.localeCompare(b.display);
	});
};
Userlist.prototype.display = function() {
	//Clear the user list
	this.userbox.empty();
	this.userbox.append("<div>Userlist:</div>");

	//Build the user list
	for (var i = 0; i < this.users.length; i ++) {
		var user = this.users[i];
		this.userbox.append("<div>" + user.getFormattedDisplay(true, true, true, false) + "</div>");
	}
};
Userlist.prototype.clear = function() {
	this.users = [];
	this.statuslist = [];
	this.userbox.empty();
};