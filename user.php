<?php
//User login code for webchat-client. Gets users their login keys in either key or JSONP format.

//Don't let people run this from other pages
defined("WEBCHAT") or die();

$allow_nonwebchat = 1;
require("../leader/opendb.php");

function getKey($username) {
	//Get their chat key, or generate a new one if we need to
	$query = pdo_prepare("SELECT `chatkey` FROM `users` WHERE `username` = :username");
	$query->bind(":username", $username);
	$chatkey = $query->execute()->fetchIdx(0);
	if ($chatkey == "" || $chatkey == false) {
		//No key found, make them a new one
		$chatkey = strRand(32);
		$query = pdo_prepare("UPDATE `users` SET `chatkey` = :key WHERE `username` = :username");
		$query->bind(":key", $chatkey);
		$query->bind(":username", $username);
		$query->execute();
	}

	return $chatkey;
}

function getLoginJSONP($type) {
	require_once("../leader/jsupport.php");

	$success = false;
	$username = "";
	$key = "";

	//Ignore any messages from the login system that may corrupt our JSON
	ob_start();

	if (array_key_exists("username", $_COOKIE) && array_key_exists("key", $_COOKIE)) {
		//We may have saved these via javascript. Try loading them
		$username = strtolower($_COOKIE["username"]);
		$key = $_COOKIE["key"];
		$success = true;
	} else if (checkPostLogin() == 7) {
		//Can we log in with leaderboards?
		$username = strtolower(getPostValue("username"));
		$key = getKey($username);
		$success = true;
	} else {
		//Nope
		$success = false;
	}

	ob_end_clean();

	//Return their key formatted as specified
	if ($success) {
		if ($type === "JS") {
			return "webchat.setUser(\"$username\", \"$key\", \"true\"); webchat.connect();";
		} else if ($type === "JSON") {
			return json_encode(array("success" => true, "username" => $username, "key" => $key));
		}
	} else {
		if ($type === "JS") {
			return "webchat.enableLogin(true); webchat.showLogin(); webchat.setLoginStatus(\"No Saved Login Found\");";
		} else if ($type === "JSON") {
			return json_encode(array("success" => false));
		}
	}
}
