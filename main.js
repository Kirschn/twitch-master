var exports = module.exports = {};
exports.map = {};
var fs  = require('fs'),
	irc = require('irc'),
	crypto = require('crypto'),

	pub = require('./lib/comm').sender(),
	config = require('./config.json'),

	ops = require('./ops.json'),
	blacklist = require('./blacklist.json'),
	filters = require('./filters.json');
var command_interval = 15;
var twitch_chat = new irc.Client('irc.twitch.tv', config.nick, {
	channels: ['#' + config.nick],
	userName: config.nick,
	password: config.password,
	autoConnect: true
}),

blacklist = JSON.parse(fs.readFileSync('./blacklist.json', 'utf8'));
filters = JSON.parse(fs.readFileSync('./filters.json', 'utf8'));
ops = JSON.parse(fs.readFileSync('./ops.json', 'utf8'));
var map_new = JSON.parse(fs.readFileSync('./map.json', 'utf8'));
mouse_range = {
		min: -3000,
		max:  3000
	};
	setTimeout(function() {

	twitch_chat.join("#" + config.nick);
},1000);
exports.map = map_new;
function mouse_movement(command)
{
	if (isNaN(command)) {
		reportStatus('Invalid issued command [' + command + '] for mouse movement.', true);
	} else {
		var qemu_cmd = 'mouse_move ',
			int_cmd = Math.round(parseInt(command));

		switch (mouse_vote) {
		case 'x':
			qemu_cmd += int_cmd + ' 0';
			mouse_x += int_cmd;

			if (mouse_x < mouse_range.min)
				mouse_x = mouse_range.min;
			else if (mouse_x > mouse_range.max)
				mouse_x = mouse_range.max;

			break;
		case 'y':
			qemu_cmd += '0 ' + int_cmd;
			mouse_y += int_cmd;

			if (mouse_y < mouse_range.min)
				mouse_y = mouse_range.min;
			else if (mouse_y > mouse_range.max)
				mouse_y = mouse_range.max;

			break;
		case 'z':
			qemu_cmd += '0 0 ' + int_cmd;
			mouse_z += int_cmd;

			if (mouse_z < mouse_range.min)
				mouse_z = mouse_range.min;
			else if (mouse_z > mouse_range.max)
				mouse_z = mouse_range.max;

			break;
		default:
			break;
		}

		reportStatus('New mouse coordinates: [dx: ' + mouse_x + '], [dy: ' + mouse_y +
			'], [dz: ' + mouse_z + '].', true);

		console.log('Sending to qemu: ' + qemu_cmd);
		pub.send(['qemu-manager', qemu_cmd]);

	}

	mouse_vote = null;
}
function voting_cmd_handle(selected_command)
{
	if (selected_command == 'yes') {
		reportStatus('Vote succeeded: ' + voting_command, true);

		// clearing the mouse coords
		if (last_exec_cmd.indexOf('boot') != -1 || last_exec_cmd == 'system_reset') {
			mouse_x = 0;
			mouse_y = 0;
			mouse_z = 0;
		}

		// send
		var command_qemu = exports.map[voting_command].replace(/^VOTE /, '');
		console.log('Sending to qemu: ' + command_qemu);
		pub.send(['qemu-manager', command_qemu]);
	} else {
		reportStatus('Vote failed: ' + voting_command, true);
	}

	voting_command = null;
}
var elVotingArray = [];
var elCounterArray = [];
var elSortArray = [];
function qemu_input(selected_command) {
	if (exports.map[selected_command] !== "") {
				if (selected_command.indexOf('mouse_move') != -1) {
					mouse_vote = selected_command[selected_command.length -1];

					console.log('Voting to move the mouse [d' + mouse_vote + ']. Integers only.', true);
				} else {
					// normal command
					

					console.log('Sending to qemu: ' + exports.map[selected_command]);
					pub.send(['qemu-manager', exports.map[selected_command]]);

					if (selected_command.indexOf('_double') != -1) {
						console.log('Sending to qemu: ' + exports.map[selected_command]);
						pub.send(['qemu-manager', exports.map[selected_command]]);
					}

	}
}
}
twitch_chat.on("message#", function(nick, to, text, message) {
	elVotingArray.push({"nick": nick, "text": text});
	console.log([nick, text]);
})
function sortFunction(a, b) {
    if (a[0] === b[0]) {
        return 0;
    }
    else {
        return (a[0] < b[0]) ? -1 : 1;
    }
}
setInterval(function() {
	if (elVotingArray !== [] && elVotingArray.length > 3) {
		console.log("tick");
		elVotingArray.forEach(function(currentVote) {
			if (elCounterArray[currentVote.text] == undefined) {
				elCounterArray[currentVote.text] = [1, currentVote.text];
			} else {
				elCounterArray[currentVote.text][0]++;
			}
		})
		var currVotes = 0;
		var command = "nop";
		console.log(elCounterArray);
		for (var i = 0; i < elCounterArray.length; i++) {
			var currentFuck = elCounterArray[i];
			console.log(currentFuck);
			if (currentFuck[0] > currVotes) {
				currVotes = currentFuck[0];
				command = currentFuck[1];
			}
		}
		if (exports.map[command] == undefined) {
			console.log("No commands.");
			console.log(command);
		} else {


		var winningCommand = command;
		twitch_chat.say("#"+config.nick, "Winning Command: " + winningCommand + " (" + currVotes + " Votes, " + elVotingArray.length + " total)");
		qemu_input(winningCommand);
	}
		elVotingArray = [];
		elCounterArray = [];
		elSortArray = [];
	}

	

}, command_interval*1000);


