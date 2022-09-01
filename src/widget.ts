// Copyright (c) Jeremy Magland
// Distributed under the terms of the Modified BSD License.

import {
  DOMWidgetModel,
  DOMWidgetView,
  ISerializers,
} from '@jupyter-widgets/base';

import { MODULE_NAME, MODULE_VERSION } from './version';

// Import the CSS
// import '../css/widget.css';

export class FigurlFigureModel extends DOMWidgetModel {
  defaults() {
    return {
      ...super.defaults(),
      _model_name: FigurlFigureModel.model_name,
      _model_module: FigurlFigureModel.model_module,
      _model_module_version: FigurlFigureModel.model_module_version,
      _view_name: FigurlFigureModel.view_name,
      _view_module: FigurlFigureModel.view_module,
      _view_module_version: FigurlFigureModel.view_module_version,
      value: 'Hello World',
    };
  }

  static serializers: ISerializers = {
    ...DOMWidgetModel.serializers,
    // Add any extra serializers here
  };

  static model_name = 'FigurlFigureModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
  static view_name = 'FigurlFigureView'; // Set to null if no view
  static view_module = MODULE_NAME; // Set to null if no view
  static view_module_version = MODULE_VERSION;
}

export class FigurlFigureView extends DOMWidgetView {
  render() {
    this.el.classList.add('custom-widget');

    this.value_changed();
    this.model.on('change:value', this.value_changed, this);
  }

  value_changed() {
    this.el.textContent = this.model.get('value');
  }
}
