<?php
defined("WEBCHAT") or die();

function getSkinName() {
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
	$skin = strtolower($skin);
	$skin = preg_replace('/[^a-z0-9]/s', '', $skin);

	return $skin;
}

function loadScripts() {
	$skin = getSkinName();

	//Generate a list of all the current skins.
	$skins = array();
	if (($dir = opendir("assets/skins/")) !== false) {
		while (($file = readdir($dir)) !== false) {
			//Ignore directories and index.html
			if ($file == "." || $file == ".." || $file == "index.html") {
				continue;
			}
			//Gets "white" from "path/to/white.css"
			$skins[] = pathinfo($file, PATHINFO_FILENAME);
		}
		closedir($dir);
	}
	if (!empty($_SERVER["HTTPS"])) {
		//Since you're using SSL, we need the SSL server's address
		echo("
<script type=\"text/javascript\">
	webchat.servers[0].port = 9192;
	webchat.servers[0].address = \"wss://marbleblast.com\";
</script>");    
	}
	if (array_key_exists("port", $_GET)) {
		$port = (int)$_GET["port"];
		echo("
<script type=\"text/javascript\">
	webchat.servers[0].port = $port;
	if (webchat.servers.length > 1)
		webchat.servers.pop(1);
</script>");
	}
	if (array_key_exists("address", $_GET)) {
		$address = addslashes($_GET["address"]);
		echo("
<script type=\"text/javascript\">
	webchat.servers[0].address = '$address';
	if (webchat.servers.length > 1)
		webchat.servers.pop(1);
</script>");
	}
	//JSONP, should either load our user info or redirect us.
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
	//Dynamically generated skin list
	echo("<script type=\"text/javascript\">webchat.skins = " . json_encode($skins) . "; webchat.skin = \"$skin\";</script>");
}