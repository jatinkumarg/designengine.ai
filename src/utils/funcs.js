
import cookie from 'react-cookies';
import axios from "axios";


export function buildInspectorPath(uploadID, pageID, artboardID, artboardTitle, prefix=null, suffix='') {
	prefix = (prefix || ('/' + window.location.pathname.split('/').pop()));
	return (prefix + '/' + uploadID + '/' + pageID + '/' + artboardID + '/' + convertURLSlug(artboardTitle) + suffix);
}

export function buildInspectorURL(uploadID, pageID, artboardID, artboardTitle, suffix='') {
	return (window.location.origin + buildInspectorPath(uploadID, pageID, artboardID, artboardTitle, suffix));
}

export function buildProjectPath(uploadID, title, suffix='') {
	return ('/proj/' + uploadID + '/' + convertURLSlug(title) + suffix);
}

export function buildProjectURL(uploadID, title, suffix='') {
	return (window.location.origin + buildProjectPath(uploadID, title, suffix));
}

export function capitalizeText(text, toLower=false) {
	return ((toLower) ? text.toLowerCase().replace(/(\b\w)/gi, function(c) { return (c.toUpperCase()); }) : text.replace(/(\b\w)/gi, function(c) { return (c.toUpperCase()); }));
}

export function convertURLSlug(text) {
	return (text.replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-').replace(/^-+/, '').replace(/-+$/, '').toLowerCase());
}

export function copyTextToClipboard(text) {
// 	navigator.clipboard.writeText(text);

	const textField = document.createElement('textarea');
	textField.innerText = text;
	document.body.appendChild(textField);
	textField.select();
	document.execCommand('copy');
	textField.remove();
}

export function className(obj) {
	return (obj.constructor.name);
}

export function hasBit(val, bit) {
	return ((val & bit) === bit);
}

export function hideText(text, char='*') {
	return (Array(text.length + 1).join(char));
}

export function idsFromPath() {
	const { pathname } = window.location;
	const inspectorPath = /\/artboard|page|inspect\/(\d+)\/(\d+)\/(\d+)\/.*$/;
	const explorePath = /\/explore\/(\d+)\/.*$/;
	const projPath = /\/proj\/(\d+)\/.*$/;

	const navIDs = {
		uploadID   : (inspectorPath.test(pathname)) ? pathname.match(inspectorPath)[1] : (explorePath.test(pathname)) ? pathname.match(explorePath)[1] : (projPath.test(pathname)) ? pathname.match(projPath)[1] : 0,
		pageID     : (inspectorPath.test(pathname)) ? pathname.match(inspectorPath)[2] : 0,
		artboardID : (inspectorPath.test(pathname)) ? pathname.match(inspectorPath)[3] : 0,
		sliceID    : 0
	};

	return (navIDs);
}

export function isExplorePage() {
	const { pathname } = window.location;
	return (pathname.includes('/explore'));
}

export function isHomePage() {
	const { pathname } = window.location;
	return (pathname === '' || pathname === '/');
}

export function isInspectorPage() {
	const { pathname } = window.location;
	return (pathname.includes('/artboard') || pathname.includes('/page') || pathname.includes('/inspect/'));
}

export function isProfilePage() {
	return (window.location.pathname.includes('/profile'));
}

export function isProjectPage() {
	return (window.location.pathname.includes('/proj'));
}

export function isUploadPage(base=false) {
	const { pathname } = window.location;
	return ((base) ? pathname === '/new' : pathname.includes('/new'));
}

export function isUserLoggedIn() {
	return (cookie.load('user_id') !== '0');
}

export function isValidEmail(email) {
	const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	return (re.test(String(email).toLowerCase()));
}

export function limitString(str='', len) {
	return ((str.length > len) ? str.substr(0, len - 1) + '…' : str);
}

export function numberedName(name, list) {
	if (list[name].length) {
		const cnt = ++list[name];
		return (name + '_' + cnt);

	} else {
		list[name] = 1;
		return (name);
	}
}

export function randomElement(array) {
	return ((array.length > 0) ? array[randomInt(0, array.length)] : null);
}

export function randomFloat(lower, upper) {
	return ((Math.random() * (upper - lower)) + lower);
}

export function randomInt(lower, upper) {
	return (Math.floor(randomFloat(lower, upper)));
}

export function scrollOrigin(element) {
	if (element) {
		element.scrollTo(0, 0);
	}
}

export function sendToSlack(message, callback=null) {
	let formData = new FormData();
	formData.append('action', 'SLACK');
	formData.append('message', message);
	axios.post('https://api.designengine.ai/system.php', formData)
		.then((response) => {
			console.log("SLACK", response.data);
			if (callback) {
				callback();
			}
		}).catch((error) => {
	});
}
