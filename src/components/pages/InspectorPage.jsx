
import React, { Component } from 'react';
import './InspectorPage.css';

import axios from 'axios';
import moment from 'moment-timezone';
import ReactNotifications from 'react-browser-notifications';
import CopyToClipboard from 'react-copy-to-clipboard';
import FontAwesome from 'react-fontawesome';
import Moment from 'react-moment';
import { connect } from 'react-redux';
import { Column, Row } from 'simple-flexbox';

import ContentModal, { MODAL_SIZE_PERCENT } from '../elements/ContentModal';
import { POPUP_TYPE_ERROR, POPUP_TYPE_INFO } from '../elements/Popup';
import InviteTeamForm from '../forms/InviteTeamForm';

import { MOMENT_TIMESTAMP } from '../../consts/formats';
import { MINUS_KEY, PLUS_KEY } from '../../consts/key-codes';
import { DE_LOGO_SMALL } from '../../consts/uris';
import { setRedirectURL } from '../../redux/actions';
import { buildInspectorURL, capitalizeText, frameToRect, makeDownload, rectContainsRect, sendToSlack } from '../../utils/funcs.js';
import { fontSpecs, toCSS, toReactCSS, toSpecs, toSwift } from '../../utils/langs.js';
import { trackEvent } from '../../utils/tracking';
import enabledZoomInButton from '../../assets/images/buttons/btn-zoom-in_enabled.svg';
import disabledZoomInButton from '../../assets/images/buttons/btn-zoom-in_disabled.svg';
import enabledZoomOutButton from '../../assets/images/buttons/btn-zoom-out_enabled.svg';
import disabledZoomOutButton from '../../assets/images/buttons/btn-zoom-out_disabled.svg';
import enabledZooResetButton from '../../assets/images/buttons/btn-zoom-reset_enabled.svg';
import disabledZoomResetButton from '../../assets/images/buttons/btn-zoom-reset_disabled.svg';
import {convertURISlug} from "../../utils/funcs";


const ANTS_INTERVAL = 50;
const STATUS_INTERVAL = 1250;
const ZOOM_FACTOR = 1.0875;
const ZOOM_NOTCHES = [
	0.03,
	0.06,
	0.13,
	0.25,
	0.50,
	1.00,
	1.75,
	3.00
];

const artboardsWrapper = React.createRef();
const canvasWrapper = React.createRef();
const canvas = React.createRef();


const buildSlicePreviews = (upload, slice)=> {
	let slices = [];
	const pages = [...upload.pages];
	pages.forEach((page)=> {
		page.artboards.filter((artboard)=> (artboard.id === slice.artboardID)).forEach((item) => {
			item.slices.filter((itm)=> (itm.id !== slice.id)).forEach((itm)=> {
				if (rectContainsRect(frameToRect(slice.meta.frame), frameToRect(itm.meta.frame))) {
					slices.push(itm);
				}
			});
		});
	});

	return (slices);
};

const normalizeTouchPosition = (event, parent)=> {
	const position = {
		clientX : event.clientX,
		clientY : event.clientY
	};

	while (parent.offsetParent) {
		position.clientX -= parent.offsetLeft - parent.scrollLeft;
		position.clientY -= parent.offsetTop - parent.scrollTop;
		parent = parent.offsetParent;
	}

	console.log('InspectorPage.normalizeTouchPosition()', position);

	return (position);
};

const transformPoint = (baseCoords, panCoords, scale)=> {
// 		console.log('InspectorPage.transformPoint()', x, y);
	return ({
		x : 0.5 + (scale * (baseCoords.x - panCoords.x)),
		y : 0.5 + (scale * (baseCoords.y - panCoords.y))
	});
};

const mapStateToProps = (state, ownProps)=> {
	return ({
		deeplink    : state.deeplink,
		profile     : state.userProfile,
		redirectURL : state.redirectURL
	});
};

const mapDispatchToProps = (dispatch)=> {
	return ({
		setRedirectURL : (url)=> dispatch(setRedirectURL(url))
	});
};


const InviteTeamModal = (props)=> {
// 	console.log('InspectorPage.InviteTeamModal()', props);

	const { profile, upload, processing, sentInvites } = props;

	return (<ContentModal
		tracking="invite-team/inspector"
		size={MODAL_SIZE_PERCENT}
		closeable={true}
		title="Invite Team"
		onComplete={props.onComplete}>
			<div className="inspector-page-invite-modal-wrapper">
				<div className="inspector-page-invite-modal-message">
					{(processing.state < 3) && (<div><FontAwesome className="inspector-page-processing-spinner" name="spinner" size="2x" pulse fixedWidth /></div>)}
					{processing.message}
				</div>
				<div>{upload.title} ({upload.filename.split('/').pop()})</div>
				{(upload.description.length > 0) && (<div>{upload.description}</div>)}
				<div className="page-link" onClick={()=> window.open(buildInspectorURL(upload))}>{buildInspectorURL(upload)}</div>
				{/*<a href={buildInspectorURL(upload)} target="_blank" rel="noopener noreferrer">{buildInspectorURL(upload)}</a>< br/>*/}
				<CopyToClipboard onCopy={()=> props.onCopyURL()} text={buildInspectorURL(upload)}>
					<button className="inspector-page-modal-button">Copy URL</button>
				</CopyToClipboard>
			</div>

			{(!sentInvites) && (<InviteTeamForm
				profile={profile}
				upload={upload}
				onSubmitted={props.onInviteTeamFormSubmitted}
			/>)}
		</ContentModal>
	);
};

const PartItem = (props)=> {
// 	console.log('InspectorPage.SlicePreviewItem()', props);

	const { id, filename, title, size } = props;

	return (<div data-slice-id={id} className="part-item"><Row vertical="center">
		<img src={`${filename}@3x.png`} className="part-item-image" width={size.width * 0.25} height={size.height * 0.25} alt={title} />
		<div className="part-item-title">{title}</div>
		<button className="tiny-button part-item-button" onClick={()=> props.onClick()}><FontAwesome name="download" /></button>
	</Row></div>);
};

const PartsList = (props)=> {
// 	console.log('InspectorPage.PartsList()', props);

	const { contents } = props;
	return (<div className="parts-list-wrapper">
		{contents.filter((slice)=> (slice.type === 'group')).map((slice, i)=> {
			return (
				<PartItem
					key={i}
					id={slice.id}
					filename={slice.filename}
					title={slice.title}
					size={slice.meta.frame.size}
					onClick={()=> props.onPartItem(slice.id)}
				/>
			);
		})}
	</div>);
};

const SliceRolloverItem = (props)=> {
// 	console.log('InspectorPage.SliceRolloverItem()', props);

	const className = (props.type === 'slice') ? 'slice-rollover-item slice-rollover-item-slice' : (props.type === 'hotspot') ? 'slice-rollover-item slice-rollover-item-hotspot' : (props.type === 'textfield') ? 'slice-rollover-item slice-rollover-item-textfield' : 'slice-rollover-item slice-rollover-item-group';
	const style = {
		top     : `${props.top}px`,
		left    : `${props.left}px`,
		width   : `${props.width}px`,
		height  : `${props.height}px`,
		zoom    : props.scale,
		display : (props.visible) ? 'block' : 'none'
	};

	return (
		<div data-slice-id={props.id} className={`${className}${(props.filled) ? '-filled' : ''}`} style={style} onMouseEnter={()=> props.onRollOver(props.offset)} onMouseLeave={()=> props.onRollOut()} onClick={()=> props.onClick(props.offset)} />
	);
};

function SpecsList(props) {
// 		console.log('InspectorPage.SpecsList()', props);

	const { upload, slice } = props;

	const font = (slice && slice.meta.font) ? fontSpecs(slice.meta.font) : null;
	const sliceStyles = (slice && slice.meta.styles && slice.meta.styles.length > 0) ? slice.meta.styles.pop() : null;
	const stroke = (sliceStyles && sliceStyles.border.length > 0) ? sliceStyles.border.pop() : null;
	const shadow = (sliceStyles && sliceStyles.shadow.length > 0) ? sliceStyles.shadow.pop() : null;
	const innerShadow = (sliceStyles && sliceStyles.innerShadow.length > 0) ? sliceStyles.innerShadow.pop() : null;

	const styles = (sliceStyles) ? {
		stroke : (stroke) ? {
			color     : stroke.color.toUpperCase(),
			position  : stroke.position,
			thickness : `${stroke.thickness}px`
		} : null,
		shadow : (shadow) ? {
			color  : shadow.color.toUpperCase(),
			offset : {
				x : shadow.offset.x,
				y : shadow.offset.y
			},
			spread : `${shadow.spread}px`,
			blur   : `${shadow.blur}px`
		} : null,
		innerShadow : (innerShadow) ? {
			color  : innerShadow.color.toUpperCase(),
			offset : {
				x : innerShadow.offset.x,
				y : innerShadow.offset.y
			},
			spread : `${innerShadow.spread}px`,
			blur   : `${innerShadow.blur}px`
		} : null
	} : null;

	return (
		<div className="inspector-page-specs-list-wrapper">
			<Row><Column flexGrow={1}>Name</Column><Column flexGrow={1} horizontal="end" className="inspector-page-specs-list-val">{(slice) ? slice.title : ''}</Column></Row>
			<Row><Column flexGrow={1}>Type</Column><Column flexGrow={1} horizontal="end" className="inspector-page-specs-list-val">{(slice) ? capitalizeText(slice.type, true) : ''}</Column></Row>
			<Row><Column flexGrow={1}>Export Size</Column><Column flexGrow={1} horizontal="end" className="inspector-page-specs-list-val">W: {(slice) ? slice.meta.frame.size.width : 0}px H: {(slice) ? slice.meta.frame.size.height : 0}px</Column></Row>
			<Row><Column flexGrow={1}>Position</Column><Column flexGrow={1} horizontal="end" className="inspector-page-specs-list-val">X: {(slice) ? slice.meta.frame.origin.x : 0}px Y: {(slice) ? slice.meta.frame.origin.y : 0}px</Column></Row>
			<Row><Column flexGrow={1}>Rotation</Column><Column flexGrow={1} horizontal="end" className="inspector-page-specs-list-val">{(slice) ? slice.meta.rotation : 0}&deg;</Column></Row>
			<Row><Column flexGrow={1}>Opacity</Column><Column flexGrow={1} horizontal="end" className="inspector-page-specs-list-val">{(slice) ? (slice.meta.opacity * 100) : 100}%</Column></Row>
			<Row><Column flexGrow={1}>Fills</Column><Column flexGrow={1} horizontal="end" className="inspector-page-specs-list-val">{(slice) ? (slice.type === 'textfield' && slice.meta.font.color) ? slice.meta.font.color.toUpperCase() : slice.meta.fillColor.toUpperCase() : ''}</Column></Row>
			<Row><Column flexGrow={1}>Borders</Column><Column flexGrow={1} horizontal="end" className="inspector-page-specs-list-val">{''}</Column></Row>
			{(slice && slice.type === 'textfield') && (<>
				<Row><Column flexGrow={1}>Font</Column><Column flexGrow={1} horizontal="end" className="inspector-page-specs-list-val">{(font) ? `${font.family} ${font.name}` : ''}</Column></Row>
				<Row><Column flexGrow={1}>Font Weight</Column><Column flexGrow={1} horizontal="end" className="inspector-page-specs-list-val">{(font) ? font.weight : '400'}</Column></Row>
				<Row><Column flexGrow={1}>Font Size</Column><Column flexGrow={1} horizontal="end" className="inspector-page-specs-list-val">{`${font.size}px`}</Column></Row>
				<Row><Column flexGrow={1}>Font Color</Column><Column flexGrow={1} horizontal="end" className="inspector-page-specs-list-val">{(font.color) ? font.color.toUpperCase() : ''}</Column></Row>
				{/*<Row><Column flexGrow={1}>Text Alignment:</Column><Column flexGrow={1} horizontal="end" className="inspector-page-specs-list-val">{(slice.meta.font.alignment) ? capitalizeText(slice.meta.font.alignment) : 'Left'}</Column></Row>*/}
				<Row><Column flexGrow={1}>Line Spacing</Column><Column flexGrow={1} horizontal="end" className="inspector-page-specs-list-val">{(font.lineHeight) ? `${font.lineHeight}px` : ''}</Column></Row>
				<Row><Column flexGrow={1}>Char Spacing</Column><Column flexGrow={1} horizontal="end" className="inspector-page-specs-list-val">{(font.kerning) ? `${font.kerning.toFixed(2)}px` : '0'}</Column></Row>
			</>)}
			{(styles) && (<>
				{/*<Row><Column flexGrow={1}>Stroke:</Column><Column flexGrow={1} horizontal="end" className="inspector-page-specs-list-val">{(styles.stroke) ? `${capitalizeText(styles.stroke.position, true)} S: ${styles.stroke.thickness} ${styles.stroke.color}` : ''}</Column></Row>*/}
				{/*<Row><Column flexGrow={1}>Shadow:</Column><Column flexGrow={1} horizontal="end" className="inspector-page-specs-list-val">{(styles.shadow) ? `X: ${styles.shadow.offset.x} Y: ${styles.shadow.offset.y} B: ${styles.shadow.blur} S: ${styles.shadow.spread}` : ''}</Column></Row>*/}
				{/*<Row><Column flexGrow={1}>Inner Shadow:</Column><Column flexGrow={1} horizontal="end" className="inspector-page-specs-list-val">{(styles.innerShadow) ? `X: ${styles.innerShadow.offset.x} Y: ${styles.innerShadow.offset.y} B: ${styles.innerShadow.blur} S: ${styles.shadow.spread}` : ''}</Column></Row>*/}
				{/*<Row><Column flexGrow={1}>Blur:</Column><Column flexGrow={1} horizontal="end" className="inspector-page-specs-list-val">{(styles.innerShadow) ? `X: ${styles.innerShadow.offset.x} Y: ${styles.innerShadow.offset.y} B: ${styles.innerShadow.blur} S: ${styles.shadow.spread}` : ''}</Column></Row>*/}
			</>)}
			{(slice && slice.meta.padding) && (<Row>
				<Column flexGrow={1}>Padding</Column><Column flexGrow={1} horizontal="end" className="inspector-page-specs-list-val">{slice.meta.padding.top}px {slice.meta.padding.left}px {slice.meta.padding.bottom}px {slice.meta.padding.right}px</Column>
			</Row>)}
			{/*<Row><Column flexGrow={1}>Blend:</Column><Column flexGrow={1} horizontal="end" className="inspector-page-specs-list-val">{(slice) ? capitalizeText(slice.meta.blendMode, true) : ''}</Column></Row>*/}
			<Row><Column flexGrow={1}>Date</Column><Column flexGrow={1} horizontal="end" className="inspector-page-specs-list-val">{(slice) ? (<Moment format={MOMENT_TIMESTAMP}>{`${slice.added.replace(' ', 'T')}Z`}</Moment>) : ''}</Column></Row>
			<Row><Column flexGrow={1}>Author</Column><Column flexGrow={1} horizontal="end" className="inspector-page-specs-list-val">{(upload) ? upload.creator.username : ''}</Column></Row>
		</div>
	);
}


class InspectorPage extends Component {
	constructor(props) {
		super(props);

		this.state = {
			section     : window.location.pathname.substr(1).split('/').shift(),
			upload      : null,
			slice       : null,
			hoverSlice  : null,
			offset      : null,
			hoverOffset : null,
			selectedTab : 0,
			tabs        : [],
			scale       : 0.5,
			panCoords   : {
				x    : 0.5,
				y    : 0.5,
				incX : 0,
				incY : 0
			},
			viewport    : {
				oldX   : 0,
				oldY   : 0,
				x      : 0,
				y      : 0,
				width  : 0,
				height : 0,
				scale  : 0
			},
			uploading   : false,
			shownInvite : true,
			sentInvites : false,
			restricted  : false,
			scrolling   : false,
			code        : {
				html   : '',
				syntax : ''
			},
			processing  : {
				state   : 3,
				message : ''
			},
			percent     : 0,
			tooltip     : ''
		};

		this.processingInterval = null;
		this.initialScaled = false;
		this.jumpedOffset = false;
		this.lastScroll = 0;
		this.scrollInterval = null;
		this.antsOffset = 0;
		this.antsInterval = null;

		this.notification = null;
	}

	componentDidMount() {
		console.log('InspectorPage.componentDidMount()', this.props, this.state);

// 		let utc = moment('2019-01-20T12:00:00Z');
// 		utc.tz(moment.tz(moment.tz.guess()).zoneName()).format('ha z');
// 		console.log(':::::::::::', moment.tz.guess());

		if (this.props.redirectURL) {
			this.props.setRedirectURL(null);
		}

		const { deeplink } = this.props;
		if (deeplink && (deeplink.uploadID !== 0)) {
			this.onRefreshUpload();
		}

		document.addEventListener('keydown', this.handleKeyDown.bind(this));
		document.addEventListener('mousedown', this.handleMouseDown.bind(this));
		document.addEventListener('wheel', this.handleWheelStart.bind(this));
	}

	shouldComponentUpdate(nextProps, nextState, nextContext) {
// 		console.log('InspectorPage.shouldComponentUpdate()', this.props, nextProps, this.state, nextState, nextContext);

		const { upload, restricted } = nextState;
		if (!restricted && upload && upload.private === '1' && (!nextProps.profile || (nextProps.profile && upload.creator.user_id !== nextProps.profile.id))) {
			this.props.setRedirectURL(window.location.pathname);
			this.setState({
				restricted : true,
				tooltip    : ''
			});
		}

		return (true);
	}

	componentDidUpdate(prevProps, prevState, snapshot) {
// 		console.log('InspectorPage.componentDidUpdate()', prevProps, this.props, this.state);

		const { deeplink, processing } = this.props;
		const { upload, panCoords, viewport, scale } = this.state;

		if (deeplink && deeplink !== prevProps.deeplink && deeplink.uploadID !== 0) {
			this.onRefreshUpload();
		}

		if (upload && processing && this.processingInterval === null) {
			this.setState({
				processing : {
					state   : 0,
					message : 'Please wait…'
				}
			});

			this.processingInterval = setInterval(this.onProcessingUpdate, STATUS_INTERVAL);
		}

		if (!processing && this.processingInterval) {
			clearInterval(this.processingInterval);
			this.processingInterval = null;
			this.onRefreshUpload();
		}

		if (artboardsWrapper.current && (viewport.width !== artboardsWrapper.current.clientWidth || viewport.height !== artboardsWrapper.current.clientHeight)) {
			const p1 = transformPoint({ x : 0.5, y : 0.5 }, panCoords, scale);
			this.setState({
				viewport : {
					oldX   : viewport.oldX,
					oldY   : viewport.oldY,
					x      : -Math.round((p1.x * artboardsWrapper.current.clientWidth) + ((artboardsWrapper.current.clientWidth * -0.5) * scale)),
					y      : -Math.round((p1.y * artboardsWrapper.current.clientHeight) + ((artboardsWrapper.current.clientHeight * -0.5) * scale)),
					width  : artboardsWrapper.current.clientWidth,
					height : artboardsWrapper.current.clientHeight,
					scale  : viewport.scale
				}
			});
		}
	}

	componentWillUnmount() {
		console.log('InspectorPage.componentWillUnmount()', this.state);

		clearInterval(this.processingInterval);
		clearInterval(this.antsInterval);
		clearInterval(this.scrollInterval);

		this.processingInterval = null;
		this.antsInterval = null;
		this.scrollInterval = null;

		document.removeEventListener('keydown', this.handleKeyDown.bind(this));
		document.removeEventListener('mousedown', this.handleMouseDown.bind(this));
		document.removeEventListener('wheel', this.handleWheelStart.bind(this));
	}

	handleArtboardRollOut = (event)=> {
// 		console.log('InspectorPage.handleArtboardRollOut()', event.target);
	};

	handleArtboardRollOver = (event)=> {
// 		console.log('InspectorPage.handleArtboardRollOver()', event.target);
		const artboardID = event.target.getAttribute('data-artboard-id');

		if (!this.antsInterval) {
			this.antsInterval = setInterval(this.onUpdateAnts, ANTS_INTERVAL);
		}

		let formData = new FormData();
		formData.append('action', 'SLICES');
		formData.append('artboard_id', artboardID);
		axios.post('https://api.designengine.ai/system.php', formData)
			.then((response) => {
// 				console.log('SLICES', response.data);

				let { upload } = this.state;
				let pages = [...upload.pages];
				pages.forEach((page)=> {
					page.artboards.filter((artboard) => (artboard.id === artboardID && artboard.slices.length === 0)).forEach((artboard) => {
						artboard.slices = response.data.slices.map((item) => ({
							id         : item.id,
							artboardID : item.artboard_id,
							title      : item.title,
							type       : item.type,
							filename   : item.filename,
							meta       : JSON.parse(item.meta),
							added      : item.added,
							filled     : false
						}));
					});
				});

				upload.pages = pages;
				this.setState({ upload });
			}).catch((error) => {
		});
	};

	handleCloseNotification = (event)=> {
// 		console.log('InspectorPage.handleCloseNotification()', event, this.notification);
		window.focus();
		this.notification.close(event.target.tag);
	};

	handleCopyCode = ()=> {
		console.log('InspectorPage.handleCopyCode()');

		trackEvent('button', 'copy-code');
		this.props.onPopup({
			type    : POPUP_TYPE_INFO,
			content : 'Copied to Clipboard!'
		});
	};

	handleCopyURL = ()=> {
		console.log('InspectorPage.handleCopyURL()');

		trackEvent('button', 'copy-url');
		this.props.onPopup({
			type    : POPUP_TYPE_INFO,
			content : 'Copied to Clipboard!'
		});
	};

	handleDownload = ()=> {
// 		console.log('InspectorPage.handleDownload()');

		trackEvent('button', 'download-all');
		const { upload, slice } = this.state;
		const sliceIDs = buildSlicePreviews(upload, slice).map((slice)=> (slice.id)).join(',');
		makeDownload(`http://cdn.designengine.ai/slices.php?title=${slice.title}&slice_ids=${sliceIDs}`);
	};

	handleInviteTeamFormSubmitted = (result)=> {
		console.log('InspectorPage.handleInviteTeamFormSubmitted()', result);
		this.setState({ sentInvites : true });
	};

	handleInviteModalClose = ()=> {
		const { processing } = this.state;
		this.setState({
			processing : {
				state : processing.state,
				message : ''
			},
			shownInvite : true
		});
	};

	handleKeyDown = (event)=> {
// 		console.log('InspectorPage.handleKeyDown()', event);

		trackEvent('keypress', (event.keyCode === PLUS_KEY) ? 'plus' : 'minus');
		if (event.keyCode === PLUS_KEY) {
			this.handleZoom(1);

		} else if (event.keyCode === MINUS_KEY) {
			this.handleZoom(-1);
		}
	};

	handleMouseDown = (event)=> {
		console.log('InspectorPage.handleMouseDown()', event);

		if (!this.state.scrolling) {
			const scrolling = true;
			const { clientX, clientY } = normalizeTouchPosition(event, artboardsWrapper);

			let { viewport } = this.state;
			viewport.oldX = clientX;
			viewport.oldY = clientY;

			document.addEventListener('mousemove', this.handleMouseMove.bind(this));
			document.addEventListener('mouseup', this.handleMouseUp.bind(this));

			this.setState({ viewport, scrolling });
		}
	};

	handleMouseMove = (event)=> {
// 		console.log('InspectorPage.handleMouseMove()', event);

		const { scrolling, scale } = this.state;
		if (scrolling) {
			let { panCoords, viewport } = this.state;
			const { clientX, clientY } = normalizeTouchPosition(event, artboardsWrapper);
			const { width, height } = artboardsWrapper.current.getBoundingClientRect();

			if (0 <= clientX && clientX <= width && 0 <= clientY && clientY <= height) {
				const dx = clientX - viewport.oldX;
				const dy = clientY - viewport.oldY;

				viewport.oldX = clientX;
				viewport.oldY = clientY;

				const sdx = dx / (width * (scale + viewport.scale));
				const sdy = dy / (height * (scale + viewport.scale));

				panCoords.incX -= sdx;
				panCoords.incY -= sdy;

				const p1 = transformPoint({ x : 0.5, y : 0.5 }, panCoords, scale);
				viewport.x = -Math.round((p1.x * viewport.width) + ((viewport.width * -0.5) * scale));
				viewport.y = -Math.round((p1.y * viewport.height) + ((viewport.height * -0.5) * scale));

				console.log('InspectorPage.handleMouseMove()', viewport);

				artboardsWrapper.current.scrollTop = viewport.y;
				artboardsWrapper.current.scrollLeft = viewport.x;

				panCoords.x += panCoords.incX;
				panCoords.y += panCoords.incY;

				this.setState({ panCoords, viewport });
			}
		}
	};

	handleMouseUp = (event)=> {
// 		console.log('InspectorPage.handleMouseUp()', event);

		const { scrolling, scale } = this.state;
		if (scrolling) {
			document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
			document.removeEventListener('mouseup', this.handleMouseUp.bind(this));


			let { panCoords, viewport } = this.state;
			const { clientX, clientY } = normalizeTouchPosition(event, artboardsWrapper);
			const { width, height } = artboardsWrapper.current.getBoundingClientRect();

			if (0 <= clientX && clientX <= width && 0 <= clientY && clientY <= height) {
				const dx = clientX - viewport.oldX;
				const dy = clientY - viewport.oldY;
				viewport.oldX = clientX;
				viewport.oldY = clientY;
				const sdx = dx / (width * (scale + viewport.scale));
				const sdy = dy / (height * (scale + viewport.scale));
				panCoords.incX -= sdx;
				panCoords.incY -= sdy;

				panCoords.x += panCoords.incX;
				panCoords.y += panCoords.incY;

				const p1 = transformPoint({ x : 0.5, y : 0.5 }, panCoords, scale);
				viewport.x = -Math.round((p1.x * viewport.width) + ((viewport.width * -0.5) * scale));
				viewport.y = -Math.round((p1.y * viewport.height) + ((viewport.height * -0.5) * scale));


				artboardsWrapper.current.scrollTop = viewport.y;
				artboardsWrapper.current.scrollLeft = viewport.x;

				this.setState({ panCoords, viewport, scrolling : false });
			}
		}
	};

	handlePartItem = (sliceID)=> {
// 		console.log('InspectorPage.handlePartItem()', sliceID);
		makeDownload(`http://cdn.designengine.ai/slice.php?slice_id=${sliceID}`);
	};

	handleSliceClick = (ind, slice, offset)=> {
// 		console.log('InspectorPage.handleSliceClick()', ind, slice, offset);

		trackEvent('slice', `${slice.id}_${convertURISlug(slice.title)}`);

		const { upload, section } = this.state;
		let { tabs } = this.state;
		let artboard = null;

		const pages = [...upload.pages];
		pages.forEach((page)=> {
			page.artboards.filter((artboard)=> (artboard.id === slice.artboardID)).forEach((item) => {
				artboard = item;
			});
		});

		const css = toCSS(slice);
		const reactCSS = toReactCSS(slice);
		const swift = toSwift(slice, artboard);

		if (section === 'inspect') {
			tabs[0].contents = css.html;
			tabs[0].syntax = css.syntax;
			tabs[1].contents = reactCSS.html;
			tabs[1].syntax = reactCSS.syntax;
			tabs[2].contents = swift.html;
			tabs[2].syntax = swift.syntax;

		} else if (section === 'parts') {
			tabs[0].contents = buildSlicePreviews(upload, slice);
		}

		this.setState({
			tabs       : tabs,
			hoverSlice : null,
			slice      : slice,
			offset     : offset
		});
	};

	handleSliceRollOut = (ind, slice)=> {
// 		console.log('InspectorPage.handleSliceRollOut()', ind, slice);

		const { upload, section } = this.state;
		let { tabs } = this.state;
		let artboard = null;

		const pages = [...upload.pages];
		pages.forEach((page)=> {
			page.artboards.filter((artboard)=> (artboard.id === slice.artboardID)).forEach((artboard) => {
				artboard.slices.filter((item)=> (item.filled)).forEach((item)=> {
					item.filled = false;
				});
			});
		});

		upload.pages = pages;
		this.setState({ upload });

		if (this.state.slice) {
			const pages = [...upload.pages];
			pages.forEach((page)=> {
				page.artboards.filter((artboard)=> (artboard.id === this.state.slice.artboardID)).forEach((item) => {
					artboard = item;
					item.slices.filter((itm)=> (itm.id !== this.state.slice.id)).forEach((itm)=> {
						itm.filled = rectContainsRect(frameToRect(this.state.slice.meta.frame), frameToRect(itm.meta.frame));
					});
				});
			});

			const css = toCSS(this.state.slice);
			const reactCSS = toReactCSS(this.state.slice);
			const swift = toSwift(this.state.slice, artboard);

			if (section === 'inspect') {
				tabs[0].contents = css.html;
				tabs[0].syntax = css.syntax;
				tabs[1].contents = reactCSS.html;
				tabs[1].syntax = reactCSS.syntax;
				tabs[2].contents = swift.html;
				tabs[2].syntax = swift.syntax;

			} else if (section === 'parts') {
				tabs[0].contents = buildSlicePreviews(upload, this.state.slice);
			}
		}

		this.setState({
			tabs       : tabs,
			hoverSlice : null
		});
	};

	handleSliceRollOver = (ind, slice, offset)=> {
// 		console.log('InspectorPage.handleSliceRollOver()', ind, slice, offset);


		const { upload, section } = this.state;
		let { tabs } = this.state;
		let artboard = null;

		const pages = [...upload.pages];
		pages.forEach((page)=> {
			page.artboards.filter((artboard)=> (artboard.id === slice.artboardID)).forEach((item) => {
				artboard = item;
				item.slices.filter((itm)=> (itm.id !== slice.id)).forEach((itm)=> {
					itm.filled = rectContainsRect(frameToRect(slice.meta.frame), frameToRect(itm.meta.frame));
				});
			});
		});

		upload.pages = pages;
		this.setState({ upload });

		const css = toCSS(slice);
		const reactCSS = toReactCSS(slice);
		const swift = toSwift(slice, artboard);

		if (section === 'inspect') {
			tabs[0].contents = css.html;
			tabs[0].syntax = css.syntax;
			tabs[1].contents = reactCSS.html;
			tabs[1].syntax = reactCSS.syntax;
			tabs[2].contents = swift.html;
			tabs[2].syntax = swift.syntax;

		} else if (section === 'parts') {
			tabs[0].contents = buildSlicePreviews(upload, slice);
		}

		this.setState({
			tabs        : tabs,
			hoverSlice  : slice,
			hoverOffset : offset
		});
	};

	handleTab = (ind)=> {
// 		console.log('InspectorPage.handleTab()', ind);
		const { tabs } = this.state;
		trackEvent('tab', convertURISlug(tabs[ind].title));
		this.setState({ selectedTab : ind });
	};

	handleWheelStart = (event)=> {
		console.log('InspectorPage.handleWheelStart()', event.type, event.deltaX, event.deltaY, event.target);
		//console.log('wheel', artboardsWrapper.current.clientWidth, artboardsWrapper.current.clientHeight, artboardsWrapper.current.scrollTop, artboardsWrapper.current.scrollLeft);

// 		event.preventDefault();

		this.lastScroll = (new Date()).getUTCSeconds();
		clearTimeout(this.scrollInterval);
		this.scrollInterval = setTimeout(this.handleWheelStop, 50);


		if (!this.state.scrolling) {
			this.setState({ scrolling : true });
		}

		if (event.ctrlKey) {
			event.preventDefault();
			this.setState({
				scale   : Math.min(Math.max(this.state.scale - (event.deltaY * 0.0025), 0.03), 3).toFixed(2),
				tooltip : Math.floor(Math.min(Math.max(this.state.scale - (event.deltaY * 0.0025), 0.03), 3).toFixed(2) * 100) + '%'
			});

		} else {
			if (artboardsWrapper.current) {
				artboardsWrapper.current.scrollTop += event.deltaY * 0.01;
				artboardsWrapper.current.scrollLeft += event.deltaX * 0.01;

				const { viewport } = this.state;
				this.setState({
					viewport : {
						oldX   : viewport.oldX,
						oldY   : viewport.oldY,
						x      : artboardsWrapper.current.scrollLeft,
						y      : artboardsWrapper.current.scrollTop,
						width  : viewport.width,
						height : viewport.height,
						scale  : viewport.scale
					}
				});
			}
		}
	};

	handleWheelStop = ()=> {
		console.log('InspectorPage.handleWheelStop()');

		clearTimeout(this.scrollInterval);
		this.setState({ scrolling : false });
	};

	handleZoom = (direction)=> {
// 		console.log('InspectorPage.handleZoom()', direction);

// 		const { panCoords, scale } = this.state;
//
// 		if (direction === 0) {
// 			this.handlePanAndZoom(panCoords.x + 0.01, panCoords.y + 0.01, ZOOM_NOTCHES[4]);
//
// 		} else {
// 			let ind = -1;
// 			ZOOM_NOTCHES.forEach((amt, i)=> {
// 				if (amt === scale) {
// 					ind = i + direction;
// 				}
// 			});
//
// 			ZOOM_NOTCHES.forEach((amt, i)=> {
// 				if (ind === -1) {
// 					if (direction > 0) {
// 						if (amt > scale) {
// 							ind = i;
// 						}
//
// 					} else {
// 						if (amt > scale) {
// 							ind = i - 1;
// 						}
// 					}
// 				}
// 			});
//
// 			this.handlePanAndZoom(panCoords.x + 0.01, panCoords.y + 0.01, ZOOM_NOTCHES[Math.min(Math.max(0, ind), ZOOM_NOTCHES.length - 1)]);
// 		}
	};

	onDrop = (files)=> {
		console.log('InspectorPage.onDrop()', files);
		const { id, email } = this.props.profile;

		if (files.length > 0 && files[0].name.split('.').pop() === 'zip') {
			const file = files.pop();
			if (file.size < 100 * (1024 * 1024)) {
				this.setState({ uploading : true });
				const config = {
					headers            : { 'content-type' : 'multipart/form-data' },
					onDownloadProgress : (progressEvent)=> {},
					onUploadProgress   : (progressEvent)=> {
// 							console.log('InspectorPage.onUploadProgress()', progressEvent);

						const { loaded, total } = progressEvent;
						const percent = Math.round((loaded * 100) / total);
						this.setState({
							percent : percent,
							tooltip : `${percent}%`
						});

						if (progressEvent.loaded >= progressEvent.total) {
							this.setState({
								uploading : false,
								tooltip   : ''
							});

							let formData = new FormData();
							formData.append('action', 'FILES');
							formData.append('upload_id', `${this.props.deeplink.uploadID}`);
							axios.post('https://api.designengine.ai/system.php', formData)
								.then((response)=> {
									console.log('FILES', response.data);

									const files = response.data.files.map((file) => ({
										id       : file.id,
										title    : file.title,
										filename : file.filename,
										contents : file.contents,
										added    : file.added
									}));

									this.setState({ files });
								}).catch((error) => {
							});
						}
					}
				};

				let formData = new FormData();
				formData.append('file', file);
				axios.post(`http://cdn.designengine.ai/files/upload.php?user_id=${id}&upload_id=${this.props.deeplink.uploadID}`, formData, config)
					.then((response) => {
						console.log("UPLOAD", response.data);
					}).catch((error) => {
					sendToSlack(`*${email}* failed uploading file _${file.name}_`);
				});

			} else {
				this.props.onPopup({
					type     : POPUP_TYPE_ERROR,
					content  : 'File size must be under 100MB.',
					duration : 500
				});
			}

		} else {
			this.props.onPopup({
				type     : POPUP_TYPE_ERROR,
				content  : 'Only zip archives are support at this time.',
				duration : 1500
			});
		}
	};

	onProcessingUpdate = ()=> {
		const { upload } = this.state;

		let formData = new FormData();
		formData.append('action', 'UPLOAD_STATUS');
		formData.append('upload_id', upload.id);
		axios.post('https://api.designengine.ai/system.php', formData)
			.then((response) => {
				console.log('UPLOAD_STATUS', response.data);
				const { status } = response.data;
				const processingState = parseInt(status.state, 10);

				if (processingState === 0) {
					const { queue } = status;
					this.setState({
						processing : {
							state   : processingState,
							message : `You are in queue position ${queue.position}/${queue.total}, please wait your turn…`
						}
					});

				} else if (processingState === 1) {
					this.setState({
						processing : {
							state   : processingState,
							message : 'Your file is being prepared…'
						}
					});

				} else if (processingState === 2) {
					const { totals } = status;
					const total = Object.values(totals).reduce((acc, val)=> (parseInt(acc, 10) + parseInt(val, 10)));

					const mins = moment.duration(moment(Date.now()).diff(`${status.started.replace(' ', 'T')}Z`)).asMinutes();
					const secs = Math.floor((mins - Math.floor(mins)) * 60);

					this.setState({
						processing : {
							state   : processingState,
							message : `Your file is processing, parsed ${total} element${(total === 1) ? '' : 's'} in ${(mins >= 1) ? Math.floor(mins) + 'm' : ''} ${secs}s…`
						}
					});
					this.onRefreshUpload();

				} else if (processingState === 3) {
					const { totals } = status;
					const total = Object.values(totals).reduce((acc, val)=> (parseInt(acc, 10) + parseInt(val, 10)));

					const mins = moment.duration(moment(`${status.ended.replace(' ', 'T')}Z`).diff(`${status.started.replace(' ', 'T')}Z`)).asMinutes();
					const secs = Math.floor((mins - Math.floor(mins)) * 60);

					this.props.onProcessing(false);
					clearInterval(this.processingInterval);
					this.processingInterval = null;

					this.onShowNotification();

					this.setState({
						processing : {
							state   : processingState,
							message : `Your file has completed processing. Parsed ${total} element${(total === 1) ? '' : 's'} in ${(mins >= 1) ? Math.floor(mins) + 'm' : ''} ${secs}s.`
						}
					});
					this.onRefreshUpload();

				} else if (processingState === 4) {
					this.setState({
						processing : {
							state   : processingState,
							message : 'An error has occurred during processing!'
						}
					});
				}
			}).catch((error) => {
		});
	};

	onRefreshUpload = ()=> {
		console.log('InspectorPage.onRefreshUpload()', this.props);

		const { uploadID } = this.props.deeplink;
		const { section, scale, viewport } = this.state;

		this.setState({ tooltip : 'Loading…' });

		let maxH = 0;
		let offset = {
			x : 0,
			y : 0
		};

		let formData = new FormData();
		formData.append('action', 'UPLOAD');
		formData.append('upload_id', uploadID);
		axios.post('https://api.designengine.ai/system.php', formData)
			.then((response)=> {
				console.log('UPLOAD', response.data);
				const { upload } = response.data;

				let pages = [];
				upload.pages.forEach((page)=> {
					let artboards = [];
					page.artboards.forEach((artboard, i, arr)=> {
						if (Math.floor(i % 5) === 0 && i !== 0) {
							viewport.height += maxH + 50;
							offset.x = 0;
							offset.y += 50 + maxH;
							maxH = 0;
						}

						maxH = Math.round(Math.max(maxH, JSON.parse(artboard.meta).frame.size.height * scale));

						artboards.push({
							id        : artboard.id,
							pageID    : artboard.page_id,
							title     : artboard.title,
							filename  : (artboard.filename.includes('@3x')) ? artboard.filename : `${artboard.filename}@3x.png`,
							meta      : JSON.parse(artboard.meta),
							added     : artboard.added,
							grid      : {
								col : i % 5,
								row : Math.floor(i / 5)
							},
							offset    : {
								x : offset.x,
								y : offset.y
							},
							slices    : artboard.slices.map((item) => ({
								id       : item.id,
								title    : item.title,
								type     : item.type,
								filename : item.filename,
								meta     : JSON.parse(item.meta),
								added    : item.added
							}))
						});


						if (i < arr.length - 1) {
							offset.x += Math.round(50 + (JSON.parse(artboard.meta).frame.size.width * scale)) - (0);
						}

						viewport.width = Math.max(viewport.width, offset.x);
					});

					page.artboards = artboards;
					pages.push(page);
				});

				this.setState({ viewport });

				upload.pages = pages;

				if (section === 'inspect') {
					formData.append('action', 'FILES');
					formData.append('upload_id', uploadID);
					axios.post('https://api.designengine.ai/system.php', formData)
						.then((response) => {
							console.log('FILES', response.data);

							const tabs = response.data.files.map((file) => ({
								id       : file.id,
								title    : file.title,
								filename : file.filename,
								contents : file.contents,
								added    : file.added
							})).concat([
								{
									id       : 0,
									title    : 'CSS',
									filename : 'CSS',
									contents : null,
									syntax   : null,
									added    : null
								}, {
									id       : 1,
									title    : 'React CSS',
									filename : 'React CSS',
									contents : null,
									syntax   : null,
									added    : null
								}, {
									id       : 2,
									title    : 'Swift',
									filename : 'Swift',
									contents : null,
									syntax   : null,
									added    : null
								}
							]);

							this.setState({
								upload  : upload,
								tabs    : tabs,
								tooltip : ''
							});

						}).catch((error) => {
					});

				} else if (section === 'parts') {
					const tabs = [
						{
							id       : 0,
							title    : 'Parts',
							filename : 'Parts',
							contents : null,
							syntax   : null,
							added    : null
						}
					];

					this.setState({
						upload  : upload,
						tabs    : tabs,
						tooltip : ''
					});

				} else if (section === 'colors') {
					const tabs = [
						{
							id       : 0,
							title    : 'Primary',
							filename : 'Primary',
							contents : null,
							syntax   : null,
							added    : null
						}, {
							id       : -1,
							title    : 'Secondary',
							filename : 'Secondary',
							contents : null,
							syntax   : null,
							added    : null
						}, {
							id       : -2,
							title    : 'Tertiary',
							filename : 'Tertiary',
							contents : null,
							syntax   : null,
							added    : null
						}
					];

					this.setState({
						upload  : upload,
						tabs    : tabs,
						tooltip : ''
					});

				} else if (section === 'typography') {
					const tabs = [
						{
							id       : 0,
							title    : 'Headlines',
							filename : 'Headlines',
							contents : null,
							syntax   : null,
							added    : null
						}, {
							id       : -1,
							title    : 'Subheadlines',
							filename : 'Subheadlines',
							contents : null,
							added    : null
						}, {
							id       : -2,
							title    : 'Body',
							filename : 'Body',
							contents : null,
							syntax   : null,
							added    : null
						}
					];

					this.setState({
						upload  : upload,
						tabs    : tabs,
						tooltip : ''
					});
				}
			}).catch((error) => {
		});
	};

	onShowNotification = ()=> {
		console.log('InspectorPage.onShowNotification()', this.notification);
		if (this.notification.supported()) {
			this.notification.show();
		}
	};

	onUpdateCanvas = ()=> {
		const { scale, offset, viewport } = this.state;
		const { slice, hoverSlice } = this.state;
		const context = canvas.current.getContext('2d');
		context.clearRect(0, 0, canvas.current.clientWidth, canvas.current.clientHeight);


// 		context.fillStyle = 'rgba(0, 0, 0, 0.25)';
// 		context.fillRect(0, 0, canvas.current.clientWidth, canvas.current.clientHeight);

		if (slice) {
			const selectedSrcFrame = slice.meta.frame;
			const selectedOffset = {
				x : offset.x - viewport.x,
				y : offset.y - viewport.y
			};

			const selectedFrame = {
				origin : {
					x : selectedOffset.x + Math.round(selectedSrcFrame.origin.x * scale),
					y : selectedOffset.y + Math.round(selectedSrcFrame.origin.y * scale)
				},
				size   : {
					width  : Math.round(selectedSrcFrame.size.width * scale),
					height : Math.round(selectedSrcFrame.size.height * scale)
				}
			};

// 			console.log('SELECTED', scale, selectedOffset, selectedFrame.origin);

			context.fillStyle = (slice.type === 'slice') ? 'rgba(255, 181, 18, 0.5)' : (slice.type === 'hotspot') ? 'rgba(62, 84, 255, 0.5)' : (slice.type === 'textfield') ? 'rgba(255, 88, 62, 0.5)' : 'rgba(62, 255, 109, 0.5)';
			context.fillRect(selectedFrame.origin.x, selectedFrame.origin.y, selectedFrame.size.width, selectedFrame.size.height);
			context.fillStyle = '#00ff00';
			context.fillRect(selectedFrame.origin.x, selectedFrame.origin.y - 13, selectedFrame.size.width, 13);
			context.fillRect(selectedFrame.origin.x - 30, selectedFrame.origin.y, 30, selectedFrame.size.height);

			context.font = '10px AndaleMono';
			context.fillStyle = '#ffffff';
			context.textAlign = 'center';
			context.textBaseline = 'bottom';
			context.fillText(`${selectedSrcFrame.size.width}PX`, selectedFrame.origin.x + (selectedFrame.size.width * 0.5), selectedFrame.origin.y - 1);

			context.textAlign = 'right';
			context.textBaseline = 'middle';
			context.fillText(`${selectedSrcFrame.size.height}PX`, selectedFrame.origin.x - 2, selectedFrame.origin.y + (selectedFrame.size.height * 0.5));

			context.strokeStyle = 'rgba(0, 0, 0, 0.5)';
			context.beginPath();
			context.setLineDash([4, 2]);
			context.lineDashOffset = this.antsOffset;
			context.strokeRect(selectedFrame.origin.x, selectedFrame.origin.y, selectedFrame.size.width, selectedFrame.size.height);
		}

		if (hoverSlice) {
			const srcFrame = hoverSlice.meta.frame;

			const hoverOffset = {
				x : this.state.hoverOffset.x - viewport.x,
				y : this.state.hoverOffset.y - viewport.y
			};

			const frame = {
				origin : {
					x : hoverOffset.x + Math.round(srcFrame.origin.x * scale),
					y : hoverOffset.y + Math.round(srcFrame.origin.y * scale)
				},
				size   : {
					width  : Math.round(srcFrame.size.width * scale),
					height : Math.round(srcFrame.size.height * scale)
				}
			};

// 			console.log('HOVER:', hoverOffset, frame.origin);

			context.fillStyle = 'rgba(0, 0, 0, 0.5)';
			context.fillStyle = (hoverSlice.type === 'slice') ? 'rgba(255, 181, 18, 0.5)' : (hoverSlice.type === 'hotspot') ? 'rgba(62, 84, 255, 0.5)' : (hoverSlice.type === 'textfield') ? 'rgba(255, 88, 62, 0.5)' : 'rgba(62, 255, 109, 0.5)';
			context.fillRect(frame.origin.x, frame.origin.y, frame.size.width, frame.size.height);
			context.strokeStyle = 'rgba(0, 255, 0, 1.0)';
			context.beginPath();
			context.setLineDash([4, 2]);
			context.lineDashOffset = 0;
			context.moveTo(0, frame.origin.y);
			context.lineTo(canvas.current.clientWidth, frame.origin.y);
			context.moveTo(0, frame.origin.y + frame.size.height);
			context.lineTo(canvas.current.clientWidth, frame.origin.y + frame.size.height);
			context.moveTo(frame.origin.x, 0);
			context.lineTo(frame.origin.x, canvas.current.clientHeight);
			context.moveTo(frame.origin.x + frame.size.width, 0);
			context.lineTo(frame.origin.x + frame.size.width, canvas.current.clientHeight);
			context.stroke();

			context.setLineDash([1, 0]);
			context.lineDashOffset = 0;
			context.fillStyle = 'rgba(0, 0, 0, 0.0)';
			context.fillRect(frame.origin.x, frame.origin.y, frame.size.width, frame.size.height);
			context.strokeStyle = '#00ff00';
			context.beginPath();
			context.moveTo(0, 0);
			context.strokeRect(frame.origin.x, frame.origin.y, frame.size.width, frame.size.height);
			// 		  context.lineWidth = 2;
			context.stroke();

			context.fillStyle = '#00ff00';
			context.fillRect(frame.origin.x, frame.origin.y - 13, frame.size.width, 13);
			context.fillRect(frame.origin.x - 30, frame.origin.y, 30, frame.size.height);

			context.font = '10px AndaleMono';
			context.fillStyle = '#ffffff';
			context.textAlign = 'center';
			context.textBaseline = 'bottom';
			context.fillText(`${srcFrame.size.width}PX`, frame.origin.x + (frame.size.width * 0.5), frame.origin.y - 1);

			context.textAlign = 'right';
			context.textBaseline = 'middle';
			context.fillText(`${srcFrame.size.height}PX`, frame.origin.x - 2, frame.origin.y + (frame.size.height * 0.5));
		}
	};

	onUpdateAnts = ()=> {
		if (canvas.current) {
			this.antsOffset = (++this.antsOffset % 16);
			this.onUpdateCanvas();
		}
	};


	render() {
		const { profile } = this.props;

		const { section, upload, slice, hoverSlice, tabs, scale, selectedTab, scrolling, viewport, panCoords, percent } = this.state;
		const { tooltip, restricted, shownInvite, sentInvites, processing } = this.state;


		const activeSlice = (hoverSlice) ? hoverSlice : slice;
		const p1 = transformPoint({ x : 0.5, y : 0.5 }, panCoords, scale);
		const artboards = (upload) ? upload.pages.flatMap((page)=> {
			return (page.artboards);
		}) : [];


		const artboardsStyle = {
			position  : 'absolute',
// 			width     : `${viewport.width * scale}px`,
// 			height    : `${viewport.height * scale}px`,
			transform : `translate(${p1.x * viewport.width}px, ${p1.y * viewport.height}px) translate(${(viewport.width * -0.5) * scale}px, ${(viewport.height * -0.5) * scale}px)`
		};

		const canvasStyle = {
			top     : `${-((p1.y * viewport.height) + ((viewport.height * -0.5) * scale))}px`,
			left    : `${-((p1.x * viewport.width) + ((viewport.width * -0.5) * scale))}px`,
			display : (scrolling) ? 'none' : 'block'
		};
		const progressStyle = { width : `${percent}%` };


		let maxH = 0;
		let offset = {
			x : 0,
			y : 0
		};

		let artboardImages = [];
		let slices = [];

		artboards.forEach((artboard, i)=> {
			if (Math.floor(i % 5) === 0 && i > 0) {
				offset.x = 0;
				offset.y += maxH + 50;
				maxH = 0;
			}

			maxH = Math.round(Math.max(maxH, artboard.meta.frame.size.height * scale));

			const artboardStyle = {
				position       : 'absolute',
				top            : `${Math.floor(offset.y)}px`,
				left           : `${Math.floor(offset.x)}px`,
				width          : `${Math.floor(scale * artboard.meta.frame.size.width)}px`,
				height         : `${Math.floor(scale * artboard.meta.frame.size.height)}px`,
				background     : `#111111 url("${artboard.filename}") no-repeat center`,
// 				backgroundSize : 'cover',
// 				backgroundSize : '100% auto',
				backgroundSize : `${Math.floor(scale * artboard.meta.frame.size.width)}px ${Math.floor(scale * artboard.meta.frame.size.height)}px`,
				border         : '2px dotted #00ff00'
			};

			const sliceWrapperStyle = {
				position : 'absolute',
				top      : `${Math.floor(offset.y)}px`,
				left     : `${Math.floor(offset.x)}px`,
				width    : `${(scale * artboard.meta.frame.size.width)}px`,
				height   : `${(scale * artboard.meta.frame.size.height)}px`
			};

			const groupSlices = artboard.slices.filter((slice)=> (slice.type === 'group')).map((slice, i) => (
				<SliceRolloverItem
					key={i}
					id={slice.id}
					title={slice.title}
					type={slice.type}
					filled={slice.filled}
					visible={(!scrolling)}
					top={slice.meta.frame.origin.y}
					left={slice.meta.frame.origin.x}
					width={slice.meta.frame.size.width}
					height={slice.meta.frame.size.height}
					scale={scale}
					offset={{ x : offset.x, y : offset.y }}
					onRollOver={(offset)=> this.handleSliceRollOver(i, slice, offset)}
					onRollOut={()=> this.handleSliceRollOut(i, slice)}
					onClick={(offset) => this.handleSliceClick(i, slice, offset)} />)
			);

			const hotspotSlices = artboard.slices.filter((slice)=> (slice.type === 'hotspot')).map((slice, i) => (
				<SliceRolloverItem
					key={i}
					id={slice.id}
					title={slice.title}
					type={slice.type}
					filled={slice.filled}
					visible={(!scrolling)}
					top={slice.meta.frame.origin.y}
					left={slice.meta.frame.origin.x}
					width={slice.meta.frame.size.width}
					height={slice.meta.frame.size.height}
					scale={scale}
					offset={{ x : offset.x, y : offset.y }}
					onRollOver={(offset)=> this.handleSliceRollOver(i, slice, offset)}
					onRollOut={()=> this.handleSliceRollOut(i, slice)}
					onClick={(offset) => this.handleSliceClick(i, slice, offset)} />)
			);

			const textfieldSlices = artboard.slices.filter((slice)=> (slice.type === 'textfield')).map((slice, i) => (
				<SliceRolloverItem
					key={i}
					id={slice.id}
					title={slice.title}
					type={slice.type}
					filled={slice.filled}
					visible={(!scrolling)}
					top={slice.meta.frame.origin.y}
					left={slice.meta.frame.origin.x}
					width={slice.meta.frame.size.width}
					height={slice.meta.frame.size.height}
					scale={scale}
					offset={{ x : offset.x, y : offset.y }}
					onRollOver={(offset)=> this.handleSliceRollOver(i, slice, offset)}
					onRollOut={()=> this.handleSliceRollOut(i, slice)}
					onClick={(offset) => this.handleSliceClick(i, slice, offset)} />)
			);

			const sliceSlices = artboard.slices.filter((slice)=> (slice.type === 'slice')).map((slice, i) => (
				<SliceRolloverItem
					key={i}
					id={slice.id}
					title={slice.title}
					type={slice.type}
					filled={slice.filled}
					visible={(!scrolling)}
					top={slice.meta.frame.origin.y}
					left={slice.meta.frame.origin.x}
					width={slice.meta.frame.size.width}
					height={slice.meta.frame.size.height}
					scale={scale}
					offset={{ x : offset.x, y : offset.y }}
					onRollOver={(offset)=> this.handleSliceRollOver(i, slice, offset)}
					onRollOut={()=> this.handleSliceRollOut(i, slice)}
					onClick={(offset) => this.handleSliceClick(i, slice, offset)} />)
			);

			artboardImages.push(
				<div key={i} style={artboardStyle}>
					<div className="inspector-page-caption">{artboard.title}</div>
				</div>
			);

			slices.push(
				<div key={i} data-artboard-id={artboard.id} className="inspector-page-slices-wrapper" style={sliceWrapperStyle} onMouseOver={this.handleArtboardRollOver} onMouseOut={this.handleArtboardRollOut}>
					<div data-artboard-id={artboard.id} className="inspector-page-group-slice-wrapper">{groupSlices}</div>
					<div data-artboard-id={artboard.id} className="inspector-page-hotspot-slice-wrapper">{hotspotSlices}</div>
					<div data-artboard-id={artboard.id} className="inspector-page-textfield-slice-wrapper">{textfieldSlices}</div>
					<div data-artboard-id={artboard.id} className="inspector-page-slice-slice-wrapper">{sliceSlices}</div>
				</div>
			);

			offset.x += Math.round(50 + (artboard.meta.frame.size.width * scale));
		});

		artboardImages = (!restricted) ? artboardImages : [];
		slices = (!restricted) ? slices : [];


// 		console.log('InspectorPage.render()', this.state, artboardsWrapper.current);

// 		console.log('InspectorPage.render()', this.props, this.state);
// 		console.log('InspectorPage.render()', (artboardsWrapper.current) ? artboardsWrapper.current.scrollTop : 0, (artboardsWrapper.current) ? artboardsWrapper.current.scrollLeft : 0, scale);
// 		console.log('InspectorPage:', window.performance.memory);

		return (<>
			{(this.state.uploading) && (<div className="upload-progress-bar-wrapper">
				<div className="upload-progress-bar" style={progressStyle} />
			</div>)}
			<div className="page-wrapper inspector-page-wrapper">
				<div className="inspector-page-content">
					<div className="inspector-page-artboards-wrapper" ref={artboardsWrapper}>
						{(artboards.length > 0) && (<div style={artboardsStyle}>
							{artboardImages}
							<div className="inspector-page-canvas-wrapper" style={canvasStyle} ref={canvasWrapper}>
								<canvas width={(artboardsWrapper.current) ? artboardsWrapper.current.clientWidth : 0} height={(artboardsWrapper.current) ? artboardsWrapper.current.clientHeight : 0} ref={canvas}>Your browser does not support the HTML5 canvas tag.</canvas>
							</div>
							{slices}
						</div>)}
					</div>
					{(artboards.length > 0) && (<div className="inspector-page-zoom-wrapper">
						<button disabled={(scale >= Math.max(...ZOOM_NOTCHES))} className="inspector-page-float-button" onClick={()=> {trackEvent('button', 'zoom-in'); this.handleZoom(1)}}><img className="inspector-page-float-button-image" src={(scale < Math.max(...ZOOM_NOTCHES)) ? enabledZoomInButton : disabledZoomInButton} alt="+" /></button><br />
						<button disabled={(scale <= Math.min(...ZOOM_NOTCHES))} className="inspector-page-float-button" onClick={()=> {trackEvent('button', 'zoom-out'); this.handleZoom(-1)}}><img className="inspector-page-float-button-image" src={(scale > Math.min(...ZOOM_NOTCHES)) ? enabledZoomOutButton : disabledZoomOutButton} alt="-" /></button><br />
						<button disabled={(scale === 0.5)} className="inspector-page-float-button" onClick={()=> {trackEvent('button', 'zoom-reset'); this.handleZoom(0)}}><img className="inspector-page-float-button-image" src={(scale !== 0.5) ? enabledZooResetButton : disabledZoomResetButton} alt="Reset" /></button>
					</div>)}

					{(upload && profile && upload.creator.user_id === profile.id) && (<div className="inspector-page-modal-button-wrapper">
						<button className="tiny-button" onClick={()=> {trackEvent('button', 'invite-team'); this.setState({ shownInvite : false })}}>Invite Team</button>
					</div>)}
				</div>

				{(section === 'inspect') && (<div className="inspector-page-panel">
					<div className="inspector-page-panel-split-content-wrapper">
						<ul className="inspector-page-panel-tab-wrapper">
							{(tabs.map((tab, i) => (<li key={i} className={`inspector-page-panel-tab${(selectedTab === i) ? ' inspector-page-panel-tab-selected' : ''}`} onClick={()=> this.handleTab(i)}>{tab.title}</li>)))}
						</ul>
						<div className="inspector-page-panel-tab-content-wrapper">
							{(tabs.filter((tab, i)=> (i === selectedTab)).map((tab, i) => {
								return (<div key={i} className="inspector-page-panel-tab-content">
									<span dangerouslySetInnerHTML={{ __html : (tab.contents) ? String(JSON.parse(tab.contents).replace(/ /g, '&nbsp;').replace(/\n/g, '<br />')) : '' }} />
								</div>);
							}))}
						</div>
					</div>
					<div className="inspector-page-panel-button-wrapper">
						<CopyToClipboard onCopy={()=> this.handleCopyCode()} text={(tabs[selectedTab]) ? tabs[selectedTab].syntax : ''}>
							<button className="inspector-page-panel-button">Copy</button>
						</CopyToClipboard>
					</div>
					<div className="inspector-page-panel-split-content-wrapper">
						<ul className="inspector-page-panel-tab-wrapper">
							<li className={'inspector-page-panel-tab inspector-page-panel-tab-selected'}>Specs</li>
							{(section === 'parts') && (<li className={'inspector-page-panel-tab'}>Parts</li>)}
						</ul>
						<div className="inspector-page-panel-tab-content-wrapper">
							<div className="inspector-page-panel-tab-content">
								<SpecsList upload={upload} slice={activeSlice} />
							</div>
						</div>
					</div>
					<div className="inspector-page-panel-button-wrapper">
						<CopyToClipboard onCopy={()=> this.handleCopyCode()} text={(activeSlice) ? toSpecs(activeSlice) : ''}>
							<button className="inspector-page-panel-button">Copy</button>
						</CopyToClipboard>
					</div>
				</div>)}

				{(section === 'parts') && (<div className="inspector-page-panel">
					<div className="inspector-page-panel-full-content-wrapper">
						<ul className="inspector-page-panel-tab-wrapper">
							{(tabs.map((tab, i) => (<li key={i} className={`inspector-page-panel-tab${(selectedTab === i) ? ' inspector-page-panel-tab-selected' : ''}`} onClick={()=> this.handleTab(i)}>{tab.title}</li>)))}
						</ul>
						<div className="inspector-page-panel-tab-content-wrapper">
							{(tabs.filter((tab, i)=> (i === selectedTab)).map((tab, i) => {
								return ((tab.contents)
									? (<PartsList key={i} contents={tab.contents} onPartItem={(sliceID)=> this.handlePartItem(sliceID)} onDownload={this.handleDownload} />)
									: ('')
								);
							}))}
						</div>
					</div>
					<div className="inspector-page-panel-button-wrapper">
						<button className="inspector-page-panel-button" onClick={()=> this.handleDownload()}><FontAwesome name="download" style={{ fontSize:'12px', marginRight:'8px' }} />Download All</button>
					</div>
				</div>)}
			</div>

			{(tooltip !== '' && !this.props.processing) && (<div className="inspector-page-tooltip">{tooltip}</div>)}
			{(restricted) && (<ContentModal
				tracking="private/inspector"
				closeable={false}
				onComplete={()=> this.props.onPage('register')}>
					This project is private, you must be logged in as one of its team members to view!
			</ContentModal>)}

			{(upload && profile && !restricted && upload.creator.user_id === profile.id && (!shownInvite || this.props.processing)) && (<InviteTeamModal
				profile={profile}
				upload={upload}
				processing={processing}
				sentInvites={sentInvites}
				onCopyURL={this.handleCopyURL}
				onInviteTeamFormSubmitted={this.handleInviteTeamFormSubmitted}
				onComplete={()=> this.handleInviteModalClose()}
				/>
			)}

			{(upload) && (<ReactNotifications
				onRef={(ref)=> (this.notification = ref)}
				title="Completed Processing"
				body={`Your design file "${upload.title}" is ready.`}
				icon={DE_LOGO_SMALL}
				timeout="6660"
				tag="processing-complete"
				onClick={(event)=> this.handleCloseNotification(event)}
			/>)}
		</>);
	}
}

export default connect(mapStateToProps, mapDispatchToProps)(InspectorPage);
