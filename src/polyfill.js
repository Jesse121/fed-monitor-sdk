function polyfill() {
	// IE 兼容CustomEvent
	if (!!window.ActiveXObject || "ActiveXObject" in window) {
		window.CustomEvent = function (type, config) {
			config = config || { bubbles: false, cancelable: false, detail: undefined };
			var e = document.createEvent("CustomEvent");
			e.initCustomEvent(type, config.bubbles, config.cancelable, config.detail);
			return e;
		};
		window.CustomEvent.prototype = window.Event.prototype;
	}
	if (typeof Object.assign != "function") {
		Object.assign = function (target) {
			"use strict";
			if (target == null) {
				throw new TypeError("Cannot convert undefined or null to object");
			}
			target = Object(target);
			for (var index = 1; index < arguments.length; index++) {
				var source = arguments[index];
				if (source != null) {
					for (var key in source) {
						if (Object.prototype.hasOwnProperty.call(source, key)) {
							target[key] = source[key];
						}
					}
				}
			}
			return target;
		};
	}
	// 兼容includes
	if (!String.prototype.includes) {
		String.prototype.includes = function (search, start) {
			"use strict";
			if (typeof start !== "number") {
				start = 0;
			}

			if (start + search.length > this.length) {
				return false;
			} else {
				return this.indexOf(search, start) !== -1;
			}
		};
	}
}

export default polyfill;
