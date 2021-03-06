import * as React from 'react';
import { Dropdown, IDropdownOption } from 'office-ui-fabric-react/lib/Dropdown';
import { Async } from 'office-ui-fabric-react/lib/Utilities';
import { Label } from 'office-ui-fabric-react/lib/Label';
import { IPropertyFieldDropDownHostProps, IPropertyFieldDropDownHostState } from './IPropertyFieldDropDownHost';
import FieldErrorMessage from '../errorMessage/FieldErrorMessage';

// Empty list value, to be checked for single list selection
const EMPTY_LIST_KEY = 'NO_LIST_SELECTED';

/**
 * Renders the controls for PropertyFieldDropDown component
 */
export default class PropertyFieldDropDownHost extends React.Component<IPropertyFieldDropDownHostProps, IPropertyFieldDropDownHostState> {
	private selectedKey: string;

	private latestValidateValue: string;
	private async: Async;
	private delayedValidate: (value: string) => void;

	/**
	 * Constructor method
	 */
	constructor(props: IPropertyFieldDropDownHostProps) {
		super(props);


		this.async = new Async(this);
		this.validate = this.validate.bind(this);
		this.onChanged = this.onChanged.bind(this);
		this.notifyAfterValidate = this.notifyAfterValidate.bind(this);
		this.delayedValidate = this.async.debounce(this.validate, this.props.deferredValidationTime);
		this.state = {
			options: this.props.options,
			errorMessage: '',
			selectedKey: props.properties[props.targetProperty]
		};

		// Start loading options
		if (this.props.loader) {
			this.loadOptions();
		}
	}

	/**
	 * Loads the options
	 */
	private loadOptions(): void {
		this.props.loader().then((response: IDropdownOption[]) => {
			if (!this.props.multiSelect) {
				// Option to unselect the list
				response.unshift({
					key: EMPTY_LIST_KEY,
					text: ''
				});
			}
			// Update the current component state
			this.setState({
				options: response
			});
		});
	}

	/**
	 * Raises when a list has been selected
	 */
	private onChanged(option: IDropdownOption, index?: number): void {
		const newValue: string = option.key as string;
		this.delayedValidate(newValue);
	}

	/**
	 * Validates the new custom field value
	 */
	private validate(value: string): void {
		if (this.props.onGetErrorMessage === null || this.props.onGetErrorMessage === undefined) {
			this.notifyAfterValidate(this.props.selectedKey, value);
			return;
		}

		if (this.latestValidateValue === value) {
			return;
		}

		this.latestValidateValue = value;

		const result: string | PromiseLike<string> = this.props.onGetErrorMessage(value || '');
		if (typeof result !== 'undefined') {
			if (typeof result === 'string') {
				if (result === '') {
					this.notifyAfterValidate(this.props.selectedKey, value);
				}
				this.setState({
					errorMessage: result
				});
			} else {
				result.then((errorMessage: string) => {
					if (typeof errorMessage === 'undefined' || errorMessage === '') {
						this.notifyAfterValidate(this.props.selectedKey, value);
					}
					this.setState({
						errorMessage: errorMessage
					});
				});
			}
		} else {
			this.notifyAfterValidate(this.props.selectedKey, value);
		}
	}

	/**
	 * Notifies the parent Web Part of a property value change
	 */
	private notifyAfterValidate(oldValue: string, newValue: string) {
		var propValue: any;
		if (this.props.multiSelect) {
			propValue = this.state.options.filter(option => {
				return option.selected;
			}).map(option => {
				return option.key;
			});
			// Update the state
			this.setState({
				selectedKeys: propValue
			});
		} else {
			// Check if the user wanted to unselect the list
			propValue = newValue === EMPTY_LIST_KEY ? '' : newValue;

			// Deselect all options
			var options = this.state.options.map(option => {
				if (option.selected) {
					option.selected = false;
				}
				return option;
			});
			// Set the current selected key
			this.selectedKey = newValue;
			// Update the state
			this.setState({
				selectedKey: this.selectedKey,
				options: options
			});
		}
		if (this.props.onPropertyChange && propValue !== null) {
			// Store the new property value
			this.props.properties[this.props.targetProperty] = propValue;
			// Trigger the default onPropertyChange event
			this.props.onPropertyChange(this.props.targetProperty, oldValue, propValue);
			// Trigger the apply button
			if (typeof this.props.onChange !== 'undefined' && this.props.onChange !== null) {
				this.props.onChange(this.props.targetProperty, propValue);
			}
		}
	}

	/**
	 * Called when the component will unmount
	 */
	public componentWillUnmount() {
		if (typeof this.async !== 'undefined') {
			this.async.dispose();
		}
	}
	/**
	 * Renders the DropDown controls with Office UI Fabric
	 */
	public render(): JSX.Element {
		// Renders content
		if (this.props.multiSelect) {
			var selectedKeys = Array.isArray(this.state.selectedKey) ? this.state.selectedKey as string[] :
				(this.state.selectedKey ? [this.state.selectedKey] : []);
			return (
				<div>
					<Label>{this.props.label}</Label>
					<Dropdown
						disabled={this.props.disabled}
						label=''
						onChanged={this.onChanged}
						options={this.state.options}
						selectedKeys={selectedKeys}
						multiSelect
					/>

					<FieldErrorMessage errorMessage={this.state.errorMessage} />
				</div>
			);
		}
		return (
			<div>
				<Label>{this.props.label}</Label>
				<Dropdown
					disabled={this.props.disabled}
					label=''
					onChanged={this.onChanged}
					options={this.state.options}
					selectedKey={this.state.selectedKey}
				/>

				<FieldErrorMessage errorMessage={this.state.errorMessage} />
			</div>
		);
	}
}
