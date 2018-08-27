
import React, { Component } from 'react';
import './ProjectItem.css';

// import FontAwesome from 'react-fontawesome';
import { Column, Row } from 'simple-flexbox';


class ProjectItem extends Component {
	constructor(props) {
		super(props);

		this.state = {
		};
	}

	render() {
// 		const faStyle = {
// 			color: '#999999',
// 			fontSize: '12px'
// 		};

		return (
			<div className="project-item" onClick={()=> this.props.onClick()}>
				<Column flexGrow={1} horizontal="center">
					<Row><img className="project-item-image" src={this.props.image} alt={this.props.title} /></Row>
				</Column>
			</div>
		);
	}
}

export default ProjectItem;