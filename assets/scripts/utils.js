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
invertColor = function(color) {
	var r = parseInt(color.substring(0, 2), 16);
	var g = parseInt(color.substring(2, 4), 16);
	var b = parseInt(color.substring(4, 6), 16);

	//Super cool actually investigating this rather than just using a hue/saturation calculation
	r = 255 - r;
	g = 255 - g;
	b = 255 - b;
	var c = [r, g, b];

	//Which color index is the largest or smallest?
	var max   = r > g ? (r > b ? 0 : 2) : (g > b ? 1 : 2);
	var min   = r < g ? (r < b ? 0 : 2) : (g < b ? 1 : 2);

	//Which one did we not get?
	var other = (max + min == 1 ? 2 : (max + min == 3 ? 0 : 1));

	//Calculate c[other] (probably a cleaner way to do this)
	c[other] = (c[max] - c[other]) + c[min];

	//Save it because we can't just forget the value
	var cmax = c[max];

	//Swap the two of them
	c[max] = c[min];
	c[min] = cmax;

	var add = Math.floor(((255 * 3) - (c[0] + c[1] + c[2])) / 6);

	c[0] = (c[0] + add > 255 ? 255 : c[0] + add);
	c[1] = (c[1] + add > 255 ? 255 : c[1] + add);
	c[2] = (c[2] + add > 255 ? 255 : c[2] + add);

	r = c[0].toString(16).paddingLeft("00");
	g = c[1].toString(16).paddingLeft("00");
	b = c[2].toString(16).paddingLeft("00");

	return r + g + b;
};