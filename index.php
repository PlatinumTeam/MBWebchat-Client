<?php
define("WEBCHAT", 1);
require("user.php");

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

//Check for a skin name in either their parameter string or cookies, and verify that it exists
$skin = "white";
if (array_key_exists("skin", $_GET)) {
	if (is_file("assets/skins/{$_GET["skin"]}.css")) {
		$skin = $_GET["skin"];
	}
}
if (array_key_exists("skin", $_COOKIE)) {
	if (is_file("assets/skins/{$_COOKIE["skin"]}.css")) {
		$skin = $_COOKIE["skin"];
	}
}

//Prevent people from XSSing the skin parameter
$skin = strtolower($name);
$skin = preg_replace('/[^a-z0-9]/s', '', $skin);

//Generate a list of all the current skins.
$skins = array();
if (($dir = opendir("assets/skins/")) !== FALSE) {
	while (($file = readdir($dir)) !== FALSE) {
		//Ignore directories and index.html
		if ($file == "." || $file == ".." || $file == "index.html")
			continue;
		//Gets "white" from "path/to/white.css"
		$skins[] = pathinfo($file, PATHINFO_FILENAME);
	}
	closedir($dir);
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

	<!-- Support older browsers with crappy web sockets -->
	<script src="assets/jquery.gracefulWebSocket.js"></script>

	<!-- Styles in the head, so they load first -->
	<link rel="stylesheet" type="text/css" href="assets/webchat.css">
	<link id="styleskin" rel="stylesheet" type="text/css" href="assets/skins/<?=$skin?>.css">

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
			</div>
		</div>
	</div>
</div>
<!-- My forms are a disaster but at least I don't use Bootstrap. -->
<div id="loginmodal">
	<div id="loginframe">
		<div id="loginoutline">
			<div id="loginbox">
				<div id="loginarea">
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
<div id="tosmodal">
	<div id="tosframe">
		<div id="tosoutline">
			<div id="tosbox">
				<div id="tosarea">
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
<!-- Yes, I have div-itis -->
<!-- Mobile detection element, should only display on phones. -->
<div id="mobiledetect">
</div>
<!-- Scripts come at the end so as not to keep the DOM waiting. -->
<script type="text/javascript" src="assets/webchat.js"></script>
<?php
if (!empty($_SERVER["HTTPS"])) {?>
	<!-- Since you're using SSL, we need the SSL server's address -->
	<script type="text/javascript">
		webchat.servers[0].port = 9192;
		webchat.servers[0].address = "wss://marbleblast.com";
	</script>
	<?php
}
?>
<?php
if (array_key_exists("port", $_GET)) {
	$port = (int)$_GET["port"];
	echo("<script type=\"text/javascript\">webchat.servers[0].port = $port; if (webchat.servers.length > 1) webchat.servers.pop(1); </script>");
}
if (array_key_exists("address", $_GET)) {
	$address = addslashes($_GET["address"]);
	echo("<script type=\"text/javascript\">webchat.servers[0].address = '$address'; if (webchat.servers.length > 1) webchat.servers.pop(1);</script>");
}
?>
<!-- JSONP, should either load our user info or redirect us. -->
<?php
if (array_key_exists("username", $_COOKIE) && array_key_exists("key", $_COOKIE)) {
	//If we're here, then we're on marbleblast.com/webchat/ and we _do_ have their info. Spit it out for them.
	echo("<script type=\"text/javascript\">" . getLoginJSONP("JS") . "</script>");
} else {
	//If we're here, we're on webchat.marbleblast.com and we don't have their username. Send a JSONP request to
	// the main marbleblast.com domain (with cookies, which cannot be sent with XHR) which will return a script
	// for filling in their information (see above, user.php).
	echo("<script type=\"text/javascript\" src=\"//marbleblast.com/webchat/?getkey=JS\"></script>");
}
//The black skin has inverted colors by default
if ($skin === "black") {
	echo("<script type=\"text/javascript\">webchat.setInvertColors(true);</script>");
} else {
	echo("<script type=\"text/javascript\">webchat.setInvertColors(false);</script>");
}
?>
<!-- Dynamically generated skin list -->
<script type="text/javascript">webchat.skins = <?=json_encode($skins)?>; webchat.skin = "<?=$skin?>";</script>
</body>
</html>