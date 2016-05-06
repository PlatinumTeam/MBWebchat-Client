function User(username, display, access, location, flair, prefix, suffix, color) {
	this.username = username || "";
	this.display  = display  || username || "";

	this.access   = access   || 0;
	this.location = location || 0;

	this.flair    = flair    || "";
	this.prefix   = prefix   || "";
	this.suffix   = suffix   || "";

	this.color    = color    || "";
}

User.prototype.getFormattedUsername = function(color, useAccess, location, titles) {
	if (color)
		return webchat.userlist.colorUser(this.username, webchat.userlist.formatUser(this.username, location, titles, this.username), useAccess, this.username);
	else
		return webchat.userlist.formatUser(this.username, location, titles, this.username);
};
User.prototype.getFormattedDisplay = function(color, useAccess, location, titles) {
	if (color)
		return webchat.userlist.colorUser(this.username, webchat.userlist.formatUser(this.username, location, titles, this.display), useAccess, this.display);
	else
		return webchat.userlist.formatUser(this.username, location, titles, this.display);
};
User.prototype.getFormattedAccess = function(color) {
	return webchat.formatAccess(this.access, color);
};

