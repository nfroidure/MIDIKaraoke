(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Commandor constructor : rootElement is the element
// from wich we capture commands
var Commandor=function Commandor(rootElement, prefix) {
	// event handlers
	var _pointerDownListener, _pointerUpListener, _pointerClickListener,
		_touchstartListener, _touchendListener, _clickListener,
		_keydownListener, _keyupListener,
		_formChangeListener, _formSubmitListener,
	// Commands hashmap
		_commands={'____internal':true}
	;
	// Command prefix
	this.prefix = prefix || 'app:';
	// Testing rootElement
	if(!rootElement) {
		throw Error('No rootElement given');
	}
	// keeping a reference to the rootElement
	this.rootElement=rootElement;
	// MS Pointer events : should unify pointers, but... read and see by yourself. 
	if(!!('onmsgesturechange' in window)) {
		// event listeners for buttons
		(function() {
			var curElement=null;
			_pointerDownListener=function(event) {
				curElement=this.findButton(event.target)||this.findForm(event.target);
				curElement&&event.preventDefault()||event.stopPropagation();
			}.bind(this);
			_pointerUpListener=function(event) {
				if(curElement) {
					if(curElement===this.findButton(event.target)) {
						this.captureButton(event);
					} else if(curElement===this.findForm(event.target)) {
						this.captureForm(event);
					}
					event.preventDefault(); event.stopPropagation();
					curElement=null;
				}
			}.bind(this);
			this.rootElement.addEventListener('MSPointerDown', _pointerDownListener, true);
			this.rootElement.addEventListener('MSPointerUp', _pointerUpListener, true);
		}).call(this);
		// fucking IE10 bug : it doesn't cancel click event
		// when gesture events are cancelled
		_pointerClickListener=function(event){
				if(this.findButton(event.target)) {
					event.preventDefault();
					event.stopPropagation();
				}
			}.bind(this);
		this.rootElement.addEventListener('click',_pointerClickListener,true);
	} else {
		// Touch events
		if(!!('ontouchstart' in window)) {
			(function() {
				// a var keepin' the touchstart element
				var curElement=null;
				_touchstartListener=function(event) {
					curElement=this.findButton(event.target)||this.findForm(event.target);
					curElement&&event.preventDefault()||event.stopPropagation();
				}.bind(this);
				this.rootElement.addEventListener('touchstart', _touchstartListener, true);
				// checking it's the same at touchend, capturing command if so
				_touchendListener=function(event) {
					if(curElement==this.findButton(event.target)) {
						this.captureButton(event);
					} else if(curElement===this.findForm(event.target)) {
						this.captureForm(event);
					} else {
						curElement=null;
					}
				}.bind(this);
				this.rootElement.addEventListener('touchend', _touchendListener,true);
			}).call(this);
		}
	// Clic events
	_clickListener=this.captureButton.bind(this);
	this.rootElement.addEventListener('click', _clickListener, true);
	}
	// Keyboard events
	// Cancel keydown action (no click event)
	_keydownListener=function(event) {
		if(13===event.keyCode&&(this.findButton(event.target)
			||this.findForm(event.target))) {
			event.preventDefault()&&event.stopPropagation();
		}
	}.bind(this);
	this.rootElement.addEventListener('keydown', _keydownListener, true);
	// Fire on keyup
	_keyupListener=function(event) {
		if(13===event.keyCode&&!event.ctrlKey) {
			if(this.findButton(event.target)) {
				this.captureButton.apply(this, arguments);
			} else {
				this.captureForm.apply(this, arguments);
			}
		}
	}.bind(this);
	this.rootElement.addEventListener('keyup', _keyupListener, true);
	// event listeners for forms submission
	_formSubmitListener=this.captureForm.bind(this);
	this.rootElement.addEventListener('submit', _formSubmitListener, true);
	// event listeners for form changes
	_formChangeListener=this.formChange.bind(this);
	this.rootElement.addEventListener('change', _formChangeListener, true);
	this.rootElement.addEventListener('select', _formChangeListener, true);

	// Common command executor
	this.executeCommand=function (event,command,element) {
		if(!_commands) {
			throw Error('Cannot execute command on a disposed Commandor object.');
		}
		// checking for the prefix
		if(0!==command.indexOf(this.prefix))
			return false;
		// removing the prefix
		command=command.substr(this.prefix.length);
		var chunks=command.split('?');
		// the first chunk is the command path
		var callback=_commands;
		var nodes=chunks[0].split('/');
		for(var i=0, j=nodes.length; i<j-1; i++) {
			if(!callback[nodes[i]]) {
				throw Error('Cannot execute the following command "'+command+'".');
			}
			callback=callback[nodes[i]];
		}
		if('function' !== typeof callback[nodes[i]]) {
			throw Error('Cannot execute the following command "'+command+'", not a fucntion.');
		}
		// Preparing arguments
		var args={};
		if(chunks[1]) {
			chunks=chunks[1].split('&');
			for(var k=0, l=chunks.length; k<l; k++) {
				var parts=chunks[k].split('=');
				if(undefined!==parts[0]&&undefined!==parts[1]) {
					args[parts[0]]=decodeURIComponent(parts[1]);
				}
			}
		}
		// executing the command fallback
		if(callback.____internal) {
			return !!!((callback[nodes[i]])(event,args,element));
		} else {
			return !!!(callback[nodes[i]](event,args,element));
		}
		return !!!callback(event,args,element);
	};

	// Add a callback or object for the specified path
	this.suscribe=function(path,callback) {
		if(!_commands) {
			throw Error('Cannot suscribe commands on a disposed Commandor object.');
		}
		var nodes=path.split('/'),
			command=_commands;
		for(var i=0, j=nodes.length-1; i<j; i++) {
			if((!command[nodes[i]])||!(command[nodes[i]] instanceof Object)) {
				command[nodes[i]]={'____internal':true};
			}
			command=command[nodes[i]];
			if(!command.____internal) {
				throw Error('Cannot suscribe commands on an external object.');
			}
		}
		command[nodes[i]]=callback;
	};

	// Delete callback for the specified path
	this.unsuscribe=function(path) {
		if(!_commands) {
			throw Error('Cannot unsuscribe commands of a disposed Commandor object.');
		}
		var nodes=path.split('/'),
			command=_commands;
		for(var i=0, j=nodes.length-1; i<j; i++) {
			command=command[nodes[i]]={};
		}
		if(!command.____internal) {
			throw Error('Cannot unsuscribe commands of an external object.');
		}
		command[nodes[i]]=null;
	};

	// Dispose the commandor object (remove event listeners)
	this.dispose=function() {
		_commands=null;
		if(_pointerDownListener) {
			this.rootElement.removeEventListener('MSPointerDown',
				_pointerDownListener, true);
			this.rootElement.removeEventListener('MSPointerUp',
				_pointerUpListener, true);
			this.rootElement.removeEventListener('click',
				_pointerClickListener, true);
		}
		if(_touchstartListener) {
			this.rootElement.removeEventListener('touchstart',
				_touchstartListener, true);
			this.rootElement.removeEventListener('touchend',
				_touchendListener, true);
		}
		this.rootElement.removeEventListener('click', _clickListener, true);
		this.rootElement.removeEventListener('keydown', _keydownListener, true);
		this.rootElement.removeEventListener('keyup', _keyupListener, true);
		this.rootElement.removeEventListener('change', _formChangeListener, true);
		this.rootElement.removeEventListener('select', _formChangeListener, true);
		this.rootElement.removeEventListener('submit', _formSubmitListener, true);
	};
};

// Look for a button
Commandor.prototype.findButton=function(element) {
	while(element&&element.parentNode) {
		if('A'===element.nodeName
			&&element.hasAttribute('href')
			&&-1!==element.getAttribute('href').indexOf(this.prefix)) {
			return element;
		}
		if('INPUT'===element.nodeName&&element.hasAttribute('type')
			&&(element.getAttribute('type')=='submit'
					||element.getAttribute('type')=='button')
			&&element.hasAttribute('formaction')
			&&-1!==element.getAttribute('formaction').indexOf(this.prefix)
			) {
			return element;
		}
		if(element===this.rootElement) {
			return null;
		}
		element=element.parentNode;
	}
	return null;
};

// Look for a form
Commandor.prototype.findForm=function(element) {
	if('FORM'===element.nodeName||
		('INPUT'===element.nodeName&&element.hasAttribute('type')
		&&'submit'===element.getAttribute('type'))) {
		while(element&&element.parentNode) {
			if('FORM'===element.nodeName&&element.hasAttribute('action')
				&&-1!==element.getAttribute('action').indexOf(this.prefix)) {
				return element;
			}
			if(element===this.rootElement) {
				return null;
			}
			element=element.parentNode;
		}
		return element;
	}
	return null;
};

// Look for form change
Commandor.prototype.findFormChange=function(element) {
	while(element&&element.parentNode) {
		if('FORM'===element.nodeName&&element.hasAttribute('action')
			&&-1!==element.getAttribute('action').indexOf(this.prefix)) {
			return element;
		}
		if(element===this.rootElement) {
			return null;
		}
		element=element.parentNode;
	}
	return element;
};

// Extract the command for a button
Commandor.prototype.doCommandOfButton=function(element, event) {
	var command='';
	// looking for a button with formaction attribute
	if('INPUT'===element.nodeName) {
		command=element.getAttribute('formaction');
	// looking for a link
	} else if('A'===element.nodeName) {
		command=element.getAttribute('href');
	}
	// executing the command
	this.executeCommand(event,command,element);
};

// Button event handler
Commandor.prototype.captureButton=function(event) {
	var element=this.findButton(event.target);
	// if there is a button, stop event
	if(element) {
		// if the button is not disabled, run the command
		if((!element.hasAttribute('disabled'))
			||'disabled'===element.getAttribute('disabled')) {
			this.doCommandOfButton(element, event);
		}
		event.stopPropagation()||event.preventDefault();
	}
};

// Form change handler
Commandor.prototype.formChange=function(event) {
	// find the evolved form
	var element=this.findFormChange(event.target),
		command='';
	// searching the data-change attribute containing the command
	if(element&&'FORM'===element.nodeName
		&&element.hasAttribute('data-change')) {
		command=element.getAttribute('data-change');
	}
	// executing the command
	command&&this.executeCommand(event,command,element);
};

// Extract the command for a button
Commandor.prototype.doCommandOfForm=function(element, event) {
	var command='';
	// looking for a button with formaction attribute
	if('FORM'===element.nodeName) {
		command=element.getAttribute('action');
	}
	// executing the command
	this.executeCommand(event,command,element);
};

// Form command handler
Commandor.prototype.captureForm=function(event) {
	var element=this.findForm(event.target);
	// if there is a button, stop event
	if(element) {
		// if the button is not disabled, run the command
		if((!element.hasAttribute('disabled'))
			||'disabled'===element.getAttribute('disabled')) {
			this.doCommandOfForm(element, event);
		}
		event.stopPropagation()||event.preventDefault();
	}
};

module.exports = Commandor;


},{}],2:[function(require,module,exports){
// MIDIEvents : Read and edit events from various sources (ArrayBuffer, Stream)
function MIDIEvents() {
	throw new Error('MIDIEvents function not intended to be run.');
}

// Static constants
// Event types
MIDIEvents.EVENT_META=0xFF;
MIDIEvents.EVENT_SYSEX=0xF0;
MIDIEvents.EVENT_DIVSYSEX=0xF7;
MIDIEvents.EVENT_MIDI=0x8;
// Meta event types
MIDIEvents.EVENT_META_SEQUENCE_NUMBER=0x00,
MIDIEvents.EVENT_META_TEXT=0x01,
MIDIEvents.EVENT_META_COPYRIGHT_NOTICE=0x02,
MIDIEvents.EVENT_META_TRACK_NAME=0x03,
MIDIEvents.EVENT_META_INSTRUMENT_NAME=0x04,
MIDIEvents.EVENT_META_LYRICS=0x05,
MIDIEvents.EVENT_META_MARKER=0x06,
MIDIEvents.EVENT_META_CUE_POINT=0x07,
MIDIEvents.EVENT_META_MIDI_CHANNEL_PREFIX=0x20,
MIDIEvents.EVENT_META_END_OF_TRACK=0x2F,
MIDIEvents.EVENT_META_SET_TEMPO=0x51,
MIDIEvents.EVENT_META_SMTPE_OFFSET=0x54,
MIDIEvents.EVENT_META_TIME_SIGNATURE=0x58,
MIDIEvents.EVENT_META_KEY_SIGNATURE=0x59,
MIDIEvents.EVENT_META_SEQUENCER_SPECIFIC=0x7F;
// MIDI event types
MIDIEvents.EVENT_MIDI_NOTE_OFF=0x8,
MIDIEvents.EVENT_MIDI_NOTE_ON=0x9,
MIDIEvents.EVENT_MIDI_NOTE_AFTERTOUCH=0xA,
MIDIEvents.EVENT_MIDI_CONTROLLER=0xB,
MIDIEvents.EVENT_MIDI_PROGRAM_CHANGE=0xC,
MIDIEvents.EVENT_MIDI_CHANNEL_AFTERTOUCH=0xD,
MIDIEvents.EVENT_MIDI_PITCH_BEND=0xE;
// MIDI event sizes
MIDIEvents.MIDI_1PARAM_EVENTS=[
	MIDIEvents.EVENT_MIDI_PROGRAM_CHANGE,
	MIDIEvents.EVENT_MIDI_CHANNEL_AFTERTOUCH
];
MIDIEvents.MIDI_2PARAMS_EVENTS=[
	MIDIEvents.EVENT_MIDI_NOTE_OFF,
	MIDIEvents.EVENT_MIDI_NOTE_ON,
	MIDIEvents.EVENT_MIDI_NOTE_AFTERTOUCH,
	MIDIEvents.EVENT_MIDI_CONTROLLER,
	MIDIEvents.EVENT_MIDI_PITCH_BEND
];

// Create an event stream parser
MIDIEvents.createParser=function(stream, startAt, strictMode) {
	// Wrap DataView into a data stream
	if(stream instanceof DataView) {
		stream={
			'position':startAt||0,
			'buffer':stream,
			'readUint8':function() {
				return this.buffer.getUint8(this.position++);
			},
			'readUint16':function() {
				var v=this.buffer.getUint16(this.position);
				this.position=this.position+2;
				return v;
			},
			'readUint32':function() {
				var v=this.buffer.getUint16(this.position);
				this.position=this.position+2;
				return v;
			},
			'readVarInt':function() {
				var v=0, i=0;
				while(i++<4) {
					var b=this.readUint8();
					if (b&0x80) {
						v+=(b&0x7f);
						v<<=7;
					} else {
						return v+b;
					}
				}
				throw new Error('0x'+this.position.toString(16)+': Variable integer'
					+' length cannot exceed 4 bytes');
			},
			'readBytes':function(l) {
				var bytes=[];
				for(l; l>0; l--) {
					bytes.push(this.readUint8());
				}
				return bytes;
			},
			'pos':function() {
				return '0x'+(this.buffer.byteOffset+this.position).toString(16);
			},
			'end':function(l) {
				return this.position===this.buffer.byteLength;
			}
		}
		startAt=0;
	}
	// Consume stream till not at start index
	if(startAt>0) {
		while(startAt--)
			stream.readUint8();
	}
	// Private vars
	// Common vars
	var deltaTime, eventTypeByte, lastEventTypeByte, event,
	// MIDI events vars
		MIDIEventType, MIDIEventChannel, MIDIEventParam1, MIDIEventParam2;
	// creating the parser object
	return {
		// Read the next event
		'next':function() {
			// Check available datas
			if(stream.end())
				return null;
			// Creating the event
			event={
				// Memoize the event index
				'index':stream.pos(),
				// Read the delta time
				'delta':stream.readVarInt()
			};
			// Read the eventTypeByte
			eventTypeByte=stream.readUint8();
			if((eventTypeByte&0xF0) == 0xF0) {
				// Meta events
				if(eventTypeByte==MIDIEvents.EVENT_META) {
					event.type=MIDIEvents.EVENT_META;
					event.subtype=stream.readUint8();
					event.length=stream.readVarInt();
					switch(event.subtype) {
						case MIDIEvents.EVENT_META_SEQUENCE_NUMBER:
							if(strictMode&&2!==event.length)
								throw new Error(stream.pos()+' Bad metaevent length.');
							event.msb=stream.readUint8();
							event.lsb=stream.readUint8();
							return event;
							break;
						case MIDIEvents.EVENT_META_TEXT:
						case MIDIEvents.EVENT_META_COPYRIGHT_NOTICE:
						case MIDIEvents.EVENT_META_TRACK_NAME:
						case MIDIEvents.EVENT_META_INSTRUMENT_NAME:
						case MIDIEvents.EVENT_META_LYRICS:
						case MIDIEvents.EVENT_META_MARKER:
						case MIDIEvents.EVENT_META_CUE_POINT:
							event.data=stream.readBytes(event.length);
							return event;
							break;
						case MIDIEvents.EVENT_META_MIDI_CHANNEL_PREFIX:
							if(strictMode&&1!==event.length)
								throw new Error(stream.pos()+' Bad metaevent length.');
							event.prefix=stream.readUint8();
							return event;
							break;
						case MIDIEvents.EVENT_META_END_OF_TRACK:
							if(strictMode&&0!==event.length)
								throw new Error(stream.pos()+' Bad metaevent length.');
							return event;
							break;
						case MIDIEvents.EVENT_META_SET_TEMPO:
							if(strictMode&&3!==event.length) {
								throw new Error(stream.pos()+' Tempo meta event length must'
									+' be 3.');
							}
							event.tempo=((stream.readUint8() << 16)
								+ (stream.readUint8() << 8)
								+ stream.readUint8());
							event.tempoBPM=60000000/event.tempo;
							return event;
							break;
						case MIDIEvents.EVENT_META_SMTPE_OFFSET:
							if(strictMode&&5!==event.length) {
								throw new Error(stream.pos()+' Bad metaevent length.');
							}
							event.hour=stream.readUint8();
							if(strictMode&&event.hour>23) {
								throw new Error(stream.pos()+' SMTPE offset hour value must'
									+' be part of 0-23.');
							}
							event.minutes=stream.readUint8();
							if(strictMode&&event.minutes>59) {
								throw new Error(stream.pos()+' SMTPE offset minutes value'
									+' must be part of 0-59.');
							}
							event.seconds=stream.readUint8();
							if(strictMode&&event.seconds>59) {
								throw new Error(stream.pos()+' SMTPE offset seconds value'
									+' must be part of 0-59.');
							}
							event.frames=stream.readUint8();
							if(strictMode&&event.frames>30) {
								throw new Error(stream.pos()+' SMTPE offset frames value must'
									+' be part of 0-30.');
							}
							event.subframes=stream.readUint8();
							if(strictMode&&event.subframes>99) {
								throw new Error(stream.pos()+' SMTPE offset subframes value'
									+' must be part of 0-99.');
							}
							return event;
							break;
						case MIDIEvents.EVENT_META_KEY_SIGNATURE:
							if(strictMode&&2!==event.length) {
								throw new Error(stream.pos()+' Bad metaevent length.');
							}
							event.key=stream.readUint8();
							if(strictMode&&(event.key<-7||event.key>7)) {
								throw new Error(stream.pos()+' Bad metaevent length.');
							}
							event.scale=stream.readUint8();
							if(strictMode&&event.scale!==0&&event.scale!==1) {
								throw new Error(stream.pos()+' Key signature scale value must'
									+' be 0 or 1.');
							}
							return event;
							break;
						case MIDIEvents.EVENT_META_TIME_SIGNATURE:
							if(strictMode&&4!==event.length)
								throw new Error(stream.pos()+' Bad metaevent length.');
							event.data=stream.readBytes(event.length);
							event.param1=event.data[0];
							event.param2=event.data[1];
							event.param3=event.data[2];
							event.param4=event.data[3];
							return event;
							break;
						case MIDIEvents.EVENT_META_SEQUENCER_SPECIFIC:
							event.data=stream.readBytes(event.length);
							return event;
							break;
						default:
							if(strictMode)
								throw new Error(stream.pos()+' Unknown meta event type '
									+'('+event.subtype.toString(16)+').');
							event.data=stream.readBytes(event.length);
							return event;
							break;
					}
				// System events
				} else if(eventTypeByte==MIDIEvents.EVENT_SYSEX
						||eventTypeByte==MIDIEvents.EVENT_DIVSYSEX) {
					event.type=eventTypeByte;
					event.length=stream.readVarInt();
					event.data=stream.readBytes(event.length);
					return event;
				// Unknown event, assuming it's system like event
				} else {
					if(strictMode)
						throw new Error(stream.pos()+' Unknown event type '
							+eventTypeByte.toString(16)+', Delta: '+event.delta+'.');
					event.type=eventTypeByte;
					event.badsubtype=stream.readVarInt();
					event.length=stream.readUint8();
					event.data=stream.readBytes(event.length);
					return event;
				}
			// MIDI eventsdestination[index++]
			} else {
				// running status
				if((eventTypeByte&0x80)==0) {
					if(!(MIDIEventType))
						throw new Error(stream.pos()+' Running status without previous event');
					MIDIEventParam1=eventTypeByte;
				} else {
					MIDIEventType=eventTypeByte>>4;
					MIDIEventChannel=eventTypeByte&0x0F;
					MIDIEventParam1=stream.readUint8();
				}
				event.type=MIDIEvents.EVENT_MIDI;
				event.subtype=MIDIEventType;
				event.channel=MIDIEventChannel;
				event.param1=MIDIEventParam1;
				switch(MIDIEventType) {
					case MIDIEvents.EVENT_MIDI_NOTE_OFF:
						event.param2=stream.readUint8();
						return event;
						break;
					case MIDIEvents.EVENT_MIDI_NOTE_ON:
						var velocity=stream.readUint8();
						// If velocity is 0, it's a note off event in fact
						if(!velocity) {
							event.subtype=MIDIEvents.EVENT_MIDI_NOTE_OFF;
							event.param2=127; // Find a standard telling what to do here
						} else {
							event.param2=velocity;
						}
						return event;
						break;
					case MIDIEvents.EVENT_MIDI_NOTE_AFTERTOUCH:
						event.param2=stream.readUint8();
						return event;
						break;
					case MIDIEvents.EVENT_MIDI_CONTROLLER:
						event.param2=stream.readUint8();
						return event;
						break;
					case MIDIEvents.EVENT_MIDI_PROGRAM_CHANGE:
						return event;
						break;
					case MIDIEvents.EVENT_MIDI_CHANNEL_AFTERTOUCH:
						return event;
						break;
					case MIDIEvents.EVENT_MIDI_PITCH_BEND:
						event.param2=stream.readUint8();
						return event;
						break;
					default:
						if(strictMode)
							throw new Error(stream.pos()+' Unknown MIDI event type '
								+'('+MIDIEventType.toString(16)+').');
						return event;
						break;
				}
			}
		}
	};
};

// Return the buffer length needed to encode the given events
MIDIEvents.writeToTrack=function(events, destination) {
	var index=0;
	// Converting each event to binary MIDI datas
	for(var i=0, j=events.length; i<j; i++) {
		// Writing delta value
		if(events[i].delta>>>28) {
			throw Error('Event #'+i+': Maximum delta time value reached ('
				+events[i].delta+'/134217728 max)');
		}
		if(events[i].delta>>>21) {
			destination[index++]=((events[i].delta>>>21)&0x7F)|0x80;
		}
		if(events[i].delta>>>14) {
			destination[index++]=((events[i].delta>>>14)&0x7F)|0x80;
		}
		if(events[i].delta>>>7) {
			destination[index++]=((events[i].delta>>>7)&0x7F)|0x80;
		}
		destination[index++]=(events[i].delta&0x7F);
		// MIDI Events encoding
		if(events[i].type===MIDIEvents.EVENT_MIDI) {
			// Adding the byte of subtype + channel
			destination[index++]=(events[i].subtype<<4)+events[i].channel
			// Adding the byte of the first params
			destination[index++]=events[i].param1;
			// Adding a byte for the optionnal second param
			if(-1!==MIDIEvents.MIDI_2PARAMS_EVENTS.indexOf(events[i].subtype)) {
				destination[index++]=events[i].param2;
			}
		// META / SYSEX events encoding
		} else {
			// Adding the event type byte
			destination[index++]=events[i].type;
			// Adding the META event subtype byte
			if(events[i].type===MIDIEvents.EVENT_META) {
				destination[index++]=events[i].subtype;
			}
			// Writing the event length bytes
			if(events[i].length>>>28) {
				throw Error('Event #'+i+': Maximum length reached ('
					+events[i].length+'/134217728 max)');
			}
			if(events[i].length>>>21) {
				destination[index++]=((events[i].length>>>21)&0x7F)|0x80;
			}
			if(events[i].length>>>14) {
				destination[index++]=((events[i].length>>>14)&0x7F)|0x80;
			}
			if(events[i].length>>>7) {
				destination[index++]=((events[i].length>>>7)&0x7F)|0x80;
			}
			destination[index++]=(events[i].length&0x7F);
			if(events[i].type===MIDIEvents.EVENT_META) {
				switch(events[i].subtype) {
					case MIDIEvents.EVENT_META_SEQUENCE_NUMBER:
						destination[index++]=events[i].msb;
						destination[index++]=events[i].lsb;
						break;
					case MIDIEvents.EVENT_META_TEXT:
					case MIDIEvents.EVENT_META_COPYRIGHT_NOTICE:
					case MIDIEvents.EVENT_META_TRACK_NAME:
					case MIDIEvents.EVENT_META_INSTRUMENT_NAME:
					case MIDIEvents.EVENT_META_LYRICS:
					case MIDIEvents.EVENT_META_MARKER:
					case MIDIEvents.EVENT_META_CUE_POINT:
						for(var k=0, l=events[i].length; k<l; k++) {
							destination[index++]=events[i].data[k];
						}
						break;
					case MIDIEvents.EVENT_META_MIDI_CHANNEL_PREFIX:
						destination[index++]=events[i].prefix;
						return event;
						break;
					case MIDIEvents.EVENT_META_END_OF_TRACK:
						break;
					case MIDIEvents.EVENT_META_SET_TEMPO:
						destination[index++]=(events[i].tempo >> 16);
						destination[index++]=(events[i].tempo >> 8) & 0xFF;
						destination[index++]=events[i].tempo & 0xFF;
						break;
					case MIDIEvents.EVENT_META_SMTPE_OFFSET:
						if(strictMode&&event.hour>23) {
							throw new Error('Event #'+i+': SMTPE offset hour value must be'
								+' part of 0-23.');
						}
						destination[index++]=events[i].hour;
						if(strictMode&&event.minutes>59) {
							throw new Error('Event #'+i+': SMTPE offset minutes value must'
								+' be part of 0-59.');
						}
						destination[index++]=events[i].minutes;
						if(strictMode&&event.seconds>59) {
							throw new Error('Event #'+i+': SMTPE offset seconds value must'
							+' be part of 0-59.');
						}
						destination[index++]=events[i].seconds;
						if(strictMode&&event.frames>30) {
							throw new Error('Event #'+i+': SMTPE offset frames amount must'
								+' be part of 0-30.');
						}
						destination[index++]=events[i].frames;
						if(strictMode&&event.subframes>99) {
							throw new Error('Event #'+i+': SMTPE offset subframes amount'
								+' must be part of 0-99.');
						}
						destination[index++]=events[i].subframes;
						return event;
						break;
					case MIDIEvents.EVENT_META_KEY_SIGNATURE:
						if('number'!= typeof events[i].key
							|| events[i].key<-7 || events[i].scale>7) {
							throw new Error('Event #'+i+':The key signature key must be'
								+' between -7 and 7');
						}
						if('number'!= typeof events[i].scale
							|| events[i].scale<0 || events[i].scale>1) {
							throw new Error('Event #'+i+':The key signature scale must be'
								+' 0 or 1');
						}
						destination[index++]=events[i].key;
						destination[index++]=events[i].scale;
						break;
					// Not implemented
					case MIDIEvents.EVENT_META_TIME_SIGNATURE:
					case MIDIEvents.EVENT_META_SEQUENCER_SPECIFIC:
					default:
						for(var k=0, l=events[i].length; k<l; k++) {
							destination[index++]=events[i].data[k];
						}
						break;
				}
			// Adding bytes corresponding to the sysex event datas
			} else {
				for(var k=0, l=events[i].length; k<l; k++) {
					destination[index++]=events[i].data[k];
				}
			}
		}
	}
};

// Return the buffer length needed to encode the given events
MIDIEvents.getRequiredBufferLength=function(events) {
	var bufferLength=0, event;
	// Calculating the track size by adding events lengths
	for(var i=0, j=events.length; i<j; i++) {
		// Computing necessary bytes to encode the delta value
		bufferLength+=
				(events[i].delta>>>21?4:
				(events[i].delta>>>14?3:
				(events[i].delta>>>7?2:1)));
		// MIDI Events have various fixed lengths
		if(events[i].type===MIDIEvents.EVENT_MIDI) {
			// Adding a byte for subtype + channel
			bufferLength++;
			// Adding a byte for the first params
			bufferLength++;
			// Adding a byte for the optionnal second param
			if(-1!==MIDIEvents.MIDI_2PARAMS_EVENTS.indexOf(events[i].subtype)) {
				bufferLength++;
			}
		// META / SYSEX events lengths are self defined
		} else {
			// Adding a byte for the event type
			bufferLength++;
			// Adding a byte for META events subtype
			if(events[i].type===MIDIEvents.EVENT_META) {
				bufferLength++;
			}
			// Adding necessary bytes to encode the length
			bufferLength+=
				(events[i].length>>>21?4:
				(events[i].length>>>14?3:
				(events[i].length>>>7?2:1)));
			// Adding bytes corresponding to the event length
			bufferLength+=events[i].length;
		}
	}
	return bufferLength;
};

module.exports = MIDIEvents;


},{}],3:[function(require,module,exports){
/*! http://mths.be/fromcodepoint v0.2.1 by @mathias */
if (!String.fromCodePoint) {
	(function() {
		var defineProperty = (function() {
			// IE 8 only supports `Object.defineProperty` on DOM elements
			try {
				var object = {};
				var $defineProperty = Object.defineProperty;
				var result = $defineProperty(object, object, object) && $defineProperty;
			} catch(error) {}
			return result;
		}());
		var stringFromCharCode = String.fromCharCode;
		var floor = Math.floor;
		var fromCodePoint = function(_) {
			var MAX_SIZE = 0x4000;
			var codeUnits = [];
			var highSurrogate;
			var lowSurrogate;
			var index = -1;
			var length = arguments.length;
			if (!length) {
				return '';
			}
			var result = '';
			while (++index < length) {
				var codePoint = Number(arguments[index]);
				if (
					!isFinite(codePoint) || // `NaN`, `+Infinity`, or `-Infinity`
					codePoint < 0 || // not a valid Unicode code point
					codePoint > 0x10FFFF || // not a valid Unicode code point
					floor(codePoint) != codePoint // not an integer
				) {
					throw RangeError('Invalid code point: ' + codePoint);
				}
				if (codePoint <= 0xFFFF) { // BMP code point
					codeUnits.push(codePoint);
				} else { // Astral code point; split in surrogate halves
					// http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
					codePoint -= 0x10000;
					highSurrogate = (codePoint >> 10) + 0xD800;
					lowSurrogate = (codePoint % 0x400) + 0xDC00;
					codeUnits.push(highSurrogate, lowSurrogate);
				}
				if (index + 1 == length || codeUnits.length > MAX_SIZE) {
					result += stringFromCharCode.apply(null, codeUnits);
					codeUnits.length = 0;
				}
			}
			return result;
		};
		if (defineProperty) {
			defineProperty(String, 'fromCodePoint', {
				'value': fromCodePoint,
				'configurable': true,
				'writable': true
			});
		} else {
			String.fromCodePoint = fromCodePoint;
		}
	}());
}

},{}],4:[function(require,module,exports){
/*! http://mths.be/codepointat v0.2.0 by @mathias */
if (!String.prototype.codePointAt) {
	(function() {
		'use strict'; // needed to support `apply`/`call` with `undefined`/`null`
		var defineProperty = (function() {
			// IE 8 only supports `Object.defineProperty` on DOM elements
			try {
				var object = {};
				var $defineProperty = Object.defineProperty;
				var result = $defineProperty(object, object, object) && $defineProperty;
			} catch(error) {}
			return result;
		}());
		var codePointAt = function(position) {
			if (this == null) {
				throw TypeError();
			}
			var string = String(this);
			var size = string.length;
			// `ToInteger`
			var index = position ? Number(position) : 0;
			if (index != index) { // better `isNaN`
				index = 0;
			}
			// Account for out-of-bounds indices:
			if (index < 0 || index >= size) {
				return undefined;
			}
			// Get the first code unit
			var first = string.charCodeAt(index);
			var second;
			if ( // check if it’s the start of a surrogate pair
				first >= 0xD800 && first <= 0xDBFF && // high surrogate
				size > index + 1 // there is a next code unit
			) {
				second = string.charCodeAt(index + 1);
				if (second >= 0xDC00 && second <= 0xDFFF) { // low surrogate
					// http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
					return (first - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
				}
			}
			return first;
		};
		if (defineProperty) {
			defineProperty(String.prototype, 'codePointAt', {
				'value': codePointAt,
				'configurable': true,
				'writable': true
			});
		} else {
			String.prototype.codePointAt = codePointAt;
		}
	}());
}

},{}],5:[function(require,module,exports){
// UTF8 : Manage UTF-8 strings in ArrayBuffers
if(module.require) {
  require('string.fromcodepoint');
  require('string.prototype.codepointat');
}

var UTF8={
  // non UTF8 encoding detection (cf README file for details)
  'isNotUTF8': function(bytes, byteOffset, byteLength) {
    try {
      UTF8.getStringFromBytes(bytes, byteOffset, byteLength, true);
    } catch(e) {
      return true;
    }
    return false;
  },
  // UTF8 decoding functions
  'getCharLength': function(theByte) {
    // 4 bytes encoded char (mask 11110000)
    if(0xF0 == (theByte&0xF0)) {
      return 4;
    // 3 bytes encoded char (mask 11100000)
    } else if(0xE0 == (theByte&0xE0)) {
      return 3;
    // 2 bytes encoded char (mask 11000000)
    } else if(0xC0 == (theByte&0xC0)) {
      return 2;
    // 1 bytes encoded char
    } else if(theByte == (theByte&0x7F)) {
      return 1;
    }
    return 0;
  },
  'getCharCode': function(bytes, byteOffset, charLength) {
    var charCode = 0, mask = '';
    byteOffset = byteOffset || 0;
    // Retrieve charLength if not given
    charLength = charLength || UTF8.getCharLength(bytes[byteOffset]);
    if(charLength == 0) {
      throw new Error(bytes[byteOffset].toString(2)+' is not a significative' +
        ' byte (offset:'+byteOffset+').');
    }
    // Return byte value if charlength is 1
    if(1 === charLength) {
      return bytes[byteOffset];
    }
    // Test UTF8 integrity
    mask = '00000000'.slice(0, charLength) + 1 + '00000000'.slice(charLength + 1);
    if(bytes[byteOffset]&(parseInt(mask, 2))) {
      throw Error('Index ' + byteOffset + ': A ' + charLength + ' bytes' +
        ' encoded char' +' cannot encode the '+(charLength+1)+'th rank bit to 1.');
    }
    // Reading the first byte
    mask='0000'.slice(0,charLength+1)+'11111111'.slice(charLength+1);
    charCode+=(bytes[byteOffset]&parseInt(mask,2))<<((--charLength)*6);
    // Reading the next bytes
    while(charLength) {
      if(0x80!==(bytes[byteOffset+1]&0x80)
        ||0x40===(bytes[byteOffset+1]&0x40)) {
        throw Error('Index '+(byteOffset+1)+': Next bytes of encoded char'
          +' must begin with a "10" bit sequence.');
      }
      charCode += ((bytes[++byteOffset]&0x3F) << ((--charLength) * 6));
    }
    return charCode;
  },
  'getStringFromBytes': function(bytes, byteOffset, byteLength, strict) {
    var charLength, chars = [];
    byteOffset = byteOffset|0;
    byteLength=('number' === typeof byteLength ?
      byteLength :
      bytes.byteLength || bytes.length
    );
    for(; byteOffset < byteLength; byteOffset++) {
      charLength = UTF8.getCharLength(bytes[byteOffset]);
      if(byteOffset + charLength > byteLength) {
        if(strict) {
          throw Error('Index ' + byteOffset + ': Found a ' + charLength +
            ' bytes encoded char declaration but only ' +
            (byteLength - byteOffset) +' bytes are available.');
        }
      } else {
        chars.push(String.fromCodePoint(
          UTF8.getCharCode(bytes, byteOffset, charLength, strict)
        ));
      }
      byteOffset += charLength - 1;
    }
    return chars.join('');
  },
  // UTF8 encoding functions
  'getBytesForCharCode': function(charCode) {
    if(charCode < 128) {
      return 1;
    } else if(charCode < 2048) {
      return 2;
    } else if(charCode < 65536) {
      return 3;
    } else if(charCode < 2097152) {
      return 4;
    }
    throw new Error('CharCode '+charCode+' cannot be encoded with UTF8.');
  },
  'setBytesFromCharCode': function(charCode, bytes, byteOffset, neededBytes) {
    charCode = charCode|0;
    bytes = bytes || [];
    byteOffset = byteOffset|0;
    neededBytes = neededBytes || UTF8.getBytesForCharCode(charCode);
    // Setting the charCode as it to bytes if the byte length is 1
    if(1 == neededBytes) {
      bytes[byteOffset] = charCode;
    } else {
      // Computing the first byte
      bytes[byteOffset++] =
        (parseInt('1111'.slice(0, neededBytes), 2) << 8 - neededBytes) +
        (charCode >>> ((--neededBytes) * 6));
      // Computing next bytes
      for(;neededBytes>0;) {
        bytes[byteOffset++] = ((charCode>>>((--neededBytes) * 6))&0x3F)|0x80;
      }
    }
    return bytes;
  },
  'setBytesFromString': function(string, bytes, byteOffset, byteLength, strict) {
    string = string || '';
    bytes = bytes || [];
    byteOffset = byteOffset|0;
    byteLength = ('number' === typeof byteLength ?
      byteLength :
      bytes.byteLength||Infinity
    );
    for(var i = 0, j = string.length; i < j; i++) {
      var neededBytes = UTF8.getBytesForCharCode(string[i].codePointAt(0));
      if(strict && byteOffset + neededBytes > byteLength) {
        throw new Error('Not enought bytes to encode the char "' + string[i] +
          '" at the offset "' + byteOffset + '".');
      }
      UTF8.setBytesFromCharCode(string[i].codePointAt(0),
        bytes, byteOffset, neededBytes, strict);
      byteOffset += neededBytes;
    }
    return bytes;
  }
};

if('undefined' !== typeof module) {
  module.exports = UTF8;
}


},{"string.fromcodepoint":3,"string.prototype.codepointat":4}],6:[function(require,module,exports){
// MIDIFile : Read (and soon edit) a MIDI file in a given ArrayBuffer

// Dependencies
var MIDIFileHeader = require('./MIDIFileHeader')
  , MIDIFileTrack = require('./MIDIFileTrack')
  , MIDIEvents = require('midievents')
  , UTF8 = require('utf-8')
;

// Constructor
function MIDIFile(buffer, strictMode) {
	// If not buffer given, creating a new MIDI file
	if(!buffer) {
		// Creating the content
		this.header=new MIDIFileHeader();
		this.tracks=[new MIDIFileTrack()];
	// if a buffer is provided, parsing him
	} else {
		if(!(buffer instanceof ArrayBuffer)) {
			throw new Error('Invalid buffer received.');
		}
		// Minimum MIDI file size is a headerChunk size (14bytes)
		// and an empty track (8+3bytes)
		if(buffer.byteLength<25) {
			throw new Error('A buffer of a valid MIDI file must have, at least, a'
				+' size of 25bytes.');
		}
		// Reading header
		this.header=new MIDIFileHeader(buffer, strictMode);
		this.tracks=[];
		var track;
		var curIndex=14;
		// Reading tracks
		for(var i=0, j=this.header.getTracksCount(); i<j; i++) {
			// Testing the buffer length
			if(strictMode&&curIndex>=buffer.byteLength-1) {
				throw new Error('Couldn\'t find datas corresponding to the track #'+i+'.');
			}
			// Creating the track object
			var track=new MIDIFileTrack(buffer, curIndex, strictMode);
			this.tracks.push(track);
			// Updating index to the track end
			curIndex+=track.getTrackLength()+8;
		}
		// Testing integrity : curIndex should be at the end of the buffer
		if(strictMode&&curIndex!=buffer.byteLength) {
			throw new Error('It seems that the buffer contains too much datas.');
		}
	}
}

// Events reading helpers
MIDIFile.prototype.getEvents = function(type, subtype) {
	var events, event, playTime=0, filteredEvents=[],
		format=this.header.getFormat(),
		tickResolution=this.header.getTickResolution();
	// Reading events
	// if the read is sequential
	if(1!==format||1===this.tracks.length) {
		for(var i=0, j=this.tracks.length; i<j; i++) {
			// reset playtime if format is 2
			playTime=(2==format&&playTime?playTime:0);
			events=new MIDIEvents.createParser(this.tracks[i].getTrackContent(),0,false);
			// loooping throught events
			 while(event=events.next()) {
			 	playTime+=(event.delta?(event.delta*tickResolution)/1000:0);
				if(event.type===MIDIEvents.EVENT_META) {
					// tempo change events
					if(event.subtype===MIDIEvents.EVENT_META_SET_TEMPO) {
						tickResolution=this.header.getTickResolution(event.tempo);
					}
				}
				// push the asked events
				if(((!type)||event.type===type)
					&&((!subtype)||(event.subtype&&event.subtype===type))) {
					event.playTime=playTime;
					filteredEvents.push(event);
				}
			}
		}
	// the read is concurrent
	} else {
		var trackParsers=[], smallestDelta=-1, i, j;
		// Creating parsers
		for(i=0, j=this.tracks.length; i<j; i++) {
			trackParsers[i]={};
			trackParsers[i].parser=new MIDIEvents.createParser(
					this.tracks[i].getTrackContent(),0,false);
			trackParsers[i].curEvent=trackParsers[i].parser.next();
		}
		// Filling events
		do {
			smallestDelta=-1;
			// finding the smallest event
			for(i=0, j=trackParsers.length; i<j; i++) {
				if(trackParsers[i].curEvent) {
					if(-1===smallestDelta||trackParsers[i].curEvent.delta
						<trackParsers[smallestDelta].curEvent.delta) {
						smallestDelta=i;
					}
				}
			}
			if(-1!==smallestDelta) {
				// removing the delta of previous events
				for(i=0, j=trackParsers.length; i<j; i++) {
					if(i!==smallestDelta&&trackParsers[i].curEvent) {
						trackParsers[i].curEvent.delta-=trackParsers[smallestDelta].curEvent.delta;
					}
				}
				// filling values
				event=trackParsers[smallestDelta].curEvent;
			 	playTime+=(event.delta?(event.delta*tickResolution)/1000:0);
				if(event.type===MIDIEvents.EVENT_META) {
					// tempo change events
					if(event.subtype===MIDIEvents.EVENT_META_SET_TEMPO) {
						tickResolution=this.header.getTickResolution(event.tempo);
					}
				}
				// push midi events
				if(((!type)||event.type===type)
					&&((!subtype)||(event.subtype&&event.subtype===type))) {
					event.playTime=playTime;
					event.track=smallestDelta;
					filteredEvents.push(event);
				}
				// getting next event
				trackParsers[smallestDelta].curEvent=trackParsers[smallestDelta].parser.next();
			}
		} while(-1!==smallestDelta);
	}
	return filteredEvents;
};

MIDIFile.prototype.getMidiEvents = function() {
	return this.getEvents(MIDIEvents.EVENT_MIDI);
};

MIDIFile.prototype.getLyrics = function() {
	var events=this.getEvents(MIDIEvents.EVENT_META),
		texts=[], lyrics=[], event, karaoke=-1, format=this.header.getFormat();
	for(var i=0, j=events.length; i<j; i++) {
		event=events[i];
		// Lyrics
		if(event.subtype===MIDIEvents.EVENT_META_LYRICS) {
			lyrics.push(event);
		// Texts
		} else if(event.subtype===MIDIEvents.EVENT_META_TEXT) {
			// Ignore special texts
			if('@'===String.fromCharCode(event.data[0])) {
				if('T'===String.fromCharCode(event.data[1])) {
					//console.log('Title : '+event.text.substring(2));
				} else if('I'===String.fromCharCode(event.data[1])) {
					//console.log('Info : '+event.text.substring(2));
				} else if('L'===String.fromCharCode(event.data[1])) {
					//console.log('Lang : '+event.text.substring(2));
				}
			// karaoke text follows, remove all previous text
			} else if(0===event.data.map(function(c) {
					return String.fromCharCode(c);
				}).join('').indexOf('words')) {
				texts.length=0;
				//console.log('Word marker found');
			// Karaoke texts
			} else {
				// If playtime is greater than 0
				if(0!==event.playTime) {
					texts.push(event);
				}
			}
		}
	}
	// Choosing the right lyrics
	if(lyrics.length>2) {
		texts=lyrics;
	} else if(!texts.length) {
		texts=[];
	}
	// Convert texts and detect encoding
	try {
		texts.forEach(function(event) {
			event.text=UTF8.getStringFromBytes(event.data,0,event.length,true);
		});
	} catch (e) {
		texts.forEach(function(event) {
			event.text=event.data.map(function(c) {
				return String.fromCharCode(c);
			}).join('');
		});
	}
	return texts;
};

// Basic events reading
MIDIFile.prototype.getTrackEvents = function(index) {
	var event, events=[], parser;
	if(index>this.tracks.length||index<0) {
		throw Error('Invalid track index ('+index+')');
	}
	parser=new MIDIEvents.createParser(
		this.tracks[index].getTrackContent(),0,false);
	event=parser.next();
	do {
		events.push(event);
		event=parser.next();
	} while(event);
	return events;
};

// Basic events writting
MIDIFile.prototype.setTrackEvents = function(index, events) {
	var bufferLength, destination;
	if(index>this.tracks.length||index<0) {
		throw Error('Invalid track index ('+index+')');
	}
	if((!events)||(!events.length)) {
		throw Error('A track must contain at least one event, none given.');
	}
	bufferLength=MIDIEvents.getRequiredBufferLength(events);
	destination = new Uint8Array(bufferLength);
	MIDIEvents.writeToTrack(events, destination);
	this.tracks[index].setTrackContent(destination);
};

// Remove a track
MIDIFile.prototype.deleteTrack = function(index) {
	if(index>this.tracks.length||index<0) {
		throw Error('Invalid track index ('+index+')');
	}
	this.tracks.splice(index,1);
	this.header.setTracksCount(this.tracks.length);
};

// Add a track
MIDIFile.prototype.addTrack = function(index) {
	if(index>this.tracks.length||index<0) {
		throw Error('Invalid track index ('+index+')');
	}
	var track = new MIDIFileTrack();
	if(index==this.tracks.length) {
		this.tracks.push(track);
	} else {
		this.tracks.splice(index,0,track);
	}
	this.header.setTracksCount(this.tracks.length);
};

// Retrieve the content in a buffer
MIDIFile.prototype.getContent = function() {
	var bufferLength, destination, origin, lastOffset=0;
	// Calculating the buffer content
	// - initialize with the header length
	bufferLength=MIDIFileHeader.HEADER_LENGTH;
	// - add tracks length
	for(var i=0, j=this.tracks.length; i<j; i++) {
		bufferLength+=this.tracks[i].getTrackLength()+8;
	}
	// Creating the destination buffer
	destination=new Uint8Array(bufferLength);
	// Adding header
	origin=new Uint8Array(this.header.datas.buffer,
		this.header.datas.byteOffset,
		MIDIFileHeader.HEADER_LENGTH);
	for(var i=0, j=MIDIFileHeader.HEADER_LENGTH; i<j; i++) {
		destination[i]=origin[i];
	}
	// Adding tracks
	for(var k=0, l=this.tracks.length; k<l; k++) {
		origin=new Uint8Array(this.tracks[k].datas.buffer,
			this.tracks[k].datas.byteOffset,
			this.tracks[k].datas.byteLength);
		for(var m=0, n=this.tracks[k].datas.byteLength; m<n; m++) {
			destination[i++]=origin[m];
		}
	}
	return destination.buffer;
};

// Exports Track/Header constructors
MIDIFile.Header = MIDIFileHeader;
MIDIFile.Track = MIDIFileTrack;

module.exports = MIDIFile;


},{"./MIDIFileHeader":7,"./MIDIFileTrack":8,"midievents":2,"utf-8":5}],7:[function(require,module,exports){
// MIDIFileHeader : Read and edit a MIDI header chunk in a given ArrayBuffer
function MIDIFileHeader(buffer, strictMode) {
	// No buffer creating him
	if(!buffer) {
		var a=new Uint8Array(MIDIFileHeader.HEADER_LENGTH);
		// Adding the header id (MThd)
		a[0]=0x4D; a[1]=0x54; a[2]=0x68; a[3]=0x64;
		// Adding the header chunk size
		a[4]=0x00; a[5]=0x00; a[6]=0x00; a[7]=0x06;
		// Adding the file format (1 here cause it's the most commonly used)
		a[8]=0x00; a[9]=0x01;
		// Adding the track count (1 cause it's a new file)
		a[10]=0x00; a[11]=0x01;
		// Adding the time division (192 ticks per beat)
		a[12]=0x00; a[13]=0xC0;
		// saving the buffer
		this.datas=new DataView(a.buffer,0,MIDIFileHeader.HEADER_LENGTH);
	// Parsing the given buffer
	} else {
		if(!(buffer instanceof ArrayBuffer))
				throw Error('Invalid buffer received.');
		this.datas=new DataView(buffer,0,MIDIFileHeader.HEADER_LENGTH);
		// Reading MIDI header chunk
		if(!('M'===String.fromCharCode(this.datas.getUint8(0))
			&&'T'===String.fromCharCode(this.datas.getUint8(1))
			&&'h'===String.fromCharCode(this.datas.getUint8(2))
			&&'d'===String.fromCharCode(this.datas.getUint8(3)))) {
			throw new Error('Invalid MIDIFileHeader : MThd prefix not found');
		}
		// Reading chunk length
		if(6!==this.datas.getUint32(4)) {
			throw new Error('Invalid MIDIFileHeader : Chunk length must be 6');
		}
	}
}

// Static constants
MIDIFileHeader.HEADER_LENGTH=14;
MIDIFileHeader.FRAMES_PER_SECONDS=1;
MIDIFileHeader.TICKS_PER_BEAT=2;

// MIDI file format
MIDIFileHeader.prototype.getFormat=function() {
	var format=this.datas.getUint16(8);
	if(0!==format&&1!==format&&2!==format) {
		throw new Error('Invalid MIDI file : MIDI format ('+format+'),'
			+' format can be 0, 1 or 2 only.');
	}
	return format;
};

MIDIFileHeader.prototype.setFormat=function(format) {
	var format=this.datas.getUint16(8);
	if(0!==format&&1!==format&&2!==format) {
		throw new Error('Invalid MIDI format given ('+format+'),'
			+' format can be 0, 1 or 2 only.');
	}
	return format;
};

// Number of tracks
MIDIFileHeader.prototype.getTracksCount=function() {
	return this.datas.getUint16(10);
};

MIDIFileHeader.prototype.setTracksCount=function(n) {
	return this.datas.setUint16(10,n);
};

// Tick compute
MIDIFileHeader.prototype.getTickResolution=function(tempo) {
	// Frames per seconds
	if(this.datas.getUint16(12)&0x8000) {
		return 1000000/(this.getSMPTEFrames() * this.getTicksPerFrame());
	// Ticks per beat
	} else {
		// Default MIDI tempo is 120bpm, 500ms per beat
		tempo=tempo||500000;
		return tempo/this.getTicksPerBeat();
	}
};

// Time division type
MIDIFileHeader.prototype.getTimeDivision=function() {
	if(this.datas.getUint16(12)&0x8000) {
		return MIDIFileHeader.FRAMES_PER_SECONDS;
	}
	return MIDIFileHeader.TICKS_PER_BEAT;
};

// Ticks per beat
MIDIFileHeader.prototype.getTicksPerBeat=function() {
	var divisionWord=this.datas.getUint16(12);
	if(divisionWord&0x8000) {
		throw new Error('Time division is not expressed as ticks per beat.');
	}
	return divisionWord;
};

MIDIFileHeader.prototype.setTicksPerBeat=function(ticksPerBeat) {
	this.datas.setUint16(12,ticksPerBeat&0x7FFF);
};

// Frames per seconds
MIDIFileHeader.prototype.getSMPTEFrames=function() {
	var divisionWord=this.datas.getUint16(12), smpteFrames;
	if(!(divisionWord&0x8000)) {
		throw new Error('Time division is not expressed as frames per seconds.');
	}
	smpteFrames=divisionWord&0x7F00;
	if(smpteFrames!=24&&smpteFrames!=25&&smpteFrames!=29&&smpteFrames!=30) {
		throw new Error('Invalid SMPTE frames value ('+smpteFrames+').');
	}
	return (29===smpteFrames?29.97:smpteFrames);
};

MIDIFileHeader.prototype.getTicksPerFrame=function() {
	var divisionWord=this.datas.getUint16(12);
	if(!(divisionWord&0x8000)) {
		throw new Error('Time division is not expressed as frames per seconds.');
	}
	return divisionWord&0x00FF;
};

MIDIFileHeader.prototype.setSMTPEDivision=function(smpteFrames,ticksPerFrame) {
	if(smpteFrames!=24&&smpteFrames!=25&&smpteFrames!=29.97
			&&smpteFrames!=29&&smpteFrames!=30) {
		throw new Error('Invalid SMPTE frames value given ('+smpteFrames+').');
	}
	if(smpteFrames==29.97)
		smpteFrames=29;
	if(ticksPerFrame<0||ticksPerFrame>0xFF) {
		throw new Error('Invalid ticks per frame value given ('+smpteFrames+').');
	}
	this.datas.setUint8(12,0x80|smpteFrames);
	this.datas.setUint8(13,ticksPerFrame);
};

module.exports = MIDIFileHeader;


},{}],8:[function(require,module,exports){
// MIDIFileTrack : Read and edit a MIDI track chunk in a given ArrayBuffer
function MIDIFileTrack(buffer, start, strictMode) {
	// no buffer, creating him
	if(!buffer) {
		var a=new Uint8Array(12);
		// Adding the empty track header (MTrk)
		a[0]=0x4D; a[1]=0x54; a[2]=0x72; a[3]=0x6B;
		// Adding the empty track size (4)
		a[4]=0x00; a[5]=0x00; a[6]=0x00; a[7]=0x04;
		// Adding the track end event
		a[8]=0x00; a[9]=0xFF; a[10]=0x2F; a[11]=0x00;
		// Saving the buffer
		this.datas=new DataView(a.buffer, 0,
			MIDIFileTrack.HDR_LENGTH+4);
	// parsing the given buffer
	} else {
		if(!(buffer instanceof ArrayBuffer))
				throw Error('Invalid buffer received.');
		// Buffer length must size at least like an  empty track (8+3bytes)
		if(buffer.byteLength-start<12) {
			throw Error('Invalid MIDIFileTrack (0x'+start.toString(16)+') :'
				+' Buffer length must size at least 12bytes');
		}
		// Creating a temporary view to read the track header
		this.datas=new DataView(buffer, start, MIDIFileTrack.HDR_LENGTH);
		// Reading MIDI track header chunk
		if(!('M'===String.fromCharCode(this.datas.getUint8(0))
			&&'T'===String.fromCharCode(this.datas.getUint8(1))
			&&'r'===String.fromCharCode(this.datas.getUint8(2))
			&&'k'===String.fromCharCode(this.datas.getUint8(3)))) {
			throw Error('Invalid MIDIFileTrack (0x'+start.toString(16)+') :'
				+' MTrk prefix not found');
			}
		// Reading the track length
		var trackLength=this.getTrackLength();
		if(buffer.byteLength-start<trackLength) {
			throw Error('Invalid MIDIFileTrack (0x'+start.toString(16)+') :'
				+' The track size exceed the buffer length.');
		}
		// Creating the final DataView
		this.datas=new DataView(buffer, start,
			MIDIFileTrack.HDR_LENGTH+trackLength);
		// Trying to find the end of track event
		if(!(0xFF===this.datas.getUint8(MIDIFileTrack.HDR_LENGTH + trackLength-3)
			&&0x2F===this.datas.getUint8(MIDIFileTrack.HDR_LENGTH + trackLength-2)
			&&0x00===this.datas.getUint8(MIDIFileTrack.HDR_LENGTH + trackLength-1)
			)) {
				throw Error('Invalid MIDIFileTrack (0x'+start.toString(16)+') :'
					+' No track end event found at the expected index'
					+' ('+(MIDIFileTrack.HDR_LENGTH+trackLength-1).toString(16)+').');
		}
	}
}

// Static constants
MIDIFileTrack.HDR_LENGTH=8;

// Track length
MIDIFileTrack.prototype.getTrackLength=function() {
	return this.datas.getUint32(4);
};

MIDIFileTrack.prototype.setTrackLength=function(trackLength) {
	return this.datas.setUint32(trackLength);
};

// Read track contents
MIDIFileTrack.prototype.getTrackContent=function() {
	return new DataView(this.datas.buffer,
		this.datas.byteOffset+MIDIFileTrack.HDR_LENGTH,
		this.datas.byteLength-MIDIFileTrack.HDR_LENGTH);
};

// Set track content
MIDIFileTrack.prototype.setTrackContent=function(dataView) {
	// Calculating the track length
	var trackLength=dataView.byteLength-dataView.byteOffset;
	// Track length must size at least like an  empty track (4bytes)
	if(trackLength<4) {
		throw Error('Invalid track length, must size at least 4bytes');
	}
	this.datas=new DataView(
		new Uint8Array(MIDIFileTrack.HDR_LENGTH+trackLength).buffer);
	// Adding the track header (MTrk)
	this.datas.setUint8(0,0x4D); // M
	this.datas.setUint8(1,0x54); // T
	this.datas.setUint8(2,0x72); // r
	this.datas.setUint8(3,0x6B); // k
	// Adding the track size
	this.datas.setUint32(4,trackLength);
	// Copying the content
	var origin=new Uint8Array(dataView.buffer, dataView.byteOffset,
		dataView.byteLength),
		destination=new Uint8Array(this.datas.buffer,
			MIDIFileTrack.HDR_LENGTH,
			trackLength);
	for(var i=0, j=origin.length; i<j; i++) {
		destination[i]=origin[i];
	}
};

module.exports = MIDIFileTrack;


},{}],9:[function(require,module,exports){
arguments[4][2][0].apply(exports,arguments)
},{"dup":2}],10:[function(require,module,exports){
var MIDIEvents = require('midievents');

// Constants
var PLAY_BUFFER_DELAY=300,
	PAGE_HIDDEN_BUFFER_RATIO=20;

// MIDIPlayer constructor
function MIDIPlayer(options) {
	options = options || {};
	this.output = options.output || null; // midi output
	this.volume = options.volume || 100; // volume in percents
	this.startTime = -1; // ms since page load
	this.pauseTime = -1; // ms elapsed before player paused
	this.events = [];
	this.notesOn = new Array(32); // notesOn[channel][note]
	for(var i=31; i>=0; i--) {
		this.notesOn[i] = [];
	}
	this.midiFile = null;
	window.addEventListener('unload', this.stop.bind(this));
}

// Parsing all tracks and add their events in a single event queue
MIDIPlayer.prototype.load = function(midiFile) {
	this.stop();
	this.position = 0
	this.midiFile = midiFile;
	this.events = this.midiFile.getMidiEvents();
};

MIDIPlayer.prototype.play = function(endCallback) {
	this.endCallback = endCallback;
	if(0 === this.position) {
		this.startTime = performance.now();
		this.timeout = setTimeout(this.processPlay.bind(this),0);
		return 1;
	}
	return 0;
};

MIDIPlayer.prototype.processPlay = function() {
	var elapsedTime = performance.now() - this.startTime;
	var event;
	var param2;
	var bufferDelay= PLAY_BUFFER_DELAY * (
	  document.hidden || document.mozHidden || document.webkitHidden ||
  	  document.msHidden || document.oHidden ?
	  PAGE_HIDDEN_BUFFER_RATIO :
	  1
	);
	event = this.events[this.position];
	while(this.events[this.position] && event.playTime-elapsedTime<bufferDelay) {
		param2 = 0;
		if(event.subtype == MIDIEvents.EVENT_MIDI_NOTE_ON) {
			param2 = Math.floor(event.param1*((this.volume||1)/100));
			this.notesOn[event.channel].push(event.param1);
		} else if(event.subtype == MIDIEvents.EVENT_MIDI_NOTE_OFF) {
			var index=this.notesOn[event.channel].indexOf(event.param1)
			if(-1 !== index) {
				this.notesOn[event.channel].splice(index,1);
			}
		}
		this.output.send(
		  -1 != MIDIEvents.MIDI_1PARAM_EVENTS.indexOf(event.subtype) ?
		  [(event.subtype<<4) + event.channel, event.param1] :
		  [(event.subtype<<4) + event.channel, event.param1, (param2 || event.param2 || 0x00)],
			Math.floor(event.playTime+this.startTime)
		);
		this.lastPlayTime = event.playTime+this.startTime;
		this.position++
		event = this.events[this.position];
	}
	if(this.position<this.events.length-1) {
		this.timeout = setTimeout(this.processPlay.bind(this), PLAY_BUFFER_DELAY-250);
	} else {
		setTimeout(this.endCallback,PLAY_BUFFER_DELAY+100);
		this.position = 0;
	}
};

MIDIPlayer.prototype.pause = function() {
	if(this.timeout) {
		clearTimeout(this.timeout);
		this.timeout = null;
		this.pauseTime = performance.now();
		for(var i = this.notesOn.length-1; i>=0; i--) {
			for(var j = this.notesOn[i].length-1; j>=0; j--) {
				this.output.send([(MIDIEvents.EVENT_MIDI_NOTE_OFF<<4)+i, this.notesOn[i][j],
					0x00],this.lastPlayTime+100);
			}
		}
		return true;
	}
	return false;
};

MIDIPlayer.prototype.resume = function(endCallback) {
	this.endCallback = endCallback;
	if(this.events && this.events[this.position] && !this.timeout) {
		this.startTime += performance.now() - this.pauseTime
		this.timeout = setTimeout(this.processPlay.bind(this),0);
		return this.events[this.position].playTime;
	}
	return 0;
};

MIDIPlayer.prototype.stop = function() {
	if(this.pause()) {
		this.position = 0;
		for(var i=31; i>=0; i--) {
			this.notesOn[i] = [];
		}
		return true;
	}
	return false;
};

module.exports = MIDIPlayer;


},{"midievents":9}],11:[function(require,module,exports){
// MIDIKaraoke : MIDI Karaoke right in your browser!
var Commandor = require('commandor')
  , MIDIPlayer = require('midiplayer')
  , MIDIFile = require('midifile')
  , MIDILyricsDisplayer = require('./MIDILyricsDisplayer')
;

function Application() {

  // GA Tracking
  this._trackEvent = function() {
    if('undefined' !== typeof window.ga) {
      ga.apply(null, ['send'].concat([].slice.call(arguments, 0)));
    }
  };

	// Registering ui elements
	this.filePicker=document.querySelector('input[type="file"]');
  this.filePicker.addEventListener('change', this.readFile.bind(this));
	this.pickFileButton=document.getElementsByClassName('pick')[0];
	this.playButton=document.getElementsByClassName('play')[0];
	this.pauseButton=document.getElementsByClassName('pause')[0];
	this.stopButton=document.getElementsByClassName('stop')[0];
	this.previousButton=document.getElementsByClassName('previous')[0];
	this.nextButton=document.getElementsByClassName('next')[0];
	this.volumeUpButton=document.getElementsByClassName('volumeup')[0];
	this.volumeDownButton=document.getElementsByClassName('volumedown')[0];
	this.volumeMuteButton=document.getElementsByClassName('volumemute')[0];
	this.textSmallerButton=document.getElementsByClassName('textsmaller')[0];
	this.textBiggerButton=document.getElementsByClassName('textbigger')[0];
	this.outputSelectButton=document.getElementsByClassName('outputselect')[0];
	// lyrics display
	this.lyricsDisplayer=new MIDILyricsDisplayer(
		document.querySelector('div.lyrics'));
	// Commands management
	this.cmdMgr=new Commandor(document.documentElement);
	this.cmdMgr.suscribe('pickFile',this.pickFile.bind(this));
	this.cmdMgr.suscribe('setOutput',this.setOutput.bind(this));
	this.cmdMgr.suscribe('play',this.play.bind(this));
	this.cmdMgr.suscribe('pause',this.pause.bind(this));
	this.cmdMgr.suscribe('stop',this.stop.bind(this));
	this.cmdMgr.suscribe('backward',this.backward.bind(this));
	this.cmdMgr.suscribe('forward',this.forward.bind(this));
	this.cmdMgr.suscribe('volume',this.volume.bind(this));
	this.cmdMgr.suscribe('setTextSize',
		this.lyricsDisplayer.setTextSize.bind(this.lyricsDisplayer));
	this.cmdMgr.suscribe('closePopin',this.closePopin.bind(this));
	this.cmdMgr.suscribe('selectOutput',this.selectOutput.bind(this));
	this.cmdMgr.suscribe('setOutput',this.setOutput.bind(this));
	// Try to enable the MIDI Access
	if(!navigator.requestMIDIAccess) {
		this.noMidiAccess();
	} else {
		navigator.requestMIDIAccess().then(this.midiAccess.bind(this),
			this.noMidiAccess.bind(this));
	}
};

Application.prototype.midiAccess = function(midiAccess) {
	this.outputs = midiAccess.outputs;
	this.outputKeys = [];
  var iter = this.outputs.values();
  var output;
  while(output = iter.next()) {
    if(output.done) {
      break;
    }
    this.outputKeys.push(output.value.id);
  }

	// check output
	if(!this.outputs.size) {
	  this.noMidiOutputs();
	  return;
	}
  this._trackEvent('setup', 'midiaccess', this.outputKeys[0], this.outputs.size);
	document.getElementById('about').classList.add('selected');
	// creating player
	this.midiPlayer=new MIDIPlayer({
	  'output': this.outputs.get(this.outputKeys[0])
	});
	// Download the intro
	this.downloadFile("./sounds/Hello.mid");
	// enable the file picker
	this.pickFileButton.removeAttribute('disabled');
	this.volumeUpButton.removeAttribute('disabled');
	this.volumeDownButton.removeAttribute('disabled');
	this.volumeMuteButton.removeAttribute('disabled');
	this.textSmallerButton.removeAttribute('disabled');
	this.textBiggerButton.removeAttribute('disabled');
	this.outputSelectButton.removeAttribute('disabled');
};

Application.prototype.noMidiAccess = function() {
  this._trackEvent('setup', 'nomidiaccess', window.navigator.userAgent);
	document.getElementById('jazz').classList.add('selected');
};

Application.prototype.noMidiOutputs = function() {
  this._trackEvent('setup', 'nomidioutput', window.navigator.userAgent);
	document.getElementById('nooutput').classList.add('selected');
};

Application.prototype.pickFile = function() {
  this._trackEvent('use', 'pickfile');
	this.filePicker.click();
};

Application.prototype.setOutput = function(event, params) {
  this.midiPlayer.output = this.outputs[params.value];
};

Application.prototype.readFile = function(event) {
	var reader = new FileReader();
	this._trackEvent('use', 'filepicked', event.target.files[0].name, event.target.files[0].length);
	reader.readAsArrayBuffer(event.target.files[0]);
	reader.onloadend=(function(event) {
    this._trackEvent('use', 'fileloaded');
		this.loadFile(event.target.result);
	}).bind(this);
};

Application.prototype.loadFile = function(buffer) {
	// creating the MidiFile instance
	midiFile=new MIDIFile(buffer);
	this.midiPlayer.load(midiFile);
	this.playButton.removeAttribute('disabled');
	this.lyricsDisplayer.loadLyrics(midiFile.getLyrics());
};

Application.prototype.play = function(buffer) {
	var playTime;
	if((playTime=this.midiPlayer.play(this.endCallback.bind(this)))
			||(playTime=this.midiPlayer.resume(this.endCallback.bind(this)))) {
		this.playButton.setAttribute('disabled','disabled');
		this.pauseButton.removeAttribute('disabled');
		this.stopButton.removeAttribute('disabled');
		this.lyricsDisplayer.start(playTime);
	}

};

Application.prototype.pause = function(buffer) {
	if(this.midiPlayer.pause()) {
    this._trackEvent('use', 'pause');
		this.playButton.removeAttribute('disabled');
		this.pauseButton.setAttribute('disabled','disabled');
		this.stopButton.setAttribute('disabled','disabled');
		this.lyricsDisplayer.stop();
	}
};

Application.prototype.stop = function(buffer) {
	if(this.midiPlayer.stop()) {
    this._trackEvent('use', 'stop');
		this.playButton.removeAttribute('disabled');
		this.pauseButton.setAttribute('disabled','disabled');
		this.stopButton.setAttribute('disabled','disabled');
		this.lyricsDisplayer.stop();
	}
};

Application.prototype.endCallback = function() {
  this._trackEvent('use', 'playend');
	this.playButton.removeAttribute('disabled');
	this.pauseButton.setAttribute('disabled','disabled');
	this.stopButton.setAttribute('disabled','disabled');
};

Application.prototype.backward = function(buffer) {
};

Application.prototype.forward = function(buffer) {
};

Application.prototype.volume = function(event, params) {
  this._trackEvent('use', 'volume', params.type, this.midiPlayer.volume);
	if('less'===params.type) {
		this.midiPlayer.volume=(this.midiPlayer.volume<10?
			0:this.midiPlayer.volume-10);
	} else if('more'===params.type) {
		this.midiPlayer.volume=(this.midiPlayer.volume>90?
			100:this.midiPlayer.volume+10);
	} else if('mute'===params.type) {
		this.midiPlayer.volume=0;
	}
};

Application.prototype.downloadFile = function(url) {
	var oReq = new XMLHttpRequest();
	oReq.open("GET", url, true);
	oReq.responseType = "arraybuffer";
	oReq.onload = (function (oEvent) {
		this.loadFile(oReq.response);
		this.play();
	}).bind(this);
	oReq.send(null);
};

Application.prototype.selectOutput = function(event) {
  this._trackEvent('use', 'selectoutput');
  var iter = this.outputs.values();
  var output;
  var outputChooser = document.getElementById("outputChooser");
  while(outputChooser.firstChild) {
    outputChooser.removeChild(outputChooser.firstChild);
  }
  while(output = iter.next()) {
    if(output.done) {
      break;
    }
    var opt = document.createElement("option");
    opt.value = output.value.id;
    opt.text = output.value.name;
    outputChooser.add(opt);
  }
	document.getElementById('output').classList.add('selected');
};

Application.prototype.setOutput = function(event) {
  this._trackEvent('use', 'setoutput', event.target[0].value);
	document.getElementById('output').classList.remove('selected');
	if(!event.target[0].value)
		return;
	this.midiPlayer.stop();
	this.midiPlayer.output = this.outputs.get(event.target[0].value);
	this.midiPlayer.play();
};

Application.prototype.selectFile = function() {
	if(!event.target.value)
		return;
	downloadFile("/sounds/"+event.target.value);
	//document.querySelector('select').addEventListener('change', selectFile);
};

Application.prototype.closePopin = function(event, params) {
  this._trackEvent('use', 'closepopin', params.id);
	document.getElementById(params.id).classList.remove('selected');
};

new Application();

module.exports = Application;


},{"./MIDILyricsDisplayer":12,"commandor":1,"midifile":6,"midiplayer":10}],12:[function(require,module,exports){
// MIDILyricsDisplayer : Shows MIDI lyrics in a given element

var PLAY_BUFFER_DELAY=600;

function MIDILyricsDisplayer(rootElement,options) {
	this.rootElement=rootElement;
	options=options||{};
	this.timeouts=[];
}

// Parsing all tracks and add their events in a single event queue
MIDILyricsDisplayer.prototype.loadLyrics = function(lyrics) {
 	// Empty old lyrics
 	while(this.rootElement.firstChild)
 		this.rootElement.removeChild(this.rootElement.firstChild)
 	// stopping previous timeout
	if(this.timeout)
		clearTimeout(this.timeout);
	// Appending the first paragraph
	var lineP=document.createElement('p'), lyricSpan;
	this.rootElement.appendChild(lineP);
	// Setting lyrics
	for(i=0, j=lyrics.length; i<j; i++) {
		if('\n'===lyrics[i].text[0]||'\\'===lyrics[i].text[0]
			||'\r'===lyrics[i].text[0]||'/'===lyrics[i].text[0]) {
			if(lineP.childNodes.length) {
				lineP=document.createElement('p');
				this.rootElement.appendChild(lineP);
			}
			lyrics[i].text=lyrics[i].text.substring(1);
		}
		if(lyrics[i].text) {
			var lyricSpan=document.createElement('span');
 			lyricSpan.appendChild(document.createTextNode(lyrics[i].text));
 			lyricSpan.setAttribute('data-playtime', lyrics[i].playTime);
 			lineP.appendChild(lyricSpan);
		}
 	}
};

MIDILyricsDisplayer.prototype.start = function(playTime) {
	// cleanup
	if(this.curP) {
		this.curP.removeAttribute('class');
		if(this.curP.previousSibling) {
			this.curP.previousSibling.removeAttribute('class');
			if(this.curP.previousSibling.previousSibling) {
				this.curP.previousSibling.previousSibling.removeAttribute('class');
			}
		}
		if(this.curP.nextSibling)
			this.curP.nextSibling.removeAttribute('class');
		for(var i=this.curP.childNodes.length-1; i>=0; i--) {
			this.curP.childNodes[i].removeAttribute('class')
		}
	}
	// saving start time
	this.startTime=Date.now()-playTime;
	// looping throught lyrics tu find the currently played
	for(var i=0, j=this.rootElement.childNodes.length; i<j; i++) {
		// if lyric paragraph is playing
		if(i===j-1||parseInt(this.rootElement.childNodes[i+1]
			.firstChild.getAttribute('data-playtime'),10)>playTime) {
			// Setting previous paragraph class
			if(i>0) {
				this.rootElement.childNodes[i-1].setAttribute('class','popout');
			}
			// Setting next paragraph class
			if(i<j-1) {
				this.rootElement.childNodes[i+1].setAttribute('class','closetopop');
			}
			// Setting current paragraph classes
			this.curP=this.rootElement.childNodes[i];
			this.curP.setAttribute('class','pop');
			for(i=0, j=this.curP.childNodes.length; i<j; i++) {
				if(i===j-1||parseInt(this.curP.childNodes[i+1].getAttribute('data-playtime'),10)>playTime) {
					this.lyricSpan=this.curP.childNodes[i];
					break;
				} else {
					this.curP.childNodes[i].setAttribute('class','sing');
				}
			}
			break;
		}
	}
	if(this.lyricSpan) {
			// programming the next sing
			this.timeout=setTimeout(this.next.bind(this),Math.floor(
				parseInt(this.lyricSpan.getAttribute('data-playtime'),10)
				-playTime
			));
	}
};

MIDILyricsDisplayer.prototype.next = function() {
	// Just jumped to a new paragraph
	if(this.lyricSpan.parentNode.firstChild===this.lyricSpan) {
		if(this.lyricSpan.parentNode.previousSibling) {
			// hide the n-2 p
			if(this.lyricSpan.parentNode.previousSibling.previousSibling) {
				this.lyricSpan.parentNode.previousSibling.previousSibling.removeAttribute('class');
			}
			// mark the n-1 p
			this.lyricSpan.parentNode.previousSibling.setAttribute('class','popout');
			// remove sing classes
			for(var i=this.lyricSpan.parentNode.previousSibling.childNodes.length-1; i>=0; i--) {
				this.lyricSpan.parentNode.previousSibling.childNodes[i].removeAttribute('class')
			}
		}
		// highlight the current p
		this.lyricSpan.parentNode.setAttribute('class','pop');
		// prepare the next p
		if(this.lyricSpan.parentNode.nextSibling) {
			this.lyricSpan.parentNode.nextSibling.setAttribute('class','closetopop');
		}
	}
	this.lyricSpan.setAttribute('class','sing');
	// finding the next span
	if(this.lyricSpan.nextSibling) {
		this.lyricSpan=this.lyricSpan.nextSibling;
	} else if(this.curP.nextSibling&&this.curP.nextSibling.firstChild) {
		this.lyricSpan=this.curP.nextSibling.firstChild;
		this.lyricSpan=this.curP.nextSibling.firstChild;
	} else {
		this.lyricSpan=null;
	}
	if(this.lyricSpan) {
		this.curP=this.lyricSpan.parentNode;
		// programming the next sing
		this.timeout=setTimeout(this.next.bind(this),Math.floor(
			parseInt(this.lyricSpan.getAttribute('data-playtime'),10)
			-(Date.now()-this.startTime)
		));
	}
};

MIDILyricsDisplayer.prototype.stop = function() {
 	// stopping previous timeout
	if(this.timeout)
		clearTimeout(this.timeout);
};

MIDILyricsDisplayer.prototype.setTextSize = function(event, params) {
	var size=parseInt(this.rootElement.style.fontSize,10)||50;
	if('smaller'===params.type&&size>10) {
		this.rootElement.style.fontSize=(size-5)+'px';
	} else if('bigger'===params.type) {
		this.rootElement.style.fontSize=(size+5)+'px';
	}
};

module.exports = MIDILyricsDisplayer;


},{}]},{},[11]);
