
const CANVAS_FONT_SIZE = 10;
const CANVAS_CAPTION_PADDING = 10;
const CANVAS_LINE_DASH = [4, 4];


export const CANVAS = {
	caption      : {
		padding   : CANVAS_CAPTION_PADDING,
		height    : (CANVAS_CAPTION_PADDING * 2) + CANVAS_FONT_SIZE,
		lineColor : '#005cc5',
		fontFace  : `normal 600 ${CANVAS_FONT_SIZE}px "San Francisco Text SemiBold"`,
		fontSize  : CANVAS_FONT_SIZE,
		textColor : '#005cc5',
		baseline  : 'top',
		align     : 'left'
	},

	guides       : {
		color     : '#00ff0f',
		lineDash  : CANVAS_LINE_DASH,
		lineWidth : 2,
	},

	marchingAnts : {
		lineDash  : CANVAS_LINE_DASH,
		lineWidth : 2,
		stroke    : 'rgba(0, 92, 197, 0.5)',
		interval  : 50,
		increment : 0.5,
		modOffset : CANVAS_LINE_DASH.reduce((acc, val)=> (acc * val)) << 0
	},

	slices       : {
		borderColor : '#00ff0f',
		fillColor   : 'rgba(9, 248, 16, 0.6)',
		lineWidth   : 1
	}
};


export const PAN_ZOOM = {
	panFactor : 0.0025,
	panMultPt : {
		x : 0.5,
		y : 0.5
	},
	zoomNotches : [
		0.03,
		0.06,
		0.13,
		0.25,
		0.50,
		1.00,
		1.75,
		3.00
	]
};


export const SECTIONS = {
	INSPECT   : 'inspect',
	PARTS     : 'parts',
	PRESENTER : 'present'
};


export const STATUS_INTERVAL = 1250;
