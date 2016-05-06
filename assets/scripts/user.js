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

