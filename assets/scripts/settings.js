function Settings() {
	this.notifications = {
		login: true,
		levelup: true,
		mastery: true,
		taskcomplete: true,
		achievement: true,
		prestigeup: true,
		record: true
	};
}
Settings.prototype.loadLocal = function() {
	//Get all of localStorage's fields for ourselves
	if (typeof(localStorage.settings) !== "undefined") {
		try {
			var localSettings = JSON.parse(localStorage.settings);
			Object.keys(localSettings).forEach(function(key) {
				settings.notifications[key] = localSettings[key];
			});
		} catch (e) {

		}
	}
};
Settings.prototype.saveLocal = function() {
	//Put all of our fields into localStorage
	localStorage.settings = JSON.stringify(this.notifications);
};
Settings.prototype.shouldShowNotification = function(type) {
	//Show notifications if we don't know what they are, because we haven't explicitly disabled them
	if (typeof(this.notifications[type]) === "undefined")
		return true;
	return this.notifications[type];
};
Settings.prototype.open = function() {
	this.settingsmodal.fadeIn();
};
Settings.prototype.close = function() {
	this.settingsmodal.fadeOut();
	this.saveLocal();
};
Settings.prototype.setup = function() {
	this.loadLocal();

	this.settingsbutton = $("#settingsbutton");
	this.settingsclose  = $("#settingsclose");
	this.settingsmodal  = $("#settingsmodal");

	this.settingsbutton.click(function(e) {
		settings.open();
	});
	this.settingsclose.click(function(e) {
		settings.close();
	});

	//Each checkbox should enable / disable the notification
	$(".settingsnotif").each(function() {
		//For reference
		var jthis = $(this);
		//Which setting are we?
		var type = jthis.attr("setting");
		//Initial value
		this.checked = settings.shouldShowNotification(type);

		//Add an event so we update window.settings when the check is clicked
		jthis.click(function(e) {
			window.settings.notifications[type] = jthis.is(":checked");
		});
	});

	//Discard settings and logout
	$("#settingsdiscard").click(function(e) {
		settings.close();
		webchat.logout();
		webchat.setUser("", "", true);
	});
};
window.settings = new Settings();
window.settings.setup();