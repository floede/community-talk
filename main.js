// seanwes talk
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

// Note: Globals defined below are considered read-only by default.  Set them to true (foo: true) to make JSHint consider them read-write.

/* global window, document, console, setTimeout, setInterval, clearTimeout, localStorage, Audio, Notification, $, webkit, fluid, docCookies, Split */

// Global variables from shared.js

/* global socket,
	afterAuthentication: true,
	serverStatus,
	loggedIn,
	myPersonInfo,
	roomsInfo: true,
	conversationsInfo,
	conversationTypes,
	conversationInfoBeingLoaded: true,
	conversationBeingEdited: true,
	conversationsBeingListenedTo,
	conversationDetailsVisible,
	justCreatedConversation: true,
	pushSubscriptions,
	audioStreamStatus,
	audioStreamInfo: true,
	iOS,
	localStorageAvailable,
	potentiallyDetrementalScrollEventInProgress
*/

// Global functions from shared.js

/* global logDebug,
	showInfo,
	showOverlayWithHTML,
	hideOverlay,
	beginPotentiallyDetrementalScroll,
	endPotentiallyDetrementalScroll,
	personClickedCallString,
	timestampFormatted,
	generatePersonClasses,
	avatarImageHTML,
	replaceAll,
	eventHTML,
	eventsHTML,
	personAvatarAndNameHTML,
	inlineConversationWrapperStartHTML,
	inlineConversationWrapperEndHTML,
	datasetAsObjectBugWorkaround
*/

// These exported variables and functions are used by UI elements and generated markup, such as setting an onclick attribute to call hideMessage, for example.

/* exported hideMessage, revealMessage, kickPerson, toggleVideo, liveCreateNewRoom, liveUpdateRoom, conversationNew, editConversation, conversationEdit, conversationArchive, toggleListeningToConversation, iOSNativeSetup, iOSNativeUnreachable, iOSNativeReachable, iOSNativeKeyboardWillShow, iOSNativeKeyboardWillHide, iOSNativeKeyboardWillChangeFrame, iOSNativeKeyboardDidShow, iOSNativeKeyboardDidHide, iOSNativeKeyboardDidChangeFrame, iOSNativeDidFinishLaunching, iOSNativeWillResignActive, iOSNativeDidEnterBackground, iOSNativeWillEnterForeground, iOSNativeDidBecomeActive, iOSNativeWillTerminate, iOSNative1PasswordIsAvailable, pushApplySavedSubscriptions, pushRegisterDeviceToken, pushRemoveDeviceToken, toggleMute, toggleOnAir, askToKickPerson, populateMessageFieldWithContent, guestChangeDetails, pushSend, addLongIfNeeded, roomInListClicked, conversationLinkHTML, summaryToggleConversationsIntro */

// !---- End JSHint Configuration ----

// !---- Globals ----

// Element Variables
var historyElement = document.getElementById('history');
var $history = $(historyElement);

var scrollInfoElement = document.getElementById('scrollInfo');
var $scrollInfo = $(scrollInfoElement);

var messageElement = document.getElementById('message');

var footerElement = document.getElementById('footer');

var comboStatusElement = document.getElementById('comboStatus');
var $comboStatus = $(comboStatusElement);

var comboBreakerElement = document.getElementById('comboBreaker');
var $comboBreaker = $(comboBreakerElement);

var comboLabelElement = document.querySelector('.comboLabel');
var $comboLabel = $(comboLabelElement);

// Stores information about the current room.
var currentRoomInfo = {};

// Stores information about the current conversation.
var currentConversationInfo = {};

// If this is a function it will be run when all pending conversation info has been loaded following one or more 'get conversation info' requests.
var runWhenAllConversationInfoLoaded;

// If the server wants us to join a room before we're logged in, that room's info goes in this queue, which gets processed when we are logged in.
var joinedRoomsQueue = [];

// Message and mention sounds.
var newMessageAudio = new Audio('/sounds/new-message-1.mp3');
var newMentionAudio = new Audio('/sounds/new-mention-1.mp3');

// This will be set to true if we're in the iOS app.
var iOSNative = false;

var newMessageBadgeCounter = 0;

var theTitle = 'Community';

var windowIsFocused = true;

// Variable to keep track of typing status.
var typingStatus = false;

// This variable keeps track of the ID of a timer used to null out typing after a short period of no typing activity.
var typingStatusTimer;

// !---- Functions ----

// !---- Emit Functions ----

function emitNewMessage(roomID, conversationID, messageType, content) {
	socket.emit('new message', {
		roomID: roomID,
		conversationID: conversationID,
		messageType: messageType,
		content: content
	});
}

function emitJoinRoom(roomID, makeCurrent) {
	if (makeCurrent) {
		makeCurrent = true;
	} else {
		makeCurrent = false;
	}
	socket.emit('join room', {
		roomID: roomID,
		makeCurrent: makeCurrent
	});
}

function emitLeaveRoom(roomID) {
	socket.emit('leave room', {
		roomID: roomID
	});
}

function emitIAmScrolledUp(roomID, conversationID) {
	// Only send scroll updates to the server if there IS NOT a potentially detremental scroll event in progress.
	if (!potentiallyDetrementalScrollEventInProgress) {
		socket.emit('i am scrolled up', {
			roomID: roomID,
			conversationID: conversationID
		});
	}
}

function emitIAmScrolledDown(roomID, conversationID) {
	// Only send scroll updates to the server if there IS NOT a potentially detremental scroll event in progress.
	if (!potentiallyDetrementalScrollEventInProgress) {
		socket.emit('i am scrolled down', {
			roomID: roomID,
			conversationID: conversationID
		});
	}
}

function emitIAmTyping(roomID, conversationID) {
	if (myPersonInfo && myPersonInfo.id && socket.connected) {
		socket.emit('i am typing', {
			roomID: roomID,
			conversationID: conversationID
		});
	}
}

function emitIAmNoLongerTyping(roomID, conversationID) {
	if (myPersonInfo && myPersonInfo.id && socket.connected) {
		socket.emit('i am no longer typing', {
			roomID: roomID,
			conversationID: conversationID
		});
	}
}

function emitIdleUpdate(idle) {
	if (myPersonInfo && myPersonInfo.id && socket.connected && typeof idle === 'boolean') {
		socket.emit('idle update', {
			idle: idle
		});
	}
}

function emitStatusUpdate(status) {
	if (myPersonInfo && myPersonInfo.id && socket.connected && typeof status === 'string') {
		socket.emit('status update', {
			status: status
		});
	}
}

function emitScheduleHTML() {
	socket.emit('schedule html');
}

function hideMessage(eventID) {
	socket.emit('hide message', {
		eventID: eventID
	});
}

function revealMessage(eventID) {
	socket.emit('reveal message', {
		eventID: eventID
	});
}

function mutePerson(personID) {
	socket.emit('mute person', {
		personID: personID
	});
}

function unmutePerson(personID) {
	socket.emit('unmute person', {
		personID: personID
	});
}

function onAir(personID) {
	socket.emit('person onair', {
		personID: personID
	});
}

function offAir(personID) {
	socket.emit('person offair', {
		personID: personID
	});
}

function kickPerson(personID) {
	socket.emit('kick person', {
		personID: personID
	});
	hideOverlay();
}

function toggleGuestMode() {
	socket.emit('toggle guest mode');
}

function getSummary() {
	socket.emit('get summary');
}

// !---- Functions ----

function summaryToggleConversationsIntro() {
	var $element = $('#summaryConversationsIntro');
	
	$element.toggle();
	
	if ($element.is(':visible')) {
		$('#summaryToggleConversationsIntroButton').text('Hide Conversations Intro');
	}
	else {
		$('#summaryToggleConversationsIntroButton').text('Show Conversations Intro');
	}
}

function getHistoryContainer(roomID, conversationID) {
	var container;
	
	if (conversationID) {
		container = document.getElementById('conversation-' + conversationID);
	}
	else {
		container = document.getElementById('room-' + roomID);
	}
	
	return container;
}

function getHistory(roomID, conversationID, beforeEventID, afterEventID) {
	logDebug('getHistory(' + roomID + ', ' + conversationID + ', ' + beforeEventID + ', ' + afterEventID + ') called from ' + arguments.callee.caller.name);
	
	// Add a loading indicator to the top or bottom of the target container.
	var container = getHistoryContainer(roomID, conversationID);
	
	if (container) {
		logDebug('Setting waitingForHistory on #' + container.id + ' to "true".');
		container.dataset.waitingForHistory = 'true';
		
		var loadingHTML = '<div class="loading">Loading...</div>';
		
		if (beforeEventID) {
			container.innerHTML = loadingHTML + container.innerHTML;
		}
		else {
			container.innerHTML = container.innerHTML + loadingHTML;
		}
	}
	
	socket.emit('get history', {
		roomID: roomID,
		conversationID: conversationID,
		beforeEventID: beforeEventID,
		afterEventID: afterEventID
	});
}

/*
function getConversationHistory(conversationID, roomID, afterEventID, beforeEventID) {
	socket.emit('get conversation history', {
		id: conversationID,
		roomID: roomID,
		afterEventID: afterEventID,
		beforeEventID: beforeEventID
	});
}
*/

function currentRoomOrConversationHistoryContainer() {
	if (currentConversationInfo && currentConversationInfo.id) {
		return document.getElementById('conversation-' + currentConversationInfo.id);
	}
	else if (currentRoomInfo && currentRoomInfo.id) {
		return document.getElementById('room-' + currentRoomInfo.id);
	}
	return null;
}

function updateConversationReadPosition() {
	// Make sure we're currently in a conversation.
	if (currentConversationInfo && currentConversationInfo.id) {
		var conversationID = currentConversationInfo.id;
		
		var container = currentRoomOrConversationHistoryContainer();
		
		if (!container) {
			return;
		}
		
		// Note: This value is set by updateScrollInfo().
		var lastReadEventID = parseInt(datasetAsObjectBugWorkaround(container.dataset).lastReadEventId);
		
		var lastReadEventIDSentToServer = parseInt(datasetAsObjectBugWorkaround(container.dataset).lastReadEventIdSentToServer);
		
		// If the last read event ID exists, and it doesn't match the last one we sent to the server...
		if (lastReadEventID && lastReadEventID !== lastReadEventIDSentToServer) {
			// Send it to the server.
			socket.emit('update conversation read position', {
				conversationID: conversationID,
				eventID: lastReadEventID
			});
			
			// Update the last read event ID sent to the server.
			container.dataset.lastReadEventIdSentToServer = lastReadEventID;
		}
	}
}

// Note: The conversation functions that generate or return HTML below generally only create/return conversation elements with the data-conversation-id and id attributes set.  Classes should be added/updated after calling these functions with updateConversationElements().

// This function will check to see if the conversation's history elements exist or not, and if they don't, it will create them.
function conversationListenButtonHTML(conversationID) {
	return '<button class="conversationButton" onclick="toggleListeningToConversation(' + conversationID + ')"></button>';
}

function conversationTitleHTML(conversationInfo, conversationID, inlineHTML) {
	var theID = 0;
	var title = 'Loading...';
	
	if (conversationInfo) {
		theID = conversationInfo.id;
		title = conversationInfo.titleHTML;
	}
	else if (conversationID) {
		theID = conversationID;
	}
	else {
		return '';
	}
	
	if (inlineHTML) {
		return '<span class="title" onclick="makeConversationCurrent(' + theID + ')">' + title + '</span><em class="conversationEdit moderatorOnly" onclick="editConversation(' + theID + ')"> (Edit)</em>';
	}
	else {
		return '<h4 class="title" onclick="makeConversationCurrent(' + theID + ')">' + title + '</h4><em class="conversationEdit moderatorOnly" onclick="editConversation(' + theID + ')">Edit</em>';
	}
}

function conversationMetadataHTML(conversationInfo) {
	var personClasses = generatePersonClasses(conversationInfo.person.id, conversationInfo.person);
	
	var roomName;
	
	roomsInfo.forEach(function (roomInfo) {
		if (roomInfo.id == conversationInfo.roomID) {
			roomName = roomInfo.name;
		}
	});
	
	var metadataHTML = '';
	
	var personObject = {
		personID: conversationInfo.person.id,
		name: conversationInfo.person.name
	};
		
	metadataHTML += 'Created ' + timestampFormatted(conversationInfo.created) + ' in ' + roomName + ' by <span class="' + personClasses + '">' + personAvatarAndNameHTML(personObject, conversationInfo.person.avatarURL, 32, conversationInfo.roomID, conversationInfo.id);
	
	metadataHTML += '<br>Use <strong>((c' + conversationInfo.id + '))</strong> to mention this conversation.</span>';
	
	return metadataHTML;
}

function basicConversationInfoHTML(conversationInfo) {
	var html = conversationListenButtonHTML(conversationInfo.id);
	html += conversationTitleHTML(conversationInfo);
	html += '<p class="metadata">' + conversationMetadataHTML(conversationInfo) + '</p>';
	return html;	
}

function conversationListHTML(conversationInfo) {
	return '<div data-conversation-id="' + conversationInfo.id + '" data-created="' + conversationInfo.created + '" id="conversationList-' + conversationInfo.id + '">' + conversationListenButtonHTML(conversationInfo.id) + conversationTitleHTML(conversationInfo) + '</div>';
}

function conversationLinkHTML(conversationInfo) {
	return '<span data-conversation-id="' + conversationInfo.id + '">' + conversationListenButtonHTML(conversationInfo.id) + conversationTitleHTML(conversationInfo, null, true) + '</span>';
}

function conversationSummaryHTML(conversationInfo) {
	var html = '<div data-conversation-id="' + conversationInfo.id + '">';
	html += basicConversationInfoHTML(conversationInfo);
	html += '</div>';
	
	return html;
}

function conversationBannerHTML(conversationInfo) {
	var html = '<div data-conversation-id="' + conversationInfo.id + '" id="conversationBanner-' + conversationInfo.id + '">';
	html += basicConversationInfoHTML(conversationInfo);
	html += '</div>';
	return html;
}

function conversationHistoryHTML(conversationInfo) {
	return '<div data-conversation-id="' + conversationInfo.id + '" id="conversation-' + conversationInfo.id + '"></div>';
}

function sortConversations(roomID) {
	var sortFunction = function (a, b) {
		// Listening
		var aListening = a.className.indexOf('listening') > -1;
		var bListening = b.className.indexOf('listening') > -1;
		
		if (aListening && !bListening) {
			return 1;
		}
		
		if (!aListening && bListening) {
			return -1;
		}
				
		// Sticky
		var aSticky = a.className.indexOf('sticky') > -1;
		var bSticky = b.className.indexOf('sticky') > -1;
		
		if (aSticky && !bSticky) {
			return 1;
		}
		
		if (!aSticky && bSticky) {
			return -1;
		}
		
		// Mentioned
		var aMentioned = a.className.indexOf('mentioned') > -1;
		var bMentioned = b.className.indexOf('mentioned') > -1;
		
		if (aMentioned && !bMentioned) {
			return 1;
		}
		if (!aMentioned && bMentioned) {
			return -1;
		}
		
		// Unread
		var aUnread = a.className.indexOf('unread') > -1;
		var bUnread = b.className.indexOf('unread') > -1;
		
		if (aUnread && !bUnread) {
			return 1;
		}
		if (!aUnread && bUnread) {
			return -1;
		}
		
		// Created
		var aCreated = parseInt(datasetAsObjectBugWorkaround(a.dataset).created);
		var bCreated = parseInt(datasetAsObjectBugWorkaround(b.dataset).created);
		
		if (aCreated > bCreated) {
			return 1;
		}
		
		if (aCreated < bCreated) {
			return -1;
		}
		
		return 0;
	};
	
	var conversationsContainerSelector = '#roomList-' + roomID + ' .conversations';
	
	// This gets all the DOM elements representing the conversations for the provided room in the left sidebar.
	var list = $(conversationsContainerSelector + ' .conversation').get();
	
	// Now we sort them using our sort function.
	list.sort(sortFunction);
	
	// Create a document fragment to hold the sorted elements.
	var documentFragment = document.createDocumentFragment();
	
	// Loop through the sorted list.
	for (var i = list.length - 1; i >= 0; i--) {
		// Move the DOM elements to the document list in order.  Note that appendChild MOVES the elements, so at the end of this loop the conversations container will be empty.
		documentFragment.appendChild(list[i]);
	}
	
	// Now we just put the elements back into the conversations container.
	$(conversationsContainerSelector).append(documentFragment);
}

function convertNodeListToArray(nodeList) {
	return Array.prototype.slice.call(nodeList);
}

function generateClassesForConversation(conversationInfo) {
	// .conversation and .conversationType-conversationTypeSlug
	var classes = 'conversation conversationType-' + conversationInfo.type.slug;
	
	// .notListening
	if (conversationsBeingListenedTo.indexOf(conversationInfo.id) === -1) {
		classes += ' notListening';
	}
	else {
		classes += ' listening';
	}
	
	var conversationListElement = document.getElementById('conversationList-' + conversationInfo.id);
	
	if (conversationListElement && conversationListElement.className) {
		// .unread
		if (conversationListElement.className.indexOf('unread') > -1) {
			classes += ' unread';
		}
		
		// .mentioned
		if (conversationListElement.className.indexOf('mentioned') > -1) {
			classes += ' mentioned';
		}
	}
	
	// .current
	if (conversationInfo.id === currentConversationInfo.id) {
		classes += ' current';
	}
	
	// .sticky
	if (conversationInfo.sticky) {
		classes += ' sticky';
	}
	
	return classes;
}

// This function will update all conversation elements if no specific conversationInfo is provided.
function updateConversationElements(conversationInfo) {
	var classes = {};
	
	var titles = {};
	
	var metadata = {};
	
	if (!conversationInfo) {
		// Loop through all the conversations in conversationsInfo.
		for (var key in conversationsInfo) {
			if (conversationsInfo.hasOwnProperty(key)) {
				var theConversationInfo = conversationsInfo[key];
				
				classes[key] = generateClassesForConversation(theConversationInfo);
				
				titles[key] = theConversationInfo.titleHTML;
				
				metadata[key] = conversationMetadataHTML(theConversationInfo);
			}
		}
	}
	else {
		classes[conversationInfo.id] = generateClassesForConversation(conversationInfo);
				
		titles[conversationInfo.id] = conversationInfo.titleHTML;
				
		metadata[conversationInfo.id] = conversationMetadataHTML(conversationInfo);
	}
	
	// Next, get all conversation elements that need to be updated.
	var selector;
	
	if (conversationInfo) {
		selector = '[data-conversation-id="' + conversationInfo.id + '"], [data-conversation-id="' + conversationInfo.id + '"] > .title, [data-conversation-id="' + conversationInfo.id + '"] > .metadata';
	}
	else {
		selector = '[data-conversation-id], [data-conversation-id] > .title, [data-conversation-id] > .metadata';
	}
	
	var elements = convertNodeListToArray(document.querySelectorAll(selector));
	
	elements.forEach(function (element) {
		var dataset = datasetAsObjectBugWorkaround(element.dataset);
		
		var conversationID;
		
		// If this element has the data-conversation-id attribute, apply the classes to it.		
		if (dataset && dataset.conversationId) {
			conversationID = parseInt(dataset.conversationId);
			
			element.className = classes[conversationID];
		}
		else {
			// Get the conversation ID from the parentNode.
			conversationID = parseInt(datasetAsObjectBugWorkaround(element.parentNode.dataset).conversationId);
			
			// If this element is a .title apply the title HTML to it.
			if (element.className.indexOf('title') > -1) {
				element.innerHTML = titles[conversationID];
			}
			// If this element is .metadata apply the metadata HTML to it.
			else if (element.className.indexOf('metadata') > -1) {
				element.innerHTML = metadata[conversationID];
			}
		}
	});
	
	if (conversationsInfo) {
		sortConversations(conversationsInfo.roomID);
	}
	else {
		roomsInfo.forEach(function (roomInfo) {
			sortConversations(roomInfo.id);
		});
	}
	
}

function createConversationHistoryElements(conversationInfo) {
	// Banner
	if (!document.getElementById('conversationBanner-' + conversationInfo.id)) {
		var bannerHTML = conversationBannerHTML(conversationInfo);
		$(bannerHTML).appendTo(historyElement);
	}
	
	// History
	if (!document.getElementById('conversation-' + conversationInfo.id)) {
		var historyHTML = conversationHistoryHTML(conversationInfo);
		$(historyHTML).appendTo(historyElement);
	}
	
	updateConversationElements(conversationInfo);
}

function firstJoinedRoomID() {
	var $firstJoinedRoom = $('#joinedRooms .room').filter(':first');
	if ($firstJoinedRoom.length) {
		return $firstJoinedRoom.attr('id').replace('roomList-', '');
	}
	return false;
}

function roomIDFromRoomListElement($element) {
	var elementID = $element.attr('id');
	return elementID.replace('#', '').replace('roomList-', '');
}
	
function messageIsCommand(message, commandPrefix) {
	var commandPrefixForComparison = commandPrefix.toUpperCase();
	if (message.length > commandPrefix.length) {
		commandPrefixForComparison += ' ';
	}
	
	if (message.slice(0, commandPrefixForComparison.length).toUpperCase() === commandPrefixForComparison) {
		return true;
	}
	
	return false;
}

function stringWithoutCommandPrefix(string) {
	var indexOfFirstSpace = string.indexOf(' ');
	if (indexOfFirstSpace == -1) {
		return '';
	}
	return string.substr(indexOfFirstSpace + 1);
}

function saveMessageDraft() {
	if (localStorageAvailable) {
		var draft = messageElement.value;
		
		if (currentConversationInfo && currentConversationInfo.id) {
			// Save the content of the message field for this conversation.
			localStorage['conversationMessageDraft' + currentConversationInfo.id] = draft;
		}
		else if (currentRoomInfo && currentRoomInfo.id) {
			// Save the content of the message field for this room.
			localStorage['roomMessageDraft' + currentRoomInfo.id] = draft;
		}
	}
}

function localStorageKeyForPreviousMessages() {
	// Conversation
	if (currentConversationInfo && currentConversationInfo.id) {
		return 'conversationPreviousMessages' + currentConversationInfo.id;
	}
	// Room
	else {
		return 'roomPreviousMessages' + currentRoomInfo.id;
	}
}

// Changes the text of the Send button to Done when approprate so you can dismiss the keyboard on iOS.
function iOSNativeUpdateSendMessageButton() {
	if (iOSNative) {
		if ($('#message').is(':focus') && $('#message').val().length === 0) {
			$('#sendMessage').text('Done');
		} else {
			$('#sendMessage').text('Send');
		}
	}		
}

// This function should be called whenever typing status potentially changes, such as during a key press event in the message field.  This function uses the currentRoomInfo.id to determine which room to update typing status for, since you can never be typing in more than one room at a time.
function updateTypingStatus(newTypingStatus) {
	// Normalize to booleans, just to be on the safe side.
	newTypingStatus = newTypingStatus ? true : false;
	var oldTypingStatus = typingStatus ? true : false;
	
	// If newTypingStatus is true...
	if (newTypingStatus) {
		// Reset the typing status timeout.
		clearTimeout(typingStatusTimer);
		
		// And start it again.
		typingStatusTimer = setTimeout(function () {
			updateTypingStatus(false);
		}, 10000); // If there's no typing activity in 10 seconds, we're no longer typing.
	}
	
	// If typing status has changed...
	if (newTypingStatus !== oldTypingStatus) {
		// Set the global typingStatus.
		typingStatus = newTypingStatus;
		
		// Let the server know.
		if (typingStatus && currentRoomInfo && currentRoomInfo.id) {
			emitIAmTyping(currentRoomInfo.id, currentConversationInfo.id);
		}
		else {
			emitIAmNoLongerTyping(currentRoomInfo.id, currentConversationInfo.id);
		}
	}
}

// Note: This is called via the onkeyup attribute on the message field itself.
function autoGrowMessageField(element) {
	var targetHeight = 28;
	
	// If the scroll height of the message field is below or at the minimum, or there's nothing in it, set the height to the minimum value.
	if (element.scrollHeight <= 30 || element.value.length === 0) {
		targetHeight = 28;
	} 
	// If the scroll height is greater than the maximum height allowed, set it to the maximum.
	else if (element.scrollHeight > 120) {
		targetHeight = 120;
	}
	// Otherwise, make the height equal to the scroll height.
	else {
		targetHeight = element.scrollHeight;
	}
	
	// We're actually going to resize the entire footer, not just the text field, so we need to add the margins surrounding it.
	targetHeight = targetHeight + 12;
	
	// Check to see if we need to resize the footer.
	if (footerElement.clientHeight != targetHeight) {
		beginPotentiallyDetrementalScroll();
		footerElement.style.height = targetHeight + 'px';
		historyElement.style.bottom = targetHeight + 'px';
		scrollInfoElement.style.bottom = targetHeight + 'px';
		endPotentiallyDetrementalScroll();
	}
}

function getAndDisplaySchedule() {
	showOverlayWithHTML('<h2>Schedule</h2><p>Loading...</p>');
	emitScheduleHTML();
}

function encodeForHTML(string) {
	string = replaceAll(string, '&', '&amp;');
	string = replaceAll(string, '<', '&lt;');
	string = replaceAll(string, '>', '&gt;');
	return string;
}

function showHistory() {
	var html = '<h2>Sent Message History</h2>';
	
	if (localStorageAvailable) {
		html += '<p>Here are the last several things you\'ve sent to the current room/conversation from this device.  You can click on any of them to populate the message field with that message.</p>';
		
		html += '<table style="cursor: default;">';
		
		var noHistoryMessage = '<tr><td>No history found.  Join the conversation!</td></tr>';
		
		var localStorageKey = localStorageKeyForPreviousMessages();
		
		if (!localStorage[localStorageKey]) {
			html += noHistoryMessage;
		}
		else {
			var previousMessages = JSON.parse(localStorage[localStorageKey]);
			
			previousMessages.reverse();
			
			previousMessages.forEach(function (previousMessage) {
				html += '<tr><td style="overflow: auto;" onclick="populateMessageFieldWithContent(this)">' + encodeForHTML(previousMessage) + '</td></tr>';
			});
			
			previousMessages.reverse();
			
			html += '</table>';
		}
	}
	// Local storage is not available.
	else {
		html += '<p>Sent message history is not available because your browser does not support local storage, or it is disabled.</p>';
	}
	
	showOverlayWithHTML(html);
}

// data.roomOrPersonID
// data.messageType (text, image)
// data.content
function sendMessage(theMessage) {
	if (currentRoomInfo && socket.connected) {
		var message = $('#message').val();
		if (theMessage) {
			message = theMessage;
		}
		
		// Make sure the message is not empty and is not just whitespace.
		if (message && typeof message === 'string' && /\S/.test(message)) {
			beginPotentiallyDetrementalScroll();
			
			if (messageIsCommand(message, '/away')) {
				emitStatusUpdate('Away');
			}
			else if (messageIsCommand(message, '/online') || messageIsCommand(message, '/back')) {
				emitStatusUpdate('');
			}
			else if (messageIsCommand(message, '/status')) {
				var status = stringWithoutCommandPrefix(message);
				emitStatusUpdate(status);
			}
			else if (messageIsCommand(message, '/schedule')) {
				getAndDisplaySchedule();
			}
			else if (messageIsCommand(message, '/dark')) {
				$('#darkModeCheckbox').prop('checked', true).trigger('change');
			}
			else if (messageIsCommand(message, '/light')) {
				$('#darkModeCheckbox').prop('checked', false).trigger('change');
			}
			else if (messageIsCommand(message, '/history')) {
				showHistory();
			}
			else if (messageIsCommand(message, '/live')) {
				socket.emit('toggle live status');
			}
			else {
				emitNewMessage(currentRoomInfo.id, currentConversationInfo.id, 'text', message);
				
				// Store the message being sent in previous messages for this room/conversation.
				if (localStorageAvailable) {
					var localStorageKey = localStorageKeyForPreviousMessages();
					
					var previousMessages;
					
					if (localStorage[localStorageKey]) {
						previousMessages = JSON.parse(localStorage[localStorageKey]);
					}
					else {
						previousMessages = [];
					}
					
					while (previousMessages.length >= 50) {
						previousMessages.splice(0, 1);
					}
					
					previousMessages.push(message);
					
					localStorage[localStorageKey] = JSON.stringify(previousMessages);
				}
			}
			
			$('#message').val('');
			
			saveMessageDraft();
			
			updateTypingStatus(false);
			
			endPotentiallyDetrementalScroll();
			
			autoGrowMessageField(messageElement);
		}
		else {
			showInfo('Sorry, you can\'t send a blank message.', 'warning', true);
		}
	}
	else {
		showInfo('Sorry, your message cannot be sent right now, please try again in a moment.', 'error', true);
	}
	
	iOSNativeUpdateSendMessageButton();
	
	setTimeout(function () {
		window.scrollTo(0, window.innerHeight);
	}, 60);
}

// !---- Chat History Scrolling ----

// The person using the chat expects the scroll position of the history/transcript to maintain some consistency, which is outlined by the following rules:
// - When #history is scrolled to the top, more events should load (if there are more to load).
// - When #history is scrolled anywhere but the bottom, #scrollInfo should be visible at the bottom of #history, which shows them how many messages are below and takes them to the bottom when clicked.
// - When #history is scrolled to the bottom, it should STAY scrolled to the bottom while visible, meaning it maintains its bottom scroll position when new events come in, when #history is resized, etc.
// - All of the above applies to rooms and conversations, but not the Summary.
// - Performance is critical.

// When scrolling, this keeps track of the last element visible in the history so we can determine if we should update scroll info or not.
function lastVisibleElementInHistory() {
	// #history's bounding rect (relative to the viewport).
	var historyRect = historyElement.getBoundingClientRect();
	
	// We're going to use elementFromPoint() to get the last visible element, which uses hit testing to determine what the topmost element is at a given point.  The last element visible in #history might be under #scrollInfo, if it's being displayed.  Setting pointer-events to 'none' prevents hit testing and, thus, elementFromPoint() from giving us #scrollInfo instead of the actual element we want.  In other words, this lets us look "beneith" #scrollInfo.
	scrollInfoElement.style.pointerEvents = 'none';
	
	// We start at the bottom left corner of #history, move right by the margin value, move up by the margin value, and then get the element at that point.
	var lastVisibleElement = document.elementFromPoint(historyRect.left + 100, historyRect.bottom - 10);
	
	// Restore #scrollInfo's pointer-events to what it was before.
	scrollInfoElement.style.pointerEvents = '';
	
	// Return the element we found.
	return lastVisibleElement;
}

// This function gets the last visible element in #history, goes up the DOM tree from there to find the lowest visible message (if the last visible message isn't a message element), then figures out how many messages are below that in the DOM tree for the current room/conversation and updates scrollInfo with that number (but only if scrollInfo is not hidden).
// This function needs to be as performant as possible, as it gets called rapidly when scrolling #history.
var priorTargetElement;
function updateScrollInfo() {
	logDebug('Start.');
	
	// Only update scroll info if we're in a room or conversation.
	if (!currentRoomInfo || !currentRoomInfo.id) {
		logDebug('End of updateScrollInfo() because a room or conversation is not current.');
		return;
	}
	
	// If #scrollInfo is hidden...
	if (scrollInfoElement.className.indexOf('hidden') > -1) {
		// If we're in a conversaiton...
		if (currentConversationInfo && currentConversationInfo.id) {
			// Get the current container element.
			var containerElement = currentRoomOrConversationHistoryContainer();
			
			var containerElementDataset = datasetAsObjectBugWorkaround(containerElement.dataset);
			
			// If the conversation is complete to bottom but there's no last read event ID set...
			if (containerElement && containerElementDataset.completeToBottom === 'true' && !containerElementDataset.lastReadEventId) {
				var allMessages = containerElement.querySelectorAll('.event.message');
				
				var lastMessage = allMessages[allMessages.length - 1];
				
				// Set the last read event ID to the last event in the conversation.
				containerElement.dataset.lastReadEventId = datasetAsObjectBugWorkaround(lastMessage.dataset).eventId;
			}
			
		}
		
		//logDebug('End of updateScrollInfo() because #scrollInfo is hidden.');
		//return;
	}
	
	var numberOfMessagesBelow = 0;
	
	// Get the last visible element in #history.
	var targetElement = lastVisibleElementInHistory();
	
	if (targetElement) {
		logDebug('Last visible element in #history tagName: ' + targetElement.tagName + ' id: ' + targetElement.id + ' class: ' + targetElement.className);
	}
	else {
		return;
	}
	
	// If the last visible element is the one we just worked on, or if the last visible element is a conversation events wrapper, bail, because nothing is going to change if we do all this again.
	if (targetElement === priorTargetElement || targetElement.className.indexOf('conversationWrappedEvents') > -1) {
		logDebug('End of updateScrollInfo() because the targetElement is the same as the priorTargetElement or is a conversation events wrapper.');
		return;
	}
	
	// Keep track of the last element we handled.
	priorTargetElement = targetElement;
	
	// The current room/conversation history element selector.
	var containerSelector = '#room-' + currentRoomInfo.id;
	if (currentConversationInfo && currentConversationInfo.id) {
		containerSelector = '#conversation-' + currentConversationInfo.id;
	}
	
	logDebug('containerSelector: ' + containerSelector);
	
	// An array containing every element inside the current room/conversation history.
	var currentHistoryElementsNodeList = document.querySelectorAll(containerSelector + ' *');
	var currentHistoryElements = convertNodeListToArray(currentHistoryElementsNodeList);
	
	// An array containing every .message element inside the current room/conversation history.
	var messageElementsNodeList = document.querySelectorAll(containerSelector + ' .message');
	var messageElements = convertNodeListToArray(messageElementsNodeList);
	
	var targetElementIndex;
	
	// While the targetElement is not a .message element (because it isn't in the message elements array)...
	while (messageElements.indexOf(targetElement) === -1) {
		// Get the index of the target element inside the array of all elements in the room/conversation history.
		targetElementIndex = currentHistoryElements.indexOf(targetElement);
		
		// Go back one element in the array by subtracting one from the index of the current target element.  In other words, we're going up one element, because we want to get all of the messages below the last visible one.
		var newTargetElementIndex = targetElementIndex - 1;
		
		// Make sure we're not going outisde the bounds of the array, or getting stuck in an infinite loop.
		if (newTargetElementIndex < 0) {
			logDebug('newTargetElementIndex is less than zero, so we are bailing out.');
			return;
		}
		
		// Set the target element to the item in the all elements array that comes before it and try again.
		targetElement = currentHistoryElements[newTargetElementIndex];
	}
	
	var currentHistoryContainer = currentRoomOrConversationHistoryContainer();
	
	// Get the eventID of the message and populate data-last-read-event-id, which is used to update the server with the last read position for this conversation.
	if (currentConversationInfo && currentConversationInfo.id) {
		logDebug('Curently in a conversation, calculating lastReadEventID...');
		
		// Get the event ID of the lowest visible message.
		var newLastReadEventID = parseInt(datasetAsObjectBugWorkaround(targetElement.dataset).eventId);
		
		// Get the saved last read event ID.
		var existingLastReadEventID = parseInt(datasetAsObjectBugWorkaround(currentHistoryContainer.dataset).lastReadEventId);
		
		// Note: Currently, this code is designed to always report the highest numbered event ID read during a session.  For example, imagine a conversation with 100 messages, and the person starts at the top.  If they scroll down so the last visible event is #75, but then scroll back up so the last visible element is #50, this will record the highest number viewed (75).  The logic below could be easily altered to always report whatever the actual last read event ID is, which would be more like saving their scroll position than saving their last read event.
		
		// If there is no saved last read event ID, or if the new event ID is greater than the existing saved one...
		if (!existingLastReadEventID || newLastReadEventID > existingLastReadEventID) {
			// Save the new last read event ID.
			logDebug('Setting last read event ID to: ' + newLastReadEventID);
			currentHistoryContainer.dataset.lastReadEventId = newLastReadEventID;
		}
	}
	
	// Now that the target element is a message, we get it's current index in the messages array.
	targetElementIndex = messageElements.indexOf(targetElement);
	
	// Finally, all we have to do to get the number of messages below is a bit of subtraction.
	numberOfMessagesBelow = messageElements.length - targetElementIndex - 1;
	
	var suffix = ' Messages Below';
	if (numberOfMessagesBelow === 1) {
		suffix = ' Message Below';
	}
	
	// If this history container isn't complete to the bottom, the number of messages below is at least, and probably higher than, the number of messages we actually have loaded on the client side.
	var additionalMessagesBelowIndicator = '';
	
	if (datasetAsObjectBugWorkaround(currentHistoryContainer.dataset).completeToBottom !== 'true') {
		additionalMessagesBelowIndicator = '+';
	}
	
	// Assemble the string and display it.
	// "42+ Messages Below"
	var string = numberOfMessagesBelow + additionalMessagesBelowIndicator + suffix;
	
	if (string.length === 0) {
		string = 'Scroll to Bottom';
	}
	
	scrollInfoElement.innerHTML = string;
	
	logDebug('End.');
}

// Determines if the chat history is currently scrolled to the top or not.
function historyScrolledToTop() {
	if (historyElement.scrollTop === 0) {
		return true;
	}
	return false;
}

// Determines if the chat history is currently scrolled to the bottom or not.  Note that there's a 10px margin of error built into this, so you don't need to be scrolled *entirely* to the bottom for this to be true.
function historyScrolledToBottom() {
	var scrolledToBottom = false;
	
	if (historyElement.scrollTop + 10 >= (historyElement.scrollHeight - historyElement.offsetHeight)) {
		scrolledToBottom = true;
	}
	
	return scrolledToBottom;
}

// Note: This function only sets the room/conversation history container's scrollPosition dataset attribute, it does not actually scroll anything.  See scrollHistoryTo() if you want to actually scroll.
function setHistoryContainerScrollPosition(roomID, conversationID, scrollPosition) {
	var container = getHistoryContainer(roomID, conversationID);
	
	if (container) {
		var currentScrollPosition = datasetAsObjectBugWorkaround(container.dataset).scrollPosition;
		
		// If we were scrolled down, but are about to NOT be scrolled down...
		if (currentScrollPosition === 'bottom' && scrollPosition !== 'bottom') {
			// Emit that we're scrolled up.
			emitIAmScrolledUp(roomID, conversationID);
		}
		// If we were NOT scrolled down, but we are about to be scrolled down...
		else if (currentScrollPosition !== 'bottom' && scrollPosition === 'bottom') {
			// Emit that we're scrolled down.
			emitIAmScrolledDown(roomID, conversationID);
		}
		
		container.dataset.scrollPosition = scrollPosition;
	}
}

function saveHistoryScrollPosition(forceScrollTop) {
	var container = currentRoomOrConversationHistoryContainer();
	
	if (container) {
		if (!forceScrollTop && historyScrolledToBottom()) {
			setHistoryContainerScrollPosition(currentRoomInfo.id, currentConversationInfo.id, 'bottom');
		}
		else {
			setHistoryContainerScrollPosition(currentRoomInfo.id, currentConversationInfo.id, historyElement.scrollTop);
		}
	}
}

function scrollHistoryTo(scrollPosition) {
	if (!scrollPosition) {
		return;
	}
	
	// Scroll to the top.
	if (scrollPosition === 'top') {
		historyElement.scrollTop = 0;
	}
	// Scroll to the bottom.
	else if (scrollPosition === 'bottom') {
		historyElement.scrollTop = historyElement.scrollHeight;
	}
	// Scroll to a specific event.
	else if (scrollPosition.indexOf('event-') === 0) {
		// We need to select the specific event element inside the right container, so we need to assemble a selector.
		var eventSelector;
		
		// If a conversation is current...
		if (currentConversationInfo && currentConversationInfo.id) {
			eventSelector = '#conversation-' + currentConversationInfo.id + ' .' + scrollPosition;
		}
		// If a room is current...
		else if (currentRoomInfo && currentRoomInfo.id) {
			eventSelector = '#room-' + currentRoomInfo.id + ' .' + scrollPosition;
		}
		
		// We want to make sure we have an eventSelector to work with before we proceed.
		if (eventSelector) {
			// Get the event.
			var event = historyElement.querySelector(eventSelector);
			
			// Scroll the event into view, at the bottom of #history.
			event.scrollIntoView(false);
			
			// Now scroll up just a bit more.
			historyElement.scrollTop = historyElement.scrollTop + 10;
		}
	}
	else {
		historyElement.scrollTop = scrollPosition;
	}
	
	// Save the new scroll position.
	saveHistoryScrollPosition();
}

function updateLeftPanelButtonUnreadDot() {
	var $leftPanelButton = $('#leftPanelButton');
	
	if ($('#leftPanel .room.unread, #leftPanel .room.containsUnread').length) {
		$leftPanelButton.addClass('unread');
	}
	else {
		$leftPanelButton.removeClass('unread');
	}
}

function updateCollapsedRoomUnreadAndMentionIndicators(roomID) {
	if ($('#roomList-' + roomID + ' .conversations .conversation.listening').hasClass('unread')) {
		$('#roomList-' + roomID).addClass('containsUnread');
	}
	else {
		$('#roomList-' + roomID).removeClass('containsUnread');
	}
	
	if ($('#roomList-' + roomID + ' .conversations .conversation.listening').hasClass('mentioned')) {
		$('#roomList-' + roomID).addClass('containsMentioned');
	}
	else {
		$('#roomList-' + roomID).removeClass('containsMentioned');
	}
}

function markRead(roomID, conversationID) {
	if (conversationID) {
		$('#conversationList-' + conversationID).removeClass('unread').removeClass('mentioned');
		
		updateCollapsedRoomUnreadAndMentionIndicators(roomID);
	}
	else if (roomID) {
		$('#roomList-' + roomID).removeClass('unread').removeClass('mentioned');
	}
	
	updateLeftPanelButtonUnreadDot();
	
	sortConversations(roomID);
}

function historyScrollHandler() {
	logDebug('Start.');

	// We only want to handle history scrolling if we're in a room or conversation.
	if (!currentRoomInfo || !currentRoomInfo.id) {
		logDebug('Ending because there is no current room.');
		return;
	}
	
	// Note that the conditionals below are independent if statements and not an if...else if...else chain because, depending on the content, you could be scrolled to the top, bottom, AND middle at the same time.
	
	var containerElement = currentRoomOrConversationHistoryContainer();
	
	// Bail if there's no container element.
	if (!containerElement) {
		logDebug('Ending because there is no container element.');
		return;
	}
	
	// We only want to handle history scrolling if we're not waiting for history.
	if (datasetAsObjectBugWorkaround(containerElement.dataset).waitingForHistory === 'true') {
		logDebug('Ending because we are waiting for history.');
		return;
	}
	
	// We're scrolling, so update #scrollInfo.
	updateScrollInfo();
	
	// When #history is scrolled to the top.
	if (historyScrolledToTop()) {
		logDebug('Scrolled to the top.');
		
		// If we're not complete to the top, then we need to request history for this room/conversation from the server.
		if (datasetAsObjectBugWorkaround(containerElement.dataset).completeToTop !== 'true') {
			// Get the first event in the room/conversation.
			var firstEventElement = containerElement.querySelector('.event');
			
			var firstEventID;
			
			if (firstEventElement) {
				firstEventID = parseInt(datasetAsObjectBugWorkaround(firstEventElement.dataset).eventId);
			}

			// If we have a first event...
			if (firstEventID) {
				// Request history prior to the first event we already have.
				logDebug('Getting history prior to event ID: ' + firstEventID);
				getHistory(currentRoomInfo.id, currentConversationInfo.id, firstEventID);
			}
			// If we do not have a first event...
			else {
				// Request the default/initial history for this room/conversation.
				logDebug('Getting initial history.');
				getHistory(currentRoomInfo.id, currentConversationInfo.id);
			}
		}
	}
	
	var scrolledToBottom = historyScrolledToBottom();
	
	// When #history is NOT scrolled to the bottom.
	// Note: This code will be called very rapidly as people scroll through the history, so make sure this is as performant as possible.
	if (!scrolledToBottom) {
		logDebug('Not scrolled to bottom.');
		
		// Reveal #scrollInfo.
		$scrollInfo.removeClass('hidden');
		
		// Set the room/conversation's scroll position to the scrollTop value of #history.
		setHistoryContainerScrollPosition(currentRoomInfo.id, currentConversationInfo.id, historyElement.scrollTop);
	}
	
	// When #history is scrolled to the bottom.
	if (scrolledToBottom) {
		logDebug('Scrolled to bottom.');
		
		// If we're not complete to the bottom, then we need to request history for this room/conversation from the server.
		if (datasetAsObjectBugWorkaround(containerElement.dataset).completeToBottom !== 'true') {
			// Get the last event in the room/conversation.
			var events = containerElement.querySelectorAll('.event');
			
			var lastEventElement;
			var lastEventID;
			
			if (events.length > 0) {
				lastEventElement = events[events.length - 1];
				lastEventID = parseInt(datasetAsObjectBugWorkaround(lastEventElement.dataset).eventId);				
			}
			
			// If we have a last event...
			if (lastEventID) {
				// Request history after the last event we already have.
				logDebug('Getting history after event ID: ' + lastEventID);
				getHistory(currentRoomInfo.id, currentConversationInfo.id, null, lastEventID);
			}
			// If we do not have a last event...
			else {
				// Do nothing.  The initial history will be populated by the scrolled to top code above.
			}
			
		}
		// If we are complete to bottom...
		else {
			// Remove the unread and mentioned classes from the room/conversation entry in the left sidebar.
			markRead(currentRoomInfo.id, currentConversationInfo.id);
		}
		
		// TODO: If there are a lot of events loaded, remove some to keep things performant.
		// A thought... should I hide the elements instead of removing them?
		// If I wrap events in chunk containers as they come in I can just hide chunks intellegently.
		
		// Hide #scrollInfo.
		$scrollInfo.addClass('hidden');
		
		// Send the last read position to the server.
		updateConversationReadPosition();
				
		// Set the room/conversation's scroll position to 'bottom'.
		setHistoryContainerScrollPosition(currentRoomInfo.id, currentConversationInfo.id, 'bottom');
	}
	
	logDebug('End.');
}

// Note that these scroll handlers DO NOT get called when adjusting the scroll position using .scrollTop and whatnot.
historyElement.addEventListener('touchmove', historyScrollHandler, false);
historyElement.addEventListener('scroll', historyScrollHandler, false);

function allowSendingMessages() {
	$('#message').prop('disabled', false);
	$('#sendMessage').prop('disabled', false);
}

function preventSendingMessages() {
	$('#message').prop('disabled', true);
	$('#sendMessage').prop('disabled', true);
}

function restoreMessageDraft() {
	if (localStorageAvailable) {
		var draft = '';
		
		if (currentConversationInfo && currentConversationInfo.id) {
			// Save the content of the message field for this conversation.
			draft = localStorage['conversationMessageDraft' + currentConversationInfo.id];
		}
		else if (currentRoomInfo && currentRoomInfo.id) {
			// Save the content of the message field for this room.
			draft = localStorage['roomMessageDraft' + currentRoomInfo.id];
		}
		
		if (draft) {
			messageElement.value = draft;
		}
	}
}

function restoreHistoryScrollPosition() {
	var container = currentRoomOrConversationHistoryContainer();
	
	if (container) {
		scrollHistoryTo(datasetAsObjectBugWorkaround(container.dataset).scrollPosition);
	}
}

function updatePersonInfoBadges() {
	// If we're not in a room/conversation, bail.
	if (!currentRoomInfo || !currentRoomInfo.id) {
		return;
	}
	
	// Get all the personInfo elements.
	var $peopleInfo = $('#roomInfo-' + currentRoomInfo.id + ' .person');
	
	// Loop through them...
	$peopleInfo.each(function (index, personInfoElement) {
		var $personInfo = $(personInfoElement);
		
		// Remove the scrolled and typing classes from them.
		$personInfo.removeClass('scrolled').removeClass('typing');
		
		// If we're currently in a conversation...
		if (currentConversationInfo && currentConversationInfo.id) {
			// Apply the scrolled class if this person is scrolled in this conversation.
			if (datasetAsObjectBugWorkaround(personInfoElement.dataset)['scrolledInConversation' + currentConversationInfo.id] === 'true') {
				$personInfo.addClass('scrolled');
			}
			
			// Apply the typing class if this person is typing in this conversation.
			if (datasetAsObjectBugWorkaround(personInfoElement.dataset)['typingInConversation' + currentConversationInfo.id] === 'true') {
				$personInfo.addClass('typing');
			}
		}
		// If we're currently in a room...
		else {
			// Apply the scrolled class if this person is scrolled in this room.
			if (datasetAsObjectBugWorkaround(personInfoElement.dataset).scrolledInRoom === 'true') {
				$personInfo.addClass('scrolled');
			}
			
			// Apply the typing class if this person is typing in this room.
			if (datasetAsObjectBugWorkaround(personInfoElement.dataset).typingInRoom === 'true') {
				$personInfo.addClass('typing');
			}
		}
	});
}

function saveCurrentRoomOrConversationState() {
	saveMessageDraft();
	saveHistoryScrollPosition(true);
	updateConversationReadPosition(); // This only does stuff if a conversation is current, so we can call it here.
}

function restoreCurrentRoomOrConversationState() {
	restoreMessageDraft();
	restoreHistoryScrollPosition();
	updatePersonInfoBadges();
}

function prepareForContentSwitch() {
	saveCurrentRoomOrConversationState();
	
	updateTypingStatus(false);

	$('#noCurrentRoom').remove();
	
	// Left Sidebar: Make sure nothing in the left panel is showing as current.
	$('#leftPanel *').removeClass('current');
	
	// Right Sidebar: Hide all room info and summary info.
	$('#rightPanel .roomInfo').hide();
	$('#summaryInfo').hide();
	
	if (currentConversationInfo && currentConversationInfo.id) {
		var currentConversationInfoElement = document.querySelector('#roomInfo-' + currentConversationInfo.roomID + ' [data-current-conversation-info]');
		
		currentConversationInfoElement.innerHTML = '';
		
		delete currentConversationInfoElement.dataset.conversationId;
	}
	
	// History: Hide all content.
	$('#summary').hide();
	$('#history > .historyBanner').hide();
	$('#history > .room').hide();
	$('#history > .conversation').hide();
	$scrollInfo.addClass('hidden');
	
	// History: Remove bannerVisible class.
	$history.removeClass('bannerVisible');
	
	// Message Field: Clear it!
	messageElement.value = '';
}

// !---- Combos! ----

/*
function immediatelyShowComboStatus() {
	$comboStatus.show().removeClass('hidden');
}
*/

function immediatelyHideComboStatus() {
	$comboStatus.hide().addClass('hidden');
}

function animateComboStatusIn() {
	$comboStatus.show().removeClass('hidden');
}
	
function comboBreaker() {
	$comboStatus.addClass('broken');
	
	$comboBreaker.removeClass('hidden').addClass('go');
	
	setTimeout(function () {
		$comboBreaker.removeClass('go').addClass('hidden');
		$comboStatus.removeClass('broken').addClass('hidden');
	}, 1500); // This duration needs to match the animation duration in the CSS!
}

function updateComboStatusWithCount(comboCount) {
	if ($comboStatus.hasClass('hidden')) {
		animateComboStatusIn();
	}
	
	$('.comboCount').text(comboCount + 'x');
	
	$comboStatus.removeClass('twoPlus');
	
	$comboStatus.removeClass('fivePlus');
	
	$comboStatus.removeClass('tenPlus');			

	if (comboCount < 5) {
		$comboStatus.addClass('twoPlus');
		$comboLabel.text('Combo!');
	}
	else if (comboCount >= 5 && comboCount < 10) {
		$comboStatus.addClass('fivePlus');
		$comboLabel.text('Combo!!!');
	}
	else if (comboCount >= 10) {
		$comboStatus.addClass('tenPlus');			
		$comboLabel.text('COMBO!!!');
	}
}

// This is the function that gets called all the time when new messages come in, the curent room is changed, etc. so it needs to be fairly quick and efficient.
// TODO: Improve performance of this function.
function updateComboStatus(displayComboBreaker) {
	// Bail if we're not in a room or conversation.
	if (!currentRoomInfo || !currentRoomInfo.id) {
		return;
	}
	
	var comboAlreadyDisplayed = false;
	
	if (!$comboStatus.hasClass('hidden')) {
		comboAlreadyDisplayed = true;
	}
	
	// Get the last message element in the current room.
	var container = currentRoomOrConversationHistoryContainer();
	
	if (container) {
		var messages = container.querySelectorAll('.message');
	
		var lastMessageElement = messages[messages.length - 1];
		
		var $lastMessage = $(lastMessageElement);
		
		var comboPeople = [];
		var comboMatch = true;
		var comboCount = 1;
	
		var $currentMessage = $lastMessage;
		var $currentContent;
		var currentContentHTML;
		var currentPerson;
	
		var $previousMessage;
		var $previousContent;
		var previousContentHTML;
		var previousPerson;
		
		while (comboMatch) {
			$currentContent = $currentMessage.find('.content');
			currentContentHTML = $currentContent.html();
			currentPerson = $currentContent.attr('data-person-id');
			comboPeople.push(currentPerson);
			
			$previousMessage = $currentMessage.prevAll('.event.message').first();
			if ($previousMessage.length === 0) {
				comboMatch = false;
				break;
			}
			$previousContent = $previousMessage.find('.content');
			previousContentHTML = $previousContent.html();
			previousPerson = $previousContent.attr('data-person-id');
							
			// If the previous message is from a person we already have, break the combo.
			// If the previous content does not match, break the combo.
			if (comboPeople.indexOf(previousPerson) !== -1 || currentContentHTML !== previousContentHTML) {
				comboMatch = false;
			} else {
				comboMatch = true;
				comboCount++;
			}
			
			$currentMessage = $previousMessage;
		}
		
		if (comboCount < 3){
			if (comboAlreadyDisplayed && displayComboBreaker) {
				comboBreaker();
			} else {
				immediatelyHideComboStatus();
			}
		} else {
			updateComboStatusWithCount(comboCount);
		}
	}
}

function updateLiveStatus(live) {
	if (live) {
		$('#liveStatus .live.status').text('This event is LIVE!');
	}
	else {
		$('#liveStatus .live.status').text('Not Live');
	}
}

function updatePrivateStatus(isPrivate) {
	if (isPrivate) {
		$('#liveStatus .private.status').text('Event is Private (URL Slug in Live Settings)');
	}
	else {
		$('#liveStatus .private.status').text('Event is Public');
	}
}

function showVideo(videoURL) {
	// Add the body class.
	$('body').addClass('videoVisible');
	
	// If a videoURL is provided, use it.  Otherwise, use the current room's video URL.
	var theVideoURL = videoURL ? videoURL : currentRoomInfo.videoURL;
	
	if ($('#video iframe').attr('src') != theVideoURL) {
		$('#video iframe').attr('src', theVideoURL);
	}
	
	// Remove any lingering split resizing gutters.
	$('div.gutter').remove();
	
	// Remove inline styles from resizing the split.
	$('#video').attr('style', '');
	$('#main').attr('style', '');
	
	// Apply the split.
	// https://github.com/nathancahill/Split.js is being used for the split functionallity.
	Split(['#video', '#main'], {
		sizes: [40, 60], // Percent.
		minSize: 200, // Pixels.
		direction: 'vertical',
		onDragStart: function () {
			beginPotentiallyDetrementalScroll();
		},
		onDragEnd: function () {
			endPotentiallyDetrementalScroll();
		}
	});
	
	// Show the Reload Video button.
	$('#reloadVideoButtonContainer').show();
}

function hideVideo() {
	// Remove the body class.
	$('body').removeClass('videoVisible');
	
	// Remove the video URL.
	$('#video iframe').attr('src', '/e');
	
	// Remove inline styles from resizing the split.
	$('#video').attr('style', '');
	$('#main').attr('style', '');
	
	// Remove any lingering split resizing gutters.
	$('div.gutter').remove();
	
	// Hide the Reload Video button.
	$('#reloadVideoButtonContainer').hide();
}

function updateInterfaceWithLiveInfo(color, url, buttonText, videoEnabled, videoURL) {
	// Color
	$('#theButton a').css('background', color);
	
	// URL
	$('#theButton a').attr('href', url);
	
	// Button Text
	$('#theButton a').text(buttonText);
	
	// Video
	if (videoEnabled) {
		showVideo(videoURL);
	}
	else {
		hideVideo();
	}
	
	updatePrivateStatus(currentRoomInfo.livePrivate);
}

function addLongIfNeeded(selector) {
	var elements = convertNodeListToArray(document.querySelectorAll(selector));
	
	var messages = [];
	
	// Get messages only.
	elements.forEach(function (element) {
		if ((' ' + element.className + ' ').indexOf(' message ') > -1) {
			messages.push(element);
		}
	});
	
	// Remove .long from the messages.
	messages.forEach(function (message) {
		if ((' ' + message.className + ' ').indexOf(' long ') > -1) {
			$(message).removeClass('long');
		}
	});
	
	var messagesToAddLongTo = [];
	
	// Measure the height of all of the elements in one go first, to prevent layout thrashing.
	messages.forEach(function (message) {
		if (message.clientHeight > 160) {
			messagesToAddLongTo.push(message);
		}
	});
	
	// Now add .long to the long messages.
	messagesToAddLongTo.forEach(function (message) {
		message.className = message.className + ' long';
	});
}

function endContentSwitch() {
	restoreCurrentRoomOrConversationState();
	
	updateInterfaceWithLiveInfo(currentRoomInfo.color, currentRoomInfo.url, currentRoomInfo.buttonText, currentRoomInfo.videoEnabled, currentRoomInfo.videoURL);
	
	updateLiveStatus(currentRoomInfo.live);
	
	if (currentConversationInfo && currentConversationInfo.id) {
		addLongIfNeeded('#conversation-' + currentConversationInfo.id + ' .event.message');
	}
	else if (currentRoomInfo && currentRoomInfo.id) {
		addLongIfNeeded('#room-' + currentRoomInfo.id + ' .event.message');
	}
	
	historyScrollHandler();
	
	updateComboStatus();
		
	autoGrowMessageField(messageElement);
	
	updateScrollInfo();
	
	if (localStorageAvailable) {
		if (currentConversationInfo && currentConversationInfo.id) {
			localStorage.currentType = 'conversation';
			localStorage.currentID = currentConversationInfo.id;
		}
		else if (currentRoomInfo && currentRoomInfo.id) {
			localStorage.currentType = 'room';
			localStorage.currentID = currentRoomInfo.id;
		}
		else {
			localStorage.currentType = 'summary';
			localStorage.currentID = null;
		}
		
	}
}

function updateHeaderTitle() {
	// If the width of the screen is small, replace the header with the name of the room.
	if (currentRoomInfo && currentRoomInfo.name) {
		$('header h1').text(currentRoomInfo.name);
	} else {
		$('header h1').text(theTitle);
	}
}

function makeSummaryCurrent() {
	prepareForContentSwitch();
	
	// Left Sidebar: Make summary appear current.
	$('#summaryList').addClass('current');
	
	// History: Show the summary.
	document.getElementById('summary').innerHTML = '<div class="loading">Loading...</div>';
	
	$('#summary').show();
	$('#summaryInfo').show();
	
	// Clear the current room and conversation infos.
	currentRoomInfo = {};
	currentConversationInfo = {};
	
	// Get the summary!
	getSummary();
	
	updateHeaderTitle();
	
	preventSendingMessages();
	
	endContentSwitch();
}

function makeRoomCurrent(roomID) {
	prepareForContentSwitch();
	
	roomsInfo.forEach(function (roomInfo) {
		if (roomInfo.id == roomID) {
			currentRoomInfo = roomInfo;
		}
	});
	
	currentConversationInfo = {};
	
	updateHeaderTitle();
	
	// Left Sidebar: Make the room appear current.
	$('#roomList-' + roomID).addClass('current');
	$('#roomList-' + roomID).removeClass('mentioned');
	
	// Right Sidebar: Show the room's info.
	$('#roomInfo-' + roomID).show();
	
	// History
	$('#room-' + roomID).show();
	
	// Remove any conversation classes from the send button.
	$('#sendMessage').removeClass();
		
	allowSendingMessages();

	endContentSwitch();
}

function makeConversationCurrent(conversationID) {
	prepareForContentSwitch();

	// Populate currentConversationInfo with the conversation we're switching to.
	currentConversationInfo = conversationsInfo[conversationID];
	
	var roomID = currentConversationInfo.roomID;
	
	// Populate currentRoomInfo with the room we're in or switching to.
	roomsInfo.forEach(function (roomInfo) {
		if (roomInfo.id == roomID) {
			currentRoomInfo = roomInfo;
		}
	});
	
	updateHeaderTitle();
	
	// Left Sidebar: Make the conversation in question appear current.
	$('#conversationList-' + conversationID).addClass('current');
	
	// If the room this conversation belongs to is collapsed, expand it.
	if ($('#roomList-' + roomID).hasClass('collapsed')) {
		$('#roomList-' + roomID).removeClass('collapsed');
	}
	
	// Right Sidebar: Show the proper room's info.
	$('#roomInfo-' + roomID).show();
	
	// Put the current conversation info in the right sidebar.
	var currentConversationInfoHTML = basicConversationInfoHTML(currentConversationInfo);
	
	var currentConversationInfoElement = document.querySelector('#roomInfo-' + roomID + ' [data-current-conversation-info]');
	
	currentConversationInfoElement.innerHTML = currentConversationInfoHTML;
	
	currentConversationInfoElement.dataset.conversationId = conversationID;
	
	// ---- History ----
	
	// Create the conversation's history banner and transcript elements if they don't already exist.
	createConversationHistoryElements(currentConversationInfo);
	
	// Show the conversation banner.
	$('#conversationBanner-' + conversationID).show();
	
	// Show the conversation history.
	$('#conversation-' + conversationID).show();
	
	// If we already have some events...
	if ($('#conversation-' + currentConversationInfo.id + ' .event').length > 0) {
		// Scroll to the scrollPosition saved on the history container.
		var conversationHistoryElement = document.getElementById('conversation-' + currentConversationInfo.id);
		
		scrollHistoryTo(datasetAsObjectBugWorkaround(conversationHistoryElement.dataset).scrollPosition);
	}
	
	// Add the conversationType-slug class to the send button.
	$('#sendMessage').removeClass().addClass('conversationType-' + currentConversationInfo.type.slug);
	
	allowSendingMessages();
	
	endContentSwitch();
}

function handleGuestModeChange(guestModeEnabled) {
	if (guestModeEnabled) {
		$('#guestMode .status').text('Guest Mode Enabled');
		$('#guestMode button').text('Disable Guest Mode');
		$('#guestLogin .enabled').show();
		$('#guestLogin .disabled').hide();
		// Why would I ever write this?!
/*
		if (docCookies.hasItem('personID') && docCookies.hasItem('token') && docCookies.getItem('personID').charAt(0) == 'g') {
			emitPersonReconnect(docCookies.getItem('personID'), docCookies.getItem('token'), 'web');
		}
*/
	} else {
		$('#guestMode .status').text('Guest Mode Disabled');
		$('#guestMode button').text('Enable Guest Mode');
		$('#guestLogin .enabled').hide();
		$('#guestLogin .disabled').show();
	}
}

function isRoomJoined(roomID) {
	return $('#room-' + roomID).length > 0;
}

function roomInListClicked(roomID) {
	var joined = false;
	if (isRoomJoined(roomID)) {
		joined = true;
	}

	if (!joined) {
		// If we're not in the room yet, join it.
		emitJoinRoom(roomID, true);
	} else {
		// If we are in the room, make it current.
		makeRoomCurrent(roomID);
	}
}

function addRoomToList(roomInfo, joined) {
	// #joinedRooms and #otherRooms contain #roomList-123
	// roomInfo.roomID and roomInfo.name
	var roomListID = 'roomList-' + roomInfo.id;
	
	if (!document.getElementById(roomListID)) {
		var classes = 'room';
		if (roomInfo.guestsAllowed) {
			classes += ' guestsAllowed';
		}
		
		var html = '<div id="' + roomListID + '" class="' + classes + '"><span class="disclosure" data-room-id="' + roomInfo.id + '"></span> <span class="name" onclick="roomInListClicked(' + roomInfo.id + ')">' + roomInfo.name + '</span><div class="conversations"></div></div>';
		
		var targetElementSelector;
		
		if (joined) {
			targetElementSelector = '#joinedRooms';
		} else {
			targetElementSelector = '#otherRooms';
		}
		
		$(html).appendTo($(targetElementSelector));
		
		$('#' + roomListID + ' .disclosure').click(function () {
			var roomID = datasetAsObjectBugWorkaround(this.dataset).roomId;
			
			var $roomListElement = $('#roomList-' + roomID);
			
			$roomListElement.toggleClass('collapsed');
		});
	}
}

function resetInterface() {
	$('#joinedRooms .room').remove();
	$('#otherRooms .room').remove();
	$('#pushNotifications p').remove();
	$('#history .room').remove();
	$('#history .conversation').remove();
	$('#rightPanel .roomInfo').remove();
	$('#memberLoginStatus').text('');
	$('#guestLoginStatus').text('');
	$('input, textfield').blur();
	currentRoomInfo = {};
	currentConversationInfo = {};
	hideOverlay(null, true);
}

// If roomID is omitted the info will be appended to all rooms.
/*
function appendInfo(info, roomID, eventID, timestamp) {
	var $roomElement;
	if (roomID) {
		$roomElement = $('#room-' + roomID);
		roomsInfo.forEach(function (roomInfo) {
			if (roomInfo.id == roomID) {
				roomInfo.lastSpeaker = null;
			}
		});
	} else {
		$roomElement = $('#history .room');
		roomsInfo.forEach(function (roomInfo) {
			roomInfo.lastSpeaker = null;
		});
	}
	var theInfoHTML = infoHTML(info, eventID, timestamp);
	$(theInfoHTML).appendTo($roomElement);
}
*/

/*
function updateTopicForRoom(roomID, topic) {
	roomsInfo.forEach(function (roomInfo) {
		if (roomInfo.id == roomID) {
			roomInfo.topic = topic;
		}
	});
	$('#roomInfo-' + roomID + ' p.topic').text(topic);
	beginPotentialScrollEvent();
	appendInfo('New topic: ' + topic, roomID);
	endPotentialScrollEvent();
}
*/

var peakPeopleCount = 0;

function updatePeopleCountForRoom(roomID) {
	var peopleCount = $('#roomInfo-' + roomID + ' .person').length;
	var peopleSuffix = 'People';
	if (peopleCount === 1) {
		peopleSuffix = 'Person';
	}
	if (peakPeopleCount < peopleCount) {
		peakPeopleCount = peopleCount;
	}
	$('#roomInfo-' + roomID + ' p.peopleCount span').html(peopleCount + ' ' + peopleSuffix + '<em class="moderatorOnly"> (Peak: ' + peakPeopleCount + ')</em>');
}

function addPersonToRoomSidebar(personClasses, personID, name, avatarURL, idle, status, roomID, conferenceAttendee) {
	var personObject = {
		personID: personID,
		name: name
	};
	
	if (myPersonInfo.id && $('#roomInfo-' + roomID + ' div.roomInfoPerson-' + personID).length === 0) {
		// #roomInfoPerson-personID
		var html = '<div class="roomInfoPerson-' + personID + ' ' + personClasses + '">\n';
		
		// Moderator On Air toggle button.
		html += '<button class="moderatorOnly onAirButton" onclick="toggleOnAir(\'' + personID + '\')"><img src="/emoji/svg/1f4e1.svg" class="emoji" width="18" height="18"></button>';
		
		// If this isn't us, we want to show the mute and kick buttons for moderators.
		if (personID != myPersonInfo.id) {
			// Mute button.
			html += '<button class="moderatorOnly muteButton" onclick="toggleMute(\'' + personID + '\')"><img src="/emoji/svg/26d4.svg" class="emoji" width="18" height="18"></button>';
			
			// Kick buttons.
			html += '<button class="moderatorOnly kickButton" onclick="askToKickPerson(\'' + personID + '\')"><img src="/emoji/svg/1f462.svg" class="emoji" width="18" height="18"></button>';
		}
		
		// Clicking on the avatar.
		html += '<span class="personClick personClickAvatar" onclick="' + personClickedCallString(personObject, true) + '">\n';
		
		// Avatar badges.
		html += '<div class="scrolledBadge"></div><div class="typingBadge"></div><div class="guestBadge"></div><div class="mutedBadge"></div><div class="onAirBadge"></div>\n';
		
		// Avatar.
		html += avatarImageHTML(avatarURL, 32);
		
		// End clicking on the avatar.
		html += '</span>\n';
		
		// Clicking on the person's name.
		html += '<span class="personClick personClickName" onclick="' + personClickedCallString(personObject, false) + '">\n';
		
		// Name.
		var nameClasses = 'name';
		
		if (conferenceAttendee) {
			nameClasses += ' conferenceAttendee';
		}
		
		html += '<span class="' + nameClasses + '">' + name + '</span>';
		
		// Status info.
		html += '<span class="statusInfo">';
		
		// Online or idle.
		html += '<span class="onlineOrIdle ' + idle + '"></span> ';
		
		// Text status.
		html += '<span class="status">' + status + '</span>';
		
		// End status info.
		html += '</span>';
		
		// End clicking on the person's name.
		html += '</span>';
		
		// End #roomInfoPerson-personID
		html += '</div>';
		
		// Add the html to the room's info in the right sidebar.
		$(html).appendTo('#roomInfo-' + roomID);
	}
	
	updatePeopleCountForRoom(roomID);
}

var sortParticipantListsLastRun = 0;

function sortParticipantLists() {
	// Don't proceed if the participants were sorted recently.
	var now = Date.now();
/*	
	var timeBuffer = 5000;
	

	if ((sortParticipantListsLastRun + timeBuffer) > now) {
		return;
	}
*/
	
	// We want the sort to be as fast as possible, so instead of using jQuery's hasClass() we're doing a native RegExp instead.
	var elementHasClass = function(element, className) {
	    return new RegExp('(\\s|^)' + className + '(\\s|$)').test(element.className);
	};
	
	var sortFunction = function (a, b) {
		// On air.
		var aOnAir = elementHasClass(a, 'onair');
		var bOnAir = elementHasClass(b, 'onair');
		
		if (aOnAir && !bOnAir) {
			return -1;
		}
		if (!aOnAir && bOnAir) {
			return 1;
		}
		
		// Online.
		var aOnline = a.getElementsByClassName('onlineOrIdle online').length;
		var bOnline = b.getElementsByClassName('onlineOrIdle online').length;
		
		if (aOnline && !bOnline) {
			return -1;
		}
		if (!aOnline && bOnline) {
			return 1;
		}

		// Then owners.
		var aIsOwner = elementHasClass(a, 'owner');
		var bIsOwner = elementHasClass(b, 'owner');
		
		if (aIsOwner && !bIsOwner) {
			return -1;
		}
		if (!aIsOwner && bIsOwner) {
			return 1;
		}
		
		// Then mods.
		var aIsModerator = elementHasClass(a, 'moderator');
		var bIsModerator = elementHasClass(b, 'moderator');
		
		if (aIsModerator && !bIsModerator) {
			return -1;
		}
		if (!aIsModerator && bIsModerator) {
			return 1;
		}
		
		// Then members.
		var aIsMember = elementHasClass(a, 'member');
		var bIsMember = elementHasClass(b, 'member');
		
		if (aIsMember && !bIsMember) {
			return -1;
		}
		if (!aIsMember && bIsMember) {
			return 1;
		}
		
		// Then guests with changed names.
		var aName = a.getElementsByClassName('name')[0].textContent;
		var bName = b.getElementsByClassName('name')[0].textContent;
		
		var aHasGuestName = aName.indexOf('Guest') !== 0;
		var bHasGuestName = bName.indexOf('Guest') !== 0;
		
		if (aHasGuestName && !bHasGuestName) {
			return -1;
		}
		if (!aHasGuestName && bHasGuestName) {
			return 1;
		}
		
		// Then by name.
		return aName.toUpperCase().localeCompare(bName.toUpperCase());
	};
	
	// For each room's info in the right sidebar...
	$('#rightPanel div.roomInfo').each(function () {
		// List contains an array of all the div.person DOM elements for this room.
		var list = $(this).find('div.person').get();
		
		// Sort the list using the sort function.
		list.sort(sortFunction);
		
		// Hide the roomInfo while we move everything around, so as to avoid a bunch of repaints.
		var previousDisplay = this.style.display;
		
		this.style.display = 'none';
		
		// Append the person elements to their parent node in order.
		for (var i = 0; i < list.length; i++) {
			list[i].parentNode.appendChild(list[i]);
		}
		
		// Reveal the roomInfo now that we're done sorting.
		this.style.display = previousDisplay;
	});
	
	sortParticipantListsLastRun = now;
}

function updatePersonInRoomSidebars(personID, name, avatarURL) {
	var parentElementString = '.roomInfoPerson-' + personID;
	
	var nameElementString = parentElementString + ' .name';
	
	var avatarElementString = parentElementString + ' img.avatar';
	
	var personClickAvatarElementString = parentElementString + ' .personClickAvatar';
	
	var personClickNameElementString = parentElementString + ' .personClickName';
	
	$(nameElementString).text(name);
	
	if (avatarURL) {
		$(avatarElementString).remove();
		$(nameElementString).before(avatarImageHTML(avatarURL, 32));
	}
	
	var personObject = {
		personID: personID,
		name: name
	};
	
	$(personClickAvatarElementString).attr('onclick', personClickedCallString(personObject, true));
	
	$(personClickNameElementString).attr('onclick', personClickedCallString(personObject, false));
	
	sortParticipantLists();
}

function removePersonFromRoomSidebar(personID, roomID) {
	$('#roomInfo-' + roomID + ' .roomInfoPerson-' + personID).remove();
	updatePeopleCountForRoom(roomID);
}

function sortJoinedRoomsList() {
	var sortFunction = function (a, b) {
		var aID = parseInt($(a).attr('id').replace('roomList-', ''));
		var bID = parseInt($(b).attr('id').replace('roomList-', ''));
		
		if (aID > bID) {
			return -1;
		}
		
		if (aID < bID) {
			return 1;
		}
		
		return 0;
	};
	
	var list = $('#joinedRooms .room').get();
	list.sort(sortFunction);
	for (var i = list.length - 1; i >= 0; i--) {
		list[i].parentNode.appendChild(list[i]);
	}
}

function setupConversation(conversationInfo, makeCurrent) {
	// Add the conversation to the left panel under the appropriate room.
	var listHTML = conversationListHTML(conversationInfo);
	
	$('#roomList-' + conversationInfo.roomID + ' .conversations').append(listHTML);
	
	// Create this conversation's history elements, if they don't exist.
	createConversationHistoryElements(conversationInfo);
	
	// Hide this conversation's history elements by default.
	$('#conversation-' + conversationInfo.id).hide();
	$('#conversationBanner-' + conversationInfo.id).hide();
	
	// Update all the conversation elements we just created.
	updateConversationElements(conversationInfo);
	
	// This conversation might be sticky (or not), so we'll need to sort the sidebar.
	sortConversations(conversationInfo.roomID);
	
	if (makeCurrent) {
		makeConversationCurrent(conversationInfo.id);
	}
}

function setupJoinedRoom(roomInfo, makeCurrent) {
	if (!isRoomJoined(roomInfo.id)) {
		// If the roomInfo is already in roomsInfo, replace it with the latest.
		var roomsInfoIndex;
		roomsInfo.forEach(function (aRoomInfo) {
			if (aRoomInfo.id == roomInfo.id) {
				roomsInfoIndex = roomsInfo.indexOf(aRoomInfo);
			}
		});
		if (roomsInfoIndex > -1) {
			roomsInfo[roomsInfoIndex] = roomInfo;
		} else {
			roomsInfo.push(roomInfo);
		}
		
		var $roomListElement = $('#roomList-' + roomInfo.id);
		var $roomElement = $('#room-' + roomInfo.id);
		var $roomInfoElement = $('#roomInfo-' + roomInfo.id);

		// Create the room history element if it doesn't exist.
		if (!$roomElement.length) {
			$('<div id="room-' + roomInfo.id + '" class="room"></div>').appendTo(historyElement);
			$roomElement = $('#room-' + roomInfo.id);
		}

		// Create and populate the roomInfo element if it doesn't exist.
		if (!$roomInfoElement.length) {
			var peopleSuffix = 'People';
			if (roomInfo.peopleInfo.length === 1) {
				peopleSuffix = 'Person';
			}
// 			var leaveButton = '<button onclick="exitRoom(' + roomInfo.id + ')">Leave</button>';
			var leaveButton = '';
			if (serverStatus.guestServer) {
				leaveButton = '';
			}
			$('<div id="roomInfo-' + roomInfo.id + '" class="roomInfo"><h2>' + roomInfo.name + '</h2><p class="peopleCount"><span>' + roomInfo.peopleInfo.length + ' ' + peopleSuffix + '</span> ' + leaveButton + '</p><div data-current-conversation-info="true"></div></div>').appendTo('#rightPanel');

			$roomInfoElement = $('#roomInfo-' + roomInfo.id);

			// Add the people to the sidebar.
			roomInfo.peopleInfo.forEach(function (personInfo) {
				var personClasses = generatePersonClasses(personInfo.id, personInfo);
				addPersonToRoomSidebar(personClasses, personInfo.id, personInfo.name, personInfo.avatarURL, personInfo.idle ? 'idle' : 'online', personInfo.status, roomInfo.id, personInfo.conferenceAttendee);
			});
		}

		// Move the room to the correct section in the left sidebar.
		$roomListElement.appendTo($('#joinedRooms'));
		
		// Add the load more events button to the room.
/*
		var buttonHTML = loadMoreEventsButtonHTML(roomInfo.id);
		$(buttonHTML).prependTo($roomElement);
*/
		
		updatePeopleCountForRoom(roomInfo.id);
		
		// Make the room current.
		if (makeCurrent) {
			makeRoomCurrent(roomInfo.id);
		}
		
		// Get the room's history.
		getHistory(roomInfo.id);
		
		sortParticipantLists();
		
		sortJoinedRoomsList();
		
		for (var key in conversationsInfo) {
			if (conversationsInfo.hasOwnProperty(key)) {
				var conversationInfo = conversationsInfo[key];
				
				if (conversationInfo.roomID == roomInfo.id) {
					setupConversation(conversationInfo);
				}
			}
		}
	}
}

function audioStreamIsOnline() {
	$('#main').addClass('onair');
	$('#audioStreamButton').removeClass();
	$('#audioStreamButton').addClass('play');
	var audioStreamURL = audioStreamInfo.protocol + '://' + audioStreamInfo.host + ':' + audioStreamInfo.port + '/;';
	
	// Apple's always-on audio stream.
	if (myPersonInfo.id == 'w1335') {
		audioStreamURL = 'http://stardust.wavestreamer.com:9995/;';
	}
	
	$('#audioStream').attr('src', audioStreamURL);
}

function audioStreamIsOffline() {
	// The audio stream is never offline for Apple.
	if (myPersonInfo.id == 'w1335') {
		return;
	}
	
	$('#main').removeClass('onair');
	$('#audioStream').get(0).pause();
	$('#audioStream').removeAttr('src');		
}

function markUnread(roomID, conversationID) {
	if (conversationID) {
		$('#conversationList-' + conversationID).addClass('unread');
		
		updateCollapsedRoomUnreadAndMentionIndicators(roomID);
	}
	else if (roomID) {
		$('#roomList-' + roomID).addClass('unread');
	}
	
	updateLeftPanelButtonUnreadDot();
	
	sortConversations(roomID);
}

function markMentioned(roomID, conversationID) {
	if (conversationID) {
		$('#conversationList-' + conversationID).addClass('unread').addClass('mentioned');
		
		updateCollapsedRoomUnreadAndMentionIndicators(roomID);
	}
	else if (roomID) {
		$('#roomList-' + roomID).addClass('unread').addClass('mentioned');
	}
	
	updateLeftPanelButtonUnreadDot();
	
	sortConversations(roomID);
}

function currentlyIn(roomID, conversationID) {
	var roomMatches = false;
	if (currentRoomInfo && currentRoomInfo.id == roomID) {
		roomMatches = true;
	}
	
	// If all we get is a roomID.
	if (!conversationID && roomMatches) {
		return true;
	}
	
	// If we get both a roomID and conversationID.
	if (roomMatches && currentConversationInfo && currentConversationInfo.id == conversationID) {
		return true;
	}
	
	return false;
}

function makeCurrentAndScrollToEvent(roomID, conversationID, eventID) {
	if (conversationID) {
		makeConversationCurrent(conversationID);
		$('#conversation-' + conversationID + ' .event-' + eventID)[0].scrollIntoView(false);
	}
	else {
		makeRoomCurrent(roomID);
		$('#room-' + conversationID + ' .event-' + eventID)[0].scrollIntoView(false);
	}
}

function exitRoom(roomID) {
	var $roomListElement = $('#roomList-' + roomID);
	var $roomElement = $('#room-' + roomID);
	var $roomInfoElement = $('#roomInfo-' + roomID);
	
	if ($roomElement.length) {
		$roomElement.remove();
		$roomInfoElement.remove();
		
		$roomListElement.appendTo($('#otherRooms'));
		
		var theFirstJoinedRoomID = firstJoinedRoomID();
		if (theFirstJoinedRoomID) {
			makeRoomCurrent(theFirstJoinedRoomID);
		} else {
			$('header h1').text(theTitle);
			if (!$('#noCurrentRoom').length) {
				$('<div id="noCurrentRoom">You are not currently in a room.  Rooms are where the awesome is; you should probably join one!</div>').appendTo(historyElement);
			}
			$('#message').prop('disabled', true);
			$('#sendMessage').prop('disabled', true);
		}
		
		emitLeaveRoom(roomID);
	}
}

function handleLiveEvent(eventInfo) {
	beginPotentiallyDetrementalScroll();
	
	// Get the roomInfo.
	var roomInfo = {};

	roomsInfo.forEach(function (theRoomInfo) {
		if (theRoomInfo.id == eventInfo.roomID) {
			roomInfo = theRoomInfo;
		}
	});
	
	// Get the conversationInfo.
	var conversationInfo = {};
	
	if (eventInfo.conversationID) {
		conversationInfo = conversationsInfo[eventInfo.conversationID];
	}
	
	// Does this event belong to the person running the client?
	var myEvent = eventInfo.personID == myPersonInfo.id;
	
	// Get the matching transcript element(s).
	var $transcriptElements;
	
	// We always want the room.
	var transcriptElementsSelector = '#room-' + roomInfo.id;
	
	// If this is for a conversation, and is not a new conversation announcement, we also want the conversation transcript.
	if (conversationInfo.id && eventInfo.type !== 'newConversation') {
		transcriptElementsSelector += ', #conversation-' + conversationInfo.id;
	}
	
	$transcriptElements = $(transcriptElementsSelector);
	
	var currentlyInMatchingRoomOrConversation = currentlyIn(roomInfo.id, conversationInfo.id);
		
	// Was the person running the client mentioned in this message?
	var mentioned = false;
	
	// The server-side Markdown formatting will replace " with &quot;, so we need to do the same thing here for mention comparisons to work.
	var myNameForMentionComparison = replaceAll(myPersonInfo.name, '"', '&quot;');
	
	if (eventInfo.contentHTML && eventInfo.contentHTML.indexOf(myNameForMentionComparison) > -1) {
		mentioned = true;
	}
			
	// Joined...
	if (eventInfo.type === 'joined') {
		// Not my event.
		if (!myEvent) {
			// Add the person that joined to the right sidebar for this room.
			var personClasses = generatePersonClasses(eventInfo.personID, eventInfo);
			
			addPersonToRoomSidebar(personClasses, eventInfo.personID, eventInfo.name, eventInfo.avatarURL, 'online', eventInfo.status, eventInfo.roomID, eventInfo.conferenceAttendee); // Note that the conferenceAttendee property only exists on events of type 'joined'.
			
			sortParticipantLists();
		}
	}
	// Left...
	else if (eventInfo.type === 'left') {
		// My event.
		if (myEvent) {
			// The person running the client left a room.
			if (eventInfo.type === 'left') {
				exitRoom(eventInfo.roomID);
			}			
		}
		// Not my event.
		else {
			removePersonFromRoomSidebar(eventInfo.personID, eventInfo.roomID);
			sortParticipantLists();
		}
	}
	// Messages and new conversation notifications for rooms...
	else if (eventInfo.type === 'message' || eventInfo.type === 'newConversation') {
		// For each of the matching transcript elements...
		$transcriptElements.each(function (index, element) {
			var $transcriptElement = $(element);
			
			// If the event is already in the transcript, we already did all this, so we're not going to do it again.
			if ($transcriptElement.find('.event-' + eventInfo.id).length > 0) {
				return;
			}
			
			var html = '';
			
			if (datasetAsObjectBugWorkaround($transcriptElement[0].dataset).completeToBottom === 'true') {
				// Is this a room or conversation?
				var roomTranscript = false;
				
				var openWrapperConversationID = null;
				
				var lastSpeaker = datasetAsObjectBugWorkaround($transcriptElement[0].dataset).lastSpeaker;
				
				var lastMessageTimestamp = datasetAsObjectBugWorkaround($transcriptElement[0].dataset).lastMessageTimestamp;
								
				// If this is a room transcript...
				if ($transcriptElement[0].id.indexOf('room') > -1) {
					// Set room transcript to true.
					roomTranscript = true;
					
					// Get the open wrapper conversation ID if there is one.
					if (datasetAsObjectBugWorkaround($transcriptElement[0].dataset).openWrapperConversationId) {
						openWrapperConversationID = parseInt(datasetAsObjectBugWorkaround($transcriptElement[0].dataset).openWrapperConversationId);
					}
				}
				
				// This event goes in the currently open wrapper.
				if (eventInfo.type !== 'newConversation' && roomTranscript && eventInfo.conversationID && eventInfo.conversationID == openWrapperConversationID) {
					var $wrapper = $('#room-' + eventInfo.roomID + ' .conversationWrappedEvents').filter(':last');
					
					html += eventHTML(eventInfo, lastSpeaker, lastMessageTimestamp);
					
					$(html).appendTo($wrapper);
					
					// Update the last speaker.
					$transcriptElement[0].dataset.lastSpeaker = eventInfo.personID;
					
					// Update the last message timestamp.
					$transcriptElement[0].dataset.lastMessageTimestamp = eventInfo.created;
				}
				// This event goes in a new wrapper.
				else if (eventInfo.type !== 'newConversation' && roomTranscript && eventInfo.conversationID) {
					$transcriptElement[0].dataset.openWrapperConversationId = eventInfo.conversationID;
					
					lastSpeaker = null;
					
					html += inlineConversationWrapperStartHTML(eventInfo.conversationID);
					html += eventHTML(eventInfo, lastSpeaker, lastMessageTimestamp);
					html += inlineConversationWrapperEndHTML();
					
					$(html).appendTo($transcriptElement);
					
					// Update the last speaker.
					$transcriptElement[0].dataset.lastSpeaker = eventInfo.personID;
					
					// Update the last message timestamp.
					$transcriptElement[0].dataset.lastMessageTimestamp = eventInfo.created;
				}
				// This event does not go in a wrapper.
				else {
					if (openWrapperConversationID) {
						delete $transcriptElement[0].dataset.openWrapperConversationId;
						
						delete $transcriptElement[0].dataset.lastSpeaker;
						
						lastSpeaker = null;
					}
					
					html += eventHTML(eventInfo, lastSpeaker, lastMessageTimestamp);
					
					$(html).appendTo($transcriptElement);
					
					if (eventInfo.type === 'message') {
						$transcriptElement[0].dataset.lastSpeaker = eventInfo.personID;
						$transcriptElement[0].dataset.lastMessageTimestamp = eventInfo.created;
					}
					else {
						delete $transcriptElement[0].dataset.lastSpeaker;
						delete $transcriptElement[0].dataset.lastMessageTimestamp;
					}
				}
				
				if (currentlyInMatchingRoomOrConversation) {
					// Add .long to this event if needed.
					addLongIfNeeded('.event-' + eventInfo.id);
				}
			}
			
			if (!myEvent) {
				// If this event is for a room or conversation we're not currently in, or we are currently in it but not scrolled to the bottom, mark it as unread.
				if (!currentlyInMatchingRoomOrConversation || (currentlyInMatchingRoomOrConversation && datasetAsObjectBugWorkaround($transcriptElement[0].dataset).scrollPosition !== 'bottom')) {
					markUnread(eventInfo.roomID, eventInfo.conversationID);
				}
				
				if (mentioned) {
					// Add mentioned class to the left sidebar item if that room/conversation is not current, or it is current and not scrolled to the bottom.
					if (!currentlyInMatchingRoomOrConversation || (currentlyInMatchingRoomOrConversation && datasetAsObjectBugWorkaround($transcriptElement[0].dataset).scrollPosition !== 'bottom')) {
						markMentioned(eventInfo.roomID, eventInfo.conversationID);
					}
				}
			}
		});
		
		// If the event's content contains a link to another conversation, update all conversation elements.
		if (eventInfo.content && eventInfo.content.match(/\(\(c([0-9]+)\)\)/gi)) {
			updateConversationElements();
		}
		// If the event belongs to a conversation, update that conversation's elements.
		else if (eventInfo.conversationID) {
			updateConversationElements(conversationInfo);
		}
		
		// Get sound and notification options.
		var messageSoundsEnabled = $('#newMessageSoundsCheckbox').is(':checked');
		var mentionSoundsEnabled = $('#newMentionSoundsCheckbox').is(':checked');
		var mentionNotificationsEnabled = $('#newMentionNotificationsCheckbox').is(':checked');
		
		// If this message DOES NOT belong to the person running the client...
		if (!myEvent) {
			// If the window/tab is not in focus...
			if (!windowIsFocused) {
				// Increment the new message badge counter.
				newMessageBadgeCounter++;
				
				// Add/update new message counter in document title.
				document.title = '(' + newMessageBadgeCounter + ') ' + theTitle;
				
				// If the badge option is checked...
				if ($('#badge').is(':checked')) {
					// Update the Fluid badge.
					if (window.fluid) {
						fluid.dockBadge = newMessageBadgeCounter;
					}
					
					// Update the native Mac app badge.
					if (window.macNative) {
						webkit.messageHandlers.talk.postMessage({
							kind: 'badge',
							content: newMessageBadgeCounter
						});
					}					
				}
			}
			
			// This keeps track of if we've already played a sound or not so we can avoid playing more than one sound at a time.
			var soundPlayed = false;
			
			// We want to handle mention stuff first, because it takes prominance.  For example, if we play a new mention sound, we want that to trump playing a new message sound.
			
			// If this person was mentioned in this message...
			if (mentioned) {
				// Assemble strings for displaying notifications about this mention.
				var mentionedName = conversationInfo.title ? conversationInfo.title : roomInfo.name;
				var mentionNotificationTitle = eventInfo.name + ' Mentioned You in "' + mentionedName + '"';
				var mentionNotificationBody = $("<div/>").html(eventInfo.contentHTML).text();
				
				// If the room/conversation this event belongs to is not current...
				if (!currentlyIn(roomInfo.id, conversationInfo.id)) {
					// Show info letting them know they were mentioned somewhere else.
					showInfo(mentionNotificationTitle, 'info', true);
				}
				
				// Mention notification.
				if (mentionNotificationsEnabled && !windowIsFocused) {
					// Web Browser Notifications
					if (Notification.permission === 'granted') {
						var notification = new Notification(mentionNotificationTitle, {
							body: mentionNotificationBody,
							icon: '/images/seanwes-talk-64x64.png'
						});
						
						notification.onclick = function () {
							makeCurrentAndScrollToEvent(eventInfo.roomID, eventInfo.conversationID, eventInfo.id);
							this.close();
						};
					}
					// Native Mac Local Notifications
					if (window.macNative) {
						webkit.messageHandlers.talk.postMessage({
							kind: 'mention',
							title: mentionNotificationTitle,
							body: mentionNotificationBody,
							roomID: eventInfo.roomID,
							conversationID: eventInfo.conversationID,
							eventID: eventInfo.id
						});
					}
				}
				
				// Mention sound.
				if (mentionSoundsEnabled) {
					// If the new mention sound is currently playing, pause it and seek to the beginning.
					newMentionAudio.pause();
					if (newMentionAudio.fastSeek) {
						newMentionAudio.fastSeek(0);
					}
					
					// Play the new mention sound.
					newMentionAudio.play();
					
					// We played a sound!
					soundPlayed = true;
				}
			}
			
			// If we didn't play a sound yet, and new message sounds are enabled...
			if (!soundPlayed && messageSoundsEnabled) {
				// If the new message sound is currently playing, pause it and seek to the beginning.
				newMessageAudio.pause();
				if (newMessageAudio.fastSeek) {
					newMessageAudio.fastSeek(0);
				}
				
				// Play the new message sound.
				newMessageAudio.play();
				
				// We played a sound!
				soundPlayed = true;
			}
		}
	}
	
	endPotentiallyDetrementalScroll();
	
	// Handle combos.
	var displayComboBreaker = false;
	
	// We only want to display the combo breaker animation if this event is for the room or conversation we're currently in.
	if (currentlyIn(eventInfo.roomID, eventInfo.conversationID)) {
		displayComboBreaker = true;
	}
	
	updateComboStatus(displayComboBreaker);
}

function updateStatusPlaceholder() {
	if (myPersonInfo.status == 'Online') {
		$('#message').attr('placeholder', '');
	} else {
		$('#message').attr('placeholder', 'Status: ' + myPersonInfo.status);
	}
	autoGrowMessageField(messageElement);
}

function toggleVideo() {
	if ($('body').hasClass('videoVisible')) {
		hideVideo();
	}
	else {
		showVideo();
	}
}

function updateRoomListsWithRoomsInfo() {
	// Empty the room lists.
	$('#joinedRooms .room').remove();
	$('#otherRooms .room').remove();
	
	roomsInfo.forEach(function (roomInfo) {
		if (!myPersonInfo.guest || (myPersonInfo.guest && roomInfo.guestsAllowed)) {
			addRoomToList(roomInfo);
		}
	});
}

function liveCreateNewRoom() {
	var name = document.getElementById('liveName').value;
	var color = document.getElementById('liveColor').value;
	var url = document.getElementById('liveURL').value;
	var redirectURL = document.getElementById('liveRedirectURL').value;
	var participantRedirectURL = document.getElementById('liveParticipantRedirectURL').value;
	var buttonText = document.getElementById('liveButtonText').value;
	var videoURL = document.getElementById('liveVideoURL').value;
	var livePrivateSlug = document.getElementById('livePrivateSlug').value;
	var livePrivateRedirectURL = document.getElementById('livePrivateRedirectURL').value;
	
	var videoEnabled = document.getElementById('liveVideoEnabled').checked;
	var live = document.getElementById('liveStatus').checked;
	var livePrivate = document.getElementById('livePrivate').checked;

	socket.emit('new live room', {
		name: name,
		color: color,
		url: url,
		redirectURL: redirectURL,
		participantRedirectURL: participantRedirectURL,
		live: live,
		buttonText: buttonText,
		videoEnabled: videoEnabled,
		videoURL: videoURL,
		livePrivate: livePrivate,
		livePrivateSlug: livePrivateSlug,
		livePrivateRedirectURL: livePrivateRedirectURL
	});
	
	hideOverlay();
}

function liveUpdateRoom() {
	var name = document.getElementById('liveName').value;
	var color = document.getElementById('liveColor').value;
	var url = document.getElementById('liveURL').value;
	var redirectURL = document.getElementById('liveRedirectURL').value;
	var participantRedirectURL = document.getElementById('liveParticipantRedirectURL').value;
	var buttonText = document.getElementById('liveButtonText').value;
	var videoURL = document.getElementById('liveVideoURL').value;
	var livePrivateSlug = document.getElementById('livePrivateSlug').value;
	var livePrivateRedirectURL = document.getElementById('livePrivateRedirectURL').value;
	
	var videoEnabled = document.getElementById('liveVideoEnabled').checked;
	var live = document.getElementById('liveStatus').checked;
	var livePrivate = document.getElementById('livePrivate').checked;
	
	socket.emit('update live room', {
		roomID: currentRoomInfo.id,
		name: name,
		color: color,
		url: url,
		redirectURL: redirectURL,
		participantRedirectURL: participantRedirectURL,
		live: live,
		buttonText: buttonText,
		videoEnabled: videoEnabled,
		videoURL: videoURL,
		livePrivate: livePrivate,
		livePrivateSlug: livePrivateSlug,
		livePrivateRedirectURL: livePrivateRedirectURL
	});
	
	hideOverlay();
}

// This function is based on the getBoundingClientRect() function, so the top value provided should be the original getBoundingClientRect().top value you want to return the event to.
function scrollEventInContainerToPositionInHistory(eventID, container, top) {
	if (container && eventID) {
		var eventElement = container.querySelector('.event-' + eventID);
		
		if (eventElement) {
			var newTop = eventElement.getBoundingClientRect().top;
			
			var topChange = newTop - top;
			
			historyElement.scrollTop = historyElement.scrollTop + topChange;
			
			saveHistoryScrollPosition();
		}
	}
}

// !---- Conversation Functions ----

function conversationNew(title, firstMessage, roomID, typeID, sticky) {
	justCreatedConversation = true;
	
	socket.emit('new conversation', {
		title: title,
		firstMessage: firstMessage,
		roomID: roomID,
		typeID: typeID,
		sticky: sticky
	});
}

function sendCommand(command) {
	emitNewMessage(currentRoomInfo.id, currentConversationInfo.id, 'text', command);
}

function editConversation(conversationID) {
	conversationBeingEdited = conversationsInfo[conversationID];
	sendCommand('/conversation');
}

function conversationEdit(conversationID, title, typeID, sticky) {
	socket.emit('edit conversation', {
		conversationID: conversationID,
		title: title,
		typeID: typeID,
		sticky: sticky
	});
}

function conversationArchive(conversationID) {
	socket.emit('archive conversation', {
		conversationID: conversationID
	});
}

function startListeningToConversation(conversationID) {
	socket.emit('start listening', {
		conversationID: conversationID
	});
}

function stopListeningToConversation(conversationID) {
	socket.emit('stop listening', {
		conversationID: conversationID
	});
}

function toggleListeningToConversation(conversationID) {
	if ($('#conversationList-' + conversationID).hasClass('notListening')) {
		startListeningToConversation(conversationID);
	}
	else {
		stopListeningToConversation(conversationID);
	}
}

/*
function scrollToEventInCurrentConversation(eventID) {
	if (!currentConversationInfo || !currentConversationInfo.id) {
		return;
	}
	
	var eventToScrollTo = $('#conversation-' + currentConversationInfo.id + ' .event-' + eventID)[0];
	eventToScrollTo.scrollIntoView(false);
	delete conversationHistoryElement.dataset.scrollToEventId;
}
*/

// !---- Prevent Focus Stealing ----

// TODO: I don't think this works very well, or at all.
$('button, .personClick, #scrollInfo').on('mousedown', function (event) {
	event.preventDefault();
});

// !---- Resizing ----

// var shouldScrollToBottomForResize = shouldHistoryScrollToBottom();

var resizeCompleteTimeout;	

$(window).on('resize', function () {
	beginPotentiallyDetrementalScroll();
	
	if ($(window).width() < 601) {
		$('body').removeClass('leftPanelVisible');
		$('body').removeClass('rightPanelVisible');
	}
	else {
		$('body').addClass('leftPanelVisible');
		$('body').addClass('rightPanelVisible');
	}
	
	// We don't want to end the potentially detremental scroll event every time the resize event fires, so we put it behind a delay.
	if (resizeCompleteTimeout) {
		clearTimeout(resizeCompleteTimeout);
	}
	
	resizeCompleteTimeout = setTimeout(function () {
		// After a resize the heights of the messages have probably changed, so we need to recalculate if they're long or not.
		var recomputeLongMessages = true;
		endPotentiallyDetrementalScroll(recomputeLongMessages);
	}, 300);
	
	updateHeaderTitle();
});
	
// !---- History Touch Dragging/Panel Reveal ----

var historyDragStartX = 0;
var historyDragStartY = 0;
var historyDragDistanceX = 0;
var historyDragDistanceY = 0;
var historyDragDirection = null;
var historyStartTranslateX = 0;

function matrixToArray(str) {
	return str.match(/(-?[0-9\.]+)/g);
}

// !TODO: Refactor to improve performance.
historyElement.addEventListener('touchstart', function (event) {
	if ($(window).width() < 601) {
		// Get the first finger.
		var touchObject = event.changedTouches[0];
		
		// This is a new touch, so let's set our base values.
		historyDragStartX = parseInt(touchObject.screenX);
		historyDragStartY = parseInt(touchObject.screenY);
		historyDragDistanceX = 0;
		historyDragDistanceY = 0;
		historyDragDirection = null;
		
		// This extracts the current transform: translateX() value from the history element.
		var currentHistoryTransformMatrix = window.getComputedStyle(historyElement).webkitTransform || window.getComputedStyle(historyElement).transform;
		historyStartTranslateX = parseInt(matrixToArray(currentHistoryTransformMatrix)[4]);
		
		// We want to turn of transitions as we drag, as they cause responsiveness problems.
		historyElement.style.webkitTransition = 'none';
		historyElement.style.transition = 'none';
		scrollInfoElement.style.webkitTransition = 'none';
		scrollInfoElement.style.transition = 'none';
		footerElement.style.webkitTransition = 'none';
		footerElement.style.transition = 'none';
	}
}, false);

// !TODO: Refactor to improve performance.
historyElement.addEventListener('touchmove', function (event) {
	if ($(window).width() < 601) {
		// Get the first finger.
		var touchObject = event.changedTouches[0];
		
		// Calculate the distance, on the X and Y axies, that the finger has moved.
		historyDragDistanceX = parseInt(touchObject.screenX) - historyDragStartX;
		historyDragDistanceY = parseInt(touchObject.screenY) - historyDragStartY;
		
		// We need to determine if this is a vertical or horizontal scroll.
		if (!historyDragDirection) {
			if (historyDragDistanceX > 40 || historyDragDistanceX < -40) {
				historyDragDirection = 'X';
			}
			if (historyDragDistanceY > 40 || historyDragDistanceY < -40) {
				historyDragDirection = 'Y';
			}
		}
		
		// We only want to move things around and prevent the default scroll behavior if this is a horizontal scroll.
		if (historyDragDirection === 'X') {
			var targetTranslateX = historyDragDistanceX + historyStartTranslateX;
			
			// Cap the max values.
			if (targetTranslateX > 200) {
				targetTranslateX = 200;
			}
			if (targetTranslateX < -200) {
				targetTranslateX = -200;
			}
			if (targetTranslateX < 20 && targetTranslateX > -20) {
				targetTranslateX = 0;
			}
			
			// If the history has been dragged to the left or right a significant amount, we want to hide the panel that is NOT being revealed, as it can bleed over on narrow screens during the drag.
			if (targetTranslateX < 0) {
				$('#leftPanel').hide();
				$('#rightPanel').show();
			}
			if (targetTranslateX > 0) {
				$('#leftPanel').show();
				$('#rightPanel').hide();
			}
			if (targetTranslateX === 0) {
				$('#leftPanel').show();
				$('#rightPanel').show();
			}
			
			// Move the history and other elements.
			historyElement.style.webkitTransform = 'translateX(' + targetTranslateX + 'px)';
			historyElement.style.transform = 'translateX(' + targetTranslateX + 'px)';
			scrollInfoElement.style.webkitTransform = 'translateX(' + targetTranslateX + 'px)';
			scrollInfoElement.style.transform = 'translateX(' + targetTranslateX + 'px)';
			footerElement.style.webkitTransform = 'translateX(' + targetTranslateX + 'px)';
			footerElement.style.transform = 'translateX(' + targetTranslateX + 'px)';
			
			// Prevent the default scroll behavior.
			event.preventDefault();
		}
	}
});

// !TODO: Refactor to improve performance.
historyElement.addEventListener('touchend', function () {
	if ($(window).width() < 601) {
		// This extracts the current transform: translateX() value from the history element.
		var currentHistoryTransformMatrix = window.getComputedStyle(historyElement).webkitTransform || window.getComputedStyle(historyElement).transform;
		var currentTranslateX = parseInt(matrixToArray(currentHistoryTransformMatrix)[4]);
		
		// Re-enable the transitions and transforms from the CSS.
		historyElement.style.webkitTransition = null;
		historyElement.style.transition = null;
		scrollInfoElement.style.webkitTransition = null;
		scrollInfoElement.style.transition = null;
		footerElement.style.webkitTransition = null;
		footerElement.style.transition = null;

		historyElement.style.webkitTransform = null;
		historyElement.style.transform = null;
		scrollInfoElement.style.webkitTransform = null;
		scrollInfoElement.style.transform = null;
		footerElement.style.webkitTransform = null;
		footerElement.style.transform = null;
		
		// Depending on where the history element is, and which panel is currently visible, hide or show the appropriate panel.
		
		$('#leftPanel').show();
		$('#rightPanel').show();

		// If this is just a single tap, not a drag, on history and a panel is visible, hide the panel.
		if (($('body').hasClass('leftPanelVisible') || $('body').hasClass('rightPanelVisible')) && historyDragDistanceX < 2 && historyDragDistanceX > -2 && historyDragDistanceY < 2 && historyDragDistanceY > -2) {
			$('body').removeClass('leftPanelVisible');
			$('body').removeClass('rightPanelVisible');								
		}
		
		// Show the left panel.
		else if (!$('body').hasClass('leftPanelVisible') && currentTranslateX > 60) {
			$('body').addClass('leftPanelVisible');
			$('body').removeClass('rightPanelVisible');				
		}
		
		// Hide the left panel.
		else if ($('body').hasClass('leftPanelVisible') && currentTranslateX < 140) {
			$('body').removeClass('leftPanelVisible');
			$('body').removeClass('rightPanelVisible');
		}
		
		// Show the right panel.
		else if (!$('body').hasClass('rightPanelVisible') && currentTranslateX < -60) {
			$('body').addClass('rightPanelVisible');
			$('body').removeClass('leftPanelVisible');				
		}
		
		// Hide the right panel.
		else if ($('body').hasClass('rightPanelVisible') && currentTranslateX > -140) {
			$('body').removeClass('rightPanelVisible');
			$('body').removeClass('leftPanelVisible');				
		}
	}
});

var wheelShouldRevealPanels = true;

document.getElementById('main').addEventListener('wheel', function (event) {
	if ($(window).width() < 601) {
		var sensitivity = 30;
		
		var scrollDirection = null;
		
		if (event.deltaX < -(sensitivity)) {
			scrollDirection = 'right';
		}
		
		if (event.deltaX > sensitivity) {
			scrollDirection = 'left';
		}
					
		if (scrollDirection && wheelShouldRevealPanels) {
			if (scrollDirection === 'right') {
				if ($('body').hasClass('rightPanelVisible')) {
					$('body').removeClass('rightPanelVisible');
				} else {
					$('body').addClass('leftPanelVisible');
				}
			}
			if (scrollDirection === 'left') {
				if ($('body').hasClass('leftPanelVisible')) {
					$('body').removeClass('leftPanelVisible');
				} else {
					$('body').addClass('rightPanelVisible');
				}
			}
			wheelShouldRevealPanels = false;
			setTimeout(function () {
				wheelShouldRevealPanels = true;
			}, 320);
		}
	}
});

function toggleLeftPanel() {
	beginPotentiallyDetrementalScroll();
	
	$('body').toggleClass('leftPanelVisible');
	
	if ($(window).width() < 601) {
		$('body').removeClass('rightPanelVisible');
	}
	
	setTimeout(function () {
		// The height of the messages probably changed, so we need to recompute if they're long or not.
		var recomputeLongMessages = true;
		endPotentiallyDetrementalScroll(recomputeLongMessages);
	}, 340); // This delay needs to match up with or exceed the associated transitions in the CSS.
}

function toggleRightPanel() {
	beginPotentiallyDetrementalScroll();
	
	$('body').toggleClass('rightPanelVisible');
	
	if ($(window).width() < 601) {
		$('body').removeClass('leftPanelVisible');
	}
	
	setTimeout(function () {
		// The height of the messages probably changed, so we need to recompute if they're long or not.
		var recomputeLongMessages = true;
		endPotentiallyDetrementalScroll(recomputeLongMessages);
	}, 340); // This delay needs to match up/exceed with the transitions in the CSS.
}

// !---- iOS Native Stuff ----

// Hide the 1Password element.
$('#iOSNative1Password').hide();

// This is a setup function for iOS devices.
function iOSNativeSetup() {
	console.log('iOSNativeSetup called.');
	
	// Set the global iOSNative to true.
	iOSNative = true;
	
	// Hide audio options that don't work on iOS.
	$('#newMessageSoundsCheckbox').prop('checked', false);
	$('#newMentionSoundsCheckbox').prop('checked', false);
	$('#audioOptions').hide();
	
	// Set the font size.
	$('#fontSize').attr('size', '5');
}

function iOSNativeUnreachable() {
	console.log('iOSNativeUnreachable called.');
}

function iOSNativeReachable() {
	console.log('iOSNativeReachable called.');
}

function iOSNativeKeyboardWillShow() {
	console.log('iOSNativeKeyboardWillShow called.');
}

function iOSNativeKeyboardWillHide() {
	console.log('iOSNativeKeyboardWillHide called.');
}

function iOSNativeKeyboardWillChangeFrame() {
	console.log('iOSNativeKeyboardWillChangeFrame called.');
}

function iOSNativeKeyboardDidShow() {
	console.log('iOSNativeKeyboardDidShow called.');
}

function iOSNativeKeyboardDidHide() {
	console.log('iOSNativeKeyboardDidHide called.');
}

function iOSNativeKeyboardDidChangeFrame() {
	console.log('iOSNativeKeyboardDidChangeFrame called.');
}

function iOSNativeDidFinishLaunching() {
	console.log('iOSNativeDidFinishLaunching called.');
}

function iOSNativeWillResignActive() {
	console.log('iOSNativeWillResignActive called.');
}

function iOSNativeDidEnterBackground() {
	console.log('iOSNativeDidEnterBackground called.');
}

function iOSNativeWillEnterForeground() {
	console.log('iOSNativeWillEnterForeground called.');
}

function iOSNativeDidBecomeActive() {
	console.log('iOSNativeDidBecomeActive called.');
}

function iOSNativeWillTerminate() {
	console.log('iOSNativeWillTerminate called.');
}

// This is a utility function that lets us send a message to the iOS app code.
function iOSNativeSendMessage(message) {
	// Create a temporary iFrame to send the message.
	var iframe = document.createElement('iframe');
	
	// Set the src attribute of the iFrame to the URL containing the message.
	iframe.setAttribute('src', 'seanwes-live-ios://' + message);
	
	// Append the iFrame to the document, which causes the src attribute's URL to be called by the system, which relays the message to the iOS code.
	document.documentElement.appendChild(iframe);
	
	// Now that we've sent the message we clean up by removing the iFrame from the document and nulling out the variable to ensure it doesn't stick around in memory.
	iframe.parentNode.removeChild(iframe);
	iframe = null;
}

// Displays and activates the 1Password integration functionallity in the iOS app.
function iOSNative1PasswordIsAvailable() {
	console.log('iOSNative1PasswordIsAvailable called.');
	
	// Show 1Password control on login screen.
	$('#iOSNative1Password').show();
	$('#iOSNative1PasswordButton').click(function () {
		iOSNativeSendMessage('one-password-fill-login');
	});
}

// !---- iOS Push Notifications ----

function pushGetSelectedSubscriptionIDs() {
	// Turn on all subscriptions intially one time.
	if (!docCookies.hasItem('oneTimePushEnable')) {
		$('#pushNotifications .subscription').each(function () {
			$(this).prop('checked', true);
		});
		docCookies.setItem('oneTimePushEnable', true, Infinity);
	}
	var array = [];
	$('#pushNotifications .subscription').each(function () {
		if ($(this).prop('checked')) {
			array.push($(this).val());
		}
	});
	return array;
}

// Tells the native app to register/unregister and save subscriptions based on the push boxes checked.
function pushRegisterSubscriptions() {
	var subscriptionIDs = pushGetSelectedSubscriptionIDs();
	if (subscriptionIDs.length > 0) {
		var subscriptionsString = subscriptionIDs.join('/');
		iOSNativeSendMessage('push-register-subscriptions/' + subscriptionsString);
	} else {
		iOSNativeSendMessage('push-unregister-subscriptions');
	}
}

// Triggered by the native app after login success.
function pushApplySavedSubscriptions() {
	for (var key in arguments) {
		var subscriptionID = arguments[key];
		if (subscriptionID != '/') {
			$('#pushCheckbox-' + subscriptionID).prop('checked', true);
		}
	}
	pushRegisterSubscriptions();
}

function pushRegisterDeviceTokenForSubscriptions(token, subscriptionIDs) {
	socket.emit('push register device token for subscriptions', {
		token: token,
		subscriptionIDs: subscriptionIDs
	});
}

// Triggered by the native app when the device token is obtained.
function pushRegisterDeviceToken(token) {
	var subscriptionIDs = pushGetSelectedSubscriptionIDs();
	pushRegisterDeviceTokenForSubscriptions(token, subscriptionIDs);
}

function pushRemoveDeviceToken(token) {
	pushRegisterDeviceTokenForSubscriptions(token, []);
}

function pushSendNotification(message, development, subscriptionIDs) {
	socket.emit('push send notification', {
		message: message,
		development: development,
		subscriptionIDs: subscriptionIDs
	});
}

// !---- Web Notifications ----

var notificationsAvailable = true;

if (!("Notification" in window) || iOS) {
	notificationsAvailable = false;
	$('#newMentionNotificationsCheckboxContainer').remove();
}

// !---- Mac Native Stuff ----

function macNativeSetup() {
	window.macNative = true;
	
	// Hide notification option until they're implemented.
	$('#newMentionNotificationsCheckboxContainer').hide();
}

if (window.macNative) {
	macNativeSetup();
}

if (!window.fluid && !window.macNative) {
	$('#badgeOptionContainer').remove();
}

$(window).focus(function () {
	windowIsFocused = true;
	newMessageBadgeCounter = 0;
	document.title = theTitle;
	if (window.fluid) {
		fluid.dockBadge = '';
	}
	if (window.macNative) {
		webkit.messageHandlers.talk.postMessage({
			kind: 'badge',
			content: 0
		});
	}
});

$(window).blur(function () {
	windowIsFocused = false;
});

// !---- Idle Status ----

// Variable to keep track of idle status.
var idleStatus = false;

// The events that prevent or cancel being idle.
var idleEvents = 'mousemove mousedown wheel touchstart keypress';

// Updates the idleStatus global, and lets the server know when the idle status changes.
function updateIdleStatus(newIdleStatus) {
	// Normalize to booleans, just to be on the safe side.
	newIdleStatus = newIdleStatus ? true : false;
	var oldIdleStatus = idleStatus ? true : false;
	
	// If idle status has changed...
	if (newIdleStatus !== oldIdleStatus) {
		// Set the global idleStatus.
		idleStatus = newIdleStatus;
		
		// Update idle status on the server.
		emitIdleUpdate(newIdleStatus);
	}
}

// Idle setup (uses jQuery Idle, which is included in shared.js).
$(document).idle({
	events: idleEvents,
	onIdle: function () {
		updateIdleStatus(true);
	},
	onActive: function () {
		updateIdleStatus(false);
	},
	keepTracking: true,
	idle: 600000 // 10 Minutes
});

// !---- Font Size ----

$('#decreaseFontSize').click(function () {
	var $selectedSize = $('#fontSize > option:selected');
	var $previousSize = $selectedSize.prev();
	if ($previousSize.length) {
		$selectedSize.prop('selected', false);
		$previousSize.prop('selected', true);
		$('#fontSize').change().blur();
	}
});

$('#increaseFontSize').click(function () {
	var $selectedSize = $('#fontSize > option:selected');
	var $nextSize = $selectedSize.next();
	if ($nextSize.length) {
		$selectedSize.prop('selected', false);
		$nextSize.prop('selected', true);
		$('#fontSize').change().blur();
	}
});

function setFontSize(size) {
	beginPotentiallyDetrementalScroll();
	
	if (size === 'small') {
		$history.css('font-size', '0.85em').css('line-height', '1.4em');
	}
	else if (size === 'normal') {
		$history.css('font-size', '0.95em').css('line-height', '1.4em');
	}
	else if (size === 'large') {
		$history.css('font-size', '1.05em').css('line-height', '1.4em');
	}
	else if (size === 'xlarge') {
		$history.css('font-size', '1.15em').css('line-height', '1.4em');
	}
	else if (size === 'eeen') {
		$history.css('font-size', '1.45em').css('line-height', '1.4em');
	}
	
	endPotentiallyDetrementalScroll();
}

// !---- Options Initialization ----

// !Font Size
if (docCookies.hasItem('fontSize')) {
	var size = docCookies.getItem('fontSize');
	$('#fontSize').val(size);
	setFontSize(size);
} else {
	$('#fontSize').val('normal');
	setFontSize('normal');
}

// !Icon Badge
if (docCookies.getItem('badge') == 'true') {
	$('#badge').prop('checked', true);
}

// !Sounds
if (docCookies.getItem('newMessageSounds') == 'true') {
	$('#newMessageSoundsCheckbox').prop('checked', true);
}

if (docCookies.getItem('newMentionSounds') == 'true') {
	$('#newMentionSoundsCheckbox').prop('checked', true);
}

if (docCookies.hasItem('soundVolume')) {
	var value = docCookies.getItem('soundVolume');
	$('#notificationVolumeSlider').val(value);
	newMessageAudio.volume = value;
	newMentionAudio.volume = value;
} else {
	$('#notificationVolumeSlider').val(0.5);
}

// !--- Initial Panel Visibility ----

// If the width of the viewport is wide enough at load, show the panels.  Otherwise, hide them.
if ($(window).width() > 600) {
	$('body').addClass('leftPanelVisible');
	$('body').addClass('rightPanelVisible');
} else {
	$('body').removeClass('leftPanelVisible');
	$('body').removeClass('rightPanelVisible');
}

// !Notifications
if (docCookies.getItem('newMentionNotifications') == 'true') {
	$('#newMentionNotificationsCheckbox').prop('checked', true);
}

// !Theme
if (docCookies.getItem('theme') === 'dark') {
	$('#darkModeCheckbox').prop('checked', true);
	$('body').addClass('dark');
}

/*
function loadMoreEvents(roomID) {
	$('#room-' + roomID + ' button.loadMoreEvents').text('Loading More...');
	$('#room-' + roomID + ' button.loadMoreEvents').prop('disabled', true);
	var firstEventElementID = $('#room-' + roomID + ' div.event').filter(':first').attr('id');
	var priorToEventID;
	if (firstEventElementID) {
		priorToEventID = firstEventElementID.slice(6);
	}
	requestPriorEvents(roomID, false, priorToEventID);
}
*/

function toggleMute(personID) {
	if ($('.roomInfoPerson-' + personID).hasClass('muted')) {
		unmutePerson(personID);
	} else {
		mutePerson(personID);
	}
}

function toggleOnAir(personID) {
	if ($('.roomInfoPerson-' + personID).hasClass('onair')) {
		offAir(personID);
	} else {
		onAir(personID);
	}
}

function askToKickPerson(personID) {
	var name = $($('.roomInfoPerson-' + personID + ' .name')[0]).text();
	showOverlayWithHTML('<h2>Kick ' + name + '?</h2><p>Are you sure you want to kick ' + name + '?</p><p><strong>This will block their IP</strong> (which might be used by others), and can only be undone by someone with direct access to the database!</p><p style="text-align: right;"><button onclick="hideOverlay()">Cancel</button> <button style="color: white; background-color: #d00;" onclick="kickPerson(\'' + personID + '\')">Kick ' + name + '</button></p>');
}

function populateMessageFieldWithContent(element) {
	$('#message').val($(element).text());
	hideOverlay();
	autoGrowMessageField(messageElement);
	$('#message').focus();
}

function guestChangeDetails() {
	socket.emit('guest details updated', {
		token: myPersonInfo.token,
		personID: myPersonInfo.id,
		name: $('#guestName').val(),
		email: $('#guestEmail').val()
	});
	hideOverlay();
}

function pushSend() {
	var message = $('#pushMessage').val();
	var development = $('#pushDevelopment').prop('checked');
	var subscriptionIDs = [];
	$('#pushSubscriptionsToSendTo .subscription').each(function () {
		if ($(this).is(':checked')) {
			subscriptionIDs.push($(this).val());
		}
	});
	
	if (message.length < 1) {
		showInfo('You can\'t send a blank push notification!', 'error', true);
		return;
	}
	
	if (subscriptionIDs.length < 1) {
		showInfo('You must select one or more groups to send a push notification to.', 'error', true);
		return;
	}
	
	pushSendNotification(message, development, subscriptionIDs);
	showInfo('Your push notification is on the way!', 'success', true);
	hideOverlay();
}

// !--- Keyboard Events ----

// !Keydown Anywhere
$(document).keydown(function(event) {
	var roomID;
	// Go to Previous Room
	if ((event.ctrlKey && event.keyCode == 186) || (event.altKey && event.keyCode == 38)) {
		if ($('#joinedRooms .room').length > 1) {
			// If there's a previous room, make it current.
			var $previousRoom = $('#joinedRooms .room.current').prev('.room');
			if ($previousRoom.length) {
				roomID = roomIDFromRoomListElement($previousRoom);
			}
			// If there isn't a previous room, make the one at the bottom of the list current.
			else {
				$previousRoom = $('#joinedRooms .room:last');
				roomID = roomIDFromRoomListElement($previousRoom);
			}
			makeRoomCurrent(roomID);
		}
		event.preventDefault();
	}
	
	// Go to Next Room
	if ((event.ctrlKey && event.keyCode == 222) || (event.altKey && event.keyCode == 40)) {
		if ($('#joinedRooms .room').length > 1) {
			// If there's a next room, make it current.
			var $nextRoom = $('#joinedRooms .room.current').next('.room');
			if ($nextRoom.length) {
				roomID = roomIDFromRoomListElement($nextRoom);
			}
			// If there isn't a previous room, make the one at the bottom of the list current.
			else {
				$nextRoom = $('#joinedRooms .room').filter(':first');
				roomID = roomIDFromRoomListElement($nextRoom);
			}
			makeRoomCurrent(roomID);
		}
		event.preventDefault();
	}

	// Toggle Left Panel via Keyboard
	if (event.ctrlKey && event.keyCode == 219) {
		toggleLeftPanel();
		event.preventDefault();
	}

	// Toggle Right Panel via Keyboard
	if (event.ctrlKey && event.keyCode == 221) {
		toggleRightPanel();
		event.preventDefault();
	}
});

// !Keyboard: Keyup Anywhere
$(document).keyup(function(event) {
	// !Esc
	if (event.keyCode == 27) {
		hideOverlay();
	}
});

// !Keypress Anywhere
$('body').keypress(function (event) {
	var $activeElement = $(document.activeElement);
	
	if (event.which !== 0 && !$activeElement.is('input, textarea') && !event.ctrlKey && !event.altKey && !event.metaKey) {
		$('#message').focus();
	}
});

// !Activity in Message Field
$('#message').on('keyup input cut paste change', function () {
	// If there's content in the message field, we're typing!
	if (messageElement.value.length > 0) {
		updateTypingStatus(true);
	}
	// Otherwise, we're not typing!
	else {
		updateTypingStatus(false);
	}

	autoGrowMessageField(messageElement);	

	saveMessageDraft();
});

// !Enter in Message Field
$('#message').keypress(function (event) {
	if (event.which == 13 && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey && !iOS) {
		sendMessage();
		return false;
	}
});

// !---- Click Events ----

// !Click: #sendMessage
$('#sendMessage').click(function () {
	if (iOSNative) {
		// If there's a message to send, send it.
		if ($('#message').val().length > 0) {
			sendMessage();
			// Once a message is sent, and the message field is focused, we need to toggle that focus to reset the iOS keyboard back to its default state (as in if someone was on the numbers and punctuation view, this will take them back to the letters after sending the message).
			if ($('#message').is(':focus')) {
				$('#message').blur();
				$('#message').focus();
				iOSNativeUpdateSendMessageButton();
			}
		}
		// Otherwise, if there's no message to send, dismiss the keyboard.
		else if ($('#message').is(':focus')) {
			$('#message').blur();
		}
		// Otherwise focus the message field, which brings up the keyboard.
		else {
			$('#message').focus();
		}
	}
	// Normal, non-iOS behavior: just send the message.
	else {
		sendMessage();
	}
});

// !header h1
$('header h1').click(function () {
	$('body').addClass('leftPanelVisible');
	if ($(window).width() < 601) {
		$('body').removeClass('rightPanelVisible');
	}
});

// !Left and Right Panel Buttons
$('#leftPanelButton').click(function () {
	toggleLeftPanel();
});
$('#rightPanelButton').click(function () {
	toggleRightPanel();
});

// !Guest Mode Toggle Button
$('#guestModeToggle').click(function () {
	toggleGuestMode();
});

// !Schedule Button
$('#scheduleButton').click(function () {
	getAndDisplaySchedule();
});

// !Help Button
$('#helpButton').click(function () {
	sendCommand('/help');
});

// !Emoji Button
$('#emojiButton').click(function () {
	sendCommand('/emoji');
});

// !History Button
$('#historyButton').click(function () {
	showHistory();
});

// !What's New Button
$('#newButton').click(function () {
	sendCommand('/new');
});

// !Guest Details Button
$('#guestDetailsButton').click(function () {
	socket.emit('show guest details');
});

// !Member Login Button
// #leftPanel is included here because there's also a #memberLoginButton on the /login/ page.
$('#leftPanel #memberLoginButton').click(function () {
	var destination = '/login/' + window.location.search;
	window.location.href = destination;
});

// !Logout Button
$('#logoutButton').click(function () {
	showOverlayWithHTML('<h2>Confirm Logout</h2><p>Are you sure you want to logout?</p><p style="text-align: right;"><button onclick="hideOverlay()">Cancel</button> <button onclick="logout()">Logout</button></p>');
});

// !Send Push Button
$('#pushSend').click(function () {
	showOverlayWithHTML('<div id="pushForm">' +
		'<h2>Send Push Notification</h2>' +
		'<p><label>Message:' + 
			'<br><input type="text" id="pushMessage"></label>' +
			'<br><small id="pushMessageCounter">Remember: Only about 200 characters.</small></p>' +
		'<p><label><input type="checkbox" id="pushDevelopment"> Send to Development</label></p>' +
		'<h3>Send to People Subscribed To:</h3>' +
		'<div id="pushSubscriptionsToSendTo">' +
		'</div>' +
		'<p><button type="button" onclick="pushSend();">Send!</button>' +
	'</div>');
	if (pushSubscriptions) {
		pushSubscriptions.forEach(function (subscription) {
			$('#pushSubscriptionsToSendTo').append('<p><label><input type="checkbox" class="subscription" id="pushSendTo-' + subscription.id + '" value="' + subscription.id + '"> ' + subscription.name + '</label></p>');
		});
	}
	$('#pushMessage').on('input', function () {
		var messageLength = $('#pushMessage').val().length;
		var characterOrCharacters = 'characters';
		if (messageLength === 1) { characterOrCharacters = 'character'; }
		var statusMessage = ', looks good!';
		if (messageLength > 200) { statusMessage = ', uh oh, might be too long!'; }
		if (messageLength > 250) { statusMessage = ', NOPE, too long!'; }
		$('#pushMessageCounter').text(messageLength + ' ' + characterOrCharacters + statusMessage);
	});
});

// !Scroll Info Bar
$scrollInfo.click(function () {
	scrollHistoryTo('bottom');
});

// !Live Stream Indicator
$('#onair').click(function () {
	showOverlayWithHTML('<h2>Streaming Live</h2><p>When the red "streaming live" indicator is displayed at the top of the chat it means there\'s a live show going on <em>right now</em>.</p><p>You can hit the play button next to the message field to tune in to the audio stream, or check out <a href="https://seanwes.com/community/live/" target="_blank">seanwes.com/community/live/</a> for more options (many live shows also have streaming video, too).</p><p><strong>Note:</strong> There\'s currently a bug in iOS 8 that prevents audio from working in web apps added to the home screen, but using the chat in Safari should work.</p>');
});

// !Audio Stream Button
$('#audioStreamButton').click(function () {
	if ($('#audioStreamButton').hasClass('play')) {
		$('#audioStreamButton').removeClass();
		$('#audioStreamButton').addClass('wait');
		$('#audioStream').get(0).play();
	} else {
		$('#audioStreamButton').removeClass();
		$('#audioStreamButton').addClass('play');
		$('#audioStream').get(0).pause();
	}
});

// !Live Status Toggle
$('#liveStatusToggle').click(function () {
	if (window.confirm('DANGER, DANGER! Are you sure you want to toggle live status? This will either kick everyone out or let everyone in!')) { 
		socket.emit('toggle live status');
	}
});

// !Live Button Toggle
$('#liveButtonToggle').click(function () {
	sendCommand('/button');
});

// !Live Settings
$('#liveSettings').click(function () {
	sendCommand('/livesettings');
});

// !New Conversation
$('#startConversationButton').click(function () {
	sendCommand('/conversation');
});

// !---- Additional Options Toggle ----

// Initialize additional options and hide.
$('#options h2').html('&#9654; Additional Options');
$('#options p').hide();

// Toggle additional options when clicked.
$('#options h2').click(function () {
	if ($('#options p').is(':visible')) {
		$('#options h2').html('&#9654; Additional Options');
		$('#options p').hide();			
	} else {
		$('#options h2').html('&#9660; Additional Options');
		$('#options p').show();
	}
});

// !---- Audio Stream Events ----

$('#audioStream').on('playing', function () {
	$('#audioStreamButton').removeClass();
	$('#audioStreamButton').addClass('stop');
});

$('#audioStream').on('pause', function () {
	$('#audioStreamButton').removeClass();
	$('#audioStreamButton').addClass('play');
});

// !---- Other Events ----

// !On: #message input
$('#message').on('input', function () {
	iOSNativeUpdateSendMessageButton();
});

// !On: #message blur
$('#message').on('blur', function () {
	iOSNativeUpdateSendMessageButton();
});

// !Message focus.
$('#message').focus(function () {
	if ($(window).width() < 601) {
		$('body').removeClass('leftPanelVisible');
		$('body').removeClass('rightPanelVisible');
	}
	setTimeout(function () {
		iOSNativeUpdateSendMessageButton();
	}, 10);
});

// !Change: Font Size
$('#fontSize').change(function () {
	var size = $('#fontSize').val();
	docCookies.setItem('fontSize', size, Infinity);
	setFontSize(size);
});

// !Check/Uncheck Badge
$('#badge').change(function () {
	docCookies.setItem('badge', $('#badge').is(':checked'), Infinity);
	if (!$('#badge').is(':checked')) {
		if (window.fluid) {
			fluid.dockBadge = '';
		}
		if (window.macNative) {
			webkit.messageHandlers.talk.postMessage({
				kind: 'badge',
				content: 0
			});
		}
	}
});

// !Check/Uncheck New Message Sounds
$('#newMessageSoundsCheckbox').change(function () {
	docCookies.setItem('newMessageSounds', $('#newMessageSoundsCheckbox').is(':checked'), Infinity);
});

// !Check/Uncheck New Mention Sounds
$('#newMentionSoundsCheckbox').change(function () {
	docCookies.setItem('newMentionSounds', $('#newMentionSoundsCheckbox').is(':checked'), Infinity);
});

// !Change: Sound Volume
$('#notificationVolumeSlider').change(function () { 
	var value = Number($('#notificationVolumeSlider').val());
	newMessageAudio.volume = value;
	newMentionAudio.volume = value;
	docCookies.setItem('soundVolume', value, Infinity);
	newMessageAudio.pause();
	if (newMessageAudio.fastSeek) {
		newMessageAudio.fastSeek(0);
	}
	newMessageAudio.play();
});

// !Check/Uncheck New Mention Notifications
$('#newMentionNotificationsCheckbox').change(function () {
	docCookies.setItem('newMentionNotifications', $('#newMentionNotificationsCheckbox').is(':checked'), Infinity);
	
	if (notificationsAvailable && $('#newMentionNotificationsCheckbox').is(':checked')) {
		if (Notification.permission !== 'granted') {
			Notification.requestPermission();
		}
	}
});

// !Check/Uncheck Dark Theme Checkbox
$('#darkModeCheckbox').change(function () {
	if ($('#darkModeCheckbox').is(':checked')) {
		docCookies.setItem('theme', 'dark', Infinity);
		$('body').addClass('dark');
	} else {
		docCookies.setItem('theme', 'default', Infinity);
		$('body').removeClass('dark');
	}
});

// !---- Prior Events ----

/*
function requestPriorEvents(roomOrPersonID, scrollToBottom, priorToEventID, quantity) {
	// data.roomOrPersonID
	// data.scrollToBottom
	// data.priorToEventID
	// data.quantity (1 to 200)
	var data = {};
	data.roomOrPersonID = roomOrPersonID;
	if (scrollToBottom) {
		data.scrollToBottom = true;
	}
	if (priorToEventID) {
		data.priorToEventID = priorToEventID;
	}
	if (quantity) {
		data.quantity = quantity;
	}
	socket.emit('prior events', data);
}
*/

/*
function loadMoreEventsButtonHTML(roomID) {
	return '<button class="loadMoreEvents" onclick="loadMoreEvents(\'' + roomID + '\')">Load More</button>';
}
*/

/*
function restoreLoadMoreButton(roomID) {
	$('#room-' + roomID + ' button.loadMoreEvents').show();
	$('#room-' + roomID + ' button.loadMoreEvents').text('Load More');
	$('#room-' + roomID + ' button.loadMoreEvents').prop('disabled', false);
	$('#room-' + roomID + ' .atTheTop').remove();
}
*/

/*
function processPriorEvents(roomOrPersonID, eventsInfo, scrollToBottom) {
	var $roomElement = $('#room-' + roomOrPersonID);
	var $loadMoreEventsButton = $('#room-' + roomOrPersonID + ' button.loadMoreEvents');
	if (eventsInfo.length === 0) {
		var atTheTopHTML = '<div class="info atTheTop">You\'re at the top!</div>';
		$(atTheTopHTML).prependTo($roomElement);
		$loadMoreEventsButton.hide();
	} else {
		var $firstEvent = $('#room-' + roomOrPersonID + ' div').filter(':first');
		if ($firstEvent.length === 0) {
			$firstEvent = $('#room-' + roomOrPersonID + ' button').filter(':first');
		}
		var currentScrollOffset;
		if (currentRoomInfo.id == roomOrPersonID) {
			// jQuery's position() function returns an object representing "the current coordinates of the first element in the set of matched elements, relative to the offset parent."  In other words, the further this element is scrolled down in #history, the greater it's position().top value will be.  scrollTop, on the other hand, is 0 when scrolled to the top, and increases as we scroll down.  Thus, setting scrollTop to equal the position().top would effectively scroll to that element.
			currentScrollOffset = $firstEvent.position().top - historyElement.scrollTop;
		}
		else if (roomScrollPositions[roomInfo.id]) {
			currentScrollOffset = roomScrollPositions[roomInfo.id];
		}
		var html = eventsHTML(eventsInfo);
		var $theElements = $(html).prependTo($roomElement);
		
		$theElements.each(addLongIfNeeded);
		
		$loadMoreEventsButton.prependTo($roomElement);
		if (scrollToBottom) {
			if (currentRoomInfo.id == roomOrPersonID) {
				scrollHistoryTo('bottom');
			} else {
				roomScrollPositions[roomInfo.id] = 'bottom';
			}
		} else {
			var newScrollPosition = $firstEvent.position().top - currentScrollOffset;
			if (currentRoomInfo.id == roomOrPersonID) {
				historyElement.scrollTop = newScrollPosition;
			} else {
				roomScrollPositions[roomInfo.id] = newScrollPosition;
			}
		}
		restoreLoadMoreButton(roomOrPersonID);
	}
	updateComboStatus();
}
*/

// !---- Socket.IO Events ----

// !redirect
socket.on('redirect', function (data) {
	console.log('Redirecting to ' + data.url);
	
	// When people are attending a live event we don't want to hammer the server we're redirecting them to all at once, so this introduces a random delay of between 0 and 5000 milliseconds before redirecting them.
	var randomTimeout = Math.random() * 5000;
	// But, if they're not logged in, then there's no live event, and we want to redirect them immediately.
	if (!loggedIn) {
		randomTimeout = 1;
	}
	setTimeout(function () {
		$('#info').hide();
		$('#video').hide();
		$('#main').hide();
		window.location.href = data.url;
	}, randomTimeout);
});

// !join room success
// data.roomInfo
socket.on('join room success', function (data) {
	if (loggedIn) {
		setupJoinedRoom(data.roomInfo, data.makeCurrent);
	} else {
		joinedRoomsQueue.push({
			roomInfo: data.roomInfo,
			makeCurrent: data.makeCurrent
		});
	}
});

// !prior events
// data.eventsInfo
/*
socket.on('prior events', function (data) {
	processPriorEvents(data.roomOrPersonID, data.eventsInfo, data.scrollToBottom);
});
*/

// !new event
// data.eventInfo
socket.on('new event', function (data) {
	handleLiveEvent(data.eventInfo);
});

// !someone is scrolled up
// data.roomID
// data.conversationID
// data.personID
socket.on('someone is scrolled up', function (data) {
	var roomInfoPersonSelector = '#roomInfo-' + data.roomID + ' .roomInfoPerson-' + data.personID;
	
	var roomInfoPersonElement = document.querySelector(roomInfoPersonSelector);
	
	if (roomInfoPersonElement) {
		// For a conversation.
		if (data.conversationID) {
			roomInfoPersonElement.dataset['scrolledInConversation' + data.conversationID] = 'true';
		}
		// For a room.
		else {
			// Update the data attribute.
			roomInfoPersonElement.dataset.scrolledInRoom = 'true';
		}
		
		// Update the class if this room is current.
		if (currentlyIn(data.roomID, data.conversationID)) {
			$(roomInfoPersonElement).addClass('scrolled');
		}
	}
});

// !someone is scrolled down
// data.roomID
// data.conversationID
// data.personID
socket.on('someone is scrolled down', function (data) {
	// The style changes below are a hack to force Fluid on Mac to re-render all of the right sidebar to prevent visual artifacts.
/*
	historyElement.style.boxShadow = 'none';
	historyElement.style.boxShadow = null;
*/

	var roomInfoPersonSelector = '#roomInfo-' + data.roomID + ' .roomInfoPerson-' + data.personID;
	
	var roomInfoPersonElement = document.querySelector(roomInfoPersonSelector);
	
	if (roomInfoPersonElement) {
		// For a conversation.
		if (data.conversationID) {
			delete roomInfoPersonElement.dataset['scrolledInConversation' + data.conversationID];
		}
		// For a room.
		else {
			// Update the data attribute.
			delete roomInfoPersonElement.dataset.scrolledInRoom;
		}
		
		// Update the class if this room is current.
		if (currentlyIn(data.roomID, data.conversationID)) {
			$(roomInfoPersonElement).removeClass('scrolled');
		}
	}
});

// !someone is typing
// data.roomID
// data.conversationID
// data.personID
socket.on('someone is typing', function (data) {
	var roomInfoPersonSelector = '#roomInfo-' + data.roomID + ' .roomInfoPerson-' + data.personID;
	
	var roomInfoPersonElement = document.querySelector(roomInfoPersonSelector);
	
	if (roomInfoPersonElement) {
		// For a conversation.
		if (data.conversationID) {
			roomInfoPersonElement.dataset['typingInConversation' + data.conversationID] = 'true';
		}
		// For a room.
		else {
			// Update the data attribute.
			roomInfoPersonElement.dataset.typingInRoom = 'true';
		}
		
		// Update the class if this room is current.
		if (currentlyIn(data.roomID, data.conversationID)) {
			$(roomInfoPersonElement).addClass('typing');
		}
	}
});

// !someone is no longer typing
// data.roomID
// data.conversationID
// data.personID
socket.on('someone is no longer typing', function (data) {
	var roomInfoPersonSelector = '#roomInfo-' + data.roomID + ' .roomInfoPerson-' + data.personID;
	
	var roomInfoPersonElement = document.querySelector(roomInfoPersonSelector);
	
	if (roomInfoPersonElement) {
		// For a conversation.
		if (data.conversationID) {
			delete roomInfoPersonElement.dataset['typingInConversation' + data.conversationID];
		}
		// For a room.
		else {
			// Update the data attribute.
			delete roomInfoPersonElement.dataset.typingInRoom;
		}
		
		// Update the class if this room is current.
		if (currentlyIn(data.roomID, data.conversationID)) {
			$(roomInfoPersonElement).removeClass('typing');
		}
	}
});

// !idle update
socket.on('idle update', function (data) {
	var personID = data.personID;
	
	var idle = false;
	
	if (data.idle) {
		idle = true;
	}
	
	// If this update is for me...
	if (myPersonInfo && myPersonInfo.id && personID == myPersonInfo.id) {
		myPersonInfo.idle = idle;
	}
	
	var $elements = $('.roomInfoPerson-' + personID + ' span.onlineOrIdle');
	
	var idleStatusChanged = false;
	
	if (idle && $elements.hasClass('online')) {
		$elements.removeClass('online').addClass('idle');
		idleStatusChanged = true;
	}
	
	if (!idle && $elements.hasClass('idle')) {
		$elements.removeClass('idle').addClass('online');
		idleStatusChanged = true;
	}
	
	if (idleStatusChanged) {
		sortParticipantLists();
	}
});

// !status update
socket.on('status update', function (data) {
	var personID = data.personID;
	var status = data.status;
	
	if (typeof status !== 'string') {
		return;
	}
	
	// If this is me, set the message placeholder text to the current status.
	if (myPersonInfo && myPersonInfo.id && personID == myPersonInfo.id) {
		myPersonInfo.status = status;
		updateStatusPlaceholder();
	}
	
	var $elements = $('.roomInfoPerson-' + personID + ' span.status');
	
	$elements.text(status);
	
	sortParticipantLists();
});

// !schedule html
socket.on('schedule html', function (data) {
	showOverlayWithHTML('<h2>Schedule</h2>' + data.html);
});

// !audio stream online
socket.on('audio stream online', function (data) {
	if (data.audioStreamInfo) {
		audioStreamInfo = data.audioStreamInfo;
	}
	audioStreamIsOnline();
});

// !audio stream offline
socket.on('audio stream offline', function () {
	audioStreamIsOffline();
});
	
// !message hidden
socket.on('message hidden', function (data) {
	var $eventElements = $('.event-' + data.eventID);
	
	// If there are matching events...
	if ($eventElements.length) {
		// Note that because we're removing elements here we don't need to call beginPotentiallyDetrementalScroll(), as removing content won't do anything adverse.
		
		// Hide them.
		$eventElements.addClass('hidden');
		
		// For each of the hidden elements, we need to check to see if the preceeding person element should also be hidden.  If all of the message elements under it (up to the next non-message element) are hidden, we should also hide the person element.
		
		$eventElements.each(function (index, element) {
			var $eventElement = $(element);
			
			// Get the preceeding person element.
			var $personElement = $eventElement.prevAll('.person:first');
			
			var shouldHidePerson = true;
			
			// Loop through all the elements after the person element until we hit one that isn't a message.
			$personElement.nextUntil(':not(.message)').each(function (index, element) {
				// If any of the messages under the person element are not hidden, we should not hide the person element.
				if (!$(element).hasClass('hidden')) {
					shouldHidePerson = false;
				}
			});
			
			if (shouldHidePerson) {
				// If we've determined we should hide the person element, then hide it.
				$personElement.addClass('hidden');
				
				// Since we've messed around with the visibility of person objects, we should clear the last speaker.
				var container = $personElement.parents('[data-last-speaker]')[0];
				if (container) {
					container.dataset.lastSpeaker = null;
				}
			}
		});
	}
});

// !message revealed
socket.on('message revealed', function (data) {
	var $eventElements = $('.event-' + data.eventID);
	
	// If there are matching events...
	if ($eventElements.length) {
		// Revealing previously hidden elements will cause scroll.
		beginPotentiallyDetrementalScroll();
		
		// Reveal the events.
		$eventElements.removeClass('hidden');
		
		// For each of the newly-revealed elements, we need to check to see if they have a matching person element above that's hidden, and if they do, reveal it.
		
		$eventElements.each(function (index, element) {
			// Get the person element preceeding this event.
			var $personElement = $(element).prevAll('.person:first');
			
			// Reveal it if it's hidden.
			if ($personElement.hasClass('hidden')) {
				$personElement.removeClass('hidden');
				
				// Since we've messed around with the visibility of person objects, we should clear the last speaker.
				$personElement.parents('[data-last-speaker]')[0].dataset.lastSpeaker = null;
			}
		});
		
		endPotentiallyDetrementalScroll();
	}
});

// !someone was muted
socket.on('someone was muted', function (data) {
	$('.roomInfoPerson-' + data.personID).addClass('muted');
	
	if (myPersonInfo.id == data.personID) {
		if (localStorageAvailable) {
			localStorage.m = 'true';
		}
	}
});

// !someone was unmuted
socket.on('someone was unmuted', function (data) {
	$('.roomInfoPerson-' + data.personID).removeClass('muted');
	
	if (myPersonInfo.id == data.personID) {
		if (localStorageAvailable) {
			localStorage.m = '';
		}
	}
});

// !someone is onair
socket.on('someone is onair', function (data) {
	$('.roomInfoPerson-' + data.personID).addClass('onair');
	sortParticipantLists();
});

// !someone is offair
socket.on('someone is offair', function (data) {
	$('.roomInfoPerson-' + data.personID).removeClass('onair');
	sortParticipantLists();
});

// !guest details updated
socket.on('guest details updated', function (data) {
	if (data.personID == myPersonInfo.id) {
		myPersonInfo.name = data.name;
		myPersonInfo.avatarURL = data.avatarURL;
	}
	
	$('[data-last-speaker]').each(function (index, element) {
		if (datasetAsObjectBugWorkaround(element.dataset).lastSpeaker == data.personID) {
			element.dataset.lastSpeaker = null;
		}
	});

	updatePersonInRoomSidebars(data.personID, data.name, data.avatarURL);
});

// !person disconnected
socket.on('person disconnected', function (data) {
	for (var key in roomsInfo) {
		var roomID = roomsInfo[key].id;
		removePersonFromRoomSidebar(data.personID, roomID);
	}
});

// !show button
socket.on('show button', function () {
	$('#video').addClass('buttonOn');
	$('#theButton').addClass('buttonOn');
});

// !hide button
socket.on('hide button', function () {
	$('#video').removeClass('buttonOn');
	$('#theButton').removeClass('buttonOn');
});

// !live status change
socket.on('live status change', function (data) {
	updateLiveStatus(data.live);
});

// !new live room
socket.on('new live room', function (data) {
	// Leave the old room.
	exitRoom(data.roomID);

	// Clear out the roomsInfo, since we're about to replace it with a new one.
	roomsInfo = [];
	
	// Join the new room.  Doing this will populate roomsInfo with the new room.
	emitJoinRoom(data.roomID, true);
});

// !update live room
socket.on('update live room', function (data) {
	// Update the roomInfo in roomsInfo.
	var targetRoomInfo;
	roomsInfo.forEach(function (roomInfo) {
		if (roomInfo.id == data.roomID) {
			targetRoomInfo = roomInfo;
		}
	});
	
	targetRoomInfo.name = data.name;
	targetRoomInfo.color = data.color;
	targetRoomInfo.url = data.url;
	targetRoomInfo.redirectURL = data.redirectURL;
	targetRoomInfo.participantRedirectURL = data.participantRedirectURL;
	targetRoomInfo.buttonText = data.buttonText;
	targetRoomInfo.videoEnabled = data.videoEnabled;
	targetRoomInfo.videoURL = data.videoURL;
	targetRoomInfo.livePrivate = data.livePrivate;
	targetRoomInfo.livePrivateSlug = data.livePrivateSlug;
	targetRoomInfo.livePrivateRedirectURL = data.livePrivateRedirectURL;
	
	// Update the room's name in the header.
	updateHeaderTitle();
	
	// Update the room's name in the room list.
	$('#roomList-' + data.roomID).text(data.name);
	
	// Update the room's name in the right sidebar.
	$('#roomInfo-' + data.roomID + ' h2').text(data.name);
	
	// Update the UI.
	updateInterfaceWithLiveInfo(data.color, data.url, data.buttonText, data.videoEnabled, data.videoURL);
});

// !new conversation
socket.on('new conversation', function (data) {
	var conversationInfo = data;
	
	// Add the conversation to conversationsInfo.
	conversationsInfo[conversationInfo.id] = conversationInfo;
	
	setupConversation(conversationInfo);
	
	// Mark this conversation as unread, since it's new.
	markUnread(conversationInfo.roomID, conversationInfo.id);
	
	// If this is the conversation we just created...
	if (justCreatedConversation && conversationInfo.person.id == myPersonInfo.id) {
		if (conversationDetailsVisible) {
			hideOverlay();
			
			delete localStorage.conversationTitleInputValue;
			delete localStorage.conversationFirstMessageTextValue;
		}
		
		justCreatedConversation = false;
		
		makeConversationCurrent(conversationInfo.id);
		
		startListeningToConversation(conversationInfo.id);
	}
});

// !conversation update
socket.on('conversation update', function (data) {
	// Update the conversation in conversationsInfo.
	var conversationInfo = conversationsInfo[data.conversationID];
	conversationInfo.title = data.title;
	conversationInfo.titleHTML = data.titleHTML;
	conversationInfo.type = data.type;
	conversationInfo.sticky = data.sticky;
	
	updateConversationElements(conversationInfo);
	
	if (conversationBeingEdited && conversationBeingEdited.id == data.conversationID) {
		if (conversationDetailsVisible) {
			hideOverlay();
		}
		conversationBeingEdited = null;
	}
});

// !conversation archived
socket.on('conversation archived', function (data) {
	// Remove the conversation from the list in the left panel.
	$('#conversationList-' + data.conversationID).remove();
	
	// Remove the matching conversation banner.
	$('#conversationBanner-' + data.conversationID).remove();
	
	// Remove the matching conversation history.
	$('#conversation-' + data.conversationID).remove();
	
	// If this conversation is in focus, display a dialog letting them know this conversation has just been archived, and change focus to the summary.
	if (currentConversationInfo && currentConversationInfo.id && currentConversationInfo.id == data.conversationID) {
		// Make the summary current.
		makeSummaryCurrent();
		// Display a notification letting them know the conversation they were viewing was just archived.
		showOverlayWithHTML('<h3>Conversation Archived</h3><p>The conversation you were viewing was just archived, switching to the Summary.</p>');
	}
	
	if (conversationBeingEdited && conversationBeingEdited.id == data.conversationID) {
		if (conversationDetailsVisible) {
			hideOverlay();
		}
		conversationBeingEdited = null;
	}
});

// !summary
socket.on('summary', function (data) {
	// Assemble the summary HTML.
	var html = '<h2>Summary</h2>';
	
	html += data.summaryIntroHTML;
	
	// New Conversations
	html += '<h3>Newest Conversations</h3>';
	html += '<p>The latest and greatest.</p>';
	html += '<ul>';
	data.newConversations.forEach(function (conversationInfo) {
		html += '<li>';
		html += conversationSummaryHTML(conversationInfo);
		html += '</li>';
	});
	html += '</ul>';
	
	// Active Conversations
	html += '<h3>Recently Active Conversations</h3>';
	html += '<p>Where people are talking right now.</p>';
	html += '<ul>';
	data.activeConversations.forEach(function (conversationInfo) {
		html += '<li>';
		html += conversationSummaryHTML(conversationInfo);
		html += '</li>';
	});
	html += '</ul>';
		
	// Most Starred Conversations
	html += '<h3>Conversations with Many Stars</h3>';
	html += '<p>Lots of value in these!</p>';
	html += '<ul>';
	data.mostStarredConversations.forEach(function (conversationInfo) {
		html += '<li>';
		html += conversationSummaryHTML(conversationInfo);
		html += '</li>';
	});
	html += '</ul>';
		
	// All Active Conversations
	html += '<h3>All Active Conversations</h3>';
	html += '<p>Newest at the top.</p>';
	html += '<ul>';
	data.allActiveConversations.forEach(function (conversationInfo) {
		html += '<li>';
		html += conversationSummaryHTML(conversationInfo);
		html += '</li>';
	});
	html += '</ul>';
	
	// Populate #summary with the HTML.
	document.getElementById('summary').innerHTML = html;
	
	// Populate #summaryConversationTypeLegend
	var summaryConversationTypeLegendHTML = '<ul>';
	
	conversationTypes.forEach(function (type) {
		summaryConversationTypeLegendHTML += '<li><strong class="conversationTypeName ' + type.slug + 'ConversationType">' + type.name + '</strong> <span class="description">' + type.description + '</span></li>';
	});
	
	summaryConversationTypeLegendHTML += '</ul>';
	
	document.getElementById('summaryConversationTypeLegend').innerHTML = summaryConversationTypeLegendHTML;
	
	// Hide the Conversations intro.
	summaryToggleConversationsIntro();
	
	// Update the conversation elements with classes and whatnot.
	updateConversationElements();
});

// !started listening
socket.on('started listening', function (data) {
	// Update conversationsBeingListenedTo
	var index = conversationsBeingListenedTo.indexOf(data.conversationID);
	if (index === -1) {
		conversationsBeingListenedTo.push(data.conversationID);
	}
	
	$('[data-conversation-id="' + data.conversationID + '"]').removeClass('notListening').addClass('listening');
	
	var conversationInfo = conversationsInfo[data.conversationID];
	
	updateCollapsedRoomUnreadAndMentionIndicators(conversationInfo.roomID);
	
	updateLeftPanelButtonUnreadDot();
	
	sortConversations(conversationInfo.roomID);
	
	updateConversationElements(conversationInfo);
	
	historyScrollHandler();
});

// !stopped listening
socket.on('stopped listening', function (data) {
	// Update conversationsBeingListenedTo
	var index = conversationsBeingListenedTo.indexOf(data.conversationID);
	if (index > -1) {
		conversationsBeingListenedTo.splice(index, 1);
	}
	
	$('[data-conversation-id="' + data.conversationID + '"]').addClass('notListening').removeClass('listening');
	
	var conversationInfo = conversationsInfo[data.conversationID];
	
	updateCollapsedRoomUnreadAndMentionIndicators(conversationInfo.roomID);
	
	updateLeftPanelButtonUnreadDot();
	
	sortConversations(conversationInfo.roomID);
	
	updateConversationElements(conversationInfo);
	
	historyScrollHandler();
});

// !conversation info
socket.on('conversation info', function (data) {
	// Add to conversationsInfo.
	conversationsInfo[data.conversationID] = data;
	
	// Update all the matching conversation elements with info.
	updateConversationElements(data);
	
	// Remove this conversation ID from the list of conversations with info being loaded.
	var index = conversationInfoBeingLoaded.indexOf(data.id);
	
	if (index > -1) {
		conversationInfoBeingLoaded.splice(index, 1);
	}
	
	if (conversationInfoBeingLoaded.length === 0 && typeof runWhenAllConversationInfoLoaded === 'function') {
		runWhenAllConversationInfoLoaded();
		runWhenAllConversationInfoLoaded = null;
	}
});

// !history
// data.roomID
// data.conversationID
// data.beforeEventID
// data.afterEventID
// data.lastReadEventID
// data.centeredOnLastReadEvent
// data.eventsInfo
socket.on('history', function (data) {
	logDebug('Start.  Got ' + data.eventsInfo.length + ' event(s) for room ID ' + data.roomID + ', conversation ID ' + data.conversationID + '.', 'onHistory');
	
	var prepending = false; // Are we adding events to the top?
	var appending = false; // Are we adding events to the bottom?
	var initial = false; // Is this the first time we're adding events to this room/conversation?
	
	if (data.beforeEventID) {
		prepending = true;
	}
	
	if (data.afterEventID) {
		appending = true;
	}
	
	if (!prepending && !appending) {
		initial = true;
	}
	
	var runHistoryScrollHandlerAtEnd = true;
	
	var markContainerAsNoLongerWaitingAtEnd = true;
	
	var setHistoryScrollPositionAtEnd = true;
	
	// Get the container to put the events in.
	var container = getHistoryContainer(data.roomID, data.conversationID);
	
	if (!container) {
		logDebug('Ending because we could not get the history container.', 'onHistory');
		return;
	}
	
	var containerID = container.id;
		
	// Remove any loading indicators.
	$('#' + containerID + ' .loading').remove();
	
	// Set "complete to top/bottom" flags if no events are provided by the server.
	if (data.eventsInfo.length === 0) {
		if (prepending) {
			logDebug('Setting completeToTop to true for #' + containerID, 'onHistory');
			container.dataset.completeToTop = 'true';
		}
		
		if (appending) {
			logDebug('Setting completeToBottom to true for #' + containerID, 'onHistory');
			container.dataset.completeToBottom = 'true';
		}
		
		if (initial) {
			logDebug('Setting completeToTop and completeToBottom to true for #' + containerID, 'onHistory');
			container.dataset.completeToTop = 'true';
			container.dataset.completeToBottom = 'true';
		}
	}
	
	// If this is the initial history for a room (not a conversation), we're getting the latest stuff, so we're complete to the bottom, and we want to scroll to the bottom.
	if (!data.conversationID && initial) {
		logDebug('Setting completeToBottom to true for #' + containerID, 'onHistory');
		container.dataset.completeToBottom = 'true';
		
		logDebug('Setting container scroll position to bottom.', 'onHistory');
		setHistoryContainerScrollPosition(data.roomID, data.conversationID, 'bottom');
	}
	
	// Create the html for the events.
	var forRoom = data.conversationID ? false : true;
	
	var html = eventsHTML(data.eventsInfo, forRoom);
	
	// Take note of the current position().top value of the first VISIBLE event before we append the new events, which will be used below if we need to restore the visual scroll position after prepending events.
	var firstEventElement = $(container).find('.event').filter(':visible')[0];
	
	var firstEventID = null;
	
	var firstEventBoundingClientRectTop = 0;
	
	if (firstEventElement) {
		firstEventID = firstEventElement.dataset.eventId;
		
		firstEventBoundingClientRectTop = firstEventElement.getBoundingClientRect().top;
	}
	
	// Add the html to the container.
	if (prepending) {
		// Add the html to the top.
		container.innerHTML = html + container.innerHTML;
	}
	// If we're not prepending, we always want the events to go at the bottom.
	else {
		// If there's an open conversation wrapper, close it up.
		if (datasetAsObjectBugWorkaround(container.dataset).openWrapperConversationId) {
			delete container.dataset.openWrapperConversationId;
		}
		
		// The last speaker for this container is no longer valid.
		delete container.dataset.lastSpeaker;
		
		// Add the html to the bottom.
		container.innerHTML = container.innerHTML + html;
	}
	
	// Update all the conversation elements.
	updateConversationElements();
	
	// Add long if needed.
	addLongIfNeeded('#' + container.id + ' .event.message');
	
	// Scrolling
	
	// If we're currently in the room/conversation this history is for...
	if (currentlyIn(data.roomID, data.conversationID)) {
		// If this is a conversation that's being initially populated and the history is centered on the last read event, scroll to that event.
		if (data.conversationID && initial && data.centeredOnLastReadEvent) {
			logDebug('Scrolling history to ' + 'event-' + data.lastReadEventID, 'onHistory');
			scrollHistoryTo('event-' + data.lastReadEventID);
		}
		// If this is a conversation and the history is NOT centered on the last read event, scroll to the top.
		else if (data.conversationID && initial && !data.centeredOnLastReadEvent) {
			logDebug('Scrolling history to top.', 'onHistory');
			scrollHistoryTo('top');
		}
		// If this is a room that's being initially populated, scroll to the bottom.
		else if (!data.conversationID && initial) {
			logDebug('Scrolling history to bottom.', 'onHistory');
			scrollHistoryTo('bottom');
		}
		// If we're prepending and there's a first event to work with, maintain the visual scroll position.
		else if (prepending) {
			/*
			Notes on preserving the scroll position:
			
			The idea here is that, earlier, we took note of the first event's ID and the first event's top position as provided by getBoundingClientRect(), which gives us the position of the element relative to the browser's viewport.  We recorded these values BEFORE adding the new events.
			
			Now that we're here, we find the new top position of the same event AFTER adding the new events.  The difference between the new top position and the old top position is the amount we need to add to #history's scrollTop to get back to the previous visual scroll position (meaning that it looks, visually to the person using the client, that the scroll position hasn't changed at all, but that events were simply added above without the scroll position being affected).
				
			*/
			
			// Restore the visual scroll position.
			logDebug('Restoring visual scroll position.', 'onHistory');
			
			scrollEventInContainerToPositionInHistory(firstEventID, container, firstEventBoundingClientRectTop);
			
			if (conversationInfoBeingLoaded.length > 0) {
				logDebug('Conversation info being loaded is greater than zero.', 'onHistory');
				
				runHistoryScrollHandlerAtEnd = false;
				
				markContainerAsNoLongerWaitingAtEnd = false;
				
				setHistoryScrollPositionAtEnd = false;
				
				runWhenAllConversationInfoLoaded = function () {
					logDebug('Restoring visual scroll position and removing waitingForHistory from #' + container.id + ' after all conversation info was loaded.', 'onHistory');

					scrollEventInContainerToPositionInHistory(firstEventID, container, firstEventBoundingClientRectTop);
					
					delete container.dataset.waitingForHistory;

					historyScrollHandler();
					
					saveHistoryScrollPosition();
				};
			}
		}
		
		// Now that we've got the scroll position where we want it, save it.
		if (setHistoryScrollPositionAtEnd) {
			saveHistoryScrollPosition();
		}
	}
	// If we're NOT currently in the room/conversation this history is for...
	else {
		// If the room/conversation does not have a saved scrollPosition, set the initial scroll position...
		if (!datasetAsObjectBugWorkaround(container.dataset).scrollPosition) {
			// event-eventID: If this is a conversation with a last read event.
			if (data.conversationID && data.lastReadEventID) {
				setHistoryContainerScrollPosition(data.roomID, data.conversationID, 'event-' + data.lastReadEventID);
			}
			// top: If this is a conversation without a last read event.
			else if (data.conversationID && !data.lastReadEventID) {
				setHistoryContainerScrollPosition(data.roomID, data.conversationID, 'top');
			}
			// bottom: If this is a room.
			else if (!data.conversationID) {
				setHistoryContainerScrollPosition(data.roomID, data.conversationID, 'bottom');
			}
		}
	}
		
 	// Clear the waiting for history flags on the container.
 	if (markContainerAsNoLongerWaitingAtEnd) {
	 	logDebug('Removing waitingForHistory from #' + container.id, 'onHistory');
	 	
	 	delete container.dataset.waitingForHistory;
 	}
	
	// Update the combo status!
	updateComboStatus();
	
	// Envoke the history scroll handler to do any further required steps.
	if (runHistoryScrollHandlerAtEnd) {
		historyScrollHandler();
	}
	
	logDebug('End.', 'onHistory');
});

$(function() {
	// !---- Handle Connection and Login ----
	
	// This code is called after the user is successfully connected and authenticated (login success).
	afterAuthentication = function (data) {
		
		// Note that the updateConversationReadPosition() function won't do anything if there isn't a current conversation, and will only send an update to the server if the last read event ID is different from the last event ID sent.
		
		// When we're inside a conversation, periodically update the server with the last read event.
		setInterval(function () {
			updateConversationReadPosition();
		}, 5000); // Every 5 seconds.
		
		// If we're in a conversation when unloading, let the server know about our last read event.
		window.addEventListener('beforeunload', function () {
			updateConversationReadPosition();
		});
		
		resetInterface();
		
		$('#guestMode').hide();
		
		if (serverStatus.guestServer) {
			$('#summaryList').hide();
			$('#joinedRooms').hide();
			$('#otherRooms').hide();
			$('#directMessages').hide();
			$('#scheduleButtonContainer').hide();
			$('#historyButtonContainer').hide();
			$('#newButtonContainer').hide();
			$('#helpButtonContainer').hide();
			$('#logoutButtonContainer').hide();
			$('#pushSendButtonContainer').hide();
			$('#login').hide().addClass('hidden');
		}
		else {
			$('#liveStatus').hide();
			$('#guestDetailsButtonContainer').hide();
			$('#memberLoginButtonContainer').hide();
		}
		
		if (!serverStatus.primaryServer) {
			$('#pushSendButtonContainer').hide();
		}
		
		if (myPersonInfo.member) {
			$('#guestDetailsButtonContainer').hide();
			$('#memberLoginButtonContainer').hide();
		}
		
		handleGuestModeChange(serverStatus.guestModeEnabled);
		
		// Populate left sidebar's room list.
		updateRoomListsWithRoomsInfo();
	
		// Setup and populate any already-joined rooms.
		myPersonInfo.joinedRoomsInfo.forEach(function (roomInfo) {
			setupJoinedRoom(roomInfo, false);
		});
		
		// Do the same for any rooms in the queue.
		joinedRoomsQueue.forEach(function (roomToJoin) {
			setupJoinedRoom(roomToJoin.roomInfo, false);
		});
		
		joinedRoomsQueue = [];
	
		sortJoinedRoomsList();
		
		// Collapse the rooms by default.
		$('#leftPanel .room').addClass('collapsed');
		
		// Restore current summary/room/conversation from last session.	
		if (localStorageAvailable) {
			if (localStorage.currentType === 'conversation') {
				makeConversationCurrent(localStorage.currentID);
			}
			else if (localStorage.currentType === 'room') {
				makeRoomCurrent(localStorage.currentID);
			}
			else {
				makeSummaryCurrent();
			}
		}
		else {
			makeSummaryCurrent();
		}
		
		// Mark conversations as unread if they have new messages since this person's last read message.
		for (var key in data.latestConversationEventIDs) {
			if (data.latestConversationEventIDs.hasOwnProperty(key)) {
				var latestMessageID = data.latestConversationEventIDs[key];
				
				var latestReadMessageID = data.latestConversationReadEventIDs[key];
				
				// If there's no latest read message ID, or if the latest message ID is larger than the last read one, mark the conversation unread.
				if (!latestReadMessageID || parseInt(latestMessageID) > parseInt(latestReadMessageID)) {
					var conversation = conversationsInfo[key];
					
					if (conversation) {
						var roomID = conversation.roomID;
						
						markUnread(roomID, key);
					}
				}
			}
		}
		
		// If this person's idle status on the server is set to idle, send an update to change that since this person just connected using this client.
		if (myPersonInfo.idle) {
			updateIdleStatus(false);
		}
		
		sortParticipantLists();
		
		var m = false;
		if (localStorageAvailable && localStorage.m === 'true') {
			m = true;
		}
		if (m) {
			socket.emit('mm');
		}
		
		updateStatusPlaceholder();
		
		// This timeout is here because the iOSNative variable isn't set quickly enough by the native app, and this horrible hack is the only way I can find to get around it.
		setTimeout(function () {
			if (iOSNative) {
				// Create push checkboxes.
				if (pushSubscriptions) {
					$('#pushNotifications').append('<p><strong>Push Notifications:</strong></p>');
					pushSubscriptions.forEach(function (subscription) {
						$('#pushNotifications').append('<p><label><input type="checkbox" class="subscription" id="pushCheckbox-' + subscription.id + '" value="' + subscription.id + '"> ' + subscription.name + '</label></p>');
					});
					$('#pushNotifications .subscription').on('change', function () {
						pushRegisterSubscriptions();
					});
					$('#options p').hide();
				}
				iOSNativeSendMessage('push-get-saved-subscriptions');
			}
		}, 5100);
		
		// Audio Stream
		if (audioStreamStatus && audioStreamStatus === 'online') {
			audioStreamIsOnline();
		} else {
			audioStreamIsOffline();
		}
		
		// Guests
		if (myPersonInfo.name.indexOf('Guest') === 0) {
			socket.emit('show guest details');
		}
				
		// Apple's audio stream.
		if (myPersonInfo.id == 'w1335') {
			audioStreamIsOnline();
		}
	};
});
