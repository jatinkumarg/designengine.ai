
import React, { Component } from 'react';
import './SideNav.css'

import axios from 'axios';
import cookie from 'react-cookies';
import { connect } from 'react-redux';
import { Column, Row } from 'simple-flexbox';

import UploadTreeItem from '../iterables/UploadTreeItem';

import { isExplorePage, isInspectorPage, isUserLoggedIn, scrollOrigin } from '../../utils/funcs';
import defaultAvatar from '../../assets/images/default-avatar.png';

const wrapper = React.createRef();
const scrollWrapper = React.createRef();


const mapStateToProps = (state, ownProps)=> {
	return ({
		navigation : state.navigation,
		profile    : state.userProfile
	});
};


class SideNav extends Component {
	constructor(props) {
		super(props);

		this.state = {
			uploads    : [],
			loadOffset : 0,
			loadAmt    : (isUserLoggedIn() && !isExplorePage()) ? -1 : 10,
			fetching   : false
		};
	}

	componentDidMount() {
		if (isUserLoggedIn() || isExplorePage()) {
			this.fetchNextUploads();
		}
	}

	componentDidUpdate(prevProps, prevState, snapshot) {
		//#- console.log('SideNav.componentDidUpdate()', prevProps, this.props, this.state);

		if (prevProps.navigation !== this.props.navigation) {
			this.onTreeEffect();
		}

		if (!this.state.fetching && this.props.processing) {
			this.setState({
				fetching   : true,
				loadOffset : 0,
				loadAmt    : -1
			});

			setTimeout(this.fetchNextUploads, 333);
		}

		if (!this.state.fetching && (this.props.profile !== prevProps.profile || ((prevProps.path.includes('/explore') || this.props.path.includes('/explore')) && this.props.path.substring(1).split('/').shift() !== prevProps.path.substring(1).split('/').shift()))) {
			this.setState({
				fetching   : true,
				uploads    : [],
				loadOffset : 0,
				loadAmt    : (isUserLoggedIn() && !isExplorePage()) ? -1 : 10
			});

			setTimeout(this.fetchNextUploads, 333);
		}
	}

	onTreeEffect = ()=> {
		//#- console.log('SideNav.onTreeEffect()', this.props, this.state);

		let uploads = [...this.state.uploads];
		uploads.forEach((upload)=> {
			upload.selected = (upload.id === this.props.navigation.uploadID);
			upload.pages.forEach((page)=> {
				page.selected = (page.id === this.props.navigation.pageID);
			});
		});

		this.setState({ uploads });
	};

	fetchNextUploads = ()=> {
		//#- console.log('SideNav.fetchNextUploads()', this.state.loadOffset, this.state.loadAmt);

// 		const prevUploads = this.state.uploads;
		const { uploadID, pageID } = this.props.navigation;
		const { loadOffset, loadAmt } = this.state;

		if (!this.state.fetching) {
			this.setState({ fetching : true });
		}

		let formData = new FormData();
		formData.append('action', 'UPLOAD_NAMES');
		formData.append('user_id', (isExplorePage()) ? '-1' : (this.props.profile) ? this.props.profile.id : '0');
		formData.append('offset', (isExplorePage()) ? Math.max(0, loadOffset) : '0');
		formData.append('length', '' + loadAmt);
		axios.post('https://api.designengine.ai/system.php', formData)
			.then((response) => {
				//#- console.log('UPLOAD_NAMES', response.data);

				const uploads = response.data.uploads.map((upload)=> ({
					id           : upload.id,
					title        : upload.title,
					description  : upload.description,
					total        : upload.total,
					added        : upload.added,
					selected     : (uploadID === upload.id),
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
						selected    : (pageID === page.id && isInspectorPage()),
						artboards   : []
					})),
					contributors : upload.contributors.map((contributor)=> ({
						id     : contributor.id,
						title  : contributor.username,
						avatar : contributor.avatar
					})).concat([{
						id     : 0,
						title  : 'Invite Team',
						avatar : defaultAvatar
					}])
				}));

// 				if (this.props.artboardID !== 0) {
// 					this.fetchPageArtboards(uploads);
// 				}

				this.setState({
// 					uploads     : (isExplorePage()) ? [...prevUploads, ...uploads] : uploads,
					uploads     : uploads,
					loadOffset  :  (uploads.length === loadAmt) ? loadOffset + loadAmt : -1,
					loadAmt     : (loadAmt < 40) ? 40 : 10,
					fetching    : false
				});
			}).catch((error) => {
		});
	};

	fetchPageArtboards = (uploads)=> {
		//#- console.log('SideNav.fetchPageArtboards()', uploads);

		uploads.forEach((upload)=> {
			upload.pages.forEach((page)=> {
				if (page.id === this.props.pageID) {
					let formData = new FormData();
					formData.append('action', 'ARTBOARD_NAMES');
					formData.append('page_id', this.props.navigation.pageID);
					axios.post('https://api.designengine.ai/system.php', formData)
						.then((response) => {
							//#- console.log('ARTBOARD_NAMES', response.data);
							page.artboards = response.data.artboards.map((artboard) => ({
								id       : artboard.id,
								pageID   : artboard.page_id,
								uploadID : artboard.upload_id,
								title    : artboard.title,
								filename : artboard.filename,
								total    : artboard.total,
								meta     : JSON.parse(artboard.meta),
								added    : artboard.added,
								selected : (this.props.navigation.artboardID === artboard.id)
							}));

							this.setState({ uploads });
						}).catch((error) => {
					});
				}
			});
		});
	};


	handleUploadClick = (upload)=> {
		//#- console.log('SideNav.handleUploadClick()', upload);

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
			scrollOrigin(wrapper.current);
		}

		this.setState({ uploads });
		this.props.onUploadItem(upload);
	};

	handleCategoryClick = (category)=> {
		//#- console.log('SideNav.handleCategoryClick()', category);
		this.props.onCategoryItem(category);
	};

	handleFontClick = (font)=> {
		//#- console.log('SideNav.handleFontClick()', font);
	};

	handleColorClick = (color)=> {
		//#- console.log('SideNav.handleColorClick()', color);
	};

	handleSymbolClick = (symbol)=> {
		//#- console.log('SideNav.handleSymbolClick()', symbol);
	};

	handlePageClick = (page)=> {
		//#- console.log('SideNav.handlePageClick()', page);

		let uploads = [...this.state.uploads];
		uploads.forEach((upload)=> {
			if (upload.id === page.uploadID) {
				upload.pages.forEach((item)=> {
					if (item.id === page.id) {
						item = page;

					} else {
						item.selected = false;
					}
				});
			}
		});

		this.setState({ uploads });
		this.props.onPageItem(page);
	};

	handleContributorClick = (contributor)=> {
		//#- console.log('SideNav.handleContributorClick()', contributor);
		if (contributor.id === 0) {
			this.props.onPage('invite-team');
		}
	};

	handleInvite = ()=> {
		cookie.save('msg', 'use this feature.', { path : '/' });
		this.props.onPage((isUserLoggedIn()) ? 'invite-team' : 'login');
	};

	handleUpload = ()=> {
		this.props.onPage('new');
	};


	render() {
		//#- console.log('SideNav.render()', this.props, this.state);
		const { uploads, fetching, loadOffset } = this.state;

		return (
			<div className="side-nav-wrapper" ref={wrapper}>
				<div className="side-nav-top-wrapper">
					<h3 className="side-nav-header"><Row vertical="center" style={{ width : '100%' }}>
						<Column flexGrow={1} horizontal="start">{(isExplorePage()) ? 'Explore' : 'Projects'}</Column>
						<Column flexGrow={1} horizontal="end"><button className="tiny-button" onClick={()=> this.handleUpload()}>New</button></Column>
					</Row></h3>
					<div className="side-nav-tree-wrapper" ref={scrollWrapper}>
						{(uploads.length === 0)
							? <span className="side-nav-subtext">{(!fetching) ? (!isExplorePage()) ? (!isUserLoggedIn()) ? 'You must be signed in.' : 'You don\'t have any projects yet!' : '' : ''}</span>
							: uploads.map((upload, i) => {
									return (<UploadTreeItem
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
								 />);
							}
						)}
					</div>
					<div className="side-nav-link" onClick={()=> this.fetchNextUploads()}>{(fetching) ? 'Loading…' : (loadOffset === -1) ? '' : (isExplorePage()) ? 'Explore More' : ''}</div>
					{(!isExplorePage()) && (<div className="side-nav-link" onClick={()=> this.handleUpload()}>{(!fetching) ? 'New Project' : ''}</div>)}
				</div>
				<div className="side-nav-team-wrapper">
					<h6>Your teams</h6>
					Team support coming soon. <span className="page-link" onClick={()=> window.open('https://github.com/de-ai/designengine.ai/projects/1')}>Roadmap</span>
				</div>
				<div className="side-nav-account-wrapper">
					<h6>Account</h6>
					{(isUserLoggedIn())
						? (<>
								<div className="nav-link" onClick={() => this.props.onPage('profile')}>Profile</div>
								<div className="nav-link" onClick={()=> this.props.onLogout()}>Sign Out</div>
							</>) : (<>
								<div className="nav-link" onClick={() => this.props.onPage('register')}>Sign Up</div>
								<div className="nav-link" onClick={() => this.props.onPage('login')}>Login</div>
							</>
						)}
				</div>
			</div>
		);
	}
}

export default connect(mapStateToProps)(SideNav);
