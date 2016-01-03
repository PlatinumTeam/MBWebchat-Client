//http://stackoverflow.com/a/14760377
String.prototype.paddingLeft = function (paddingValue) {
	return String(paddingValue + this).slice(-paddingValue.length);
};

//Horde of Torque methods and other helpers that are super useful
getWord = function(text, word) {
	return text.split(" ")[word];
};
getWordCount = function(text) {
	return text.split(" ").length;
};
getWords = function(text, start, end) {
	if (typeof(end) === "undefined")
		end = getWordCount(text);
	return text.split(" ").slice(start, end + 1).join(" ");
};
firstWord = function(text) {
	return getWord(text, 0);
};
restWords = function(text) {
	return getWords(text, 1, getWordCount(text));
};
decodeName = function(text) {
	return text.replace(/-SPC-/g, " ").replace(/-TAB-/g, "\t").replace(/-NL-/g, "\n");
};
encodeName = function(text) {
	return text.replace(/ /g, "-SPC-").replace(/\t/g, "-TAB-").replace(/\n/g, "-NL-");
};
htmlDecode = function(text) {
	//The server replaces spaces with + symbols because of issues with spaces.
	// We also need to encode all bare % symbols (with no numbers following) because
	// decodeURIComponent() thinks that they are HTML entities.

	//Also replace all &lt; &gt; and &amp; with their originals because we replace them below.

	//Nasty regex that gets all % symbols without any following 0-9a-f and replaces them with %25
	var toDecode = text
		.replace(/\+/g, " ")
		.replace(/%(?=[^0-9a-fA-F]+)/g, "%25")
		.replace(/&gt;/g, ">")
		.replace(/&lt;/g, "<")
		.replace(/&amp;/g, "&");

	var decoded = decodeURIComponent(toDecode);
	//HTML characters that need to be escaped (&, <, >)
	decoded = decoded
		.replace(/&/g, "&amp;")
		.replace(/>/g, "&gt;")
		.replace(/</g, "&lt;");
	return decoded;
};
formatTime = function(time) {
	var isNeg = (time < 0);
	time = Math.abs(time);

	//xx:xx.xxx
	var millis  =            (time %  1000)        .toString().paddingLeft("000");
	var seconds = Math.floor((time % 60000) / 1000).toString().paddingLeft("00");
	var minutes = Math.floor( time / 60000)        .toString().paddingLeft("00");

	return minutes + ":" + seconds + "." + millis;
};
upperFirst = function(str) {
	return str[0].toUpperCase() + str.substring(1);
};

