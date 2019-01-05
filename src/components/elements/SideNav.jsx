
import React, { Component } from 'react';
import './SideNav.css'

import axios from 'axios';
import cookie from 'react-cookies';
import { connect } from 'react-redux';
import { Column, Row } from 'simple-flexbox';

import UploadTreeItem from '../iterables/UploadTreeItem';

import { isUserLoggedIn } from '../../utils/funcs';

const wrapper = React.createRef();
const scrollWrapper = React.createRef();


const mapStateToProps = (state, ownProps)=> {
	return ({ profile : state.userProfile });
};


class SideNav extends Component {
	constructor(props) {
		super(props);

		this.state = {
			uploadID   : this.props.uploadID,
			pageID     : this.props.pageID,
			artboardID : this.props.artboardID,
			sliceID    : this.props.sliceID,
			uploads    : [],
			loadOffset : 0,
			loadAmt    : (isUserLoggedIn() && !window.location.pathname.includes('/explore')) ? 666 : 10,
			fetching   : false
		};
	}

	componentDidMount() {
		if (isUserLoggedIn()) {
			this.fetchNextUploads();
		}
	}

	componentDidUpdate(prevProps, prevState, snapshot) {
		console.log('SideNav.componentDidUpdate()', prevProps, this.props, this.state);
		if (prevProps.uploadID !== this.props.uploadID || prevProps.pageID !== this.props.pageID) {
			this.onTreeEffect();
		}

		if (this.props.userID !== prevProps.userID) {
			this.fetchNextUploads();
		}

		if (this.props.processing) {
			this.fetchNextUploads();
		}
	}

	onTreeEffect = ()=> {
		let self = this;
		let uploads = [...this.state.uploads];
		uploads.forEach((upload)=> {
			upload.selected = (upload.id === this.props.uploadID);
			upload.pages.forEach((page)=> {
				page.selected = (page.id === self.props.pageID);
			});
		});

		this.setState({ uploads : uploads });
	};

	fetchNextUploads = ()=> {
// 		console.log('SideNav.fetchNextUploads()');

		const prevUploads = this.state.uploads;

		if (!this.state.fetching) {
			this.setState({ fetching : true });
		}

		let formData = new FormData();
		formData.append('action', 'UPLOAD_NAMES');
		formData.append('user_id', (window.location.pathname.includes('/explore')) ? '-1' : this.props.userID);
		formData.append('offset', (window.location.pathname.includes('/explore')) ? this.state.loadOffset : '0');
		formData.append('length', this.state.loadAmt);
		axios.post('https://api.designengine.ai/system.php', formData)
			.then((response) => {
				console.log('UPLOAD_NAMES', response.data);

				const uploads = response.data.uploads.map((upload)=> ({
					id           : upload.id,
					title        : upload.title,
					description  : upload.description,
					total        : upload.total,
					added        : upload.added,
					selected     : (this.props.uploadID === upload.id),
					fonts        : upload.fonts.map((font)=> ({
						id     : font.id,
						family : font.family,
						style  : font.style,
						added  : font.added
					})),
					colors       : upload.colors.map((color)=> ({
						id    : color.id,
						hex   : color.hex_val,
						added : color.added
					})),
					symbols      : upload.fonts.map((symbol)=> ({
						id    : symbol.id,
						uuid  : symbol.uuid,
						title : symbol.title,
						added : symbol.added
					})),
					pages        : upload.pages.map((page) => ({
						id          : page.id,
						uploadID    : page.upload_id,
						title       : page.title,
						description : page.description,
						total       : page.total,
						added       : page.added,
						selected    : (this.props.pageID === page.id),
						artboards   : []
					})),
					contributors : upload.contributors.map((contributor)=> ({
						id     : contributor.id,
						title  : contributor.username,
						avatar : contributor.avatar
					})),
				}));

// 				if (this.props.artboardID !== 0) {
// 					this.fetchPageArtboards(uploads);
// 				}

				this.setState({
					uploads     : (window.location.pathname.includes('/explore')) ? prevUploads.concat(uploads) : uploads,
					loadOffset  : this.state.loadOffset + this.state.loadAmt,
					loadAmt     : (this.state.loadAmt < 40) ? 40 : 10,
					fetching    : false
				});
			}).catch((error) => {
		});
	};

	fetchPageArtboards = (uploads)=> {
		console.log('SideNav.fetchPageArtboards()', uploads);

		uploads.forEach((upload)=> {
			upload.pages.forEach((page)=> {
				if (page.id === this.props.pageID) {
					let formData = new FormData();
					formData.append('action', 'ARTBOARD_NAMES');
					formData.append('page_id', this.props.pageID);
					axios.post('https://api.designengine.ai/system.php', formData)
						.then((response) => {
							console.log('ARTBOARD_NAMES', response.data);
							page.artboards = response.data.artboards.map((artboard) => ({
								id       : artboard.id,
								pageID   : artboard.page_id,
								uploadID : artboard.upload_id,
								title    : artboard.title,
								filename : artboard.filename,
								total    : artboard.total,
								meta     : JSON.parse(artboard.meta),
								added    : artboard.added,
								selected : (this.props.artboardID === artboard.id)
							}));

							this.setState({ uploads : uploads });
						}).catch((error) => {
					});
				}
			});
		});
	};


	handleUploadClick = (upload)=> {
		console.log('SideNav.handleUploadClick()', upload);

		let uploads = [...this.state.uploads];
		uploads.forEach(function(item, i) {
			if (item.id === upload.id) {
				item.selected = !item.selected;

			} else {
				item.selected = false;
				item.pages.forEach((page)=> {
					page.selected = false;
				});
			}
		});

		if (!upload.selected) {
			wrapper.current.scrollTo(0, 0);
		}

		this.setState({ uploads : uploads });

		if (window.location.pathname === '/' || window.location.pathname === '/explore' || window.location.pathname.includes('/proj')) {
			this.props.onUploadItem(upload);
		}
	};

	handleCategoryClick = (category)=> {
		console.log('SideNav.handleCategoryClick()', category);
	};

	handleFontClick = (font)=> {
		console.log('SideNav.handleFontClick()', font);
	};

	handleColorClick = (color)=> {
		console.log('SideNav.handleColorClick()', color);
	};

	handleSymbolClick = (symbol)=> {
		console.log('SideNav.handleSymbolClick()', symbol);
	};

	handlePageClick = (page)=> {
		console.log('SideNav.handlePageClick()', page);
// 		page.selected = true;// !page.selected;

		let uploads = [...this.state.uploads];
		uploads.forEach((upload)=> {
			if (upload.id === page.uploadID) {
				upload.pages.forEach((item)=> {
					if (item.id === page.id) {
						item.selected = !item.selected;

					} else {
						item.selected = false;
					}
				});
			}
		});

		this.setState({ uploads : uploads });

// 		if (!window.location.pathname.includes('/explore')) {
// 			this.fetchPageArtboards(uploads);
// 		}
		this.props.onPageItem(page);
	};

	handleContributorClick = (contributor)=> {
		console.log('SideNav.handleContributorClick()', contributor);
	};



	handleInvite = ()=> {
		cookie.save('msg', 'use this feature.', { path : '/' });
		this.props.onPage((isUserLoggedIn()) ? 'invite-team' : 'login');
	};

	handleUpload = ()=> {
		cookie.save('msg', 'use this feature.', { path : '/' });

		let self = this;
		setTimeout(function() {
			self.props.onPage((!isUserLoggedIn()) ? 'login' : 'new');
		}, 100);
	};

	render() {
		console.log('SideNav.render()', this.props, this.state);

		const isExplore = (window.location.pathname.includes('/explore'));
		const { uploads, fetching } = this.state;

		return (
			<div className="side-nav-wrapper" ref={wrapper}>
				<div className="side-nav-top-wrapper">
					<h3 className="side-nav-header"><Row vertical="center" style={{width:'100%'}}>
						<Column flexGrow={1} horizontal="start">{(isExplore) ? 'Explore' : 'Projects'}</Column>
						<Column flexGrow={1} horizontal="end"><button className="tiny-button" onClick={()=> this.handleUpload()}>New</button></Column>
					</Row></h3>
					<div className="side-nav-tree-wrapper" ref={scrollWrapper}>
						{(uploads.length === 0) ? <span className="side-nav-subtext">You don't have any projects yet!</span> : uploads.map((upload, i) => {
							return (
								<UploadTreeItem
									key={i}
									title={upload.title}
									fonts={upload.fonts}
									colors={upload.colors}
									symbols={upload.symbols}
									pages={upload.pages}
									contributors={upload.contributors}
									selected={upload.selected}
									onClick={()=> this.handleUploadClick(upload)}
									onCategoryClick={(category)=> this.handleCategoryClick(category)}
									onFontClick={(font)=> this.handleFontClick(font)}
									onColorClick={(color)=> this.handleColorClick(color)}
									onSymbolClick={(symbol)=> this.handleSymbolClick(symbol)}
									onPageClick={(page)=> this.handlePageClick(page)}
									onContributorClick={(contributor)=> this.handleContributorClick(contributor)}
							 />
							);
						})}
					</div>
					{(window.location.pathname.includes('/explore'))
						? (<div className="side-nav-link" onClick={()=> this.fetchNextUploads()}>{(fetching) ? 'Loading…' : 'Explore More'}</div>)
						: (<div className="side-nav-link" onClick={()=> this.handleUpload()}>New Project</div>)
					}
				</div>
				<div className="side-nav-team-wrapper">
					<h6>Your teams</h6>
					Team support coming soon. <span className="page-link" onClick={()=> window.open('https://github.com/de-ai/designengine.ai/projects/1')}>Roadmap</span>
				</div>
				<div className="side-nav-account-wrapper">
					<h6>Account</h6>
					{(isUserLoggedIn())
						? (<div>
								<div className="nav-link" onClick={() => this.props.onPage('profile')}>Profile</div>
								<div className="nav-link" onClick={()=> this.props.onLogout()}>Sign Out</div>
							</div>) : (<div>
								<div className="nav-link" onClick={() => this.props.onPage('register')}>Sign Up</div>
								<div className="nav-link" onClick={() => this.props.onPage('login')}>Login</div>
							</div>
						)}
				</div>
			</div>
		);
	}
}

export default connect(mapStateToProps)(SideNav);
