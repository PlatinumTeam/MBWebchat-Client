<?php
define("WEBCHAT", 1);
require("user.php");
require("scripts.php");

//JSONP - Load the user's information from marbleblast.com even though we're on the webchat.marbleblast.com domain.
// Users will request /webchat/?getkey=1 as a javascript file, and evaluate the contents. We give them a short
// line of javascript (see user.php) that fills in their user information.
if (array_key_exists("getkey", $_GET)) {
	header("Content-Type: text/javascript");
	header("Access-Control-Allow-Origin: http://webchat.marbleblast.com");
	die(getLoginJSONP($_GET["getkey"]));
}
if (array_key_exists("getkey", $_POST)) {
	header("Content-Type: text/javascript");
	header("Access-Control-Allow-Origin: http://webchat.marbleblast.com");
	die(getLoginJSONP($_POST["getkey"]));
}
?>
<html>
<head>
	<title>MarbleBlast.com Webchat</title>
	<link rel="shortcut icon" href="/favicon.ico">

	<!-- UTF-8 so we can use strange chars -->
	<meta http-equiv="content-type" content="text/html; charset=UTF-8">

	<!-- JQuery ... Inb4 Javascript snobs -->
	<script src="//code.jquery.com/jquery-1.11.2.min.js"></script>
	<script src="//code.jquery.com/jquery-migrate-1.2.1.min.js"></script>

	<!-- Super cool icons by Font Awesome -->
	<link rel="stylesheet" href="//maxcdn.bootstrapcdn.com/font-awesome/4.5.0/css/font-awesome.min.css">

	<!-- Support older browsers with crappy web sockets -->
	<script src="assets/jquery.gracefulWebSocket.js"></script>

	<!-- Styles in the head, so they load first -->
	<link rel="stylesheet" type="text/css" href="assets/webchat.css">
	<link id="styleskin" rel="stylesheet" type="text/css" href="assets/skins/<?=getSkinName()?>.css">

	<!-- Mobile phones like to zoom. We don't like that. -->
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">

	<!-- Google analytics because I love stats -->
	<script>
		(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
			(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
			m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
		})(window,document,'script','//www.google-analytics.com/analytics.js','ga');

		ga('create', 'UA-48516589-1', 'auto', {
			'allowLinker' : true
		});
		ga('send', 'pageview');
		ga('require', 'linker');
		ga('linker:autolink', ['marbleblast.com', 'webchat.marbleblast.com'], false, true);
	</script>

	<!-- Web application support, iPhone and Android (probably) -->
	<meta name="apple-mobile-web-app-status-bar-style" content="default" />
	<meta name="apple-mobile-web-app-capable" content="yes">
	<meta name="mobile-web-app-capable" content="yes">
	<link rel="apple-touch-icon" href="platinum.png">
</head>
<body>
<div id="main">
	<div id="titleframe">
		<div id="titletext">
			MarbleBlast.com Webchat
		</div>
		<div id="titlestatus">
			Disconnected
		</div>
	</div>
	<!-- One div for sizing, one div for padding, one div for styling -->
	<div id="chatframe">
		<div id="chatoutline">
			<div id="chatbox">
			</div>
		</div>
	</div>
	<div id="userframe">
		<div id="useroutline">
			<div id="userbox">
			</div>
		</div>
	</div>
	<div id="messageframe">
		<div id="messageoutline">
			<div id="messagebox">
				<input type="hidden" id="atoggle" class="button" value="/a">
				<input type="text" id="textbox" value="">
				<button id="settingsbutton" class="button"><i class="fa fa-cog"></i></button>
			</div>
		</div>
	</div>
</div>
<!-- My forms are a disaster but at least I don't use Bootstrap. -->
<div class="dialogmodal" id="loginmodal">
	<div class="dialogframe">
		<div class="dialogoutline">
			<div class="dialogbox">
				<div class="dialogarea">
					<h1 id="logintitle">Log In</h1>
					<p id="loginmessage">Log in with your marbleblast.com account to access the chat system.</p>
					<form action="javascript:void(0);" id="loginform">
						<label for="username">Username: </label>
						<input name="username" type="text" class="form" id="loginusername" disabled="disabled">
						<br>
						<label for="password">Password: </label>
						<input name="password" type="password" class="form" id="loginpassword" disabled="disabled">
						<input name="key" type="hidden" class="form" id="loginkey" disabled="disabled">
						<br>
						<label for="loginremember">Remember on this Computer:
							<input name="remember" type="checkbox" class="button" id="loginremember" disabled="disabled">
						</label>
						<br>
						<input type="submit" class="button-active" id="loginguest" value="Guest" disabled="disabled">
						<input type="submit" class="button-active" id="loginsubmit" value="Log In" disabled="disabled">
					</form>
					<div id="loginstatusbox">
						<p id="loginstatus">Checking for Saved Login...</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
<!-- No, I don't use min either. Sorry, Owen. -->
<div class="dialogmodal" id="tosmodal">
	<div class="dialogframe">
		<div class="dialogoutline">
			<div class="dialogbox">
				<div class="dialogarea">
					<h1 id="logintitle">Terms of Service</h1>
					<div id="tostext">
						<div id="toscontent">
						<?php require("tos.php"); ?>
						</div>
					</div>
					<input type="submit" class="button-danger" id="tosdecline" value="Decline">
					<input type="submit" class="button-success" id="tosaccept" value="Accept">
				</div>
			</div>
		</div>
	</div>
</div>
<div class="dialogmodal" id="settingsmodal">
	<div class="dialogframe">
		<div class="dialogoutline">
			<div class="dialogbox">
				<div class="dialogarea">
					<h1>Chat Settings</h1>
					<div id="settingstext">
						<div id="settingscontent">
							Show the following notifications:
							<ul class="settingslist">
								<li>
									<input type="checkbox" class="settingsnotif" id="settingsnotiflogin" setting="login" checked>
									<label for="settingsnotiflogin">Logins / Logouts</label>
								</li>
								<li>
									<input type="checkbox" class="settingsnotif" id="settingsnotifrecord" setting="record" checked>
									<label for="settingsnotifrecord">World Records</label>
								</li>
								<li>
									<input type="checkbox" class="settingsnotif" id="settingsnotiflevelup" setting="levelup" checked>
									<label for="settingsnotiflevelup">Fubar Level-Ups</label>
								</li>
								<li>
									<input type="checkbox" class="settingsnotif" id="settingsnotifmastery" setting="mastery" checked>
									<label for="settingsnotifmastery">Fubar Mastery Points</label>
								</li>
								<li>
									<input type="checkbox" class="settingsnotif" id="settingsnotifprestigeup" setting="prestigeup" checked>
									<label for="settingsnotifprestigeup">Fubar Prestige Ranks</label>
								</li>
							</ul>
							Discard saved session information:
							<input type="submit" class="button-danger" id="settingsdiscard" name="settingsdiscard" value="Discard">
							<br>
						</div>
					</div>
					<input type="submit" class="button-active" id="settingsclose" value="Close">
				</div>
			</div>
		</div>
	</div>
</div>
<!-- Yes, I have div-itis -->
<!-- Mobile detection element, should only display on phones. -->
<div id="mobiledetect">
</div>
<!-- Scripts come at the end so as not to keep the DOM waiting. -->
<script type="text/javascript" src="assets/scripts/utils.js"></script>
<script type="text/javascript" src="assets/scripts/webchat.js"></script>
<script type="text/javascript" src="assets/scripts/settings.js"></script>
<!-- Dynamically generated scripts at the end -->
<?php loadScripts(); ?>
</body>
</html>