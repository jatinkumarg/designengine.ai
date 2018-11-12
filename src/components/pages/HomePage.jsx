
import React, { Component } from 'react';
import './HomePage.css';

import axios from 'axios';
import CopyToClipboard from 'react-copy-to-clipboard';
import cookie from 'react-cookies';
import { Column, Row } from 'simple-flexbox';

import LoggedInPage from './LoggedInPage';
import LoggedOutPage from './LoggedOutPage';
import ArtboardItem from '../iterables/ArtboardItem';


class HomePage extends Component {
	constructor(props) {
		super(props);

		this.state = {
			action      : '',
			uploadTitle : 'Loading Project…',
			pageTitle   : 'Loading…',
			uploadURL   : '…',
			artboards   : []
		};
	}

	componentDidMount() {
		console.log('HomePage().componentDidMount()', this.props);
		if (this.props.uploadID !== 0) {
			this.refreshData();
		}
	}

	componentDidUpdate(prevProps) {
		console.log('HomePage.componentDidUpdate()', this.props, prevProps);
		if (this.props.uploadID !== prevProps.uploadID || this.props.pageID !== prevProps.pageID) {
			this.refreshData();
			return (null);
		}
	}

	refreshData = ()=> {
		this.setState({
			pageTitle : 'Loading…',
			uploadURL : (this.props.pageID === 0) ? '…' : this.state.uploadURL,
			artboards : []
		});

		let formData = new FormData();
		formData.append('action', 'UPLOAD_NAMES');
		formData.append('user_id', cookie.load('user_id'));
		axios.post('https://api.designengine.ai/system.php', formData)
			.then((response) => {
				console.log('UPLOAD_NAMES', response.data);
				let self = this;
				let title = '';
				let uploadURL = '';
				response.data.uploads.forEach(function(upload, i) {
					if (upload.id === self.props.uploadID) {
						title = upload.title;
						uploadURL = 'https://earlyaccess.designengine.ai/doc/' + self.props.uploadID + '/' + upload.title.replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-').replace(/^-+/, '').replace(/-+$/, '').toLowerCase();
					}
				});


				formData.append('action', 'PAGE');
				formData.append('page_id', this.props.pageID);
				axios.post('https://api.designengine.ai/system.php', formData)
					.then((response)=> {
						console.log('PAGE', response.data);
						this.setState({ pageTitle : (this.props.pageID === 0) ? title : response.data.page.title });

						formData.append('action', 'ARTBOARDS');
						formData.append('upload_id', this.props.uploadID);
						formData.append('page_id', this.props.pageID);
						axios.post('https://api.designengine.ai/system.php', formData)
							.then((response)=> {
								console.log('ARTBOARDS', response.data);

								const artboards = response.data.artboards.map((item) => ({
									id       : item.id,
									pageID   : item.page_id,
									title    : item.title,
									type     : item.type,
									filename : item.filename,
									meta     : JSON.parse(item.meta),
									added    : item.added,
									selected : false
								}));

								this.setState({
									uploadTitle : title,
									uploadURL   : uploadURL,
									artboards : artboards
								});
							}).catch((error) => {
						});
					}).catch((error) => {
				});
			}).catch((error) => {
		});
	};

	handleURLCopy = ()=> {
		window.alert('URL copied to clipboard!');
	};


	render() {
		console.log('HomePage.render()', this.props);
		const artboards = this.state.artboards;
		const items = artboards.map((artboard) => {
			if (artboard.type !== 'hero' && (this.props.pageID <= 0 || this.props.pageID === artboard.pageID)) {
				return (
					<Column key={artboard.id}>
						<ArtboardItem
							title={artboard.title}
							image={artboard.filename}
							size="landscape"//{(artboard.meta.frame.size.width > artboard.meta.frame.size.height || artboard.meta.frame.size.width === artboard.meta.frame.size.height) ? 'landscape' : 'portrait'}
							onClick={() => this.props.onArtboardClicked(artboard)} />
					</Column>
				);

			} else {
				return (null);
			}
		});


		return (
			<div className="page-wrapper home-page-wrapper">
				{(parseInt(cookie.load('user_id'), 10) === 0 && parseInt(this.props.uploadID, 10) === 0) && (<LoggedOutPage onRegister={()=> this.props.onRegister()} onPayment={()=> this.props.onPayment()} />)}
				{(parseInt(cookie.load('user_id'), 10) !== 0 && parseInt(this.props.uploadID, 10) === 0) && (<LoggedInPage onPage={(url)=> this.props.onPage(url)} onRegister={()=> this.props.onRegister()} onPayment={()=> this.props.onPayment()}/>)}

				{(parseInt(this.props.uploadID, 10) !== 0) && (<div>
					<Row vertical="start">
						<Column flexGrow={1} horizontal="center">
							<div className="page-header">
								<Row horizontal="center"><h1>{this.state.uploadTitle}</h1></Row>
								<div className="page-header-text">Design Engine is the first design platform built for engineers. From open source projects to enterprise, you can inspect parts, download source, and build interface along worldclass designers.</div>
								<Row horizontal="center">
									<CopyToClipboard onCopy={()=> this.handleURLCopy()} text={this.state.uploadURL}>
										<button>Copy Project Link</button>
									</CopyToClipboard>
								</Row>
								<Row horizontal="center"><div className="page-header-url">
									<a href={this.state.uploadURL} target="_blank" rel="noopener noreferrer">{this.state.uploadURL}</a>
								</div></Row>
							</div>
						</Column>
					</Row>
					<Row><h5>{this.state.pageTitle}</h5></Row>
					<Row horizontal="space-between" className="home-page-artboards-wrapper" style={{flexWrap:'wrap'}}>
						{items}
					</Row>
				</div>)}
			</div>
		);
	}
}

export default HomePage;
