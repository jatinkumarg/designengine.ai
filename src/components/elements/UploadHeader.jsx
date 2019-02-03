
import React, { Component } from 'react';
import './UploadHeader.css';

import Dropzone from 'react-dropzone';
import FontAwesome from 'react-fontawesome';
import { connect } from 'react-redux';
import { Row } from 'simple-flexbox';

import { POPUP_TYPE_ERROR } from './Popup';
import { sendToSlack } from '../../utils/funcs';
import { trackEvent } from '../../utils/tracking';


const dropZone = React.createRef();


const mapStateToProps = (state, ownProps)=> {
	return ({ profile : state.userProfile });
};


class UploadHeader extends Component {
	constructor(props) {
		super(props);

		this.state = {
			dialog  : false,
			profile : {
				id       : 0,
				username : ''
			}
		};
	}

	componentDidUpdate(prevProps, prevState, snapshot) {
// 		console.log('UploadHeader.componentDidUpdate()', prevProps, this.props, prevState, this.state, snapshot);

		const { dialog } = this.props;
		if (dialog !== this.state.dialog) {
			this.setState({ dialog });
		}

		if (this.state.dialog) {
			if (dropZone.current && dropZone.current.fileInputEl) {
				dropZone.current.fileInputEl.click();
			}
		}
	}


	handleDialogCancel = ()=> {
// 		console.log('UploadHeader.handleDialogCancel()');
		this.setState({ dialog : false });
	};

	handleFileDrop = (files)=> {
// 		console.log('UploadHeader.handleFileDrop()', files);

		const { id, email } = (this.props.profile) ? this.props.profile : this.state.profile;
		if (files.length > 0) {
			const file = files.pop();

			if (file.name.split('.').pop() === 'sketch') {
				if (file.size < 100 * (1024 * 1024)) {
					this.props.onFile(file);

				} else {
					sendToSlack(`*[${id}]* *${email}* uploaded oversized file "_${file.name}_" (${Math.round(file.size * (1 / (1024 * 1024)))}MB)`);
					this.props.onPopup({
						type     : POPUP_TYPE_ERROR,
						content  : 'File size must be under 100MB.',
						duration : 750
					});
				}

			} else {
				sendToSlack(`*[${id}]* *${email}* uploaded incompatible file "_${file.name}_"`);
				this.props.onPopup({
					type     : POPUP_TYPE_ERROR,
					content  : (file.name.split('.').pop() === 'xd') ? 'Adobe XD Support Coming Soon!' : 'Only Sketch files are support at this time.',
					duration : 1500
				});
			}
		}
	};

	handleUploadType = (type)=> {
// 		console.log('UploadHeader.handleUploadType()', type);
		trackEvent('button', type);
	};

	render() {
// 		console.log('UploadHeader.render()', this.props, this.state);
		const { subtitle } = this.props;

		return (<div className="upload-header-wrapper">
			<Dropzone className="upload-header-dz" multiple={false} disablePreview={true} onDrop={this.handleFileDrop.bind(this)} onFileDialogCancel={this.handleDialogCancel} ref={dropZone}>
				<Row horizontal="center"><h2>Upload any design file for interface specs</h2></Row>
				<Row horizontal="center"><div className="upload-header-subtitle">Drag, drop, or click to upload.</div></Row>
			</Dropzone>
		</div>);
	}
}

export default connect(mapStateToProps)(UploadHeader);
