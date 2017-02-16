// seanwes talk
// Shared Functions & Whatnot
// Developed by Justin Michael

// !---- JSHint Configuration ----

/*
jshint
bitwise: true,
curly: true,
latedef: true,
nonbsp: true,
notypeof: true,
undef: true,
unused: true
*/

/* global console, $, moment, io, docCookies */

/* exported logDebug, conversationBeingEdited, justCreatedConversation, iOS, localStorageAvailable, logout, toggleLongMessage, toggleEventDetails, personClicked, toggleAnswered, infoHTML, eventsHTML, personAvatarAndNameHTML, toggleStar, inlineConversationWrapperStartHTML, inlineConversationWrapperEndHTML, conversationInfoBeingLoaded, conversationTypes, datasetAsObjectBugWorkaround, currentConferenceAttendeeGroup */

// The globals defined below should no longer be needed once shared.js and main.js are refactored to move all socket stuff to main.js.

/* global iOSNativeSendMessage, currentRoomOrConversationHistoryContainer, addLongIfNeeded, scrollHistoryTo, currentlyIn, makeConversationCurrent, conversationListenButtonHTML, conversationTitleHTML, makeRoomCurrent, conversationLinkHTML */

// !---- End JSHint Configuration ----

// !---- API Version ----
// WARNING: If this value doesn't match the one in server.js the client will get stuck in a reload loop.
var apiVersion = 113;

// !---- Debugging ----

var debugging = false;

// If you want to restrict debugging to specific functions put their names in this array.  If this array is empty, all logDebug() messages are logged to the console.
var debuggingFunctions = ['updateScrollInfo'];

var logDebug = function (){};

if (debugging) {
	logDebug = function (string, anonymousFunctionName) {
		var functionName = arguments.callee.caller.name;
		
		if (anonymousFunctionName) {
			functionName = anonymousFunctionName;
		}
		
		if (debuggingFunctions.length === 0 || debuggingFunctions.indexOf(functionName) > -1) {
			console.log(functionName + ': ' + string);
		}
	};
}

// !---- Globals ----

// The current conference attendee group in WordPress.
var currentConferenceAttendeeGroup = 'seanwesconference2017attendee';

// This is a placeholder for a variable that, when it's a function, will be called after successful authentication.
var afterAuthentication;

var onLoginPage = false;

// Stores information about the server once we connect to it.
var serverStatus = {};

// Have we logged in this session?
var loginSucceededThisSession = false;

// Are we logged in now?
var loggedIn = false;

// We want to reload when a login problem occurs most of the time, but not always.  This variable lets us control that behavior.
var reloadOnLoginProblem = true;

// Stores information about the person connected, one we've successfully connected and logged in.
var myPersonInfo = {};

// Stores information about the rooms.
// !TODO: Convert this into an object, similar to conversationsInfo.
var roomsInfo = [];

// Stores the conversation types.
var conversationTypes = [];

// Stores information about the conversations.  Properties are conversationIDs, values are conversationInfo objects.
var conversationsInfo = {};

// An array of conversation IDs that represent conversation info we're still waiting on from the server.
var conversationInfoBeingLoaded = [];

// The conversation currently being edited.
var conversationBeingEdited = null;

// Array of conversations being listened to (conversationIDs).
var conversationsBeingListenedTo = [];

// True when conversationDetails are visible.
var conversationDetailsVisible = false;

// This will be set to true when creating a new conversation, so when the server creates the new conversation we know to switch to it.
var justCreatedConversation = false;

// Stores information about the push notifications we're subscribed to (we get this after a successful login).
var pushSubscriptions = [];

// Global variables to hold audio stream info, for later.
var audioStreamStatus = null;
var audioStreamInfo = null;

// Is this an iOS device (either an iOS web browser or the iOS app).
var iOS = navigator.userAgent.match(/(iPad|iPhone|iPod)/g) ? true : false;

// This is temporarally set to false when the server is full, so as not to confuse people.
var showDisconnectMessage = true;

function storageAvailable(type) {
	try {
		var storage = window[type],
			x = '__storage_test__';
		storage.setItem(x, x);
		storage.removeItem(x);
		return true;
	}
	catch(e) {
		return false;
	}
}

var localStorageAvailable = storageAvailable('localStorage');

// The talkContext allows us to make decisions based on what kind of client situation we're dealing with (chat, backlog, etc.).
var talkContext = '';
if (window.location.pathname == '/') {
	talkContext = 'chat';
}
else if (window.location.pathname.indexOf('backlog') > -1) {
	talkContext = 'backlog';
}
else if (window.location.pathname.indexOf('login') > -1) {
	talkContext = 'login';
}

// !---- Socket.IO Connection ----

// Use websockets only to prevent performance and other issues.  Just trust me on this one.
var queryParameters = window.location.search;

if (queryParameters.charAt(0) === '?') {
	queryParameters = queryParameters.slice(1);
}

var socket = io({
	transports: ['websocket'],
	query: queryParameters
});

// !---- Functions ----

// !---- Info Display Functions ----

// Displays a message at the top of the chat interface.
var hideInfoTimeout;

// Hides the info message at the top of the chat interface.
function hideInfo() {
	$('#info').removeClass();
	setTimeout(function () {
		$('#info').text('');
	}, 1000);
}

function showInfo(message, type, momentary) {
	type = type || 'info';
	momentary = momentary || false;
	console.log('Info (' + type + '): ' + message);
	$('#info').removeClass();
	$('#info').text(message);
	$('#info').addClass(type);
	$('#info').addClass('opaque');
	if (momentary) {
		hideInfoTimeout = setTimeout(function () {
			hideInfo();
		}, 2500);
	}
	else {
		clearTimeout(hideInfoTimeout);
	}
}

function nope() {
	$('body').html('');
	$('body').css('background', 'url("/custom-emoji/nope.png") center center no-repeat #2e2e2e').css('background-size', '64px 32px');
}

// !---- Overlay (Help, etc.) Functions ----

var overlayClearTimeout;

// Displays the modal overlay with the specified html.
function showOverlayWithHTML(html) {
	if (overlayClearTimeout) {
		clearTimeout(overlayClearTimeout);
		
		overlayClearTimeout = null;
	}
	
	// Remove focus from all text input fields.
	$('textfield, input').blur();
	
	// Put the specified HTMl into the overlay's .content element.
	$('#overlay .content').html(html);
	
	// Make sure all the links that should open in a new window/tab do so.
	$('#overlay .content .linksTargetBlank a').attr('target', '_blank');
	
	// Make sure the overlay content is scrolled to the top (it may have been scrolled the last time it was displayed).
	$('#overlay .content').scrollTop(0);
	
	// Reveal the overlay by removing the classes that hide it.
	$('#overlay').removeClass('dismissing').removeClass('hidden');
}

// Hides the modal overlay and, optionally, returns focus to the message field.
function hideOverlay(focusMessageField, immediately) {
	// Hide the overlay by adding the classes that hide it.
	$('#overlay').addClass('dismissing').addClass('hidden');
	
	conversationDetailsVisible = false;
	
	conversationBeingEdited = null;
	
	var dismissDuration = 500;
	
	if (immediately) {
		dismissDuration = 0;
	}
	
	// After the overlay dismissal animations have completed...
	overlayClearTimeout = setTimeout(function () {
		// Empty out the content of the overlay.
		$('#overlay .content').text('');
		
		// Return focus to the message field if instructed to do so.
		if (focusMessageField) {
			$('#message').focus();
		}
		
		overlayClearTimeout = null;
	}, dismissDuration); // Note: This duration has to match the animation duration in the CSS!
}

// !---- Login Functions ----

function saveReconnectInfo(forever) {
	if (forever || docCookies.getItem('rememberMe')) {
		docCookies.setItem('personID', myPersonInfo.id, Infinity);
		docCookies.setItem('token', myPersonInfo.token, Infinity);
		docCookies.setItem('rememberMe', true, Infinity);
	} else {
		docCookies.setItem('personID', myPersonInfo.id);
		docCookies.setItem('token', myPersonInfo.token);
	}
}

function logout() {
	if (window.iOSNative) {
		iOSNativeSendMessage('logout');
	}
	// Remove all cookies.
	docCookies.keys().forEach(function (cookieKey) {
		docCookies.removeItem(cookieKey);
	});
	// Reload the page, bypassing the cache.
	console.log('Reloading due to logout.');
	document.location.reload(true);
}

// !---- Timezone Functions ----

// Returns the timezone offset of the client's current timezone.
function getTimezoneOffset() {
	var timezoneOffset = 0;
	var aMoment = moment();
	if (aMoment && aMoment.utcOffset && typeof aMoment.utcOffset === 'function') {
		timezoneOffset = aMoment.utcOffset();
	}
	return timezoneOffset;
}

// !---- Emit Functions ----

function emitUserProfile(personID) {
	socket.emit('user profile', {
		personID: personID
	});
}

function emitStarMessage(eventID) {
	socket.emit('star message', {
		eventID: eventID
	});
}

function emitUnstarMessage(eventID) {
	socket.emit('unstar message', {
		eventID: eventID
	});
}

function emitClientError(message, url, lineNumber) {
	socket.emit('client error', {
		message: message,
		url: url,
		lineNumber: lineNumber,
		userAgent: navigator.userAgent
	});
}

function emitGuestLogin(name, email, clientType) {
	docCookies.setItem('theme', 'dark', Infinity);
	$('#darkModeCheckbox').prop('checked', true);
	$('body').addClass('dark');
	console.log('Emitting guest login...');
	socket.emit('guest login', {
		name: name,
		email: email,
		clientType: clientType,
		timezoneOffset: getTimezoneOffset(),
		talkContext: talkContext
	});
}

function emitMemberLogin(username, password, clientType) {
	reloadOnLoginProblem = false;
	docCookies.setItem('theme', 'dark', Infinity);
	$('#darkModeCheckbox').prop('checked', true);
	$('body').addClass('dark');
	$('#memberLoginStatus').text('Logging in...');
	console.log('Emitting member login...');
	socket.emit('member login', {
		username: username,
		password: password,
		clientType: clientType,
		timezoneOffset: getTimezoneOffset(),
		talkContext: talkContext
	});
}

function emitPersonReconnect(personID, token, clientType) {
	$('#guestLoginStatus').text('Logging in...');
	console.log('Emitting person reconnect...');
	socket.emit('person reconnect', {
		personID: personID,
		token: token,
		clientType: clientType,
		timezoneOffset: getTimezoneOffset(),
		talkContext: talkContext
	});
}

// This function takes a dataset, converts it to JSON, then converts said JSON back into an object, which it then returns.  This is a workaround for this bug: https://bugs.webkit.org/show_bug.cgi?id=161454  When that bug is no longer an issue this function can be removed from the entire app.  Note that this bug only affects reading properties from datasets; creating, editing, and deleting them directly works just fine.
function datasetAsObjectBugWorkaround(dataset) {
	return JSON.parse(JSON.stringify(dataset));
}

// !---- Potentially Detremental Scrolling Functions ----

/*

When someone is scrolled to the bottom of #history we want to keep them scrolled to the bottom, but various things happen that alter the size or content of #history that prevent this from being the case unless we take steps to correct the scroll position.

The beginPotentiallyDetrementalScroll() and endPotentiallyDetrementalScroll() functions are designed to be wrapped around any code that could potentially alter the scroll position of #history in an undesired way.

To give you an idea of what kind of things I'm talking about, here's a list (that may not be complete):

- The size of the message field/footer changes to accomidate the size of the content.
- Font size changes.
- New live events added.
- Video split adjustments.
- Window resized.
- Left/right panels hidden or revealed.
- Message hidden or revealed.
- Message starred or unstarred (changes to the star count can cause text to wrap in different ways, which could change the height of the message).
- Message details revealed or hidden (clicking on the (i) button).
- Long messages expanded or collapsed.
- History is prepended.  (Note that this case has additional scroll handling logic in the 'history' message handling code to maintain the visual scroll position.)

*/

var potentiallyDetrementalScrollEventInProgress = false;

function beginPotentiallyDetrementalScroll() {
	// We're doing a potentially detremential scroll.
	potentiallyDetrementalScrollEventInProgress = true;
}

// At the end of the potentially detremental scroll event we want to restore the "proper" scroll position.
function endPotentiallyDetrementalScroll(recomputeLongMessages) {
	// Get the current room/conversation container.
	var container = currentRoomOrConversationHistoryContainer();
	
	// If a room or conversation is current...
	if (container) {
		var containerID = container.id;
		
		if (recomputeLongMessages) {
			addLongIfNeeded('#' + containerID + ' .event.message');
		}
		
		var scrollPosition = datasetAsObjectBugWorkaround(container.dataset).scrollPosition;
		
		// If the current room/conversation is set to be scrolled to the bottom, scroll it back to the bottom following the potentially detremental scroll event.
		if (scrollPosition === 'bottom') {
			scrollHistoryTo(scrollPosition);
		}
	}

	// We're no longer doing a potentially detremental scroll.
	potentiallyDetrementalScrollEventInProgress = false;
}

// !---- Message/Event Functions ----

// Show or hide the entire contents of a long message.
function toggleLongMessage(eventElementID) {
	if (talkContext === 'chat') {
		beginPotentiallyDetrementalScroll();
	}
	
	var $event = $('.' + eventElementID); // The event's (message's) wrapper element.
	var $button = $('.' + eventElementID + ' .longButton button'); // The show/hide button.
	
	// If this event already has its entire content visible, collapse it.
	if ($event.hasClass('longVisible')) {
		$event.removeClass('longVisible');
		$button.html('&#9660;');
	} 
	// If this event had part of it's content hidden, show it.
	else {
		$event.addClass('longVisible');
		$button.html('&#9650;');
	}
	
	if (talkContext === 'chat') {
		endPotentiallyDetrementalScroll();
	}
}

function toggleEventDetails(eventElementClass) {
	if (talkContext === 'chat') {
		beginPotentiallyDetrementalScroll();
	}
	
	$('.' + eventElementClass).toggleClass('detailsVisible');
	
	if (talkContext === 'chat') {
		endPotentiallyDetrementalScroll();
	}
}

// Encodes a personObject using URI and JSON encoding so that it can be used inside JavaScript that's inside an HTML element's attribute, like onclick.
function encodePersonObject(personObject) {
	return encodeURIComponent(JSON.stringify(personObject)).replace(/'/g, "\\'");
}

function personClickedCallString(personObject, viewProfile, roomID, conversationID) {
	// If viewProfile is truthy, we want to spit out something that looks like this:
	
	// personClicked('encodedPersonObject', true)
	
	// If it's not, we want to spit this out:
	
	// personClicked('encodedPersonObject', false, <eventInfo.roomID>, <eventInfo.conversationID>)
	
	var string = "personClicked('";
	string += encodePersonObject(personObject);
	string += "'";
	
	if (viewProfile) {
		string += ', true)';
	}
	else {
		string += ', false, ';
		string += roomID ? roomID : 'null';
		string += ', ';
		string += conversationID ? conversationID : 'null';
		string += ')';
	}
	
	return string;
}

// Handles when a person is clicked by either mentioning them or showing their profile.
function personClicked(personObjectEncoded, viewProfile, roomID, conversationID) {
	// What can happen when a person is clicked?
	
	// See their profile.
	// Mention them in the current room/conversation.
	// Switch to conversation and mention them there.
	
	// Get the person's information object.
	var personObject = JSON.parse(decodeURIComponent(personObjectEncoded));
	
	// If we're in the backlog there's no such thing as mentioning someone, so we always want to view their profile.
	if (talkContext === 'backlog') {
		viewProfile = true;
	}
	
	// View their profile if they're a WordPress user.
	if (viewProfile && personObject.personID.charAt(0) == 'w') {
		showOverlayWithHTML('<h2>' + personObject.name + '</h2><p>Loading...</p>');
		emitUserProfile(personObject.personID);
		return;
	}
	
	// If a conversation ID is specified switch to it if it isn't current.
	if (roomID && conversationID && !currentlyIn(roomID, conversationID)) {
		makeConversationCurrent(conversationID);
		// !TODO: We might want to scroll to the event in question as well?
	}
	// If a room ID is specified switch to it if it isn't current.
	else if (roomID && !currentlyIn(roomID)) {
		makeRoomCurrent(roomID);
	}
	
	// Mention them.
	
	// Get the message textarea element.
	var $messageElement = $("#message");
	
	// Get the existing message.
	var existingMessage = $messageElement.val();
	
	// Get the current caret position, or the end of the current selection.
	var caretPosition = $messageElement[0].selectionEnd;
	
	// Assemble the new message containing the mention.
	var newMessage = existingMessage.substring(0, caretPosition) + '@' + personObject.name + ': ' + existingMessage.substring(caretPosition);
	
	// Put the new message in the message field.
	$messageElement.val(newMessage);
	
	// Focus the message field.
	$messageElement.focus();
	
	// Put the caret after the person's name (the +3 accounts for the @, the :, and the trailing space).
	$messageElement[0].selectionStart = caretPosition + personObject.name.length + 3;
}

function toggleAnswered(eventID) {
	var $eventElements = $('.event-' + eventID);
	
	if ($eventElements.hasClass('answered')) {
		socket.emit('unanswer message', {
			eventID: eventID
		});
	} else {
		socket.emit('answer message', {
			eventID: eventID
		});
	}
}

// !---- Event Rendering Functions ----

function timestampFormatted(timestamp) {
	var timeString = '';

	if (!timestamp) {
		timeString = moment().calendar();
	} else {
		timeString = moment.unix(timestamp).calendar();
	}

	return timeString;
}

// Generates the HTML (<div class="timestamp">) for a timestamp, which is used in messages and other events.
function timestampHTML(timestamp) {
	return '<div class="timestamp">' + timestampFormatted(timestamp) + '</div>\n';
}

// Generates HTML for an informational event.
function infoHTML(content, eventID, timestamp) {
	var classes = 'info';
	if (eventID) {
		classes += ' event event-' + eventID;
	}
	return '<div class="' + classes + '">' + timestampHTML(timestamp) + content + '</div>\n';
}

// Generates a class string (suitable for use inside the class attribute of an HTML element) containing the classes that the specified person should have.
function generatePersonClasses(personID, personInfoOrEventInfo) {
	var personClasses = 'person';
	
	if (personID == myPersonInfo.id) {
		personClasses += ' me';
	}
	
	if (personInfoOrEventInfo.guest) {
		personClasses += ' guest';
	}
	else {
		personClasses += ' member';
	}
	
	if (personInfoOrEventInfo.moderator) {
		personClasses += ' moderator';
	}
	
	if (personInfoOrEventInfo.owner) {
		personClasses += ' owner';
	}
	
	if (personInfoOrEventInfo.muted) {
		personClasses += ' muted';
	}
	
	if (personInfoOrEventInfo.onair) {
		personClasses += ' onair';
	}
	
	return personClasses;
}

// Generates the <img> element for an avatar.
function avatarImageHTML(avatarURL, size, style) {
	var sizeMultiplier = 2;
	if (window.devicePixelRatio) {
		sizeMultiplier = window.devicePixelRatio;
	}
	var imageSizeParameter = size * sizeMultiplier;
	if (!style) {
		style = '';
	}
	return '<img class="avatar" src="' + avatarURL + '&s=' + imageSizeParameter + '" height="' + size + '" width="' + size + '" style="' + style + '">\n';
}

function personNameHTML(personObject, roomID, conversationID) {
	var html = '<span class="personClick" onclick="' + personClickedCallString(personObject, false, roomID, conversationID) + '">\n';
	html += '<span class="name">' + personObject.name + '</span>\n';
	html += '</span>\n';
	return html;
}

function personAvatarAndNameHTML(personObject, avatarURL, avatarSize, roomID, conversationID) {
	var html = '<span class="personClick" onclick="' + personClickedCallString(personObject, true) + '">\n';
	html += avatarImageHTML(avatarURL, avatarSize);
	html += '</span>\n';
	html += personNameHTML(personObject, roomID, conversationID);
	return html;
}

// Generates the HTML that contains a person's avatar and name, which is used above messages that belong to them.
function personInfoHTML(eventInfo, hide) {
	var personClasses = generatePersonClasses(eventInfo.personID, eventInfo);
	
	if (hide) {
		personClasses += ' hidden';
	}
	
	var personObject = {
		personID: eventInfo.personID,
		name: eventInfo.name
	};
	
	var personHTML = '<div class="' + personClasses + '">\n';
	personHTML += personAvatarAndNameHTML(personObject, eventInfo.avatarURL, 32, eventInfo.roomID, eventInfo.conversationID);
	if (talkContext === 'backlog') {
		var room = roomsInfo.filter(function (room) {
			return room.id === eventInfo.roomID;
		})[0];
		if (room) {
			personHTML += '<span class="roomName">' + room.name + '</span>';
		} else {
			personHTML += '<span class="roomName">-</span>';
		}
	}
	personHTML += timestampHTML(eventInfo.created);
	personHTML += '</div>\n';
	return personHTML;
}

// Escapes a string for use in a regular expression.  For example, if you wanted to use the string "foo$bar" in a regular expression, the $ would need to be escaped, resulting in "foo\$bar", which is what this function does for you.
function escapeRegExp(string) {
	return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

// Wrapper for global find and replace using RegExp() and String's replace() method.
function replaceAll(string, find, replace) {
	if (typeof string === 'string') {
		return string.replace(new RegExp(escapeRegExp(find), 'g'), replace);
	}
	return null;
}

function insertConversationLinks(string) {
	if (string && string.indexOf('<pre>') !== 0) {
		return string.replace(/\(\(c([0-9]+)\)\)/gi, function (match, conversationID) {
			var conversationInfo = conversationsInfo[conversationID];
			
			if (conversationInfo && conversationInfo.id) {
				return conversationLinkHTML(conversationInfo);
			}
			
			return '<em>Conversation ' + conversationID + ' is not active.</em>';
		});
	}
	else {
		return string;
	}
}

// Generates the HTML for a message.
function messageHTML(eventInfo) {
	var classes = 'event message event-' + eventInfo.id;
	if (eventInfo.question) {
		classes += ' question';
	}
	if (eventInfo.stars > 0) {
		classes += ' starred';
	}
	if (eventInfo.hidden) {
		classes += ' hidden';
	}
	if (eventInfo.answered) {
		classes += ' answered';
	}
	if (myPersonInfo && myPersonInfo.starredEvents && myPersonInfo.starredEvents.indexOf(eventInfo.id) !== -1) {
		classes += ' starredByMe';
	}
	var contentHTML = eventInfo.contentHTML;
	
	// The server-side Markdown formatting will replace " with &quot;, so we need to do the same thing here for mention comparisons to work.
	var myNameForMentionComparison = replaceAll(myPersonInfo.name, '"', '&quot;');
	
	// Highlight mentions.
	contentHTML = replaceAll(contentHTML, myNameForMentionComparison, '<span class="nameHighlight">' + myNameForMentionComparison + '</span>');
	
	// Create a person object.
	var personObject = {
		personID: eventInfo.personID,
		name: eventInfo.name
	};
	
	// Handle actions.
	if (eventInfo.action && contentHTML) {
		classes += ' action';
		if (contentHTML.slice(0, 3) == '<p>') {
			contentHTML = '<p>' + personNameHTML(personObject, eventInfo.roomID, eventInfo.conversationID) + contentHTML.slice(3);
		} else {
			contentHTML = personNameHTML(personObject, eventInfo.roomID, eventInfo.conversationID) + ' ' + contentHTML;
		}
	}
	
	// Conversation links.
	contentHTML = insertConversationLinks(contentHTML);
	
	var html = '<div data-event-id="' + eventInfo.id + '" class="' + classes + '">\n';
	html += '<button class="details" onclick="toggleEventDetails(\'event-' + eventInfo.id + '\')">i</button>\n';
	html += '<div class="answered moderatorOnly" onclick="toggleAnswered(' + eventInfo.id + ')"></div>\n';
	html += '<div class="stars" onclick="toggleStar(' + eventInfo.id + ')">' + eventInfo.stars + '</div>\n';
	if (serverStatus.guestServer) {
		html += '<button class="moderatorOnly hideButton messageDetailsButton" onclick="hideMessage(' + eventInfo.id + ')">Hide</button> ';
		html += '<button class="moderatorOnly revealButton messageDetailsButton" onclick="revealMessage(' + eventInfo.id + ')">Reveal</button> ';
	}
	html += '<div class="content" data-person-id="' + eventInfo.personID + '">\n';
	html += contentHTML;
	html += '</div>\n'; // div.content
	html += '<div class="longButton"><button onclick="toggleLongMessage(\'event-' + eventInfo.id + '\')">&#9660;</button></div>\n';
	html += '<div class="details">\n';
	var createdMoment = moment.unix(eventInfo.created);
	var localTimeString = createdMoment.format('dddd, MMMM Do YYYY, h:mm:ss A');
	var remoteMoment;
	var remoteTimeString = '';
	if (createdMoment.utcOffset && typeof createdMoment.utcOffset === 'function') {
		remoteMoment = createdMoment.utcOffset(eventInfo.timezoneOffset);
	}
	if (remoteMoment && remoteMoment.format && typeof remoteMoment.format === 'function') {
		remoteTimeString =  ' (Origin: ' + remoteMoment.format('dddd, h:mm:ss A') + ')';
	}
	html += '<strong>' + localTimeString + '</strong>' + remoteTimeString;
	html += ' <a class="permalink" href="/backlog/?event=' + eventInfo.id + '" target="_blank" title="Permalink to this message.">Permalink</a> ';
	html += '<button onclick="' + personClickedCallString(personObject, true) + '">View Profile</button> ';
	html += '<button class="moderatorOnly hideButton" onclick="hideMessage(' + eventInfo.id + ')">Hide</button> ';
	html += '<button class="moderatorOnly revealButton" onclick="revealMessage(' + eventInfo.id + ')">Reveal</button> ';
	if (eventInfo.personID != myPersonInfo.id) {
		html += '<button class="moderatorOnly" onclick="toggleMute(\'' + eventInfo.personID + '\')">Toggle Mute</button>';
		html += '<button class="moderatorOnly" onclick="askToKickPerson(\'' + eventInfo.personID + '\')">Kick Person</button>';
	}
	html += '</div>\n'; // div.details
	html += '</div>\n'; // div.message
	return html;
}

// Generates the HTML for an event.
function eventHTML(eventInfo, lastSpeaker, lastTimestamp, hidePersonInfo) {
	lastTimestamp = parseInt(lastTimestamp);
	
	if (eventInfo.context === 'room' || eventInfo.context === 'conversation' || eventInfo.context === 'dm') {
		var html = '';

		if (eventInfo.type === 'message') {
			if (typeof lastSpeaker === 'undefined' || eventInfo.personID != lastSpeaker || eventInfo.created - lastTimestamp > 300) {
				html += personInfoHTML(eventInfo, hidePersonInfo);
			}
			
			html += messageHTML(eventInfo);
			
			return html;
		}
		else if (eventInfo.type === 'newConversation') {
			var conversationInfo = conversationsInfo[eventInfo.conversationID];
			
			if (conversationInfo) {
				html = '<div data-event-id="' + eventInfo.id + '" class="event newConversationAnnouncement"><em>New Conversation &rarr;</em> ' + conversationLinkHTML(conversationInfo) + '</div>';
			}
			
			return html;
		}
	}
	return '';
}

function inlineConversationWrapperStartHTML(conversationID) {
	// Start the conversation events wrapper for the conversation that the event belongs to.
	var html = '<div data-inline-conversation-wrapper="' + conversationID + '" data-conversation-id="' + conversationID + '">';
	
	// If we have the conversationInfo, use it.
	if (conversationsInfo.hasOwnProperty(conversationID)) {
		var conversationInfo = conversationsInfo[conversationID];
		
		html += conversationListenButtonHTML(conversationInfo.id);
		
		html += conversationTitleHTML(conversationInfo);
	}
	// If we don't have the conversation info, we need to request it from the server.
	else {
		html += conversationListenButtonHTML(conversationID);
		
		html += conversationTitleHTML(null, conversationID);
		
		// The response to this request will populate the conversation elements with the proper information.
		if (conversationInfoBeingLoaded.indexOf(conversationID) === -1) {
			conversationInfoBeingLoaded.push(conversationID);
		}
		
		socket.emit('get conversation info', {
			conversationID: conversationID
		});
	}
	
	// Now we add the div the events are going to go in.
	html += '<div class="conversationWrappedEvents">';

	return html;
}

function inlineConversationWrapperEndHTML() {
	return '</div></div>';
}

// Generates HTML for an array of events.
function eventsHTML(eventsInfo, forRoom) {
	var currentConversationID;
	var currentSpeakerID;
	var currentTimestamp;
	
	var html = '';
	
	eventsInfo.forEach(function (eventInfo) {
		// If this is for a room and this event belongs to a conversation...
		if (forRoom && eventInfo.conversationID && eventInfo.type === 'message') {
			// If the event does not belong to the conversation we're currently in.
			if (eventInfo.conversationID != currentConversationID) {
				// First we need to close the existing conversation events wrapper, if there is one.
				if (currentConversationID) {
					html += '</div></div>';
				}
				
				currentSpeakerID = null;
				
				currentConversationID = eventInfo.conversationID;
				
				// Start the conversation events wrapper for the conversation that the event belongs to.
				html += inlineConversationWrapperStartHTML(eventInfo.conversationID);
				
				currentConversationID = eventInfo.conversationID;
			}
		}
		else {
			// If there's an open conversation wrapper, close it.
			if (currentConversationID) {
				html += '</div></div>';
				currentConversationID = null;
				currentSpeakerID = null;
			}
		}
		
		// If this message is hidden, and this person isn't the current speaker, that means there isn't an existing visible person info element for this message, so we need to create one and hide it.  Also, because it's hidden, we're not counting this person as the current speaker.
		if (eventInfo.hidden && eventInfo.personID != currentSpeakerID) {
			currentSpeakerID = null;
		}
		
		// If this is a new conversation announcement, discard the current speaker ID.
		if (eventInfo.type === 'newConversation') {
			currentSpeakerID = null;
		}
		
		html += eventHTML(eventInfo, currentSpeakerID, currentTimestamp, eventInfo.hidden);
		
		currentTimestamp = eventInfo.created;
		
		if (eventInfo.type === 'message' && !eventInfo.hidden) {
			currentSpeakerID = eventInfo.personID;
		}
		else {
			currentSpeakerID = null;
		}
	});
	
	if (currentConversationID) {
		html += '</div></div>';
		currentConversationID = null;
		currentSpeakerID = null;
	}
	
	return html;
}

// !---- Stars ----

// Toggles the current person's star on the given event (message).
function toggleStar(eventID) {
	var $eventElements = $('.event-' + eventID);
	
	if ($eventElements.hasClass('starredByMe')) {
		// Remove the star.
		emitUnstarMessage(eventID);
	} else {
		// Add a star.
		emitStarMessage(eventID);
	}
}

// !---- Preflight ----

// Let the user know we're working on connecting.
showInfo('Connecting...', 'info');

// !---- Moment Configuration ----

moment.locale('en', {
	calendar: {
        lastDay: '[Yesterday,] LT',
        sameDay: 'LT',
        nextDay: '[Tomorrow,] LT',
        lastWeek: 'dddd[,] LT',
        nextWeek: 'dddd[,] LT',
        sameElse: 'ddd, MMM Do, YYYY, h:mm A'
    }
});

// !---- Login Events ----

// When the enter key is pressed in any guest login field initiate the guest login process.
$('#guestName, #guestEmail, #guestRemember').keypress(function (event) {
	if (event.which == 13) {
		emitGuestLogin($('#guestName').val(), $('#guestEmail').val(), 'web');
		return false;
	}
});

// When the guest login button is clicked or tapped initiate the guest login process.
$('#guestLoginButton').click(function () {
	emitGuestLogin($('#guestName').val(), $('#guestEmail').val(), 'web');
});

// When the enter key is pressed in any member login field initiate the member login process.
$('#memberUsername, #memberPassword, #memberRemember').keypress(function (event) {
	if (event.which == 13) {
		emitMemberLogin($('#memberUsername').val(), $('#memberPassword').val(), 'web');
		return false;
	}
});

// When the member login button is clicked or tapped initiate the member login process.
$('#communityLogin #memberLoginButton').click(function () {
	emitMemberLogin($('#memberUsername').val(), $('#memberPassword').val(), 'web');
});

// Clicking or tapping "behind" the overlay (in the shaded part) should dismiss the overlay.
$('#overlay').click(function () {
	hideOverlay();
});

// Clicking or tapping on the overlay's hide button should hide the overlay.
$('#overlay .hideButton').click(function () {
	hideOverlay();
});
	
// Stop overlay content click propagation.
$("#overlay .content").click(function (event) {
	event.stopPropagation();  
});

// !---- Built-In Socket.IO Events ----
	
// !connect
socket.on('connect', function () {
	// Nothing is currently done on connect; everything is kicked off when the server sends the 'server status' message.  This method is intentionally included and left blank so I don't forget it exists. :)
});

// !reconnect
socket.on('reconnect', function (data) {
	// Display the reconnect info in console.
	console.log('Reconnect:', data);
	
	// Let the user know we reconnected.
	showInfo('Reconnected...', 'success', true);
	
	// If we've got myPersonInfo and a token, emit person reconnect.
	if (typeof myPersonInfo.id !== 'undefined' && myPersonInfo.token !== 'undefined') {
		emitPersonReconnect(myPersonInfo.id, myPersonInfo.token, 'web');
	}
	// Otherwise display reloading message in console and reload the page, bypassing the cache.
	else {
		console.log('Reloading due to reconnect!');
		document.location.reload(true);
	}
});

// !connect_error
socket.on('connect_error', function (data) {
	console.log('Connect Error:', data);
	showInfo('Connection error.', 'error');
});

// !connect_timeout
socket.on('connect_timeout', function () {
	showInfo('Connection timeout.', 'error');
});

// !reconnect_attempt
socket.on('reconnect_attempt', function () {
	showInfo('Reconnecting...', 'info');
});

// !reconnecting
socket.on('reconnecting', function (data) {
	console.log('Reconnection attempt:', data);
	showInfo('Reconnecting...', 'info');
});

// !reconnect_error
socket.on('reconnect_error', function (data) {
	console.log('Reconnect Error:', data);
	showInfo('Reconnection error, trying again...', 'error');
});

// !reconnect_failed
socket.on('reconnect_failed', function (data) {
	console.log('Reconnect Failed:', data);
	showInfo('Reconnect failed.', 'error');
});

// !disconnect
socket.on('disconnect', function () {
	if (showDisconnectMessage) {
		showInfo('Disconnected.', 'warning');
	}
	loggedIn = false;
});

// !---- Socket.IO Events ----

// !nope
socket.on('nope', function () {
	nope();
});

// !personLimitReached
socket.on('socket limit reached', function () {
	showInfo('The chat is full! Hang on...', 'error', false);
	showDisconnectMessage = false;
	console.log('Reloading due to person limit being reached!');
	document.location.reload(true);
});

// !login problem
socket.on('login problem', function (data) {
	// Most of the time we're going to want to trash the auth cookies and reload the page if there's a login problem.
	if (reloadOnLoginProblem) {
		docCookies.removeItem('personID');
		docCookies.removeItem('token');
		console.log('Reloading due to login problem:', data);
		document.location.reload(true);
	}
	// But if we're on the login screen we just want to display the login problem to the user instead.
	else {
		$('#memberLoginStatus').text(data);
	}
});

// !data problem
// Data problems occur when the data being sent from the client to the server is bad in some way.  The server will emit the 'data problem' event and supply a human-readable message explaining what the problem is when this happens, which should be shown to the user.
socket.on('data problem', function (data) {
	showInfo(data, 'error', true);
	console.log('data problem:', data);
});

// !connection problem
// If there's an issue with the connection the server will emit this message.  Like 'data problem' events above, the server will proide a human-readable message that should be shown to the user.
socket.on('connection problem', function (data) {
	showInfo(data, 'error', true);
	console.log('connection problem:', data);
});

// !star message problem
socket.on('star message problem', function (data) {
	showInfo('Unable to add star to message ' + data.eventID + '.', 'error', true);
});

// !message starred
socket.on('message starred', function (data) {
	// Changing the star count of a message may cause the height of that message to change as the text layout changes.  Thus, this is a potential scroll event.
	if (talkContext === 'chat') {
		beginPotentiallyDetrementalScroll();
	}
	
	// Get the event element belonging to the event that was starred.
	var $eventElements = $('.event-' + data.eventID);
	
	// Add the 'starred' class to the event element.
	$eventElements.addClass('starred');
	
	// If we're the one starring it, add the 'starredByMe' class.
	if (data.personID == myPersonInfo.id) {
		$eventElements.addClass('starredByMe');
	}
	
	// Get the event's stars element (this is the elemnt that display the star count).
	var $eventStarsElements = $('.event-' + data.eventID + ' div.stars');
	
	// Update the star count.
	$eventStarsElements.text(data.starCount);
	
	if (talkContext === 'chat') {
		endPotentiallyDetrementalScroll();
	}
});

// !unstar message problem
// If something goes wrong with removing a star from a message, let the user know.
socket.on('unstar message problem', function (data) {
	showInfo('Unable to remove star from message ' + data.eventID + '.', 'error', true);
});

// !message unstarred
socket.on('message unstarred', function (data) {
	// Changing the star count of a message may cause the height of that message to change as the text layout changes.  Thus, this is a potential scroll event.
	if (talkContext === 'chat') {
		beginPotentiallyDetrementalScroll();
	}
	
	// Get the event elements.
	var $eventElements = $('.event-' + data.eventID);
	
	// Get the event's stars elements.
	var $eventStarsElements = $('.event-' + data.eventID + ' div.stars');
	
	// Update the star count.
	$eventStarsElements.text(data.starCount);
	
	// If the star count is zero, this event is no longer starred.
	if (data.starCount <= 0) {
		$eventElements.removeClass('starred');
	}
	
	// If this message was unstarred by us, this message is no longer starred by us.
	if (data.personID == myPersonInfo.id) {
		$eventElements.removeClass('starredByMe');
	}

	if (talkContext === 'chat') {
		endPotentiallyDetrementalScroll();
	}
});

// !user profile
// The server will send the 'user profile' event after the client requests a user's profile, such as when a user's avatar is clicked or tapped.
socket.on('user profile', function (data) {
	
	// Get the profile info out of the data.
	var profile = data.profile;
	
	// Generate the avatar HTML for the profile.
	var avatarHTML = avatarImageHTML(profile.avatarURL, 100, 'float: right; margin-left: .5em;');
	
	// Create a person object based on the data provided.
	var personObject = {
		personID: data.personID,
		name: profile.firstName + ' ' + profile.lastName
	};
	
	// Construct the HTML for the overlay.
	
	// First and last name.
	var html = '<h2>' + profile.firstName + ' ' + profile.lastName + '</h2>';
	
	// Avatar.
	html += avatarHTML;
	
	// The 'linksTargetBlank' class is used to ensure that all links inside this element have a target attribute of "_blank" when the overlay is displayed.
	html += '<div class="linksTargetBlank">';
	
	// Conference attendees.
	
	// 2017
	if (profile.groups.indexOf('seanwesconference2017attendee') > -1) {
		html += '<p class="seanwesconference2017attendee"><a href="http://seanwes.com/conference/" target="_blank">2017<br>seanwes conference</a> Attendee</p>';
	}
	
	// 2016
	if (profile.groups.indexOf('seanwes2016attendee') > -1) {
		html += '<p class="seanwes2016attendee"><a href="http://seanwes.com/conference/" target="_blank">2016<br>seanwes conference</a> Attendee</p>';
	}
	
	// Bio.
	html += '<p><strong>Bio</strong><br>' + profile.bio + '</p>';
	
	// Website.
	html += '<p><strong>Website</strong><br><a target="_blank" href="' + profile.website + '">' + profile.website + '</a></p>';
	
	// Forum signature.
	html += '<p><strong>Forum Signature</strong><br>' + profile.signature + '</p>';
	
	// Mention button.
	html += '<p style="text-align: center;"><button onclick="' + personClickedCallString(personObject, false) + '; hideOverlay(true);">Mention ' + profile.firstName + ' ' + profile.lastName + '</button></p>';
	
	// Close the 'linksTargetBlank' div.
	html += '</div>';
	
	// Display the profile in the overlay.
	showOverlayWithHTML(html);
});

// !display html in overlay
// The server can display arbitrary html in the overlay at any time using this event.  This is used for things like /emoji, /help, and various other stuff.
socket.on('display html in overlay', function (data) {
	setTimeout(function () {
		showOverlayWithHTML(data.html);
	}, 500);
});

// !message answered
socket.on('message answered', function (data) {
	var $eventElements = $('.event-' + data.eventID);
	
	if ($eventElements.length) {
		$eventElements.addClass('answered');
	}
});

// !message unanswered
socket.on('message unanswered', function (data) {
	var $eventElements = $('.event-' + data.eventID);
	
	if ($eventElements.length) {
		$eventElements.removeClass('answered');
	}
});

// !---- Initial Connection & User Authentication ----

// afterAuthentication

// !server status
// When we connect the server should almost immediately send us a 'server status' message letting us know the state of things, which we use to kick everything off.
socket.on('server status', function (data) {
	// If the API versions don't match we need to reload so we're on the latest, matching version.
	if (data.apiVersion != apiVersion) {
		console.log('Reloading due to API mismatch!');
		document.location.reload(true);
	}
	
	// Relay errors on the client to the server.
	window.onerror = function(message, url, lineNumber) {  
		emitClientError(message, url, lineNumber);
		return false;
	};
	
	// Set global serverStatus object with the data we got back.
	serverStatus = data;
	
	// Let the user know we're connected.
	showInfo('Connected...', 'success', true);
	
	if (talkContext === 'login') {
		docCookies.removeItem('personID');
		docCookies.removeItem('token');
	}
	else {
		// Get the authentication cookies.
		var personID = docCookies.getItem('personID');
		var token = docCookies.getItem('token');
		
		// If login hasn't already succeeded...
		if (!loginSucceededThisSession) {
			// If we have stored authentication info try to reconnect.
			if (personID && token) {
				console.log('Reconnecting using stored credentials...');
				emitPersonReconnect(personID, token, 'web');
			}
			// Otherwise, if the server is in guest mode, login as a guest.
			else if (serverStatus.guestServer) {
				console.log('Logging in as a guest...');
				emitGuestLogin('', '', 'web');
			}
			// If all else fails, show the login screen.
			else {
				console.log('Displaying the login UI...');
				$('#login').removeClass('hidden');
			}			
		}
	}
});

// !login success
// data.personInfo
// data.token
// data.roomsInfo
// data.conversationsInfo
// data.conversationTypes
// data.latestConversationEventIDs
// data.latestConversationReadEventIDs
// data.subscriptions
// data.audioStreamStatus
// data.audioStreamInfo (if enabled)
socket.on('login success', function (data) {
	// Now that we've successfully logged in, if there's a login problem we're going to want to reload everything.
	reloadOnLoginProblem = true;
	
	// Populate the myPersonInfo global.
	myPersonInfo = data.personInfo;
	myPersonInfo.starredEvents = data.starredEvents;
	
	// Populate the push notification subscriptions variable.
	pushSubscriptions = data.subscriptions;
	
	// Populate the audio stream globals.
	audioStreamStatus = data.audioStreamStatus;
	audioStreamInfo = data.audioStreamInfo;
	
	// If we got an authentication token fron the server, add it to myPersonInfo.
	if (data.token) {
		myPersonInfo.token = data.token;
	}
	// Otherwise, add the one stored in the cookie.
	else {
		myPersonInfo.token = docCookies.getItem('token');
	}
	
	// Populate the roomsInfo global.
	roomsInfo = data.roomsInfo;
	
	// Populate the conversationsInfo global.
	conversationsInfo = data.conversationsInfo;
		
	// Populate the conversationTypes global.
	conversationTypes = data.conversationTypes;
	
	conversationsBeingListenedTo = data.conversationsBeingListenedTo;
	
	// Add the 'moderator' class to the body element if we're a moderator or owner.
	if (myPersonInfo.moderator || myPersonInfo.owner) {
		$('body').addClass('moderator');
	}
	
	// If we're not a guest, and if the remember me box is checked, save the reconnection info forever.
	if (!myPersonInfo.guest && $('#memberRemember').is(':checked')) {
		saveReconnectInfo(true);
	}
	// Otherwise, default to saving authentication info for this session only.
	else {
		saveReconnectInfo();
	}
	
	// Now we're logged in!
	loggedIn = true;
	loginSucceededThisSession = true;
	
	if (onLoginPage) {
		var destination = '/' + window.location.search;
		window.location.href = destination;
	}
	else {
		// Reveal the main interface.
		$('#main').removeClass('hidden');
	
		// Fade the login view out.
		$('#login').addClass('hidden');
		setTimeout(function () {
			$('#login').hide();
		}, 500); // Note: This needs to match the duration in the CSS so we don't hide the element before the transition is complete.
	
		// Let the user know login succeeded.
		showInfo('Login successful!', 'success', true);
		
		// If there are things we need to do after successful authentication, let's do them!
		if (typeof afterAuthentication === 'function') {
			afterAuthentication(data);
		}
	}
});

// !---- Third-Party Code ----

/* jshint ignore:start */

var docCookies = {
	/*\
	|*|
	|*|  :: cookies.js ::
	|*|
	|*|  A complete cookies reader/writer framework with full unicode support.
	|*|
	|*|  Revision #1 - September 4, 2014
	|*|
	|*|  https://developer.mozilla.org/en-US/docs/Web/API/document.cookie
	|*|  https://developer.mozilla.org/User:fusionchess
	|*|
	|*|  This framework is released under the GNU Public License, version 3 or later.
	|*|  http://www.gnu.org/licenses/gpl-3.0-standalone.html
	|*|
	|*|  Syntaxes:
	|*|
	|*|  * docCookies.setItem(name, value[, end[, path[, domain[, secure]]]])
	|*|  * docCookies.getItem(name)
	|*|  * docCookies.removeItem(name[, path[, domain]])
	|*|  * docCookies.hasItem(name)
	|*|  * docCookies.keys()
	|*|
	\*/
	getItem: function (sKey) {
		if (!sKey) { return null; }
		return decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
	},
	setItem: function (sKey, sValue, vEnd, sPath, sDomain, bSecure) {
		if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) { return false; }
		var sExpires = "";
		if (vEnd) {
			switch (vEnd.constructor) {
				case Number:
				sExpires = vEnd === Infinity ? "; expires=Fri, 31 Dec 9999 23:59:59 GMT" : "; max-age=" + vEnd;
				break;
				case String:
				sExpires = "; expires=" + vEnd;
				break;
				case Date:
				sExpires = "; expires=" + vEnd.toUTCString();
				break;
			}
		}
		document.cookie = encodeURIComponent(sKey) + "=" + encodeURIComponent(sValue) + sExpires + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "") + (bSecure ? "; secure" : "");
		return true;
	},
	removeItem: function (sKey, sPath, sDomain) {
		if (!this.hasItem(sKey)) { return false; }
		document.cookie = encodeURIComponent(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT" + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "");
		return true;
	},
	hasItem: function (sKey) {
		if (!sKey) { return false; }
		return (new RegExp("(?:^|;\\s*)" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
	},
	keys: function () {
		var aKeys = document.cookie.replace(/((?:^|\s*;)[^\=]+)(?=;|$)|^\s*|\s*(?:\=[^;]*)?(?:\1|$)/g, "").split(/\s*(?:\=[^;]*)?;\s*/);
		for (var nLen = aKeys.length, nIdx = 0; nIdx < nLen; nIdx++) { aKeys[nIdx] = decodeURIComponent(aKeys[nIdx]); }
		return aKeys;
	}
};

// Source: https://github.com/kidh0/jquery.idle
/**
 *  File: jquery.idle.js
 *  Title:  JQuery Idle.
 *  A dead simple jQuery plugin that executes a callback function if the user is idle.
 *  About: Author
 *  Henrique Boaventura (hboaventura@gmail.com).
 *  About: Version
 *  1.2.5
 *  About: License
 *  Copyright (C) 2013, Henrique Boaventura (hboaventura@gmail.com).
 *  MIT License:
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the "Software"), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *  - The above copyright notice and this permission notice shall be included in all
 *    copies or substantial portions of the Software.
 *  - THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 *    SOFTWARE.
 **/
/*jslint browser: true */
(function ($) {
  'use strict';

  $.fn.idle = function (options) {
    var defaults = {
        idle: 60000, //idle time in ms
        events: 'mousemove keydown mousedown touchstart', //events that will trigger the idle resetter
        onIdle: function () {}, //callback function to be executed after idle time
        onActive: function () {}, //callback function to be executed after back from idleness
        onHide: function () {}, //callback function to be executed when window is hidden
        onShow: function () {}, //callback function to be executed when window is visible
        keepTracking: true, //set it to false if you want to track only the first time
        startAtIdle: false,
        recurIdleCall: false
      },
      idle = options.startAtIdle || false,
      visible = !options.startAtIdle || true,
      settings = $.extend({}, defaults, options),
      lastId = null,
      resetTimeout,
      timeout;

    //event to clear all idle events
    $(this).on( "idle:stop", {}, function( event) {
      $(this).off(settings.events);
      settings.keepTracking = false;
      resetTimeout(lastId, settings);
    });

    resetTimeout = function (id, settings) {
      if (idle) {
        settings.onActive.call();
        idle = false;
      }
      clearTimeout(id);
      if(settings.keepTracking) {
        return timeout(settings);
      }
    };

    timeout = function (settings) {
      var timer = (settings.recurIdleCall ? setInterval : setTimeout), id;
      id = timer(function () {
        idle = true;
        settings.onIdle.call();
      }, settings.idle);
      return id;
    };

    return this.each(function () {
      lastId = timeout(settings);
      $(this).on(settings.events, function (e) {
        lastId = resetTimeout(lastId, settings);
      });
      if (settings.onShow || settings.onHide) {
        $(document).on("visibilitychange webkitvisibilitychange mozvisibilitychange msvisibilitychange", function () {
          if (document.hidden || document.webkitHidden || document.mozHidden || document.msHidden) {
            if (visible) {
              visible = false;
              settings.onHide.call();
            }
          } else {
            if (!visible) {
              visible = true;
              settings.onShow.call();
            }
          }
        });
      }
    });

  };
}(jQuery));

/* jshint ignore:end */
