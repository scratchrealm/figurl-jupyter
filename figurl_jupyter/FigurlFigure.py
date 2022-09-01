#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Jeremy Magland.
# Distributed under the terms of the Modified BSD License.

"""
TODO: Add module docstring
"""

from ipywidgets import DOMWidget
from traitlets import Unicode
from ._frontend import module_name, module_version


class FigurlFigure(DOMWidget):
    """TODO: Add docstring here
    """
    _model_name = Unicode('FigurlFigureModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('FigurlFigureView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    value = Unicode('Hello World from figurl!').tag(sync=True)
