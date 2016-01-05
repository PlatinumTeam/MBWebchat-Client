(function($){
	function Settings() {
		this.notifications = {
			login: false,
			logout: false,
			setlocation: false,
			levelup: false,
			mastery: false,
			taskcomplete: false,
			achievement: false,
			prestigeup: false,
			record: false
		};
	}
	Settings.prototype.loadLocal = function() {
		if (typeof(localStorage.settings) !== "undefined") {
			Object.keys(localStorage.settings).forEach(function(key) {
				settings[key] = localStorage.settings[key];
			});
		}
	}
	Settings.prototype.saveLocal = function() {
		var temp = {};
		Object.keys(this).forEach(function(key) {
			if (typeof(settings[key]) !== "function")
				temp[key] = settings[key];
		});
		localStorage.settings = temp;
	}
	Settings.prototype.shouldShowNotification = function(type) {
		if (typeof(this.notifications[type]) === "undefined")
			return true;
		return this.notifications[type];
	}
	Settings.prototype.open = function() {
		$("#settingsmodal").fadeIn();
	}
	Settings.prototype.close = function() {
		$("#settingsmodal").fadeOut();
		this.saveLocal();
	}
	Settings.prototype.setup = function() {
		this.loadLocal();

		this.settingsbutton = $("#settingsbutton");
		this.settingsclose  = $("#settingsclose");

		this.settingsbutton.click(function(e) {
			settings.open();
		});
		this.settingsclose.click(function(e) {
			settings.close();
		});

		$(".settingsnotif").each(function() {
			var jthis = $(this);
			var type = jthis.attr("setting");
			this.checked = settings.shouldShowNotification(type);

			jthis.click(function(e) {
				window.settings.notifications[type] = jthis.is(":checked");
			});
		});
		$("#settingsdiscard").click(function(e) {
			settings.close();
			webchat.logout();
			webchat.setUser("", "", true);
		});
	}
	window.settings = new Settings();
	window.settings.setup();
})(jQuery.noConflict());