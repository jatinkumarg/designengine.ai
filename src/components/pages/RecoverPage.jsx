
import React, { Component } from 'react';
import './RecoverPage.css';

import axios from 'axios/index';
import { Column, Row } from 'simple-flexbox';

import { isValidEmail } from '../../utils/funcs';

class RecoverPage extends Component {
	constructor(props) {
		super(props);

		this.state = {
			email      : '',
			emailValid : true
		};
	}

	handleSubmit = (event)=> {
		console.log('RecoverPage.handleSubmit()', event);
		event.preventDefault();

		const { email } = this.state;
		const emailValid = (email.includes('@')) ? isValidEmail(email) : (email.length > 0);

		this.setState({
			email      : (emailValid) ? email : 'Invalid Email or Username',
			emailValid : emailValid
		});

		if (emailValid) {
			let formData = new FormData();
			formData.append('action', 'RESET_PASSWORD');
			formData.append('email', email);
			axios.post('https://api.designengine.ai/system.php', formData)
				.then((response)=> {
					console.log('RESET_PASSWORD', response.data);
				}).catch((error) => {
			});

			this.props.onPage('');
		}
	};


	render() {
		const { email, emailValid } = this.state;

		const emailClass = (emailValid) ? 'input-wrapper' : 'input-wrapper input-wrapper-error';
		const buttonClass = (emailValid) ? 'fat-button adjacent-button' : 'fat-button adjacent-button button-disabled';

		return (
			<div className="page-wrapper recover-page-wrapper">
				<h3>Forgot Password</h3>
				<h4>Enter your Email Address to send a password recovery link.</h4>
				<div className="recover-page-form-wrapper">
					<form onSubmit={this.handleSubmit}>
						<div className={emailClass}><input type="text" name="email" placeholder="Enter Email or Username" value={email} onFocus={()=> this.setState({ email : '', emailValid : true })} onChange={(event)=> this.setState({ [event.target.name] : event.target.value })} /></div>
						<Row vertical="center">
							<Column><button type="submit" className={buttonClass} onClick={(event)=> this.handleSubmit(event)}>Submit</button></Column>
							<Column><div className="page-link" style={{ fontSize : '14px' }} onClick={()=> this.props.onPage('login')}>Already have an account?</div></Column>
						</Row>
					</form>
				</div>
			</div>
		);
	}
}

export default RecoverPage;
