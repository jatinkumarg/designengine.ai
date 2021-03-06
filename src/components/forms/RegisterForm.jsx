
import React, { Component } from 'react';
import './RegisterForm.css'

import axios from 'axios';
import { Column, Row } from 'simple-flexbox';

import { hasBit, isValidEmail } from '../../utils/funcs';


const passwordTextfield = React.createRef();


const txtClass = (isValid)=> {
	return ((isValid) ? 'input-wrapper' : 'input-wrapper input-wrapper-error');
};


class RegisterForm extends Component {
	constructor(props) {
		super(props);
		this.state = {
			username      : '',
			email         : '',
			password      : '',
			password2     : '',
			usernameValid : true,
			emailValid    : true,
			passwordValid : true
		};
	}

	componentDidMount() {
// 		console.log('RegisterForm.componentDidMount()', this.props, this.state);
	}

	componentWillUnmount() {
		this.timeline = null;
	}

	handlePassword = ()=> {
		console.log('RegisterForm.handlePassword()');

		this.setState({
			password      : '',
			password2     : '',
			passwordValid : true,
			passMsg       : ''
		});

		setTimeout(() => {
			passwordTextfield.current.focus();
		}, 69);
	};

	handleSubmit = (event)=> {
		console.log('RegisterForm.handleSubmit()', event.target);
		event.preventDefault();

		const { username, email, password, password2 } = this.state;
		const usernameValid = (username.length > 0 && !username.includes('@'));
		const emailValid = isValidEmail(email);
		const passwordValid = (password.length > 0 && password === password2);

		if (password !== password2) {
			this.setState({
				password      : '',
				password2     : '',
				passwordValid : false,
				passMsg       : 'Passwords don\'t match'
			});

			return;
		}

		this.setState({
			username      : (usernameValid) ? username : 'Invalid Username',
			email         : (emailValid) ? email : 'Invalid Email',
			passMsg       : (passwordValid) ? '' : 'Invalid Password',
			usernameValid : usernameValid,
			emailValid    : emailValid,
			passwordValid : passwordValid
		});


		if (usernameValid && emailValid && passwordValid) {
			let formData = new FormData();
			formData.append('action', 'REGISTER');
			formData.append('username', username);
			formData.append('email', email);
			formData.append('password', password);
			formData.append('type', 'user');
			axios.post('https://api.designengine.ai/system.php', formData)
				.then((response) => {
					console.log('REGISTER', response.data);
					const status = parseInt(response.data.status, 16);
// 					console.log('status', status, hasBit(status, 0x01), hasBit(status, 0x10));

					if (status === 0x11) {
						this.props.onRegistered(response.data.user);

					} else {
						this.setState({
							username      : hasBit(status, 0x01) ? username : 'Username Already in Use',
							email         : hasBit(status, 0x10) ? email : 'Email Already in Use',
							password      : '',
							password2     : '',
							usernameValid : hasBit(status, 0x01),
							emailValid    : hasBit(status, 0x10)
						});
					}
				}).catch((error) => {
			});
		}
	};


	render() {
// 		console.log('RegisterForm.render()', this.props, this.state);

		const { username, email, password, password2 } = this.state;
		const { usernameValid, emailValid, passwordValid, passMsg } = this.state;

		const usernameClass = txtClass(usernameValid);
		const emailClass = txtClass(emailValid);
		const passwordClass = txtClass(passwordValid);
		const password2Class = txtClass(passwordValid);
		const buttonClass = (usernameValid && emailValid && passwordValid) ? 'fat-button adjacent-button' : 'fat-button adjacent-button button-disabled';

		return (
			<div className="register-form-wrapper">
				<form onSubmit={this.handleSubmit}>
					<div className={usernameClass}><input type="text" name="username" placeholder="Username" value={username} onFocus={()=> this.setState({ username : '', usernameValid : true })} onChange={(event)=> this.setState({ [event.target.name] : event.target.value })} /></div>
					<div className={emailClass}><input type="text" name="email" placeholder="Email Address" value={email} onFocus={()=> this.setState({ email : '', emailValid : true })} onChange={(event)=> this.setState({ [event.target.name] : event.target.value })} /></div>
					<div className={passwordClass} onClick={()=> this.handlePassword()}>
						<input type="password" name="password" placeholder="Password" value={password} style={{ display : (passwordValid) ? 'block' : 'none' }} onChange={(event)=> this.setState({ [event.target.name] : event.target.value })} ref={passwordTextfield} />
						<div className="field-error" style={{ display : (!passwordValid) ? 'block' : 'none' }}>{passMsg}</div>
					</div>
					<div className={password2Class}><input type="password" name="password2" placeholder="Confirm Password" value={password2} onChange={(event)=> this.setState({ [event.target.name] : event.target.value })} /></div>
					<Row vertical="center">
						<Column><button type="submit" className={buttonClass} onClick={(event)=> this.handleSubmit(event)}>Submit</button></Column>
						<Column><div className="page-link" style={{ fontSize : '14px' }} onClick={()=> this.props.onLogin()}>Already have an account?</div></Column>
					</Row>
				</form>
			</div>
		);
	}
}

export default RegisterForm;